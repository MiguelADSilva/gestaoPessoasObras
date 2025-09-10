// src/app/api/obras/[id]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/database';
import { ObjectId } from 'mongodb';

// Aceita _id como ObjectId OU string (para dados antigos)
function buildIdFilter(id) {
  const ors = [];
  if (ObjectId.isValid(id)) ors.push({ _id: new ObjectId(id) });
  ors.push({ _id: id });
  return ors.length === 1 ? ors[0] : { $or: ors };
}

// Normaliza doc (garante id string e estadoObra)
function normalize(doc) {
  if (!doc) return null;
  const id =
    typeof doc._id === 'string'
      ? doc._id
      : (doc._id && doc._id.toString ? doc._id.toString() : doc._id);
  return {
    ...doc,
    id,
    _id: id,
    estadoObra: doc.estadoObra || doc.estado || 'planeamento',
  };
}

// PUT - Atualizar obra (estável)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const estadoFinal = body.estadoObra || body.estado;

    const update = {
      ...body,
      ...(estadoFinal ? { estadoObra: estadoFinal, estado: estadoFinal } : {}),
      dataAtualizacao: new Date(),
    };

    delete update._id;
    delete update.id;

    // 1) Atualiza
    const result = await db.collection('obras').updateOne(buildIdFilter(id), { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    // 2) Lê novamente para devolver ao cliente
    const updated = await db.collection('obras').findOne(buildIdFilter(id));

    return NextResponse.json({ message: 'Obra atualizada', obra: normalize(updated) }, { status: 200 });
  } catch (error) {
    console.error('Erro ao atualizar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar obra' },
      { status: 500 }
    );
  }
}

// DELETE - Remover obra
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { db } = await connectToDatabase();

    const result = await db.collection('obras').deleteOne(buildIdFilter(id));

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Obra eliminada com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao eliminar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao eliminar obra' },
      { status: 500 }
    );
  }
}
