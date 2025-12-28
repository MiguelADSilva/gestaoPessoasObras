export const runtime = "nodejs";

import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)} €`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBaseUrl(req) {
  const envUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (envUrl) return envUrl;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req, { params }) {
  try {
    const id = params?.id;
    const body = await req.json().catch(() => ({}));
    const to = String(body?.to || "").trim();

    if (!id) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    if (!to) return NextResponse.json({ error: "Email de destino em falta." }, { status: 400 });

    const baseUrl = getBaseUrl(req);
    const getRes = await fetch(`${baseUrl}/api/orcamentos/${id}`, { cache: "no-store" });
    const orc = await getRes.json().catch(() => null);

    if (!getRes.ok || !orc) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    const titulo = orc?.titulo || "Orçamento";
    const cliente = orc?.clienteNome || "—";
    const obra = orc?.obraNomeSnapshot || "—";

    const subtotalNum = Number(orc?.subtotal ?? 0);
    const descontoNum = Number(orc?.desconto ?? 0);
    const ivaNum = Number(orc?.totalIva ?? 0);
    const totalNum = Number(orc?.total ?? 0);

    const subtotal = money(subtotalNum);
    const desconto = money(descontoNum);
    const iva = money(ivaNum);
    const total = money(totalNum);

    const p50 = money(totalNum * 0.5);
    const p30 = money(totalNum * 0.3);
    const p20 = money(totalNum * 0.2);

    const linhas = Array.isArray(orc?.linhas) ? orc.linhas : [];

    const materiaisHtml = linhas.length
      ? `
        <table style="width:100%;border-collapse:collapse;margin-top:14px">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">
                Materiais incluídos
              </th>
            </tr>
          </thead>
          <tbody>
            ${linhas
              .map((l) => {
                const desc = escapeHtml(l?.descricao || "—");
                return `
                  <tr>
                    <td style="border-bottom:1px solid #f0f0f0;padding:8px">
                      ${desc}
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      `
      : `<div style="margin-top:12px;color:#666">Sem materiais listados.</div>`;

    const nowPt = new Date().toLocaleString("pt-PT");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:16px">

        <div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:12px;padding:14px;margin-bottom:14px">
          <div style="font-size:26px;font-weight:800;color:#7a5a00">
            IMPORTANTE
          </div>
          <div style="margin-top:8px;color:#6b5e2e;font-size:14px">
            <strong>Validade do orçamento:</strong> 15 dias
          </div>
        </div>

        <h2>${escapeHtml(titulo)}</h2>

        <div style="border:1px solid #eee;border-radius:10px;padding:12px">
          <div><strong>Cliente:</strong> ${escapeHtml(cliente)}</div>
          <div><strong>Obra:</strong> ${escapeHtml(obra)}</div>

          <div style="margin-top:10px">
            <strong>Subtotal:</strong> ${subtotal}<br/>
            <strong>Desconto:</strong> ${desconto}<br/>
            <strong>IVA:</strong> ${iva}<br/>
            <strong>Total final:</strong> ${total}
          </div>
        </div>

        <div style="margin-top:14px;border:1px solid #e8e8e8;border-radius:10px;padding:12px">
          <div style="font-weight:700;margin-bottom:6px">Condições de pagamento</div>
          <div><strong>50% adjudicação:</strong> ${p50}</div>
          <div><strong>30% a meio da obra:</strong> ${p30}</div>
          <div><strong>20% no final:</strong> ${p20}</div>
        </div>

        ${materiaisHtml}

        ${
          orc?.notas
            ? `<div style="margin-top:12px"><strong>Notas:</strong><br/>${escapeHtml(orc.notas).replaceAll(
                "\n",
                "<br/>"
              )}</div>`
            : ""
        }

        <div style="margin-top:18px;color:#888;font-size:12px">
          Enviado em ${nowPt}
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || "false") === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || "Orçamentos"} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: `Orçamento: ${titulo}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Erro ao enviar email." },
      { status: 500 }
    );
  }
}
