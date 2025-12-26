import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(2)} €`;
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function POST(req, { params }) {
  try {
    const { id } = params || {};
    const body = await req.json().catch(() => ({}));
    const to = (body?.to || '').trim();

    if (!id) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    if (!to) return NextResponse.json({ error: 'Email de destino em falta.' }, { status: 400 });

    // ✅ Buscar orçamento via rota existente
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    const getRes = await fetch(`${baseUrl}/api/orcamentos/${id}`, { cache: 'no-store' });
    const orc = await getRes.json().catch(() => null);

    if (!getRes.ok || !orc) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    }

    const titulo = orc?.titulo || 'Orçamento';
    const cliente = orc?.clienteNome || '—';
    const obra = orc?.obraNomeSnapshot || (orc?.obraId ? String(orc.obraId) : '—');
    const subtotalNum = Number(orc?.subtotal ?? orc?.totals?.subtotal ?? 0);
    const ivaNum = Number(orc?.totalIva ?? orc?.totals?.iva ?? 0);
    const totalNum = Number(orc?.total ?? orc?.totals?.total ?? 0);

    const subtotal = money(subtotalNum);
    const iva = money(ivaNum);
    const total = money(totalNum);

    // ✅ Pagamentos (com base no TOTAL)
    const p50 = money(totalNum * 0.5);
    const p30 = money(totalNum * 0.3);
    const p20 = money(totalNum * 0.2);

    const linhas = Array.isArray(orc?.linhas) ? orc.linhas : [];

    // ✅ Corrige tabela: inclui Qtd + Preço
    const linhasHtml = linhas.length
      ? `
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #ddd;padding:8px">Descrição</th>
              <th style="text-align:right;border-bottom:1px solid #ddd;padding:8px">Preço</th>
            </tr>
          </thead>
          <tbody>
            ${linhas
              .map((l) => {
                const desc = escapeHtml(l?.descricao || '—');
                const preco = money(l?.precoUnitario ?? l?.precoUnit ?? 0);

                return `
                  <tr>
                    <td style="border-bottom:1px solid #f0f0f0;padding:8px">${desc}</td>
                    <td style="border-bottom:1px solid #f0f0f0;padding:8px;text-align:right">${preco}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      `
      : `<div style="margin-top:12px;color:#666">Sem linhas.</div>`;

    const nowPt = new Date().toLocaleString('pt-PT');

    // ✅ HTML com "IMPORTANTE", validade 15 dias e condições de pagamento
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:16px">
        
        <!-- IMPORTANTE -->
        <div style="background:#fff3cd;border:1px solid #ffeeba;border-radius:12px;padding:14px;margin-bottom:14px">
          <div style="font-size:26px;font-weight:800;color:#7a5a00;letter-spacing:0.5px">
            IMPORTANTE
          </div>
          <div style="margin-top:8px;color:#6b5e2e;font-size:14px">
            <strong>Validade do orçamento:</strong> 15 dias
          </div>
        </div>

        <h2 style="margin:0 0 8px 0">${escapeHtml(titulo)}</h2>
        <div style="color:#666;margin-bottom:14px">Orçamento enviado através da plataforma.</div>

        <div style="border:1px solid #eee;border-radius:10px;padding:12px">
          <div><strong>Cliente:</strong> ${escapeHtml(cliente)}</div>
          <div><strong>Obra:</strong> ${escapeHtml(obra)}</div>

          <div style="margin-top:10px">
            <strong>Subtotal:</strong> ${subtotal}<br/>
            <strong>IVA:</strong> ${iva}<br/>
            <strong>Total:</strong> ${total}
          </div>
        </div>

        <!-- Pagamento -->
        <div style="margin-top:14px;border:1px solid #e8e8e8;border-radius:10px;padding:12px">
          <div style="font-weight:700;margin-bottom:6px">Informações de pagamento</div>

          <div style="margin-top:8px">
            <div style="margin-bottom:8px">
              <strong>50% de adjudicação:</strong> ${p50}
            </div>

            <div style="margin-bottom:8px">
              <strong>30% quando o serviço vai a meio:</strong> ${p30}<br/>
              <span style="color:#666;font-size:13px">
                Ex.(quando é uma obra, este valor só é pago quando estiver tubo — caixas e quadros — ao sítio)
              </span>
            </div>

            <div style="margin-bottom:0px">
              <strong>20% quando a obra estiver terminada:</strong> ${p20}
            </div>
          </div>
        </div>

        ${linhasHtml}

        ${
          orc?.notas
            ? `<div style="margin-top:12px"><strong>Notas:</strong><br/>${escapeHtml(orc.notas).replaceAll(
                '\n',
                '<br/>'
              )}</div>`
            : ''
        }

        <div style="margin-top:18px;color:#888;font-size:12px">
          Enviado em ${nowPt}
        </div>
      </div>
    `;

    // ✅ Transport (Nodemailer)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || 'false') === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fromName = process.env.EMAIL_FROM_NAME || 'Orçamentos';
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `Orçamento: ${titulo}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Erro ao enviar email.' }, { status: 500 });
  }
}
