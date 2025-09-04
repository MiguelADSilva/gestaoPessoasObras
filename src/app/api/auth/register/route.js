// src/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  let client;
  
  try {
    // 1. Verificar se temos variáveis de ambiente
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI não está definida');
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definida');
    }

    // 2. Obter dados do request
    const { nome, email, password, tipo = 'cliente' } = await request.json();
    
    console.log('📝 Tentativa de registro:', { nome, email, tipo });

    // 3. Validações
    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e password são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // 4. Conectar à base de dados
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('gestaoobras');
    
    console.log('✅ Conectado à base de dados');

    // 5. Verificar se usuário já existe
    const existingUser = await db.collection('users').findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      await client.close();
      return NextResponse.json(
        { error: 'Já existe um utilizador com este email' },
        { status: 409 }
      );
    }

    // 6. Criptografar password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Password criptografada');

    // 7. Criar usuário
    const userData = {
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      tipo: tipo,
      estado: 'ativo',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(userData);
    console.log('👤 Utilizador inserido com ID:', result.insertedId);

    // 8. Gerar token JWT
    const token = jwt.sign(
      { 
        userId: result.insertedId.toString(),
        email: userData.email,
        tipo: userData.tipo
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 9. Fechar conexão
    await client.close();

    // 10. Retornar resposta
    return NextResponse.json(
      { 
        message: 'Utilizador criado com sucesso',
        user: {
          _id: result.insertedId,
          nome: userData.nome,
          email: userData.email,
          tipo: userData.tipo,
          estado: userData.estado
        },
        token 
      },
      { status: 201 }
    );

  } catch (error) {
    // Fechar conexão em caso de erro
    if (client) {
      await client.close().catch(console.error);
    }
    
    console.error('💥 Erro no register:', error.message);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message },
      { status: 500 }
    );
  }
}