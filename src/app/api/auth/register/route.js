// src/app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export async function POST(request) {
  let client;
  try {
    // ====== ENV checks ======
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não definida');
    if (!process.env.MONGODB_DB) throw new Error('MONGODB_DB não definida');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definida');
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      throw new Error('EMAIL_USER/EMAIL_PASS não definidos');

    // ====== Body ======
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const nome = (body?.nome || '').trim();
    const email = (body?.email || '').trim().toLowerCase();
    const password = body?.password || '';
    const tipo = (body?.tipo || 'cliente').toLowerCase();
    const estadoReq = (body?.estado || 'pendente').toLowerCase(); // pendente por default
    const telefoneRaw = body?.telefone;

    // ====== Validações ======
    if (!nome || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e password são obrigatórios' },
        { status: 400 }
      );
    }
    // Aceita emails .com, .pt, .sapo
    const emailOk = /^[^\s@]+@[^\s@]+\.(com|pt|sapo)$/i.test(email);
    if (!emailOk) {
      return NextResponse.json(
        { error: 'Introduza um email válido que termine em .com, .pt ou .sapo' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Normalizar telefone (opcional) — nunca guardar "-"
    const normalizePhone = (v) => {
      if (v == null) return null;
      const s = String(v).trim();
      if (!s || s === '-' || s === '--' || s === '—') return null;
      return s;
    };
    const telefone = normalizePhone(telefoneRaw);

    // ====== DB ======
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    // Duplicado
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      await client.close();
      return NextResponse.json(
        { error: 'Já existe um utilizador com este email' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Gerar verifyToken (24h)
    const verifyToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // ==== Origin dinâmico (prod/local) ====
    const url = new URL(request.url);
    const originHeader = request.headers.get('origin');
    const computedOrigin = originHeader || process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
    const verifyUrl = `${computedOrigin}/api/auth/verify?token=${verifyToken}`;

    // Estado inicial: pendente (até confirmar por email)
    const estadoInicial =
      ['ativo', 'inativo', 'pendente'].includes(estadoReq) ? estadoReq : 'pendente';

    const userData = {
      nome,
      email,
      password: hashedPassword,
      tipo,                          // admin | gestor | tecnico | cliente
      estado: estadoInicial,         // 'pendente' até confirmar
      isActive: estadoInicial === 'ativo', // compat boolean
      telefone: telefone ?? null,
      verifyToken,
      lastVerificationSentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(userData);

    // ====== Enviar email ======
    const hasSmtpHost = !!process.env.EMAIL_HOST;
    let transporter;
    if (hasSmtpHost) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT || 465),
        secure: String(process.env.EMAIL_SECURE || 'true') === 'true',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
    } else {
      // fallback Gmail (requer App Password)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
    }

    await transporter.sendMail({
      from: `"Gestão de Obras" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Confirmação de conta',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;">
          <h2 style="margin:0 0 8px 0;">Bem-vindo, ${nome}!</h2>
          <p style="margin:0 0 16px 0;">Para concluir o registo, confirme a sua conta.</p>
          <p style="margin:0 0 16px 0;">Clique no botão abaixo para <b>ativar</b> a sua conta:</p>
          <p style="margin:24px 0;">
            <a href="${verifyUrl}" target="_blank"
               style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">
              Confirmar conta
            </a>
          </p>
          <p style="color:#555;margin:16px 0 0 0;">O link é válido por 24 horas.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
          <p style="font-size:12px;color:#777;margin:0;">Se não realizou este pedido, ignore este email.</p>
        </div>
      `,
    });

    await client.close();

    // Resposta (sem password/token)
    return NextResponse.json(
      {
        message: 'Utilizador criado com sucesso. Verifique o seu email para ativar a conta.',
        user: {
          _id: result.insertedId,
          nome: userData.nome,
          email: userData.email,
          tipo: userData.tipo,
          estado: userData.estado,
          telefone: userData.telefone,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) try { await client.close(); } catch {}
    console.error('💥 Erro no register:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + error.message },
      { status: 500 }
    );
  }
}
