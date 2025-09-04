// src/app/api/obras/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { ObjectId } from 'mongodb';

// GET - Obter todas as obras (com pesquisa opcional)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const estado = searchParams.get('estado') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    const { db } = await connectToDatabase();
    
    // Construir query de pesquisa
    let query = {};
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { localizacao: { $regex: search, $options: 'i' } },
        { responsavel: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (estado) {
      query.estado = estado;
    }

    // Paginação
    const skip = (page - 1) * limit;
    
    const obras = await db.collection('obras')
      .find(query)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Contar total para paginação
    const total = await db.collection('obras').countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      obras,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Erro ao buscar obras:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar obras' },
      { status: 500 }
    );
  }
}

// POST - Criar nova obra
export async function POST(request) {
  try {
    const obraData = await request.json();
    
    // Validação básica
    if (!obraData.nome || !obraData.localizacao) {
      return NextResponse.json(
        { error: 'Nome e localização são obrigatórios' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Verificar se obra já existe
    const obraExistente = await db.collection('obras').findOne({
      nome: obraData.nome,
      localizacao: obraData.localizacao
    });

    if (obraExistente) {
      return NextResponse.json(
        { error: 'Já existe uma obra com este nome e localização' },
        { status: 409 }
      );
    }

    // Adicionar dados automáticos
    const obraCompleta = {
      ...obraData,
      estado: obraData.estado || 'planeamento',
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    };

    const result = await db.collection('obras').insertOne(obraCompleta);
    
    // Retornar a obra criada
    const obraCriada = await db.collection('obras').findOne({
      _id: result.insertedId
    });

    return NextResponse.json(
      { 
        message: 'Obra criada com sucesso', 
        obra: obraCriada 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro ao criar obra:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar obra' },
      { status: 500 }
    );
  }
}