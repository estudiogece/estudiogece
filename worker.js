// Worker do Estúdio Gecê — serve o site estático (binding ASSETS), API de
// briefing (Resend), autenticação (D1 + cookie de sessão assinado) e a API
// de dados do painel/portal.
//
// Bindings: ASSETS (assets), DB (D1 "estudiogece-db").
// Secrets: RESEND_API_KEY, SESSION_SECRET, ADMIN_PASSWORD.

const DESTINO = "falecom@estudiogece.com.br";
const REMETENTE = "Briefing Estúdio Gecê <briefing@estudiogece.com.br>";

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
function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

function montarSecoes(data) {
  const lista = SECOES.slice();
  if (data.perfil === "Comercial") lista.push(SECAO_COM);
  else lista.push(SECAO_RES);
  return lista.concat(SECOES_FIM);
}

async function handleOrcamento(request, env) {
  try {
    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: "Configuração de envio ausente." }, 500);
    }
    const ct = request.headers.get("content-type") || "";
    let data = {};
    if (ct.includes("application/json")) data = await request.json();
    else {
      const fd = await request.formData();
      for (const k of fd.keys()) {
        const all = fd.getAll(k);
        data[k] = all.length > 1 ? all : all[0];
      }
    }
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
      const linhas = campos.map(([k, label]) => [label, fmt(data[k])]).filter(([, v]) => v !== "");
      if (!linhas.length) continue;
      html += `<h3 style="color:#561624;border-bottom:1px solid #eee;padding-bottom:4px;margin:18px 0 8px;font-size:15px">${esc(titulo)}</h3>
        <table style="border-collapse:collapse;font-size:14px;width:100%">`;
      html += linhas.map(([label, v]) =>
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
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: REMETENTE, to: [DESTINO],
        reply_to: fmt(data.email) ? [fmt(data.email)] : undefined,
        subject: `Briefing — ${fmt(data.nome).slice(0, 70)} (${fmt(data.perfil) || "projeto"})`,
        html, text: txt.join("\n"),
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

// ============================================================
// Autenticação e sessão
// - Admin: conta única (ADMIN_EMAIL) validada pelo secret ADMIN_PASSWORD.
// - Clientes: contas em D1 (users, role='client'), senha com PBKDF2-SHA256.
// - Sessão: cookie assinado (HMAC-SHA256) com { sub, role, exp }.
// ============================================================
const ADMIN_EMAIL = "gcamara@estudiogece.com.br";
const SESSION_COOKIE = "gece_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 dias

const _enc = new TextEncoder();
const _dec = new TextDecoder();
const toHex = (bytes) => Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => { const a = new Uint8Array(hex.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16); return a; };

function bytesToB64url(bytes) {
  let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(str); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const strToB64url = (s) => bytesToB64url(_enc.encode(s));
const b64urlToStr = (s) => _dec.decode(b64urlToBytes(s));

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function pbkdf2(password, saltBytes, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", _enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toHex(salt), hash: toHex(await pbkdf2(password, salt)) };
}
async function verifyPassword(password, saltHex, hashHex) {
  return safeEqual(toHex(await pbkdf2(password, fromHex(saltHex))), hashHex);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", _enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signSession(claims, secret) {
  const payload = { ...claims, exp: Math.floor(Date.now() / 1000) + SESSION_TTL };
  const data = strToB64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), _enc.encode(data));
  return data + "." + bytesToB64url(new Uint8Array(sig));
}
async function verifySession(token, secret) {
  if (!token || !secret || token.indexOf(".") < 0) return null;
  const [data, sig] = token.split(".");
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), b64urlToBytes(sig), _enc.encode(data));
    if (!ok) return null;
    const payload = JSON.parse(b64urlToStr(data));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function sessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
async function sessionFrom(request, env) {
  return verifySession(getCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
}

async function readBody(request) {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) return request.json();
  const fd = await request.formData(); const o = {};
  for (const k of fd.keys()) o[k] = fd.get(k);
  return o;
}
const emailOk = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

