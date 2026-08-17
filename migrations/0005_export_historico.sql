-- Fase 5: histórico de exportações

CREATE TABLE export_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  filtros_json TEXT,
  ciclo_referencia TEXT,
  r2_key TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  gerado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_export_historico_tipo ON export_historico(tipo);
CREATE INDEX idx_export_historico_usuario ON export_historico(usuario_id);
