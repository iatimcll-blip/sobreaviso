import type { Afastamento, AfastamentoDetalhado, AfastamentoEntrada, StatusAfastamento } from '../../../shared/types/afastamento';
import { execute, query, queryOne } from '../client';

interface AfastamentoRow {
  id: number;
  colaborador_id: number;
  tipo: Afastamento['tipo'];
  data_inicio: string;
  data_fim: string;
  justificativa: string | null;
  documento_r2_key: string | null;
  documento_nome_arquivo: string | null;
  observacao: string | null;
  status: StatusAfastamento;
  criado_em: string;
  atualizado_em: string;
  colaborador_nome: string;
}

const SELECT = `
  SELECT a.*, c.nome AS colaborador_nome
  FROM afastamentos a
  JOIN colaboradores c ON c.id = a.colaborador_id
`;

function map(row: AfastamentoRow): AfastamentoDetalhado {
  return {
    id: row.id,
    colaboradorId: row.colaborador_id,
    tipo: row.tipo,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    justificativa: row.justificativa,
    documentoR2Key: row.documento_r2_key,
    documentoNomeArquivo: row.documento_nome_arquivo,
    observacao: row.observacao,
    status: row.status,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    colaboradorNome: row.colaborador_nome,
  };
}

export interface FiltroAfastamentos {
  colaboradorId?: number;
  tipo?: Afastamento['tipo'];
  status?: StatusAfastamento;
  de?: string;
  ate?: string;
}

export async function listarAfastamentos(db: D1Database, filtro: FiltroAfastamentos = {}): Promise<AfastamentoDetalhado[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  if (filtro.colaboradorId) {
    condicoes.push('a.colaborador_id = ?');
    params.push(filtro.colaboradorId);
  }
  if (filtro.tipo) {
    condicoes.push('a.tipo = ?');
    params.push(filtro.tipo);
  }
  if (filtro.status) {
    condicoes.push('a.status = ?');
    params.push(filtro.status);
  }
  if (filtro.de) {
    condicoes.push('a.data_fim >= ?');
    params.push(filtro.de);
  }
  if (filtro.ate) {
    condicoes.push('a.data_inicio <= ?');
    params.push(filtro.ate);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const rows = await query<AfastamentoRow>(db, `${SELECT} ${where} ORDER BY a.data_inicio DESC`, params);
  return rows.map(map);
}

export async function buscarAfastamento(db: D1Database, id: number): Promise<AfastamentoDetalhado | null> {
  const row = await queryOne<AfastamentoRow>(db, `${SELECT} WHERE a.id = ?`, [id]);
  return row ? map(row) : null;
}

export async function criarAfastamento(db: D1Database, dado: AfastamentoEntrada, usuarioId: number): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO afastamentos (colaborador_id, tipo, data_inicio, data_fim, justificativa, observacao, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [dado.colaboradorId, dado.tipo, dado.dataInicio, dado.dataFim, dado.justificativa ?? null, dado.observacao ?? null, usuarioId],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarStatusAfastamento(db: D1Database, id: number, status: StatusAfastamento): Promise<void> {
  await execute(db, `UPDATE afastamentos SET status = ?, atualizado_em = datetime('now') WHERE id = ?`, [status, id]);
}

export async function anexarDocumento(db: D1Database, id: number, r2Key: string, nomeArquivo: string): Promise<void> {
  await execute(db, `UPDATE afastamentos SET documento_r2_key = ?, documento_nome_arquivo = ?, atualizado_em = datetime('now') WHERE id = ?`, [
    r2Key,
    nomeArquivo,
    id,
  ]);
}
