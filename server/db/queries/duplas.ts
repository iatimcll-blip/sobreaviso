import type { DuplaDetalhada, DuplaEntrada } from '../../../shared/types/dupla';
import { execute, query, queryOne } from '../client';

interface DuplaRow {
  id: number;
  equipe_id: number | null;
  nome: string | null;
  colaborador_1_id: number;
  colaborador_2_id: number | null;
  ativo: number;
  data_inicio: string;
  data_fim: string | null;
  equipe_nome: string | null;
  colaborador_1_nome: string;
  colaborador_2_nome: string | null;
}

const SELECT = `
  SELECT d.*, eq.nome AS equipe_nome, c1.nome AS colaborador_1_nome, c2.nome AS colaborador_2_nome
  FROM duplas d
  LEFT JOIN equipes eq ON eq.id = d.equipe_id
  JOIN colaboradores c1 ON c1.id = d.colaborador_1_id
  LEFT JOIN colaboradores c2 ON c2.id = d.colaborador_2_id
`;

function map(row: DuplaRow): DuplaDetalhada {
  return {
    id: row.id,
    equipeId: row.equipe_id,
    nome: row.nome,
    colaborador1Id: row.colaborador_1_id,
    colaborador2Id: row.colaborador_2_id,
    ativo: row.ativo === 1,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    equipeNome: row.equipe_nome,
    colaborador1Nome: row.colaborador_1_nome,
    colaborador2Nome: row.colaborador_2_nome,
    incompleta: row.colaborador_2_id === null,
  };
}

export async function listarDuplas(db: D1Database): Promise<DuplaDetalhada[]> {
  const rows = await query<DuplaRow>(db, `${SELECT} ORDER BY d.ativo DESC, c1.nome ASC`);
  return rows.map(map);
}

export async function buscarDupla(db: D1Database, id: number): Promise<DuplaDetalhada | null> {
  const row = await queryOne<DuplaRow>(db, `${SELECT} WHERE d.id = ?`, [id]);
  return row ? map(row) : null;
}

export async function criarDupla(db: D1Database, dado: DuplaEntrada): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO duplas (equipe_id, nome, colaborador_1_id, colaborador_2_id, ativo, data_inicio, data_fim) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      dado.equipeId ?? null,
      dado.nome ?? null,
      dado.colaborador1Id,
      dado.colaborador2Id ?? null,
      dado.ativo === false ? 0 : 1,
      dado.dataInicio,
      dado.dataFim ?? null,
    ],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarDupla(db: D1Database, id: number, dado: DuplaEntrada): Promise<void> {
  await execute(
    db,
    `UPDATE duplas SET equipe_id = ?, nome = ?, colaborador_1_id = ?, colaborador_2_id = ?, ativo = ?, data_inicio = ?, data_fim = ? WHERE id = ?`,
    [
      dado.equipeId ?? null,
      dado.nome ?? null,
      dado.colaborador1Id,
      dado.colaborador2Id ?? null,
      dado.ativo === false ? 0 : 1,
      dado.dataInicio,
      dado.dataFim ?? null,
      id,
    ],
  );
}

export async function excluirDupla(db: D1Database, id: number): Promise<void> {
  await execute(db, 'DELETE FROM duplas WHERE id = ?', [id]);
}
