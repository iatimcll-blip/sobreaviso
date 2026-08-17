-- Fase 2: escalas, sobreaviso (com rodízio), equipes (membros) e duplas

ALTER TABLE colaboradores ADD COLUMN tipo_escala_padrao_id INTEGER REFERENCES escalas_modelo(id);

CREATE TABLE escalas_modelo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('5x2', '6x1', '12x36', '4x2', 'personalizada')),
  turno TEXT NOT NULL DEFAULT 'diurno' CHECK (turno IN ('diurno', 'noturno', 'misto')),
  duracao_intervalo_minutos INTEGER NOT NULL DEFAULT 60,
  data_inicio_vigencia TEXT NOT NULL,
  data_fim_vigencia TEXT,
  possui_acordo_coletivo INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  duplicado_de_id INTEGER REFERENCES escalas_modelo(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por INTEGER REFERENCES users(id)
);

CREATE TABLE escalas_turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escala_modelo_id INTEGER NOT NULL REFERENCES escalas_modelo(id),
  ciclo_dia INTEGER NOT NULL,
  hora_entrada TEXT,
  hora_saida TEXT,
  intervalo_inicio TEXT,
  intervalo_fim TEXT,
  folga INTEGER NOT NULL DEFAULT 0,
  UNIQUE(escala_modelo_id, ciclo_dia)
);
CREATE INDEX idx_escalas_turno_modelo ON escalas_turno(escala_modelo_id);

CREATE TABLE escala_vinculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  escala_modelo_id INTEGER NOT NULL REFERENCES escalas_modelo(id),
  colaborador_id INTEGER REFERENCES colaboradores(id),
  equipe_id INTEGER REFERENCES equipes(id),
  localidade_id INTEGER REFERENCES localidades(id),
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (colaborador_id IS NOT NULL OR equipe_id IS NOT NULL OR localidade_id IS NOT NULL)
);
CREATE INDEX idx_escala_vinculos_modelo ON escala_vinculos(escala_modelo_id);
CREATE INDEX idx_escala_vinculos_colaborador ON escala_vinculos(colaborador_id);
CREATE INDEX idx_escala_vinculos_equipe ON escala_vinculos(equipe_id);

CREATE TABLE equipe_membros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipe_id INTEGER NOT NULL REFERENCES equipes(id),
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  papel TEXT NOT NULL DEFAULT 'tecnico' CHECK (papel IN ('tecnico', 'supervisor', 'ga', 'go')),
  data_inicio TEXT NOT NULL DEFAULT (date('now')),
  data_fim TEXT
);
CREATE INDEX idx_equipe_membros_equipe ON equipe_membros(equipe_id);
CREATE INDEX idx_equipe_membros_colaborador ON equipe_membros(colaborador_id);

CREATE TABLE duplas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipe_id INTEGER REFERENCES equipes(id),
  nome TEXT,
  colaborador_1_id INTEGER NOT NULL REFERENCES colaboradores(id),
  colaborador_2_id INTEGER REFERENCES colaboradores(id),
  ativo INTEGER NOT NULL DEFAULT 1,
  data_inicio TEXT NOT NULL DEFAULT (date('now')),
  data_fim TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_duplas_equipe ON duplas(equipe_id);

CREATE TABLE sobreaviso_regras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  periodicidade_dias INTEGER NOT NULL DEFAULT 7,
  hora_troca TEXT NOT NULL DEFAULT '07:00',
  data_inicio TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sobreaviso_regra_equipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  regra_id INTEGER NOT NULL REFERENCES sobreaviso_regras(id),
  equipe_id INTEGER NOT NULL REFERENCES equipes(id),
  ordem INTEGER NOT NULL,
  UNIQUE(regra_id, ordem)
);
CREATE INDEX idx_sobreaviso_regra_equipes_regra ON sobreaviso_regra_equipes(regra_id);

CREATE TABLE sobreavisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  colaborador_id INTEGER REFERENCES colaboradores(id),
  equipe_id INTEGER REFERENCES equipes(id),
  dupla_id INTEGER REFERENCES duplas(id),
  localidade_id INTEGER REFERENCES localidades(id),
  inicio TEXT NOT NULL,
  fim TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'rodizio_automatico')),
  regra_id INTEGER REFERENCES sobreaviso_regras(id),
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')),
  criado_por INTEGER REFERENCES users(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (colaborador_id IS NOT NULL OR equipe_id IS NOT NULL)
);
CREATE INDEX idx_sobreavisos_colaborador ON sobreavisos(colaborador_id);
CREATE INDEX idx_sobreavisos_equipe ON sobreavisos(equipe_id);
CREATE INDEX idx_sobreavisos_periodo ON sobreavisos(inicio, fim);
