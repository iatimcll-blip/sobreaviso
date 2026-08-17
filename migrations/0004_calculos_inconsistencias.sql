-- Fase 4: parâmetros CLT configuráveis, ciclos de apuração e inconsistências

CREATE TABLE configuracoes_clt (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  interjornada_minima_horas REAL NOT NULL DEFAULT 11,
  jornada_maxima_diaria_horas REAL NOT NULL DEFAULT 10,
  intrajornada_jornada_longa_horas REAL NOT NULL DEFAULT 6,
  intrajornada_minima_longa_minutos INTEGER NOT NULL DEFAULT 60,
  intrajornada_minima_longa_com_acordo_minutos INTEGER NOT NULL DEFAULT 30,
  intrajornada_jornada_media_horas REAL NOT NULL DEFAULT 4,
  intrajornada_minima_media_minutos INTEGER NOT NULL DEFAULT 15,
  hora_noturna_inicio TEXT NOT NULL DEFAULT '22:00',
  hora_noturna_fim TEXT NOT NULL DEFAULT '05:00',
  hora_noturna_fator_reducao REAL NOT NULL DEFAULT 52.5,
  hora_noturna_adicional_pct REAL NOT NULL DEFAULT 20,
  sobreaviso_fator REAL NOT NULL DEFAULT 0.333333,
  descanso_semanal_horas REAL NOT NULL DEFAULT 24,
  descanso_12x36_horas REAL NOT NULL DEFAULT 36,
  teto_horas_extras_dia REAL NOT NULL DEFAULT 2,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO configuracoes_clt (id) VALUES (1);

CREATE TABLE ciclos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rotulo TEXT NOT NULL UNIQUE,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  fechado_em TEXT,
  fechado_por INTEGER REFERENCES users(id)
);

CREATE TABLE inconsistencias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo TEXT NOT NULL,
  colaborador_id INTEGER REFERENCES colaboradores(id),
  equipe_id INTEGER REFERENCES equipes(id),
  localidade_id INTEGER REFERENCES localidades(id),
  data_referencia TEXT NOT NULL,
  ciclo_referencia TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa', 'media', 'alta')),
  descricao TEXT NOT NULL,
  entidade_relacionada_tipo TEXT,
  entidade_relacionada_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_revisao', 'justificada', 'aprovada', 'corrigida', 'ignorada')),
  justificativa TEXT,
  revisado_por INTEGER REFERENCES users(id),
  revisado_em TEXT,
  detectado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tipo, colaborador_id, equipe_id, data_referencia)
);
CREATE INDEX idx_inconsistencias_ciclo ON inconsistencias(ciclo_referencia);
CREATE INDEX idx_inconsistencias_colaborador ON inconsistencias(colaborador_id);
CREATE INDEX idx_inconsistencias_status ON inconsistencias(status);
