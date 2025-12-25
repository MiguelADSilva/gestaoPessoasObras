export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/lib/database";

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const categoria = (searchParams.get("categoria") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (categoria) filter.categoria = categoria;

    if (q) {
      filter.$or = [
        { nome: { $regex: q, $options: "i" } },
        { referencia: { $regex: q, $options: "i" } },
        { marca: { $regex: q, $options: "i" } },
        { fornecedor: { $regex: q, $options: "i" } },
        { categoria: { $regex: q, $options: "i" } },
      ];
    }

    const col = db.collection("materials");

    const [items, total] = await Promise.all([
      col.find(filter).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao buscar materiais." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const nome = (body?.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });

    const doc = {
      nome,
      categoria: (body?.categoria || "geral").trim(),
      marca: (body?.marca || "").trim(),
      referencia: (body?.referencia || "").trim(),
      unidade: (body?.unidade || "un").trim(),
      iva: toNumber(body?.iva ?? 23, 23),

      precoCompra: toNumber(body?.precoCompra ?? 0, 0),
      precoVenda: toNumber(body?.precoVenda ?? 0, 0),
      stockAtual: toNumber(body?.stockAtual ?? 0, 0),

      fornecedor: (body?.fornecedor || "").trim(),
      notas: (body?.notas || "").trim(),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("materials").insertOne(doc);

    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao criar material." }, { status: 500 });
  }
}

/**
 * ✅ APAGAR TODOS
 * Chamada: DELETE /api/materiais?all=1
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all");

    if (all !== "1") {
      return NextResponse.json(
        { error: "Para apagar todos os materiais tens de chamar com ?all=1" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("materials").deleteMany({});

    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erro ao apagar todos os materiais." }, { status: 500 });
  }
}
