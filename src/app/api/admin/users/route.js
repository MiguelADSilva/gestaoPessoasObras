
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../lib/auth-admin';
import User from '../../models/User';

export async function GET(request) {
  try {
    // Verificar se é admin
    const authResult = await authenticateAdmin(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const tipo = searchParams.get('tipo') || '';
    const estado = searchParams.get('estado') || '';

    // Construir query de pesquisa
    let query = {};
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { empresa: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tipo) query.tipo = tipo;
    if (estado) query.estado = estado;

    // Paginação
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
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
    console.error('Erro ao listar utilizadores:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}