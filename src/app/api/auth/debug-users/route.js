import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // ✅ Bloqueia em produção
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ Em DEV podes devolver informação de debug (mas NUNCA segredos)
  return NextResponse.json({
    ok: true,
    env: {
      // ⚠️ Não devolver valores de segredos. Só booleanos.
      EMAIL_USER_SET: !!process.env.EMAIL_USER,
      EMAIL_PASS_SET: !!process.env.EMAIL_PASS,
      EMAIL_HOST_SET: !!process.env.EMAIL_HOST,
    },
  });
}