async function handleRegister(request, env) {
  if (!env.SESSION_SECRET) return json({ ok: false, error: "Servidor não configurado." }, 500);
  const b = await readBody(request);
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const senha = String(b.senha || "");
  if (!name || !emailOk(email) || senha.length < 6) {
    return json({ ok: false, error: "Preencha nome, e-mail válido e senha (mín. 6 caracteres)." }, 400);
  }
  if (email === ADMIN_EMAIL.toLowerCase()) return json({ ok: false, error: "E-mail indisponível." }, 409);
  const exists = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (exists) return json({ ok: false, error: "Já existe uma conta com este e-mail." }, 409);
  const { salt, hash } = await hashPassword(senha);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO users (id,name,email,password_hash,password_salt,role,created_at) VALUES (?,?,?,?,?,?,?)"
  ).bind(id, name, email, hash, salt, "client", Date.now()).run();
  const token = await signSession({ sub: id, role: "client" }, env.SESSION_SECRET);
  return json({ ok: true, user: { name, email, role: "client" } }, 200, { "Set-Cookie": sessionCookie(token, SESSION_TTL) });
}

async function handleLogin(request, env) {
  if (!env.SESSION_SECRET) return json({ ok: false, error: "Servidor não configurado." }, 500);
  const b = await readBody(request);
  const email = String(b.email || "").trim().toLowerCase();
  const senha = String(b.senha || "");
  let claims = null, user = null;

  if (email === ADMIN_EMAIL.toLowerCase()) {
    if (env.ADMIN_PASSWORD && safeEqual(senha, env.ADMIN_PASSWORD)) {
      claims = { sub: "admin", role: "admin" };
      user = { name: "Gabriel Câmara", email: ADMIN_EMAIL, role: "admin" };
    }
  } else {
    const row = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
    if (row && (await verifyPassword(senha, row.password_salt, row.password_hash))) {
      if (row.ativo === 0) {
        return json({ ok: false, error: "Conta desativada. Fale com o Estúdio Gecê." }, 403);
      }
      claims = { sub: row.id, role: row.role };
      user = { name: row.name, email: row.email, role: row.role };
    }
  }
  if (!claims) {
    await new Promise((r) => setTimeout(r, 500));
    return json({ ok: false, error: "E-mail ou senha inválidos." }, 401);
  }
  const token = await signSession(claims, env.SESSION_SECRET);
  return json({ ok: true, user }, 200, { "Set-Cookie": sessionCookie(token, SESSION_TTL) });
}

