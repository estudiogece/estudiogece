-- Schema do Estúdio Gecê (Cloudflare D1)
-- Aplicar: npx wrangler d1 execute estudiogece-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client', -- 'admin' | 'client'
  telefone      TEXT,
  ativo         INTEGER DEFAULT 1,              -- 0 = conta desativada (não loga)
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projetos (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  cliente    TEXT,
  client_id  TEXT REFERENCES users(id) ON DELETE SET NULL, -- conta de cliente vinculada
  tipologia  TEXT,
  status     TEXT,
  fase       TEXT,      -- etapa: estudo|anteprojeto|executivo|obra|entregue
  valor      REAL,
  prazo      TEXT,
  local      TEXT,
  notas      TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS financeiro (
  id         TEXT PRIMARY KEY,
  descricao  TEXT NOT NULL,
  tipo       TEXT,      -- 'receita' | 'despesa'
  valor      REAL,
  vencimento TEXT,
  status     TEXT,      -- 'pendente' | 'pago'
  projeto_id TEXT REFERENCES projetos(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos (
  id         TEXT PRIMARY KEY,
  titulo     TEXT NOT NULL,
  data       TEXT,
  hora       TEXT,
  tipo       TEXT,
  projeto_id TEXT REFERENCES projetos(id) ON DELETE SET NULL,
  notas      TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL,
  contato    TEXT,
  origem     TEXT,
  interesse  TEXT,
  status     TEXT,      -- 'novo' | 'negociacao' | 'ganho' | 'perdido'
  valor      REAL,
  notas      TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS arquivos (
  id         TEXT PRIMARY KEY,
  projeto_id TEXT REFERENCES projetos(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  url        TEXT NOT NULL,       -- link do arquivo (ex.: Google Drive)
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_arquivos_projeto ON arquivos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_projetos_client ON projetos(client_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_projeto ON financeiro(projeto_id);
CREATE INDEX IF NOT EXISTS idx_eventos_projeto ON eventos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
