export const runtime = "nodejs";

import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function GET() {
  const cfg = {
    host: process.env.EMAIL_HOST || "",
    port: Number(process.env.EMAIL_PORT || 0),
    secure: String(process.env.EMAIL_SECURE || "false") === "true",
    user: process.env.EMAIL_USER || "",
    passLen: String(process.env.EMAIL_PASS || "").length,
    passFirst2: String(process.env.EMAIL_PASS || "").slice(0, 2),
    passLast2: String(process.env.EMAIL_PASS || "").slice(-2),
  };

  try {
    const missing = [];
    for (const k of ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"]) {
      if (!process.env[k]) missing.push(k);
    }
    if (missing.length) {
      return NextResponse.json({ ok: false, error: "Env vars em falta", missing, cfg }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: process.env.EMAIL_PASS },
    });

    await transporter.verify();

    return NextResponse.json({ ok: true, cfg });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        cfg,
        error: e?.message || "Falhou verify()",
        debug: {
          name: e?.name,
          code: e?.code,
          responseCode: e?.responseCode,
          response: e?.response,
        },
      },
      { status: 500 }
    );
  }
}
