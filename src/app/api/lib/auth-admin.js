// src/lib/auth-admin.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '../models/User';

export async function authenticateAdmin(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token de autenticação não fornecido' };
    }

    const token = authHeader.substring(7);
    
    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário para verificar se é admin
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return { error: 'Utilizador não encontrado' };
    }

    if (user.estado !== 'ativo') {
      return { error: 'Conta inativa' };
    }

    if (user.tipo !== 'admin') {
      return { error: 'Acesso não autorizado. Apenas administradores.' };
    }

    return { user };

  } catch (error) {
    return { error: 'Token inválido ou expirado' };
  }
}