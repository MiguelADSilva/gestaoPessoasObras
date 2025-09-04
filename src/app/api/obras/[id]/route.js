// src/app/api/obras/[id]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from './../../../../lib/database';
import { ObjectId } from 'mongodb';

// GET - Obter obra por ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const obra = await db.collection('obras').findOne({
      _id: new ObjectId(id)
    });

    if (!obra) {
      return NextResponse.json(
        { error: 'Obra não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(obra);

  } catch (error) {
    console.error('Erro ao buscar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar obra
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    const { db } = await connectToDatabase();

    // Verificar se obra existe
    const obraExistente = await db.collection('obras').findOne({
      _id: new ObjectId(id)
    });

    if (!obraExistente) {
      return NextResponse.json(
        { error: 'Obra não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar obra
    const result = await db.collection('obras').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          dataAtualizacao: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Nenhuma alteração realizada' },
        { status: 400 }
      );
    }

    // Retornar obra atualizada
    const obraAtualizada = await db.collection('obras').findOne({
      _id: new ObjectId(id)
    });

    return NextResponse.json({
      message: 'Obra atualizada com sucesso',
      obra: obraAtualizada
    });

  } catch (error) {
    console.error('Erro ao atualizar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Apagar obra
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Verificar se obra existe
    const obraExistente = await db.collection('obras').findOne({
      _id: new ObjectId(id)
    });

    if (!obraExistente) {
      return NextResponse.json(
        { error: 'Obra não encontrada' },
        { status: 404 }
      );
    }

    // Apagar obra
    const result = await db.collection('obras').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Falha ao apagar obra' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Obra apagada com sucesso',
      id: id
    });

  } catch (error) {
    console.error('Erro ao apagar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}