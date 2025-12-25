export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createRequire } from 'module';
import { connectToDatabase } from '@/app/api/lib/database';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse'); // pdf-parse@1.1.1

const IVA_DEFAULT = 23;

function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

function normalizeLine(s) {
  return String(s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\s+/g, ' ')
    // ajuda quando vem "50,30Mec" colado
    .replace(/(\d)([A-Za-zÀ-ÿ])/g, '$1 $2')
    .trim();
}

function hasLetters(s) {
  return /[A-ZÀ-Ü]/i.test(String(s || ''));
}

/**
 * Parse número em PT/EN com 2-3 decimais e/ou milhares:
 * "1,59" -> 1.59
 * "8.297" -> 8.297 (assumimos decimal se o último bloco tiver 2-3 dígitos)
 * "1.277,00" -> 1277.00
 * "1 277,00" -> 1277.00
 */
function parseEuroFlexible(raw) {
  let s = String(raw || '').trim();
  if (!s) return null;

  s = s.replace(/[€\s]/g, '');

  // remove espaços de milhares
  s = s.replace(/\s+/g, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma) {
    // formato PT: '.' milhares, ',' decimal
    s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  if (hasDot) {
    // decidir se dot é decimal (último grupo 2-3) ou milhares (último grupo 3 e há 2+ dots)
    const parts = s.split('.');
    const last = parts[parts.length - 1];

    // se último bloco 2-3 => decimal
    if (/^\d{2,3}$/.test(last)) {
      // remove outros pontos (milhares)
      const head = parts.slice(0, -1).join('');
      const num = Number(`${head}.${last}`);
      return Number.isFinite(num) ? num : null;
    }

    // senão, assume milhares e remove pontos
    s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function detectCategoria(nomeUpper) {
  if (nomeUpper.includes('CABO') || nomeUpper.includes('FIO') || nomeUpper.includes('H07') || nomeUpper.includes('RZ1') || nomeUpper.includes('XV'))
    return 'cabos';
  if (nomeUpper.includes('TOMADA')) return 'tomadas';
  if (nomeUpper.includes('INTERRUPTOR') || /\bINT\b/.test(nomeUpper)) return 'int';
  return 'geral';
}

/* ---------------------------
   DETEÇÃO DE FORMATO
---------------------------- */
function detectFormat(text) {
  const t = String(text || '');
  const up = t.toUpperCase();

  if (up.includes('€/KM') || up.includes('€ /KM') || up.includes('€/ KM')) return 'POLICABOS';
  if (up.includes('CÓDIGO BARRAS') || up.includes('CODIGO BARRAS')) return 'EFAPEL';
  if (up.includes('PREÇO TABELA') || up.includes('PRECO TABELA')) return 'VOLTER';

  // heurísticas extra:
  const eanCount = (t.match(/\b\d{13}\b/g) || []).length;
  if (eanCount > 50) return 'EFAPEL';

  // muitas linhas a começar por 6-8 dígitos + € -> volter-like
  const lines = t.split('\n').slice(0, 200);
  let codeEuro = 0;
  for (const l of lines) {
    const s = normalizeLine(l);
    if (/^\d{6,8}\s+.+\s+\d/.test(s) && /€/.test(s)) codeEuro++;
  }
  if (codeEuro >= 5) return 'VOLTER';

  return 'UNKNOWN';
}

/* =========================================================
   EFAPEL PARSER (ref + nome + preço + ean + qtd + famílias)
========================================================= */
function isHeaderLineEfapel(lineUpper) {
  return (
    lineUpper.includes('MAR/') ||
    lineUpper.includes('REFER') ||
    lineUpper.includes('DESIGNA') ||
    lineUpper.includes('PREÇO') ||
    lineUpper.includes('CÓDIGO') ||
    lineUpper.includes('CODIGO') ||
    lineUpper.includes('BARRAS') ||
    lineUpper === 'QT.' ||
    lineUpper.includes('FAMÍLIA') ||
    lineUpper.includes('CAIXA')
  );
}

// agrupa linhas partidas: novo registo quando começa com 5 dígitos
function groupEfapelRecords(lines) {
  const records = [];
  let cur = '';

  for (const raw of lines) {
    const line = normalizeLine(raw);
    if (!line) continue;

    const up = line.toUpperCase();
    if (isHeaderLineEfapel(up)) continue;

    const startsNew = /^\d{5}/.test(line);
    if (startsNew) {
      if (cur) records.push(cur);
      cur = line;
    } else {
      if (!cur) continue;
      cur = normalizeLine(cur + ' ' + line);
    }
  }

  if (cur) records.push(cur);
  return records;
}

// referencia: "70922 TBI" ou "21011"
function splitEfapelRefAndAfterRef(s) {
  const m = s.match(/^(\d{5})(.*)$/);
  if (!m) return null;

  const base = m[1];
  let tail = (m[2] || '').trimStart();
  if (!tail) return null;

  // sufixo COLADO 3 letras: "TBIINTERRUPTOR..."
  const glued3 = tail.match(/^([A-Z]{3})([A-ZÀ-Ü].*)$/i);
  if (glued3) {
    return {
      referencia: `${base} ${glued3[1].toUpperCase()}`,
      afterRef: normalizeLine(glued3[2]),
    };
  }

  // sufixo token curto: "TBI TOMADA..."
  const token = tail.match(/^([A-Z0-9]{1,6})\s*(.*)$/i);
  if (token) {
    const suf = token[1];
    const rest = normalizeLine(token[2] || '');
    if (hasLetters(rest)) {
      return {
        referencia: `${base} ${suf.toUpperCase()}`,
        afterRef: rest,
      };
    }
  }

  return { referencia: base, afterRef: tail };
}

// família real = texto depois da lista numérica "21,90,70, 50,30 ..."
function extractEfapelFamiliaFinal(afterQtd) {
  const s = normalizeLine(afterQtd);

  // encontra o último bloco com várias vírgulas (lista)
  const reNums = /\d{1,3}(?:\s*,\s*\d{1,3})+(?:\s*,\s*\d{1,3})*/g;
  let lastMatch = null;
  let m;
  while ((m = reNums.exec(s)) !== null) lastMatch = m;

  if (!lastMatch) {
    // fallback: tenta última "palavra(s) + número"
    const tail = s.match(/([A-Za-zÀ-ÿ.]+(?:\s+[A-Za-zÀ-ÿ.]+)*\s+\d{1,3})\s*$/);
    return tail ? normalizeLine(tail[1]) : '';
  }

  const afterNums = normalizeLine(s.slice(lastMatch.index + lastMatch[0].length));
  return afterNums || '';
}

function parseEfapelRecord(record) {
  const s = normalizeLine(record);
  if (!s) return null;

  // preço (X,YY €)
  const priceMatch = s.match(/(\d{1,6},\d{2})\s*(€|EUR)/i);
  if (!priceMatch) return null;

  const precoCompra = parseEuroFlexible(priceMatch[1]);
  if (precoCompra == null) return null;

  const priceIndex = s.indexOf(priceMatch[0]);
  if (priceIndex < 0) return null;

  const beforePrice = normalizeLine(s.slice(0, priceIndex));
  const afterPrice = normalizeLine(s.slice(priceIndex + priceMatch[0].length));

  const refObj = splitEfapelRefAndAfterRef(beforePrice);
  if (!refObj) return null;

  const referencia = refObj.referencia;
  const nome = normalizeLine(refObj.afterRef);
  if (!referencia || !nome) return null;

  // ean
  const eanMatch = afterPrice.match(/(\d{13})/);
  if (!eanMatch) return null;
  const ean = eanMatch[1];
  const eanPos = afterPrice.indexOf(ean);
  const afterEan = normalizeLine(afterPrice.slice(eanPos + ean.length));

  // qtd
  const qtdMatch = afterEan.match(/^\s*(\d{1,3})/);
  if (!qtdMatch) return null;
  const afterQtd = normalizeLine(afterEan.slice(qtdMatch[0].length));

  const marca = extractEfapelFamiliaFinal(afterQtd) || '';

  return {
    referencia,
    nome,
    marca,
    categoria: detectCategoria(nome.toUpperCase()),
    unidade: 'un',
    precoCompra,
  };
}

function parseEfapel(text) {
  const rawLines = String(text || '').split('\n');
  const records = groupEfapelRecords(rawLines);

  const items = [];
  for (const r of records) {
    const it = parseEfapelRecord(r);
    if (it) items.push(it);
  }

  // dedupe por referencia
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    if (seen.has(it.referencia)) continue;
    seen.add(it.referencia);
    unique.push(it);
  }

  return { items: unique, debug: { lines: rawLines.length, records: records.length } };
}

/* =========================================================
   VOLTER PARSER (código + descrição + preço em €)
   - aqui assumimos preço por METRO como disseste
========================================================= */
function parseVolter(text) {
  const lines = String(text || '').split('\n').map(normalizeLine).filter(Boolean);

  const items = [];
  for (const line of lines) {
    const up = line.toUpperCase();
    // ignora cabeçalhos típicos
    if (
      up.includes('CÓDIGO') ||
      up.includes('CODIGO') ||
      up.includes('DESIGNA') ||
      up.includes('PREÇO TABELA') ||
      up.includes('PRECO TABELA')
    ) continue;

    // padrão: 6-8 dígitos + descrição + preço + €
    // exemplo: "1210093 FIO H07V-U ... 8.297 €"
    const m = line.match(/^(\d{6,8})\s+(.+?)\s+(\d[\d.,\s]*)\s*€\b/i);
    if (!m) continue;

    const referencia = m[1];
    const nome = normalizeLine(m[2]);
    const precoCompra = parseEuroFlexible(m[3]);

    if (!referencia || !nome || precoCompra == null) continue;

    items.push({
      referencia,
      nome,
      marca: 'Volter',
      categoria: detectCategoria(nome.toUpperCase()),
      unidade: 'm', // ✅ por metro
      precoCompra,
    });
  }

  // dedupe por referencia
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    if (seen.has(it.referencia)) continue;
    seen.add(it.referencia);
    unique.push(it);
  }

  return { items: unique, debug: { lines: lines.length } };
}

/* =========================================================
   POLICABOS/LAPP PARSER (tabela €/Km -> €/m)
   - tenta apanhar um "título" (nome em cinzento) e as linhas "Nxmm²"
========================================================= */
function parsePolicabos(text) {
  const lines = String(text || '').split('\n').map(normalizeLine).filter(Boolean);

  let currentProduct = '';
  const items = [];

  for (const line of lines) {
    const up = line.toUpperCase();

    // cabeçalhos
    if (up.includes('€/KM') || up.includes('EURO/KM') || up.includes('PREÇO') || up.includes('TABELA') || up.includes('PÁG')) {
      continue;
    }

    // detetar um "título" (muitas vezes é uma linha curta, sem preço e sem €/Km, com letras)
    // ex: "H07V-U (450/750V)"
    const looksLikeTitle =
      hasLetters(line) &&
      !/€/.test(line) &&
      !/^\d{3,}/.test(line) &&
      line.length >= 6 &&
      line.length <= 60;

    // mas não trocar o título se a linha parece claramente uma entrada de tabela
    const looksLikeRow = /\b(\d+)\s*[XxGg]\s*\d+(?:,\d+)?\b/.test(line) && (up.includes('€/KM') || /€/.test(line));

    if (looksLikeTitle && !looksLikeRow) {
      currentProduct = line;
      continue;
    }

    // linhas tipo: "3 G 1,5 3383,00 €/Km" ou "1 X 16 750,00 €/Km"
    // apanha primeiro "condutores" e depois preço €/Km
    const mRow = line.match(/\b(\d+\s*[XxGg]\s*\d+(?:,\d+)?)\b.*?(\d[\d.,\s]*)\s*€\s*\/?\s*Km\b/i);
    if (!mRow) continue;

    const cond = normalizeLine(mRow[1]).toUpperCase().replace(/\s+/g, ' ');
    const precoKm = parseEuroFlexible(mRow[2]);
    if (precoKm == null) continue;

    const precoM = precoKm / 1000;

    const nomeBase = currentProduct ? currentProduct : 'Cabo';
    const nome = `${nomeBase} — ${cond}`;

    // referencia estável (evita duplicados):
    // se houver produto, usa um "slug" simples + cond
    const ref = `${(currentProduct || 'CABO').toUpperCase().replace(/\s+/g, '').slice(0, 12)}_${cond.replace(/\s+/g, '')}`.slice(0, 40);

    items.push({
      referencia: ref,
      nome,
      marca: 'Policabos/LAPP',
      categoria: 'cabos',
      unidade: 'm',
      precoCompra: precoM,
    });
  }

  // dedupe por referencia
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    if (seen.has(it.referencia)) continue;
    seen.add(it.referencia);
    unique.push(it);
  }

  return { items: unique, debug: { lines: lines.length } };
}

