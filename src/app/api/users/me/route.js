// src/app/api/users/me/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../lib/database';

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(request) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    let userId;
    try { userId = new ObjectId(payload.userId); }
    catch { return NextResponse.json({ error: 'userId inválido' }, { status: 400 }); }

    const { db } = await connectToDatabase();
    await db.command({ ping: 1 }); // opcional

    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { password: 0, emailVerificationToken: 0, resetPasswordToken: 0, resetPasswordExpires: 0 } }
    );

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
    console.error('Erro /api/users/me:', e?.message, e?.stack);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
