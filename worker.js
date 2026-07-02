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
  projetos: { nome: "nome", cliente: "cliente", clientId: "client_id", tipologia: "tipologia", status: "status", valor: "valor", prazo: "prazo", local: "local", notas: "notas" },
  financeiro: { descricao: "descricao", tipo: "tipo", valor: "valor", vencimento: "vencimento", status: "status", projetoId: "projeto_id" },
  eventos: { titulo: "titulo", data: "data", hora: "hora", tipo: "tipo", projetoId: "projeto_id", notas: "notas" },
  leads: { nome: "nome", contato: "contato", origem: "origem", interesse: "interesse", status: "status", valor: "valor", notas: "notas" },
};
const selectList = (table) => ["id", "created_at", ...Object.entries(TABLES[table]).map(([a, d]) => `${d} AS ${a}`)].join(", ");

async function projetosWithClient(env, whereClientId) {
  let sql = `SELECT p.id, p.created_at, p.nome, p.cliente, p.client_id AS clientId, p.tipologia, p.status,
    p.valor, p.prazo, p.local, p.notas, u.name AS clientNome, u.email AS clientEmail
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
    `SELECT id, projeto_id AS projetoId, nome, tamanho, tipo, created_at FROM arquivos WHERE projeto_id IN (${ph}) ORDER BY created_at DESC`
  ).bind(...ids).all()).results || [];
  const byProj = {};
  files.forEach((f) => { (byProj[f.projetoId] = byProj[f.projetoId] || []).push(f); });
  projetos.forEach((p) => { p.arquivos = byProj[p.id] || []; });
  return projetos;
}

async function handleAdminData(env) {
  const [projetos, financeiro, eventos, leads, clientes] = await Promise.all([
    projetosWithClient(env, null).then((ps) => attachArquivos(env, ps)),
    env.DB.prepare(`SELECT ${selectList("financeiro")} FROM financeiro ORDER BY vencimento DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("eventos")} FROM eventos ORDER BY data ASC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT ${selectList("leads")} FROM leads ORDER BY created_at DESC`).all().then((r) => r.results || []),
    env.DB.prepare(`SELECT id, name, email, created_at,
      (SELECT COUNT(*) FROM projetos p WHERE p.client_id = users.id) AS numProjetos
      FROM users WHERE role='client' ORDER BY created_at DESC`).all().then((r) => r.results || []),
  ]);
  return json({ projetos, financeiro, eventos, leads, clientes });
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
  return json({ ok: true, record });
}
async function handleAdminUpdate(env, table, id, body) {
  const { cols, vals } = pickFields(table, body);
  if (cols.length) {
    await env.DB.prepare(`UPDATE ${table} SET ${cols.map((c) => c + "=?").join(",")} WHERE id=?`).bind(...vals, id).run();
  }
  const record = table === "projetos"
    ? (await projetosWithClient(env, null)).find((p) => p.id === id)
    : await env.DB.prepare(`SELECT ${selectList(table)} FROM ${table} WHERE id=?`).bind(id).first();
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

// ---------- Arquivos (R2 + metadados em D1) ----------
const MAX_FILE = 50 * 1024 * 1024; // 50 MB

async function handleUpload(request, env, url) {
  if (!env.FILES) return json({ ok: false, error: "Armazenamento de arquivos não configurado." }, 500);
  const projetoId = url.searchParams.get("projetoId");
  const nome = (url.searchParams.get("nome") || "arquivo").slice(0, 180);
  if (!projetoId) return json({ ok: false, error: "Projeto não informado." }, 400);
  const proj = await env.DB.prepare("SELECT id FROM projetos WHERE id=?").bind(projetoId).first();
  if (!proj) return json({ ok: false, error: "Projeto não encontrado." }, 404);
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_FILE) return json({ ok: false, error: "Arquivo acima de 50 MB." }, 413);
  const tipo = request.headers.get("content-type") || "application/octet-stream";
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return json({ ok: false, error: "Arquivo vazio." }, 400);
  if (buf.byteLength > MAX_FILE) return json({ ok: false, error: "Arquivo acima de 50 MB." }, 413);
  const id = crypto.randomUUID();
  const key = `${projetoId}/${id}`;
  await env.FILES.put(key, buf, { httpMetadata: { contentType: tipo } });
  const createdAt = Date.now();
  await env.DB.prepare("INSERT INTO arquivos (id,projeto_id,nome,tamanho,tipo,r2_key,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(id, projetoId, nome, buf.byteLength, tipo, key, createdAt).run();
  return json({ ok: true, record: { id, projetoId, nome, tamanho: buf.byteLength, tipo, created_at: createdAt } });
}

async function handleDeleteFile(env, id) {
  const row = await env.DB.prepare("SELECT r2_key FROM arquivos WHERE id=?").bind(id).first();
  if (row) {
    if (env.FILES) await env.FILES.delete(row.r2_key);
    await env.DB.prepare("DELETE FROM arquivos WHERE id=?").bind(id).run();
  }
  return json({ ok: true });
}

async function handleFileDownload(request, env, id, forceDownload) {
  const s = await sessionFrom(request, env);
  if (!s) return new Response("Não autenticado.", { status: 401 });
  const row = await env.DB.prepare(
    "SELECT a.nome, a.tipo, a.r2_key, p.client_id AS clientId FROM arquivos a JOIN projetos p ON p.id = a.projeto_id WHERE a.id = ?"
  ).bind(id).first();
  if (!row) return new Response("Arquivo não encontrado.", { status: 404 });
  if (s.role !== "admin" && row.clientId !== s.sub) return new Response("Acesso restrito.", { status: 403 });
  if (!env.FILES) return new Response("Armazenamento indisponível.", { status: 500 });
  const obj = await env.FILES.get(row.r2_key);
  if (!obj) return new Response("Arquivo indisponível.", { status: 404 });
  const disp = forceDownload ? "attachment" : "inline";
  const headers = new Headers();
  headers.set("content-type", row.tipo || "application/octet-stream");
  headers.set("content-disposition", `${disp}; filename*=UTF-8''${encodeURIComponent(row.nome)}`);
  headers.set("cache-control", "private, max-age=0, must-revalidate");
  return new Response(obj.body, { headers });
}

async function handleApiData(request, env, url) {
  const session = await sessionFrom(request, env);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","admin","projetos","<id>"]

  if (parts[1] === "portal") {
    if (!session) return json({ ok: false, error: "Não autenticado." }, 401);
    if (parts[2] === "data") return handlePortalData(env, session);
    return json({ ok: false, error: "Rota inválida." }, 404);
  }

  if (parts[1] === "admin") {
    if (!session || session.role !== "admin") return json({ ok: false, error: "Acesso restrito." }, 403);
    if (parts[2] === "data") return handleAdminData(env);
    if (parts[2] === "arquivos") {
      if (request.method === "POST") return handleUpload(request, env, url);
      if (request.method === "DELETE") return handleDeleteFile(env, parts[3]);
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
    if (path.startsWith("/api/files/")) {
      const id = path.slice("/api/files/".length).split("/")[0];
      return handleFileDownload(request, env, id, url.searchParams.get("download") === "1");
    }
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
};

function redirectTo(url, to, next) {
  const dest = new URL(to, url.origin);
  if (next) dest.searchParams.set("next", next);
  return Response.redirect(dest.toString(), 302);
}
