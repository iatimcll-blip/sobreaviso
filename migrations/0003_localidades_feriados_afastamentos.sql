-- Fase 3: feriados (nacionais/estaduais/municipais) e afastamentos/ocorrências

CREATE TABLE feriados (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data TEXT NOT NULL,
  ano INTEGER NOT NULL,
  nome TEXT NOT NULL,
  abrangencia TEXT NOT NULL CHECK (abrangencia IN ('nacional', 'estadual', 'municipal')),
  uf_sigla TEXT REFERENCES uf(sigla),
  localidade_id INTEGER REFERENCES localidades(id),
  tipo TEXT NOT NULL DEFAULT 'feriado' CHECK (tipo IN ('feriado', 'ponto_facultativo')),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('automatico', 'importado', 'manual')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(data, nome, abrangencia, uf_sigla, localidade_id)
);
CREATE INDEX idx_feriados_ano ON feriados(ano);
CREATE INDEX idx_feriados_uf ON feriados(uf_sigla);
CREATE INDEX idx_feriados_localidade ON feriados(localidade_id);

CREATE TABLE afastamentos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('ferias', 'banco_horas', 'atestado', 'falta', 'medida_disciplinar', 'licenca', 'folga_compensatoria', 'outros')),
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  justificativa TEXT,
  documento_r2_key TEXT,
  documento_nome_arquivo TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  criado_por INTEGER REFERENCES users(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_afastamentos_colaborador ON afastamentos(colaborador_id);
CREATE INDEX idx_afastamentos_periodo ON afastamentos(data_inicio, data_fim);
