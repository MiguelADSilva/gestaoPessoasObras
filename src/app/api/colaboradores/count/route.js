// src/app/api/colaboradores/count/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../lib/database';

function getBearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(request) {
  try {
    const token = getBearerToken(request);
    if (!token) return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });

    try { jwt.verify(token, process.env.JWT_SECRET); }
    catch { return NextResponse.json({ error: 'Token inválido' }, { status: 401 }); }

    const { db } = await connectToDatabase();
    await db.command({ ping: 1 }); // opcional

    const count = await db.collection('users').countDocuments({
      tipo: { $in: ['admin', 'gestor', 'tecnico'] },
      estado: 'ativo',
    });

    return NextResponse.json({ count });
  } catch (e) {
    console.error('Erro /api/colaboradores/count:', e?.message, e?.stack);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
