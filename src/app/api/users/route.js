// src/app/api/users/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../lib/database';

// GET - Listar utilizadores com filtros
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get('search') || '').trim();
    const tipo = (searchParams.get('tipo') || '').trim().toLowerCase();
    const estado = (searchParams.get('estado') || '').trim().toLowerCase();

    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 100;

    const { db } = await connectToDatabase();

    const query = {};

    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { telefone: { $regex: search, $options: 'i' } },
      ];
    }

    if (tipo) query.tipo = tipo;
    if (estado) query.estado = estado;

    const skip = (page - 1) * limit;

    const users = await db
      .collection('users')
      .find(query)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db.collection('users').countDocuments(query);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao listar utilizadores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao listar utilizadores' },
      { status: 500 }
    );
  }
}
