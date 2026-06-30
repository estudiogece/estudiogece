// Cloudflare Pages Function — recebe o briefing e envia por e-mail via Resend.
// Rota: POST /api/orcamento
// Requer a variável de ambiente RESEND_API_KEY (configurada no painel do Cloudflare Pages).

const DESTINO = "gcamara@estudiogece.com.br";
// Remetente precisa usar um domínio verificado no Resend.
const REMETENTE = "Briefing Estúdio Gecê <briefing@estudiogece.com.br>";

const CAMPOS = [
  ["nome", "Nome"],
  ["telefone", "WhatsApp"],
  ["email", "E-mail"],
  ["tipo", "Tipo de imóvel"],
  ["estado", "Estado do imóvel"],
  ["local", "Localização"],
  ["metragem", "Metragem"],
  ["ambientes", "Ambientes"],
  ["intervencao", "Nível de intervenção"],
  ["planta", "Possui planta"],
  ["urgencia", "Urgência"],
  ["orcamento", "Orçamento (execução)"],
  ["referencias", "Link de referências"],
  ["obs", "Observações"],
];

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: "Configuração de envio ausente." }, 500);
    }

    const ct = request.headers.get("content-type") || "";
    let data = {};
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) data[k] = v;
    }

    // Honeypot anti-spam: campo oculto "website" deve vir vazio.
    if (data.website) return json({ ok: true });

    if (!data.nome || !data.telefone) {
      return json({ ok: false, error: "Nome e telefone são obrigatórios." }, 400);
    }

    const linhasHtml = CAMPOS.map(
      ([k, label]) =>
        `<tr><td style="padding:6px 12px;color:#561624;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 12px">${esc(data[k]) || "—"}</td></tr>`
    ).join("");

    const linhasTxt = CAMPOS.map(
      ([k, label]) => `${label}: ${data[k] || "—"}`
    ).join("\n");

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:640px">
        <h2 style="color:#561624;margin:0 0 12px">Novo briefing — Estúdio Gecê</h2>
        <table style="border-collapse:collapse;font-size:14px;width:100%">${linhasHtml}</table>
      </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [DESTINO],
        reply_to: data.email ? [String(data.email)] : undefined,
        subject: `Briefing de projeto — ${String(data.nome).slice(0, 80)}`,
        html,
        text: `NOVO BRIEFING — ESTÚDIO GECÊ\n\n${linhasTxt}`,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return json({ ok: false, error: "Falha ao enviar o e-mail.", detail: err }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "Erro inesperado." }, 500);
  }
}
