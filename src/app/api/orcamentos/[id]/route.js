import { NextResponse } from 'next/server';
import Orcamento from '@/models/Orcamento';
import dbConnect from '@/lib/mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const item = await Orcamento.findById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: 'Erro ao obter orçamento' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const body = await req.json();

    const updated = await Orcamento.findByIdAndUpdate(params.id, body, {
      new: true,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    const id = params?.id;

    if (!id) {
      return NextResponse.json({ error: 'ID em falta.' }, { status: 400 });
    }

    const deleted = await Orcamento.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Erro ao eliminar orçamento.' },
      { status: 500 }
    );
  }
}
