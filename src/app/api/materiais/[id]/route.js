// src/app/api/materiais/[id]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/api/lib/database"; // mantém o teu caminho atual

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function findMaterial(db, id) {
  const oid = toObjectId(id);
  // 1) tenta ObjectId
  if (oid) {
    const doc = await db.collection("materials").findOne({ _id: oid });
    if (doc) return doc;
  }
  // 2) fallback: _id como string
  return await db.collection("materials").findOne({ _id: String(id) });
}

async function updateMaterial(db, id, update) {
  const oid = toObjectId(id);

  // 1) tenta atualizar por ObjectId
  if (oid) {
    const r1 = await db.collection("materials").findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { returnDocument: "after" }
    );
    if (r1?.value) return r1.value;
  }

  // 2) fallback: _id como string
  const r2 = await db.collection("materials").findOneAndUpdate(
    { _id: String(id) },
    { $set: update },
    { returnDocument: "after" }
  );
  return r2?.value || null;
}

async function deleteMaterial(db, id) {
  const oid = toObjectId(id);

  // 1) tenta apagar por ObjectId
  if (oid) {
    const r1 = await db.collection("materials").deleteOne({ _id: oid });
    if (r1?.deletedCount) return true;
  }

  // 2) fallback: _id como string
  const r2 = await db.collection("materials").deleteOne({ _id: String(id) });
  return !!r2?.deletedCount;
}

export async function GET(req, { params }) {
  try {
    const { db } = await connectToDatabase();
    const id = params?.id;

    if (!id) return NextResponse.json({ error: "ID em falta." }, { status: 400 });

    const item = await findMaterial(db, id);
    if (!item) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });

    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao buscar material." },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { db } = await connectToDatabase();
    const id = params?.id;

    if (!id) return NextResponse.json({ error: "ID em falta." }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const nome = (body?.nome || "").trim();
    if (!nome) return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });

    const update = {
      nome,
      categoria: (body?.categoria || "geral").trim(),
      marca: (body?.marca || "").trim(),
      referencia: (body?.referencia || "").trim(),
      unidade: (body?.unidade || "un").trim(),
      iva: toNumber(body?.iva, 23),

      precoCompra: toNumber(body?.precoCompra, 0),
      precoVenda: toNumber(body?.precoVenda, 0),
      stockAtual: toNumber(body?.stockAtual, 0),

      fornecedor: (body?.fornecedor || "").trim(),
      notas: (body?.notas || "").trim(),

      updatedAt: new Date(),
    };

    const updated = await updateMaterial(db, id, update);
    if (!updated) {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao atualizar material." },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { db } = await connectToDatabase();
    const id = params?.id;

    if (!id) return NextResponse.json({ error: "ID em falta." }, { status: 400 });

    const ok = await deleteMaterial(db, id);
    if (!ok) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao eliminar material." },
      { status: 500 }
    );
  }
}
