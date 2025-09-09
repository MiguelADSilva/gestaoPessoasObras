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

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      console.error('JWT verify error:', e?.message);
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const count = await User.countDocuments({
      tipo: { $in: ['admin', 'gestor', 'tecnico'] },
      estado: 'ativo',
    });

    return NextResponse.json({ count });
  } catch (e) {
    console.error('Erro /api/colaboradores/count:', e?.message);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
