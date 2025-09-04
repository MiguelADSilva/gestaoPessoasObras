// src/app/api/obras/[id]/anotacoes/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { ObjectId } from 'mongodb';

// GET - Obter todas as anotações de uma obra
export async function GET(request, context) {
  try {
    const { id } = context.params;
    
    const { db } = await connectToDatabase();
    const obra = await db.collection('obras').findOne(
      { _id: new ObjectId(id) },
      { projection: { anotacoes: 1 } }
    );

    if (!obra) {
      return NextResponse.json(
        { error: 'Obra não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(obra.anotacoes || []);

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Adicionar nova anotação à obra
export async function POST(request, context) {
  try {
    const { id } = context.params;
    const anotacaoData = await request.json();
    
    const { db } = await connectToDatabase();
    
    // Adicionar dados automáticos
    const anotacaoCompleta = {
      _id: new ObjectId(),
      ...anotacaoData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('obras').updateOne(
      { _id: new ObjectId(id) },
      { $push: { anotacoes: anotacaoCompleta } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Obra não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Anotação adicionada com sucesso',
        anotacao: anotacaoCompleta 
      },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}