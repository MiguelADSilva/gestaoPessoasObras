export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/database';

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // teste leve e sem permissões especiais
    const ping = await db.command({ ping: 1 });

    // opcional: conta users só para validar acesso
    const usersCount = await db.collection('users').countDocuments({});

    return NextResponse.json({
      ok: true,
      ping,
      usersCount,
    });
  } catch (e) {
    // devolve o erro para diagnóstico (temporário)
    return NextResponse.json({
      ok: false,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
    }, { status: 500 });
  }
}