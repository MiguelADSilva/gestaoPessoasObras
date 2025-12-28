import { NextResponse } from "next/server";
import Orcamento from "@/models/Orcamento";
import dbConnect from "@/lib/mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toNum = (v, fallback = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function calcOrcamentoTotals({ linhas = [], descontoPercent = 0, autoLiquidacao = false }) {
  let subtotal = 0;
  let totalIva = 0;

  const linhasCalc = (Array.isArray(linhas) ? linhas : []).map((l) => {
    const quantidade = toNum(l?.quantidade, 0);
    const precoUnitario = toNum(l?.precoUnitario ?? l?.precoUnit, 0);
    const ivaPct = autoLiquidacao ? 0 : toNum(l?.iva, 0);

    const base = quantidade * precoUnitario;
    const ivaValor = base * (ivaPct / 100);

    subtotal += base;
    totalIva += ivaValor;

    return {
      materialId: l?.materialId ?? null,
      descricao: String(l?.descricao ?? "").trim(),
      unidade: String(l?.unidade ?? "un").trim(),
      quantidade,
      precoUnitario,
      iva: ivaPct,
      totalLinha: base + ivaValor,
    };
  });

  const totalSemDesconto = subtotal + totalIva;
  const descontoP = Math.max(0, toNum(descontoPercent, 0));
  const descontoValor = totalSemDesconto * (descontoP / 100);
  const total = Math.max(0, totalSemDesconto - descontoValor);

  return { linhas: linhasCalc, subtotal, totalIva, totalSemDesconto, descontoValor, descontoP, total };
}

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const descontoPercent = body?.descontoPercent ?? 0;
    const autoLiquidacao = !!(body?.autoLiquidacao ?? body?.autoliquidacao ?? body?.reverseCharge);

    const { linhas, subtotal, totalIva, totalSemDesconto, descontoValor, descontoP, total } =
      calcOrcamentoTotals({
        linhas: body?.linhas,
        descontoPercent,
        autoLiquidacao,
      });

    const orcamento = await Orcamento.create({
      obraId: body?.obraId || null,
      obraNomeSnapshot: body?.obraNomeSnapshot || undefined,
      titulo: body?.titulo || "Orçamento",
      clienteNome: body?.clienteNome || "",
      clienteContacto: body?.clienteContacto || "",
      notas: body?.notas || "",
      estado: body?.estado || "rascunho",

      // ✅ novos campos
      descontoPercent: descontoP,
      descontoValor,
      autoLiquidacao,

      // ✅ totals
      linhas,
      subtotal,
      totalIva,
      totalSemDesconto,
      total,
      criadoPor: body?.criadoPor || undefined,
    });

    return NextResponse.json(orcamento, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao criar orçamento" }, { status: 500 });
  }
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
