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
      totalLinha: base,
    };
  });

  const totalSemDesconto = subtotal + totalIva;
  const dp = Math.max(0, toNum(descontoPercent, 0));
  const descontoValor = totalSemDesconto * (dp / 100);
  const total = Math.max(0, totalSemDesconto - descontoValor);

  return { linhas, subtotal, totalIva, descontoPercent: dp, descontoValor, total };
}

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const id = params?.id;
    const doc = await Orcamento.findById(id);
    if (!doc) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao carregar orçamento" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();

    const id = params?.id;
    const body = await req.json().catch(() => ({}));
    const rawLinhas = Array.isArray(body?.linhas) ? body.linhas : [];

    // ✅ desconto vindo do front
    const descontoPercent = body?.descontoPercent ?? 0;
    const calc = calcFromLinhas(rawLinhas, descontoPercent);

    const updated = await Orcamento.findByIdAndUpdate(
      id,
      {
        obraId: body?.obraId ?? null,
        obraNomeSnapshot: body?.obraNomeSnapshot ?? undefined,

        titulo: body?.titulo || "Orçamento",
        clienteNome: body?.clienteNome || "",
        clienteContacto: body?.clienteContacto || "",
        notas: body?.notas || "",

        descontoPercent: calc.descontoPercent,
        descontoValor: calc.descontoValor,

        linhas: calc.linhas,
        subtotal: calc.subtotal,
        totalIva: calc.totalIva,
        total: calc.total,

        estado: body?.estado || "rascunho",
      },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao atualizar orçamento" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const id = params?.id;

    const deleted = await Orcamento.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao eliminar orçamento" }, { status: 500 });
  }
}
