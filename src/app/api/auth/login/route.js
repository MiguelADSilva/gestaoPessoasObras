import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    // Verificar se o corpo da requisição é JSON válido
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password são obrigatórios' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email e password devem ser strings' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Buscar usuário
    const user = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        tipo: user.tipo || 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Retornar resposta sem password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Login bem-sucedido',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}