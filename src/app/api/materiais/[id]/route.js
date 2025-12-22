// src/app/api/materiais/[id]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/api/lib/database";

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function PUT(req, { params }) {
  try {
    const id = params?.id;
    const _id = parseId(id);
    if (!_id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { db } = await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const updates = {};
    if (body?.nome != null) updates.nome = String(body.nome).trim();
    if (body?.categoria != null) updates.categoria = String(body.categoria).trim();
    if (body?.marca != null) updates.marca = String(body.marca).trim();
    if (body?.referencia != null) updates.referencia = String(body.referencia).trim();
    if (body?.unidade != null) updates.unidade = String(body.unidade).trim();
    if (body?.iva != null) updates.iva = toNumber(body.iva, 23);
    if (body?.precoCompra != null) updates.precoCompra = toNumber(body.precoCompra, 0);
    if (body?.precoVenda != null) updates.precoVenda = toNumber(body.precoVenda, 0);
    if (body?.stockAtual != null) updates.stockAtual = toNumber(body.stockAtual, 0);
    if (body?.fornecedor != null) updates.fornecedor = String(body.fornecedor).trim();
    if (body?.notas != null) updates.notas = String(body.notas).trim();

    if (updates.nome === "") {
      return NextResponse.json({ error: "O nome é obrigatório." }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const col = db.collection("materials");
    const result = await col.findOneAndUpdate(
      { _id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result?.value) {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    return NextResponse.json(result.value);
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao atualizar material." },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const id = params?.id;
    const _id = parseId(id);
    if (!_id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const { db } = await connectToDatabase();
    const col = db.collection("materials");

    const result = await col.deleteOne({ _id });
    if (!result?.deletedCount) {
      return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao eliminar material." },
      { status: 500 }
    );
  }
}
