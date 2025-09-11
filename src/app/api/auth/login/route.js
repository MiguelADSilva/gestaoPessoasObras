// src/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    // Ler body em JSON
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      );
    }

    const email = (body?.email || '').toLowerCase().trim();
    const password = body?.password || '';

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

    // DB
    const { db } = await connectToDatabase();

    // Procurar utilizador
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Verificar password
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    // Bloquear quem não está ativo
    const estadoRaw = (user.estado ?? (user.isActive ? 'ativo' : 'inativo')) || 'inativo';
    const estado = String(estadoRaw).toLowerCase();
    const isActive = user.isActive === true || estado === 'ativo';

    if (!isActive) {
      const msg =
        estado === 'pendente'
          ? 'Conta ainda por confirmar. Verifique o seu email e confirme a adesão.'
          : 'Conta inativa. Contacte o administrador.';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // Garantir segredo JWT
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: 'Configuração em falta: JWT_SECRET' },
        { status: 500 }
      );
    }

    // Gerar token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        tipo: user.tipo || 'cliente',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remover campos sensíveis
    const {
      password: _pwd,
      verifyToken: _vt,
      ...userSafe
    } = user;

    return NextResponse.json(
      {
        message: 'Login bem-sucedido',
        user: {
          ...userSafe,
          estado: estado || 'ativo',
          isActive: true,
        },
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
