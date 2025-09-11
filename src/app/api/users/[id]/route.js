import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/database';
import { ObjectId } from 'mongodb';

// DELETE - Remover utilizador
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Utilizador eliminado com sucesso' });
  } catch (error) {
    console.error('Erro ao eliminar utilizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao eliminar utilizador' },
      { status: 500 }
    );
  }
}
