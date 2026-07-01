// Worker do Estúdio Gecê — serve o site estático (binding ASSETS) e trata a API.
// Rota de API: POST /api/orcamento -> envia o briefing por e-mail via Resend.
// Requer o secret RESEND_API_KEY (configurado no painel do Worker).

const DESTINO = "falecom@estudiogece.com.br";
// Remetente precisa usar um domínio verificado no Resend.
const REMETENTE = "Briefing Estúdio Gecê <briefing@estudiogece.com.br>";

// Seções fixas (na ordem). A Seção 4 (programa de necessidades) é condicional.
const SECOES = [
  ["1. Identificação do solicitante", [
    ["nome", "Nome completo"],
    ["decisor", "É quem contrata/decide?"],
    ["email", "E-mail"],
    ["telefone", "Telefone / WhatsApp"],
    ["pf_pj", "Pessoa física / jurídica"],
    ["documento", "CPF / CNPJ"],
    ["cidade_uf", "Cidade / UF"],
    ["origem", "Como conheceu o Estúdio"],
  ]],
  ["2. Natureza do projeto", [
    ["tipo_imovel", "Tipo de imóvel"],
    ["perfil", "O projeto é"],
    ["servicos", "Serviços que busca"],
    ["obra_tipo", "Construção nova / intervenção"],
  ]],
  ["3. Dados do imóvel", [
    ["endereco", "Endereço / localização"],
    ["situacao_imovel", "Situação do imóvel"],
    ["area_terreno", "Área do terreno (m²)"],
    ["area_construida", "Área construída (m²)"],
    ["estagio", "Estágio atual"],
    ["regularizado", "Regularizado?"],
    ["possui_planta", "Possui projeto/planta?"],
    ["condominio", "Condomínio com normas?"],
    ["pavimentos", "Pavimentos (atuais/desejados)"],
  ]],
];

const SECAO_RES = ["4. Programa de necessidades — Residencial", [
  ["res_moradores", "Quem vai morar (adultos/crianças/idosos)"],
  ["res_pets", "Pets"],
  ["res_quartos", "Quartos (e suítes)"],
  ["res_ambientes", "Ambientes desejados"],
  ["res_acessibilidade", "Acessibilidade / mobilidade"],
  ["res_incomodo", "O que mais incomoda hoje"],
  ["res_inegociavel", "Inegociável no projeto"],
  ["res_estilo", "Estilo / referências"],
]];

const SECAO_COM = ["4. Programa de necessidades — Comercial", [
  ["com_ramo", "Ramo do negócio"],
  ["com_funcionarios", "Funcionários / postos"],
  ["com_publico", "Atende público presencialmente?"],
  ["com_ambientes", "Ambientes necessários"],
  ["com_marca", "Comunicar a marca / branding"],
  ["com_ponto", "Ponto definido?"],
  ["com_inegociavel", "Inegociável no projeto"],
  ["com_referencias", "Referências"],
]];

const SECOES_FIM = [
  ["5. Prazo, investimento e expectativas", [
    ["inicio_projeto", "Início do projeto"],
    ["inicio_obra", "Início da obra"],
    ["verba", "Verba prevista para o projeto"],
    ["investimento", "Faixa de investimento (obra)"],
    ["execucao", "Executar de uma vez / etapas"],
    ["ja_arquiteto", "Já trabalhou com arquiteto"],
    ["urgencia", "Nível de urgência"],
  ]],
  ["6. Finalização", [
    ["algo_mais", "Algo mais importante"],
    ["disponibilidade", "Disponibilidade para reunião"],
  ]],
];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

function fmt(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return v == null ? "" : String(v).trim();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function montarSecoes(data) {
  const lista = SECOES.slice();
  if (data.perfil === "Comercial") lista.push(SECAO_COM);
  else lista.push(SECAO_RES); // Residencial (padrão)
  return lista.concat(SECOES_FIM);
}

async function handleOrcamento(request, env) {
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
      for (const k of fd.keys()) {
        const all = fd.getAll(k);
        data[k] = all.length > 1 ? all : all[0];
      }
    }

    // Honeypot anti-spam: campo oculto "website" deve vir vazio.
    if (data.website) return json({ ok: true });

    if (!fmt(data.nome) || !fmt(data.telefone) || !fmt(data.email)) {
      return json({ ok: false, error: "Nome, e-mail e telefone são obrigatórios." }, 400);
    }

    const secoes = montarSecoes(data);

    let html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:660px">
      <h2 style="color:#561624;margin:0 0 4px">Novo briefing — Estúdio Gecê</h2>
      <p style="color:#666;margin:0 0 18px">Projeto ${esc(fmt(data.perfil) || "—")}</p>`;
    const txt = ["NOVO BRIEFING — ESTÚDIO GECÊ", ""];

    for (const [titulo, campos] of secoes) {
      const linhas = campos
        .map(([k, label]) => [label, fmt(data[k])])
        .filter(([, v]) => v !== ""); // só mostra o que foi preenchido
      if (!linhas.length) continue;

      html += `<h3 style="color:#561624;border-bottom:1px solid #eee;padding-bottom:4px;margin:18px 0 8px;font-size:15px">${esc(titulo)}</h3>
        <table style="border-collapse:collapse;font-size:14px;width:100%">`;
      html += linhas
        .map(([label, v]) =>
          `<tr><td style="padding:5px 12px 5px 0;color:#561624;font-weight:600;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:5px 0">${esc(v)}</td></tr>`
        ).join("");
      html += `</table>`;

      txt.push(titulo);
      linhas.forEach(([label, v]) => txt.push(`  ${label}: ${v}`));
      txt.push("");
    }
    html += `</div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [DESTINO],
        reply_to: fmt(data.email) ? [fmt(data.email)] : undefined,
        subject: `Briefing — ${fmt(data.nome).slice(0, 70)} (${fmt(data.perfil) || "projeto"})`,
        html,
        text: txt.join("\n"),
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/orcamento") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "Método não permitido." }, 405);
      }
      return handleOrcamento(request, env);
    }
    // Todo o restante é servido pelo site estático.
    return env.ASSETS.fetch(request);
  },
};
