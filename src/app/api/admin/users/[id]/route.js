// src/app/api/admin/users/[id]/route.js
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '../../../lib/auth-admin';
import User from '../../../models/User';

export async function GET(request, { params }) {
  try {
    const authResult = await authenticateAdmin(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = params;

    const user = await User.findById(id)
      .select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error('Erro ao buscar utilizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const authResult = await authenticateAdmin(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = params;
    const updateData = await request.json();

    // Não permitir alterar password por esta rota
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Utilizador atualizado com sucesso',
      user
    });

  } catch (error) {
    console.error('Erro ao atualizar utilizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await authenticateAdmin(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { id } = params;

    // Verificar se é o próprio admin a tentar apagar-se
    if (id === authResult.user._id.toString()) {
      return NextResponse.json(
        { error: 'Não pode apagar a sua própria conta' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilizador não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Utilizador apagado com sucesso',
      id: user._id
    });

  } catch (error) {
    console.error('Erro ao apagar utilizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await authenticateAdmin(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userData = await request.json();

    // Validações
    if (!userData.nome || !userData.email || !userData.password) {
      return NextResponse.json(
        { error: 'Nome, email e password são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se usuário já existe
    const existingUser = await User.findOne({
      email: userData.email.toLowerCase()
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um utilizador com este email' },
        { status: 409 }
      );
    }

    // Criar novo usuário (a password será automaticamente criptografada pelo Mongoose)
    const newUser = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      estado: userData.estado || 'ativo'
    });

    await newUser.save();

    return NextResponse.json(
      { 
        message: 'Utilizador criado com sucesso',
        user: newUser.toJSON()
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro ao criar utilizador:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}