function handleLogout() {
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function handleMe(request, env) {
  const s = await sessionFrom(request, env);
  if (!s) return json({ ok: false }, 401);
  if (s.role === "admin") return json({ ok: true, user: { name: "Gabriel Câmara", email: ADMIN_EMAIL, role: "admin" } });
  const row = await env.DB.prepare("SELECT name,email,role FROM users WHERE id=?").bind(s.sub).first();
  if (!row) return json({ ok: false }, 401);
  return json({ ok: true, user: row });
}

// ============================================================
// API de dados (D1). Campos expostos em camelCase -> colunas no banco.
// ============================================================
const TABLES = {
  projetos: { nome: "nome", cliente: "cliente", clientId: "client_id", tipologia: "tipologia", status: "status", fase: "fase", etapas: "etapas", valor: "valor", prazo: "prazo", local: "local", notas: "notas" },
  financeiro: { descricao: "descricao", tipo: "tipo", valor: "valor", vencimento: "vencimento", status: "status", projetoId: "projeto_id" },
  eventos: { titulo: "titulo", data: "data", hora: "hora", tipo: "tipo", projetoId: "projeto_id", notas: "notas", meet: "meet", gcalId: "gcal_id" },
  leads: { nome: "nome", contato: "contato", origem: "origem", interesse: "interesse", status: "status", valor: "valor", notas: "notas" },
  arquivos: { nome: "nome", url: "url", projetoId: "projeto_id" },
  posts: { data: "data", canal: "canal", formato: "formato", titulo: "titulo", legenda: "legenda", status: "status", alcance: "alcance", curtidas: "curtidas", notas: "notas" },
  campanhas: { nome: "nome", canal: "canal", objetivo: "objetivo", inicio: "inicio", fim: "fim", investimento: "investimento", leads: "leads", alcance: "alcance", status: "status", notas: "notas" },
  lembretes: { texto: "texto", feito: "feito" },
};
const selectList = (table) => ["id", "created_at", ...Object.entries(TABLES[table]).map(([a, d]) => `${d} AS ${a}`)].join(", ");

async function projetosWithClient(env, whereClientId) {
  let sql = `SELECT p.id, p.created_at, p.nome, p.cliente, p.client_id AS clientId, p.tipologia, p.status,
    p.fase, p.etapas, p.valor, p.prazo, p.local, p.notas, u.name AS clientNome, u.email AS clientEmail
    FROM projetos p LEFT JOIN users u ON u.id = p.client_id`;
  const binds = [];
  if (whereClientId) { sql += " WHERE p.client_id = ?"; binds.push(whereClientId); }
  sql += " ORDER BY p.created_at DESC";
  return (await env.DB.prepare(sql).bind(...binds).all()).results || [];
}

async function attachArquivos(env, projetos) {
  if (!projetos.length) return projetos;
  const ids = projetos.map((p) => p.id);
  const ph = ids.map(() => "?").join(",");
  const files = (await env.DB.prepare(
    `SELECT id, projeto_id AS projetoId, nome, url, created_at FROM arquivos WHERE projeto_id IN (${ph}) ORDER BY created_at DESC`
  ).bind(...ids).all()).results || [];
  const byProj = {};
  files.forEach((f) => { (byProj[f.projetoId] = byProj[f.projetoId] || []).push(f); });
  projetos.forEach((p) => { p.arquivos = byProj[p.id] || []; });
  return projetos;
}

async function handleAdminData(env) {
  const [projetos, financeiro, eventos, leads, clientes, posts, campanhas, lembretes] = await Promise.all([
    projetosWithClient(env, null).then((ps) => attachArquivos(env, ps)),
    env.DB.prepare(`SELECT ${selectList("financeiro")} FROM financeiro ORDER BY vencimento DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("eventos")} FROM eventos ORDER BY data ASC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("leads")} FROM leads ORDER BY created_at DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT id, name, email, telefone, ativo, created_at,
      (SELECT COUNT(*) FROM projetos p WHERE p.client_id = users.id) AS numProjetos
      FROM users WHERE role='client' ORDER BY created_at DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("posts")} FROM posts ORDER BY data DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("campanhas")} FROM campanhas ORDER BY created_at DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("lembretes")} FROM lembretes ORDER BY created_at DESC`).all().then((r) => r.results || []),
  ]);
  return json({ projetos, financeiro, eventos, leads, clientes, posts, campanhas, lembretes });
}

function pickFields(table, body) {
  const map = TABLES[table]; const cols = [], vals = [];
  for (const [apiField, dbCol] of Object.entries(map)) {
    if (apiField in body) { let v = body[apiField]; if (v === "" || v === undefined) v = null; cols.push(dbCol); vals.push(v); }
  }
  return { cols, vals };
}
async function handleAdminCreate(env, table, body) {
  const { cols, vals } = pickFields(table, body);
  const id = crypto.randomUUID(), createdAt = Date.now();
  const allCols = ["id", ...cols, "created_at"], allVals = [id, ...vals, createdAt];
  await env.DB.prepare(`INSERT INTO ${table} (${allCols.join(",")}) VALUES (${allCols.map(() => "?").join(",")})`).bind(...allVals).run();
  const record = table === "projetos"
    ? (await projetosWithClient(env, null)).find((p) => p.id === id)
    : await env.DB.prepare(`SELECT ${selectList(table)} FROM ${table} WHERE id=?`).bind(id).first();
  if (table === "projetos" && body.clientId) { try { await notifyProjectLinked(env, id); } catch {} }
  if (table === "arquivos" && body.projetoId) { try { await notifyNewFile(env, body.projetoId, body.nome); } catch {} }
  return json({ ok: true, record });
}
async function handleAdminUpdate(env, table, id, body) {
  let oldClient = null;
  if (table === "projetos") {
    const old = await env.DB.prepare("SELECT client_id FROM projetos WHERE id=?").bind(id).first();
    oldClient = old ? old.client_id : null;
  }
  const { cols, vals } = pickFields(table, body);
  if (cols.length) {
    await env.DB.prepare(`UPDATE ${table} SET ${cols.map((c) => c + "=?").join(",")} WHERE id=?`).bind(...vals, id).run();
  }
  const record = table === "projetos"
    ? (await projetosWithClient(env, null)).find((p) => p.id === id)
    : await env.DB.prepare(`SELECT ${selectList(table)} FROM ${table} WHERE id=?`).bind(id).first();
  if (table === "projetos" && body.clientId && body.clientId !== oldClient) { try { await notifyProjectLinked(env, id); } catch {} }
  return json({ ok: true, record });
}
async function handleAdminDelete(env, table, id) {
  await env.DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
  return json({ ok: true });
}

async function handlePortalData(env, session) {
  if (session.role === "admin") return json({ user: { name: "Gabriel Câmara", role: "admin" }, projetos: [], eventos: [], financeiro: [] });
  const uid = session.sub;
  const user = await env.DB.prepare("SELECT name,email FROM users WHERE id=?").bind(uid).first();
  const projetos = await attachArquivos(env, await projetosWithClient(env, uid));
  const ids = projetos.map((p) => p.id);
  let eventos = [], financeiro = [];
  if (ids.length) {
    const ph = ids.map(() => "?").join(",");
    eventos = (await env.DB.prepare(`SELECT ${selectList("eventos")} FROM eventos WHERE projeto_id IN (${ph}) ORDER BY data ASC`).bind(...ids).all()).results || [];
    // Portal do cliente mostra apenas receitas (pagamentos), não despesas do estúdio.
    financeiro = (await env.DB.prepare(`SELECT ${selectList("financeiro")} FROM financeiro WHERE projeto_id IN (${ph}) AND tipo='receita' ORDER BY vencimento ASC`).bind(...ids).all()).results || [];
  }
  return json({ user, projetos, eventos, financeiro });
}

// ---------- Notificações por e-mail (Resend) ----------
const NOTIF_FROM = "Estúdio Gecê <briefing@estudiogece.com.br>";
const SITE = "https://estudiogece.com.br";
async function sendMail(env, to, subject, html) {
  if (!env.RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: NOTIF_FROM, to: [to], subject, html }),
    });
  } catch {}
}
function mailShell(titulo, corpo) {
  return `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#211013">
    <h2 style="color:#561624;margin:0 0 12px">${titulo}</h2>${corpo}
    <p style="margin-top:24px"><a href="${SITE}/portal/" style="background:#561624;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">Acessar meu portal</a></p>
    <p style="color:#8a7a7d;font-size:12px;margin-top:24px">Estúdio Gecê · Arquitetura</p></div>`;
}
const firstName = n => String(n || "").trim().split(" ")[0] || "";
async function clientOfProject(env, projetoId) {
  return env.DB.prepare("SELECT u.name, u.email FROM projetos p JOIN users u ON u.id=p.client_id WHERE p.id=? AND u.ativo=1").bind(projetoId).first();
}
async function notifyProjectLinked(env, projetoId) {
  const c = await clientOfProject(env, projetoId); if (!c) return;
  const p = await env.DB.prepare("SELECT nome FROM projetos WHERE id=?").bind(projetoId).first();
  await sendMail(env, c.email, "Seu projeto no Estúdio Gecê",
    mailShell(`Olá, ${firstName(c.name)}!`, `<p>O projeto <strong>${esc(p ? p.nome : "")}</strong> foi vinculado à sua conta. Você já pode acompanhar o andamento, arquivos e pagamentos no seu portal.</p>`));
}
async function notifyNewFile(env, projetoId, nome) {
  const c = await clientOfProject(env, projetoId); if (!c) return;
  await sendMail(env, c.email, "Novo arquivo disponível",
    mailShell(`Olá, ${firstName(c.name)}!`, `<p>Um novo arquivo foi adicionado ao seu projeto: <strong>${esc(nome)}</strong>. Acesse o portal para visualizar.</p>`));
}

