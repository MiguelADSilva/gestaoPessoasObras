import { NextResponse } from 'next/server';
import { connectToDatabase } from '../lib/database';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();

    const { db } = await connectToDatabase();

    const query = search
      ? {
          $or: [
            { nome: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    // devolve só campos necessários
    const users = await db
      .collection('users')
      .find(query, { projection: { _id: 1, nome: 1, email: 1, tipo: 1 } })
      .limit(10)
      .toArray();

    const out = users.map(u => ({
      id: u._id?.toString(),
      nome: u.nome || u.email || 'Sem nome',
      email: u.email || '',
      tipo: u.tipo || '',
    }));

    return NextResponse.json(out);
  } catch (e) {
    console.error('Erro a listar users', e);
    return NextResponse.json({ error: 'Erro a listar utilizadores' }, { status: 500 });
  }
}