import { NextResponse } from 'next/server';
import Orcamento from '@/models/Orcamento';

// ⚠️ Troca isto para a tua ligação ANTIGA (mongoose)
// Exemplo comum:
// import dbConnect from '@/lib/mongodb';
// await dbConnect();

// Se no teu projeto a ligação está noutro sítio, aponta para lá:
import dbConnect from '@/lib/mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const rawLinhas = Array.isArray(body?.linhas) ? body.linhas : [];

    let subtotal = 0;
    let totalIva = 0;

    const linhas = rawLinhas.map((l) => {
      const quantidade = toNum(l?.quantidade, 0);
      const precoUnitario = toNum(l?.precoUnitario ?? l?.precoUnit, 0);
      const iva = toNum(l?.iva, 0);

      const linhaTotal = quantidade * precoUnitario;
      const ivaValor = linhaTotal * (iva / 100);

      subtotal += linhaTotal;
      totalIva += ivaValor;

      return {
        ...l,
        quantidade,
        precoUnitario, // ✅ garante o nome que o schema pede
        iva,
        totalLinha: linhaTotal + ivaValor, // ✅ nunca NaN
      };
    });

    const total = subtotal + totalIva;

    const orcamento = await Orcamento.create({
      obraId: body?.obraId || null,
      obraNomeSnapshot: body?.obraNomeSnapshot || undefined,
      titulo: body?.titulo || 'Orçamento',
      clienteNome: body?.clienteNome || '',
      clienteContacto: body?.clienteContacto || '',
      notas: body?.notas || '',
      linhas,
      subtotal,
      totalIva,
      total,
      criadoPor: body?.criadoPor || undefined,
    });

    return NextResponse.json(orcamento, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Erro ao criar orçamento' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await dbConnect();
    const orcamentos = await Orcamento.find().sort({ createdAt: -1 });
    return NextResponse.json({ items: orcamentos });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Erro ao listar orçamentos' },
      { status: 500 }
    );
  }
}
