// src/app/api/auth/verify/route.js
import { NextResponse } from 'next/server';
import { authenticateToken } from '../../../../lib/auth';

export async function GET(request) {
  try {
    const authResult = await authenticateToken(request);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: authResult.user
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar token' },
      { status: 500 }
    );
  }
}
