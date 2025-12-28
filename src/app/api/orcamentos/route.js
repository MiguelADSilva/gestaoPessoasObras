import { NextResponse } from "next/server";
import Orcamento from "@/models/Orcamento";
import dbConnect from "@/lib/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toNum = (v, fallback = 0) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function calcFromLinhas(rawLinhas = [], descontoPercent = 0) {
  let subtotal = 0;
  let totalIva = 0;

  const linhas = rawLinhas.map((l) => {
    const quantidade = toNum(l?.quantidade, 0);
    const precoUnitario = toNum(l?.precoUnitario ?? l?.precoUnit, 0);
    const iva = toNum(l?.iva, 0);

    const base = quantidade * precoUnitario;
    const ivaValor = base * (iva / 100);

    subtotal += base;
    totalIva += ivaValor;

    return {
      materialId: l?.materialId || null,
      descricao: (l?.descricao || "").trim(),
      unidade: (l?.unidade || "un").trim(),
      quantidade,
      precoUnitario,
      iva,
      totalLinha: base, // (se quiseres com iva, muda para base + ivaValor)
    };
  });

  const totalSemDesconto = subtotal + totalIva;
  const dp = Math.max(0, toNum(descontoPercent, 0));
  const descontoValor = totalSemDesconto * (dp / 100);
  const total = Math.max(0, totalSemDesconto - descontoValor);

  return { linhas, subtotal, totalIva, descontoPercent: dp, descontoValor, total };
}

export async function GET() {
  try {
    await dbConnect();
    const orcamentos = await Orcamento.find().sort({ createdAt: -1 });
    return NextResponse.json({ items: orcamentos });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao listar orçamentos" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const rawLinhas = Array.isArray(body?.linhas) ? body.linhas : [];

    const descontoPercent = body?.descontoPercent ?? 0;
    const calc = calcFromLinhas(rawLinhas, descontoPercent);

    const orcamento = await Orcamento.create({
      obraId: body?.obraId || null,
      obraNomeSnapshot: body?.obraNomeSnapshot || undefined,

      titulo: body?.titulo || "Orçamento",
      clienteNome: body?.clienteNome || "",
      clienteContacto: body?.clienteContacto || "",
      notas: body?.notas || "",

      // ✅ desconto
      descontoPercent: calc.descontoPercent,
      descontoValor: calc.descontoValor,

      linhas: calc.linhas,
      subtotal: calc.subtotal,
      totalIva: calc.totalIva,
      total: calc.total,

      estado: body?.estado || "rascunho",
      criadoPor: body?.criadoPor || undefined,
    });

    return NextResponse.json(orcamento, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao criar orçamento" }, { status: 500 });
  }
}
