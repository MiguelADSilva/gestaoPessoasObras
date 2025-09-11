// src/app/api/auth/resend-verification/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

export async function POST(request) {
  let client;
  try {
    // ====== ENV check ======
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não definida');
    if (!process.env.MONGODB_DB) throw new Error('MONGODB_DB não definida');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não definida');
    if (!process.env.NEXT_PUBLIC_APP_URL) throw new Error('NEXT_PUBLIC_APP_URL não definida');
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      throw new Error('EMAIL_USER/EMAIL_PASS não definidos');

    // ====== Body ======
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const email = (body?.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // ====== DB ======
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);

    const user = await db.collection('users').findOne({ email });
    if (!user) {
      await client.close();
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    const estado = String(user.estado || (user.isActive ? 'ativo' : 'inativo')).toLowerCase();
    if (estado === 'ativo' || user.isActive === true) {
      await client.close();
      return NextResponse.json({ error: 'A conta já está ativa' }, { status: 400 });
    }

    // Cooldown anti-spam
    const now = Date.now();
    const last = user.lastVerificationSentAt ? new Date(user.lastVerificationSentAt).getTime() : 0;
    if (last && now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      await client.close();
      return NextResponse.json(
        { error: `Aguarde ${waitSec}s antes de pedir novo email de verificação.` },
        { status: 429 }
      );
    }

    // (Re)gerar token 24h
    const verifyToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${verifyToken}`;

    // Guardar token e carimbo tempo
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          verifyToken,
          lastVerificationSentAt: new Date(),
          updatedAt: new Date(),
          // garantir que fica pendente enquanto não confirma
          estado: estado === 'pendente' ? 'pendente' : 'pendente',
          isActive: false,
        },
      }
    );

    // ====== Email ======
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
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
    }

    await transporter.sendMail({
      from: `"Gestão de Obras" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reenvio de confirmação de conta',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;">
          <h2 style="margin:0 0 8px 0;">Confirmar a sua conta</h2>
          <p style="margin:0 0 16px 0;">Recebemos um pedido para confirmar a sua conta.</p>
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
    return NextResponse.json({ message: 'Email de verificação reenviado.' }, { status: 200 });
  } catch (err) {
    if (client) try { await client.close(); } catch {}
    console.error('Erro no resend-verification:', err);
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 });
  }
}
