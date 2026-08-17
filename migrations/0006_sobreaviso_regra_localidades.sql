CREATE TABLE sobreaviso_regra_localidades (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  regra_id INTEGER NOT NULL REFERENCES sobreaviso_regras(id),
  localidade_id INTEGER NOT NULL REFERENCES localidades(id),
  UNIQUE(regra_id, localidade_id)
);
CREATE INDEX idx_sobreaviso_regra_localidades_regra ON sobreaviso_regra_localidades(regra_id);
