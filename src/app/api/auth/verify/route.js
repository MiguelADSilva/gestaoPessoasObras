// src/app/api/auth/verify/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../lib/auth';

/**
 * Suporta dois modos:
 * 1) Verificação por link de email:   GET /api/auth/verify?token=XXXX
 *    - Decodifica o token
 *    - Marca o utilizador como { estado: 'ativo', isActive: true } e apaga verifyToken
 *
 * 2) Verificação de sessão (legado):  GET /api/auth/verify  com Authorization: Bearer <JWT>
 *    - Usa authenticateToken e devolve { valid: true, user }
 */

export async function GET(request) {
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');

  // --- MODO 1: verificação por email (com query ?token=...) ---
  if (tokenParam) {
    let client;
    try {
      if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não definida');
      if (!process.env.MONGODB_DB) throw new Error('MONGODB_DB não definida');
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definida');

      // valida e decodifica o token de verificação (24h)
      let decoded;
      try {
        decoded = jwt.verify(tokenParam, process.env.JWT_SECRET);
      } catch (e) {
        return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 });
      }

      const email = (decoded?.email || '').toLowerCase().trim();
      if (!email) {
        return NextResponse.json({ error: 'Token sem email válido' }, { status: 400 });
      }

      // liga à BD
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db(process.env.MONGODB_DB);

      // encontra o utilizador com esse verifyToken
      const user = await db.collection('users').findOne({ email, verifyToken: tokenParam });
      if (!user) {
        await client.close();
        return NextResponse.json({ error: 'Utilizador não encontrado ou já verificado' }, { status: 404 });
      }

      // ativa a conta
      await db.collection('users').updateOne(
        { email },
        {
          $set: {
            estado: 'ativo',
            isActive: true,
            updatedAt: new Date(),
          },
          $unset: { verifyToken: '' },
        }
      );

      await client.close();

      // Podes trocar por um redirect para uma página de sucesso, se quiseres:
      // return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/verificacao-sucesso`);
      return NextResponse.json({ message: 'Conta confirmada com sucesso!' }, { status: 200 });
    } catch (error) {
      if (client) await client.close().catch(() => {});
      console.error('Erro na verificação por email:', error);
      return NextResponse.json({ error: 'Erro interno: ' + error.message }, { status: 500 });
    }
  }

  // --- MODO 2: verificação de sessão (legado, usa Authorization Bearer) ---
  try {
    const authResult = await authenticateToken(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    return NextResponse.json({ valid: true, user: authResult.user }, { status: 200 });
  } catch (error) {
    console.error('Erro ao verificar token da sessão:', error);
    return NextResponse.json({ error: 'Erro ao verificar token' }, { status: 500 });
  }
}