/* =========================================================
   GRAVAÇÃO (precoCompra -> precoVenda com IVA)
========================================================= */
function normalizeToDbItem(it) {
  const iva = IVA_DEFAULT;

  const precoCompra = Number(it.precoCompra ?? 0);
  const precoVenda = round3(precoCompra * (1 + iva / 100));

  return {
    referencia: String(it.referencia || '').trim(),
    nome: String(it.nome || '').trim(),
    marca: String(it.marca || '').trim(),
    categoria: String(it.categoria || 'geral').trim() || 'geral',
    unidade: String(it.unidade || 'un').trim() || 'un',
    iva,
    precoCompra: round3(precoCompra),
    precoVenda,
    stockAtual: 0,
    fornecedor: '',
    notas: '',
  };
}

export async function POST(req) {
  try {
    const form = await req.formData();
    let file = form.get('file');

    // fallback: procura qualquer File
    if (!file) {
      for (const [, value] of form.entries()) {
        if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
          file = value;
          break;
        }
      }
    }

    if (!file) {
      const keys = [];
      for (const [k] of form.entries()) keys.push(k);
      return NextResponse.json(
        { error: `PDF não encontrado no form-data. Keys recebidas: ${keys.join(', ') || '(nenhuma)'}` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    const text = String(parsed?.text || '').trim();

    if (!text) {
      return NextResponse.json(
        { error: 'Não foi possível ler texto do PDF (se for scanner, precisa de OCR).' },
        { status: 400 }
      );
    }

    const format = detectFormat(text);

    let parsedResult = null;
    if (format === 'EFAPEL') parsedResult = parseEfapel(text);
    else if (format === 'VOLTER') parsedResult = parseVolter(text);
    else if (format === 'POLICABOS') parsedResult = parsePolicabos(text);
    else {
      const sampleLines = text
        .split('\n')
        .map(normalizeLine)
        .filter(Boolean)
        .slice(0, 40);

      return NextResponse.json(
        {
          error: 'Formato de PDF não reconhecido. Envia 2-3 linhas do PDF para eu ajustar.',
          debug: { format, sampleLines },
        },
        { status: 400 }
      );
    }

    const itemsRaw = Array.isArray(parsedResult?.items) ? parsedResult.items : [];
    if (itemsRaw.length === 0) {
      const sampleLines = text
        .split('\n')
        .map(normalizeLine)
        .filter(Boolean)
        .slice(0, 60);

      return NextResponse.json(
        { error: 'Nenhuma linha válida encontrada no PDF.', debug: { format, sampleLines } },
        { status: 400 }
      );
    }

    // normalizar + validar
    const items = itemsRaw
      .map(normalizeToDbItem)
      .filter((it) => it.referencia && it.nome && Number.isFinite(it.precoCompra));

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Itens detetados mas falharam na normalização (referência/nome/preço).' },
        { status: 400 }
      );
    }

    // bulk upsert
    const { db } = await connectToDatabase();
    const col = db.collection('materials');

    const ops = items.map((it) => ({
      updateOne: {
        filter: { referencia: it.referencia },
        update: {
          $set: {
            nome: it.nome,
            marca: it.marca,
            categoria: it.categoria,
            unidade: it.unidade,
            iva: it.iva,
            precoCompra: it.precoCompra,
            precoVenda: it.precoVenda,
            stockAtual: it.stockAtual,
            fornecedor: it.fornecedor,
            notas: it.notas,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    }));

    const result = await col.bulkWrite(ops, { ordered: false });

    return NextResponse.json({
      ok: true,
      format,
      foundCount: items.length,
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      matched: result.matchedCount || 0,
      debug: parsedResult?.debug || {},
      preview: items.slice(0, 12),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Erro ao importar PDF.' },
      { status: 500 }
    );
  }
}
