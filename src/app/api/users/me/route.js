export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../lib/database';
import User from '../../models/User';

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(request) {
  try {
    await connectToDatabase();

    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      console.error('JWT verify error:', e?.message);
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const user = await User.findById(payload.userId)
      .select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });

    return NextResponse.json({
      _id: user._id,
      nome: user.nome,
      email: user.email,
      tipo: user.tipo,
      estado: user.estado,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (e) {
    console.error('Erro /api/users/me:', e?.message);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
