ALTER TABLE equipe_membros DROP CONSTRAINT equipe_membros_papel_check;
ALTER TABLE equipe_membros ADD CONSTRAINT equipe_membros_papel_check
  CHECK (papel IN ('tecnico', 'oficial', 'auxiliar', 'supervisor', 'ga', 'go'));
