// src/app/api/materiais/route.js
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
    const q = (searchParams.get('q') || '').trim();
    const categoria = (searchParams.get('categoria') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (categoria) filter.categoria = categoria;

    if (q) {
      filter.$or = [
        { nome: { $regex: q, $options: 'i' } },
        { referencia: { $regex: q, $options: 'i' } },
        { marca: { $regex: q, $options: 'i' } },
        { fornecedor: { $regex: q, $options: 'i' } },
        { categoria: { $regex: q, $options: 'i' } },
      ];
    }

    const col = db.collection('materials');

    const [items, total] = await Promise.all([
      col.find(filter).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erro ao buscar materiais.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const nome = (body?.nome || '').trim();
    if (!nome) return NextResponse.json({ error: 'O nome é obrigatório.' }, { status: 400 });

    const doc = {
      nome,
      categoria: (body?.categoria || 'geral').trim(),
      marca: (body?.marca || '').trim(),
      referencia: (body?.referencia || '').trim(),
      unidade: (body?.unidade || 'un').trim(),
      iva: Number(body?.iva ?? 23),

      precoCompra: Number(body?.precoCompra ?? 0),
      precoVenda: Number(body?.precoVenda ?? 0),
      stockAtual: Number(body?.stockAtual ?? 0),

      fornecedor: (body?.fornecedor || '').trim(),
      notas: (body?.notas || '').trim(),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('materials').insertOne(doc);

    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erro ao criar material.' }, { status: 500 });
  }
}