// ---------- Gestão de clientes (admin) ----------
function gerarSenha() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  let s = ""; for (const x of b) s += c[x % c.length];
  return s.slice(0, 4) + "-" + s.slice(4, 8) + "-" + s.slice(8, 12);
}
async function handleClienteUpdate(env, id, b) {
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  if (!name || !emailOk(email)) return json({ ok: false, error: "Nome e e-mail válidos são obrigatórios." }, 400);
  const dup = await env.DB.prepare("SELECT id FROM users WHERE email=? AND id<>?").bind(email, id).first();
  if (dup) return json({ ok: false, error: "E-mail já usado por outra conta." }, 409);
  const ativo = (b.ativo === 0 || b.ativo === "0" || b.ativo === false || b.ativo === "false") ? 0 : 1;
  await env.DB.prepare("UPDATE users SET name=?, email=?, telefone=?, ativo=? WHERE id=? AND role='client'")
    .bind(name, email, b.telefone || null, ativo, id).run();
  return json({ ok: true });
}
async function handleClienteDelete(env, id) {
  await env.DB.prepare("DELETE FROM users WHERE id=? AND role='client'").bind(id).run();
  return json({ ok: true });
}
async function handleClienteCreate(env, b) {
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  if (!name || !emailOk(email)) return json({ ok: false, error: "Nome e e-mail válidos são obrigatórios." }, 400);
  if (email === ADMIN_EMAIL.toLowerCase()) return json({ ok: false, error: "E-mail indisponível." }, 409);
  const dup = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (dup) return json({ ok: false, error: "Já existe uma conta com este e-mail." }, 409);
  const senha = gerarSenha();
  const { salt, hash } = await hashPassword(senha);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,password_salt,role,telefone,ativo,created_at) VALUES (?,?,?,?,?,?,?,1,?)")
    .bind(id, name, email, hash, salt, "client", b.telefone || null, Date.now()).run();
  try {
    await sendMail(env, email, "Seu acesso ao portal — Estúdio Gecê",
      mailShell(`Olá, ${firstName(name)}!`, `<p>Criamos seu acesso ao portal do Estúdio Gecê, onde você acompanha seu projeto, arquivos e pagamentos.</p><p><strong>E-mail:</strong> ${esc(email)}<br><strong>Senha provisória:</strong> <span style="font-size:18px;font-weight:700;color:#561624">${senha}</span></p><p>Ao entrar, recomendamos trocar a senha no seu portal.</p>`));
  } catch {}
  return json({ ok: true, senha });
}
async function handleClienteResetSenha(env, id) {
  const row = await env.DB.prepare("SELECT email, name FROM users WHERE id=? AND role='client'").bind(id).first();
  if (!row) return json({ ok: false, error: "Cliente não encontrado." }, 404);
  const senha = gerarSenha();
  const { salt, hash } = await hashPassword(senha);
  await env.DB.prepare("UPDATE users SET password_hash=?, password_salt=? WHERE id=?").bind(hash, salt, id).run();
  try {
    await sendMail(env, row.email, "Sua senha foi redefinida — Estúdio Gecê",
      mailShell(`Olá, ${firstName(row.name)}!`, `<p>O Estúdio Gecê redefiniu a senha da sua conta. Sua nova senha é:</p><p style="font-size:20px;font-weight:700;letter-spacing:1px;color:#561624">${senha}</p>`));
  } catch {}
  return json({ ok: true, senha });
}

