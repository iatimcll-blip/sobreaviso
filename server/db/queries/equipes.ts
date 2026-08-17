import type { Equipe, EquipeDetalhada, EquipeEntrada, EquipeMembro, EquipeMembroEntrada } from '../../../shared/types/equipe';
import { execute, query, queryOne } from '../client';

interface EquipeRow {
  id: number;
  nome: string;
  localidade_id: number | null;
  supervisor_id: number | null;
  gestor_administrativo_id: number | null;
  gestor_operacional_id: number | null;
  ativo: number;
}

interface EquipeDetalhadaRow extends EquipeRow {
  localidade_nome: string | null;
  supervisor_nome: string | null;
  gestor_administrativo_nome: string | null;
  gestor_operacional_nome: string | null;
  total_membros: number;
}

function map(row: EquipeRow): Equipe {
  return {
    id: row.id,
    nome: row.nome,
    localidadeId: row.localidade_id,
    supervisorId: row.supervisor_id,
    gestorAdministrativoId: row.gestor_administrativo_id,
    gestorOperacionalId: row.gestor_operacional_id,
    ativo: row.ativo === 1,
  };
}

function mapDetalhada(row: EquipeDetalhadaRow): EquipeDetalhada {
  return {
    ...map(row),
    localidadeNome: row.localidade_nome,
    supervisorNome: row.supervisor_nome,
    gestorAdministrativoNome: row.gestor_administrativo_nome,
    gestorOperacionalNome: row.gestor_operacional_nome,
    totalMembros: row.total_membros,
  };
}

const SELECT_DETALHADA = `
  SELECT
    e.*, loc.nome AS localidade_nome, sup.nome AS supervisor_nome, ga.nome AS gestor_administrativo_nome, go.nome AS gestor_operacional_nome,
    (SELECT COUNT(*) FROM equipe_membros m WHERE m.equipe_id = e.id AND m.data_fim IS NULL) AS total_membros
  FROM equipes e
  LEFT JOIN localidades loc ON loc.id = e.localidade_id
  LEFT JOIN colaboradores sup ON sup.id = e.supervisor_id
  LEFT JOIN colaboradores ga ON ga.id = e.gestor_administrativo_id
  LEFT JOIN colaboradores go ON go.id = e.gestor_operacional_id
`;

export async function listarEquipes(db: D1Database, somenteAtivas = false): Promise<Equipe[]> {
  const where = somenteAtivas ? 'WHERE ativo = 1' : '';
  const rows = await query<EquipeRow>(db, `SELECT * FROM equipes ${where} ORDER BY nome ASC`);
  return rows.map(map);
}

export async function listarEquipesDetalhadas(db: D1Database): Promise<EquipeDetalhada[]> {
  const rows = await query<EquipeDetalhadaRow>(db, `${SELECT_DETALHADA} ORDER BY e.nome ASC`);
  return rows.map(mapDetalhada);
}

export async function buscarEquipeDetalhada(db: D1Database, id: number): Promise<EquipeDetalhada | null> {
  const row = await queryOne<EquipeDetalhadaRow>(db, `${SELECT_DETALHADA} WHERE e.id = ?`, [id]);
  return row ? mapDetalhada(row) : null;
}

export async function buscarEquipePorNome(db: D1Database, nome: string): Promise<{ id: number } | null> {
  return queryOne<{ id: number }>(db, 'SELECT id FROM equipes WHERE UPPER(nome) = UPPER(?)', [nome.trim()]);
}

export async function criarEquipeSeNaoExistir(db: D1Database, nome: string): Promise<number> {
  const existente = await buscarEquipePorNome(db, nome);
  if (existente) return existente.id;
  const resultado = await execute(db, 'INSERT INTO equipes (nome) VALUES (?)', [nome.trim()]);
  return Number(resultado.meta.last_row_id);
}

export async function criarEquipe(db: D1Database, dado: EquipeEntrada): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO equipes (nome, localidade_id, supervisor_id, gestor_administrativo_id, gestor_operacional_id, ativo) VALUES (?, ?, ?, ?, ?, ?)',
    [
      dado.nome,
      dado.localidadeId ?? null,
      dado.supervisorId ?? null,
      dado.gestorAdministrativoId ?? null,
      dado.gestorOperacionalId ?? null,
      dado.ativo === false ? 0 : 1,
    ],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarEquipe(db: D1Database, id: number, dado: EquipeEntrada): Promise<void> {
  await execute(
    db,
    `UPDATE equipes SET nome = ?, localidade_id = ?, supervisor_id = ?, gestor_administrativo_id = ?, gestor_operacional_id = ?, ativo = ?, atualizado_em = datetime('now')
     WHERE id = ?`,
    [
      dado.nome,
      dado.localidadeId ?? null,
      dado.supervisorId ?? null,
      dado.gestorAdministrativoId ?? null,
      dado.gestorOperacionalId ?? null,
      dado.ativo === false ? 0 : 1,
      id,
    ],
  );
}

interface EquipeMembroRow {
  id: number;
  equipe_id: number;
  colaborador_id: number;
  papel: EquipeMembro['papel'];
  data_inicio: string;
  data_fim: string | null;
  colaborador_nome: string;
}

export async function listarMembrosAtivos(db: D1Database, equipeId: number): Promise<EquipeMembro[]> {
  const rows = await query<EquipeMembroRow>(
    db,
    `SELECT m.*, c.nome AS colaborador_nome FROM equipe_membros m
     JOIN colaboradores c ON c.id = m.colaborador_id
     WHERE m.equipe_id = ? AND m.data_fim IS NULL
     ORDER BY m.papel ASC, c.nome ASC`,
    [equipeId],
  );
  return rows.map((row) => ({
    id: row.id,
    equipeId: row.equipe_id,
    colaboradorId: row.colaborador_id,
    papel: row.papel,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    colaboradorNome: row.colaborador_nome,
  }));
}

export async function adicionarMembro(db: D1Database, equipeId: number, dado: EquipeMembroEntrada): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO equipe_membros (equipe_id, colaborador_id, papel, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?)',
    [equipeId, dado.colaboradorId, dado.papel, dado.dataInicio, dado.dataFim ?? null],
  );
  return Number(resultado.meta.last_row_id);
}

export async function encerrarMembro(db: D1Database, membroId: number): Promise<void> {
  await execute(db, `UPDATE equipe_membros SET data_fim = date('now') WHERE id = ?`, [membroId]);
}
