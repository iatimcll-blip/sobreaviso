-- Fase 1: fundação (autenticação, permissões, colaboradores, equipes mínimas, auditoria, histórico de importação)

CREATE TABLE uf (
  sigla TEXT PRIMARY KEY,
  nome TEXT NOT NULL
);

CREATE TABLE localidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  uf_sigla TEXT NOT NULL REFERENCES uf(sigla),
  tipo TEXT NOT NULL DEFAULT 'municipio' CHECK (tipo IN ('municipio', 'base', 'site')),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_localidades_uf ON localidades(uf_sigla);

CREATE TABLE equipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  localidade_id INTEGER REFERENCES localidades(id),
  supervisor_id INTEGER REFERENCES colaboradores(id),
  gestor_administrativo_id INTEGER REFERENCES colaboradores(id),
  gestor_operacional_id INTEGER REFERENCES colaboradores(id),
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE colaboradores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  matricula TEXT UNIQUE,
  funcao TEXT NOT NULL,
  equipe_id INTEGER REFERENCES equipes(id),
  uf_sigla TEXT NOT NULL REFERENCES uf(sigla),
  localidade_id INTEGER NOT NULL REFERENCES localidades(id),
  gestor_administrativo_id INTEGER REFERENCES colaboradores(id),
  gestor_operacional_id INTEGER REFERENCES colaboradores(id),
  ga_nome_importado TEXT,
  go_nome_importado TEXT,
  situacao_cadastral TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao_cadastral IN ('ativo', 'afastado', 'inativo', 'desligado')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por INTEGER,
  atualizado_por INTEGER
);
CREATE INDEX idx_colaboradores_equipe ON colaboradores(equipe_id);
CREATE INDEX idx_colaboradores_localidade ON colaboradores(localidade_id);
CREATE INDEX idx_colaboradores_situacao ON colaboradores(situacao_cadastral);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  nome_completo TEXT NOT NULL,
  colaborador_id INTEGER REFERENCES colaboradores(id),
  ativo INTEGER NOT NULL DEFAULT 1,
  ultimo_login_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  revogado_em TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  tela TEXT NOT NULL CHECK (tela IN (
    'dashboard', 'escalas', 'sobreaviso', 'colaboradores', 'inconsistencias', 'configuracoes',
    'equipes', 'duplas', 'afastamentos', 'localidades', 'feriados', 'usuarios'
  )),
  pode_visualizar INTEGER NOT NULL DEFAULT 0,
  pode_criar INTEGER NOT NULL DEFAULT 0,
  pode_editar INTEGER NOT NULL DEFAULT 0,
  pode_excluir INTEGER NOT NULL DEFAULT 0,
  pode_exportar INTEGER NOT NULL DEFAULT 0,
  pode_importar INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, tela)
);

CREATE TABLE auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entidade TEXT NOT NULL,
  entidade_id INTEGER,
  acao TEXT NOT NULL,
  usuario_id INTEGER REFERENCES users(id),
  dados_antes TEXT,
  dados_depois TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT
);
CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);

CREATE TABLE import_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('colaboradores', 'feriados')),
  nome_arquivo TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  iniciado_em TEXT NOT NULL DEFAULT (datetime('now')),
  concluido_em TEXT,
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'concluido_com_erros', 'falhou')),
  total_linhas INTEGER NOT NULL DEFAULT 0,
  total_importados INTEGER NOT NULL DEFAULT 0,
  total_atualizados INTEGER NOT NULL DEFAULT 0,
  total_ignorados INTEGER NOT NULL DEFAULT 0,
  total_erros INTEGER NOT NULL DEFAULT 0,
  detalhes_json TEXT
);

-- Seed: 27 UFs brasileiras
INSERT INTO uf (sigla, nome) VALUES
  ('AC','Acre'), ('AL','Alagoas'), ('AP','Amapá'), ('AM','Amazonas'), ('BA','Bahia'),
  ('CE','Ceará'), ('DF','Distrito Federal'), ('ES','Espírito Santo'), ('GO','Goiás'),
  ('MA','Maranhão'), ('MT','Mato Grosso'), ('MS','Mato Grosso do Sul'), ('MG','Minas Gerais'),
  ('PA','Pará'), ('PB','Paraíba'), ('PR','Paraná'), ('PE','Pernambuco'), ('PI','Piauí'),
  ('RJ','Rio de Janeiro'), ('RN','Rio Grande do Norte'), ('RS','Rio Grande do Sul'),
  ('RO','Rondônia'), ('RR','Roraima'), ('SC','Santa Catarina'), ('SP','São Paulo'),
  ('SE','Sergipe'), ('TO','Tocantins');