// ---------- Lembrete de parcelas (cron) ----------
async function lembrarParcelas(env) {
  const alvo = new Date(); alvo.setDate(alvo.getDate() + 3);
  const iso = `${alvo.getFullYear()}-${String(alvo.getMonth()+1).padStart(2,"0")}-${String(alvo.getDate()).padStart(2,"0")}`;
  const rows = (await env.DB.prepare(
    `SELECT f.descricao, f.valor, f.vencimento, u.name, u.email
     FROM financeiro f JOIN projetos p ON p.id=f.projeto_id JOIN users u ON u.id=p.client_id
     WHERE f.tipo='receita' AND f.status='pendente' AND f.vencimento=? AND u.ativo=1`).bind(iso).all()).results || [];
  for (const r of rows) {
    const valor = (Number(r.valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await sendMail(env, r.email, "Lembrete de pagamento — Estúdio Gecê",
      mailShell(`Olá, ${firstName(r.name)}!`, `<p>Sua parcela <strong>${esc(r.descricao)}</strong> no valor de <strong>${valor}</strong> vence em <strong>${r.vencimento}</strong>.</p>`));
  }
}

async function handlePortalTrocarSenha(env, session, b) {
  if (session.role === "admin") return json({ ok: false, error: "O admin troca a senha pelo painel." }, 400);
  const nova = String(b.nova || "");
  if (nova.length < 6) return json({ ok: false, error: "A nova senha deve ter ao menos 6 caracteres." }, 400);
  const row = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id=?").bind(session.sub).first();
  if (!row) return json({ ok: false }, 401);
  if (!(await verifyPassword(String(b.atual || ""), row.password_salt, row.password_hash))) {
    return json({ ok: false, error: "Senha atual incorreta." }, 403);
  }
  const { salt, hash } = await hashPassword(nova);
  await env.DB.prepare("UPDATE users SET password_hash=?, password_salt=? WHERE id=?").bind(hash, salt, session.sub).run();
  return json({ ok: true });
}

async function handleApiData(request, env, url) {
  const session = await sessionFrom(request, env);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","admin","projetos","<id>"]

  if (parts[1] === "portal") {
    if (!session) return json({ ok: false, error: "Não autenticado." }, 401);
    if (parts[2] === "data") return handlePortalData(env, session);
    if (parts[2] === "senha" && request.method === "POST") return handlePortalTrocarSenha(env, session, await readBody(request));
    return json({ ok: false, error: "Rota inválida." }, 404);
  }

  if (parts[1] === "admin") {
    if (!session || session.role !== "admin") return json({ ok: false, error: "Acesso restrito." }, 403);
    if (parts[2] === "data") return handleAdminData(env);
    if (parts[2] === "config") {
      const chave = parts[3];
      if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT valor FROM config WHERE chave=?").bind(chave).first();
        return json({ ok: true, valor: row ? row.valor : null });
      }
      if (request.method === "PUT") {
        const b = await readBody(request);
        await env.DB.prepare("INSERT INTO config (chave,valor,updated_at) VALUES (?,?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor, updated_at=excluded.updated_at").bind(chave, String(b.valor || ""), Date.now()).run();
        return json({ ok: true });
      }
      return json({ ok: false, error: "Método não permitido." }, 405);
    }
    if (parts[2] === "clientes") {
      const cid = parts[3];
      if (request.method === "POST" && !cid) return handleClienteCreate(env, await readBody(request));
      if (request.method === "PUT") return handleClienteUpdate(env, cid, await readBody(request));
      if (request.method === "DELETE") return handleClienteDelete(env, cid);
      if (request.method === "POST" && parts[4] === "senha") return handleClienteResetSenha(env, cid);
      return json({ ok: false, error: "Método não permitido." }, 405);
    }
    const table = parts[2], id = parts[3];
    if (!TABLES[table]) return json({ ok: false, error: "Coleção inválida." }, 404);
    if (request.method === "POST") return handleAdminCreate(env, table, await readBody(request));
    if (request.method === "PUT") return handleAdminUpdate(env, table, id, await readBody(request));
    if (request.method === "DELETE") return handleAdminDelete(env, table, id);
    return json({ ok: false, error: "Método não permitido." }, 405);
  }
  return json({ ok: false, error: "Rota inválida." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- API ---
    if (path === "/api/orcamento") {
      if (request.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);
      return handleOrcamento(request, env);
    }
    if (path === "/api/register") {
      if (request.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);
      return handleRegister(request, env);
    }
    if (path === "/api/login") {
      if (request.method !== "POST") return json({ ok: false, error: "Método não permitido." }, 405);
      return handleLogin(request, env);
    }
    if (path === "/api/logout") return handleLogout();
    if (path === "/api/me") return handleMe(request, env);
    if (path.startsWith("/api/admin/") || path.startsWith("/api/portal/")) {
      return handleApiData(request, env, url);
    }

    // --- Páginas privadas ---
    if (path === "/admin" || path.startsWith("/admin/")) {
      const s = await sessionFrom(request, env);
      if (!s) return redirectTo(url, "/login", path);
      if (s.role !== "admin") return Response.redirect(new URL("/portal/", url.origin).toString(), 302);
    }
    if (path === "/portal" || path.startsWith("/portal/")) {
      const s = await sessionFrom(request, env);
      if (!s) return redirectTo(url, "/login", path);
    }

    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(lembrarParcelas(env));
  },
};

function redirectTo(url, to, next) {
  const dest = new URL(to, url.origin);
  if (next) dest.searchParams.set("next", next);
  return Response.redirect(dest.toString(), 302);
}
