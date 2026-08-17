import type { InconsistenciaDetectada, SeveridadeInconsistencia, StatusInconsistencia, TipoInconsistencia } from '../../../shared/calculo/inconsistencias';
import type { InconsistenciaDetalhada } from '../../../shared/types/inconsistencia';
import { execute, query, queryOne } from '../client';

export type { InconsistenciaDetalhada };

interface InconsistenciaRow {
  id: number;
  tipo: TipoInconsistencia;
  colaborador_id: number | null;
  equipe_id: number | null;
  localidade_id: number | null;
  data_referencia: string;
  ciclo_referencia: string;
  severidade: SeveridadeInconsistencia;
  descricao: string;
  entidade_relacionada_tipo: string | null;
  entidade_relacionada_id: number | null;
  status: StatusInconsistencia;
  justificativa: string | null;
  revisado_por: number | null;
  revisado_em: string | null;
  detectado_em: string;
  colaborador_nome: string | null;
  equipe_nome: string | null;
  localidade_nome: string | null;
}

const SELECT = `
  SELECT i.*, c.nome AS colaborador_nome, eq.nome AS equipe_nome, loc.nome AS localidade_nome
  FROM inconsistencias i
  LEFT JOIN colaboradores c ON c.id = i.colaborador_id
  LEFT JOIN equipes eq ON eq.id = i.equipe_id
  LEFT JOIN localidades loc ON loc.id = i.localidade_id
`;

function map(row: InconsistenciaRow): InconsistenciaDetalhada {
  return {
    id: row.id,
    tipo: row.tipo,
    colaboradorId: row.colaborador_id,
    equipeId: row.equipe_id,
    localidadeId: row.localidade_id,
    dataReferencia: row.data_referencia,
    cicloReferencia: row.ciclo_referencia,
    severidade: row.severidade,
    descricao: row.descricao,
    entidadeRelacionadaTipo: row.entidade_relacionada_tipo,
    entidadeRelacionadaId: row.entidade_relacionada_id,
    status: row.status,
    justificativa: row.justificativa,
    revisadoPor: row.revisado_por,
    revisadoEm: row.revisado_em,
    detectadoEm: row.detectado_em,
    colaboradorNome: row.colaborador_nome,
    equipeNome: row.equipe_nome,
    localidadeNome: row.localidade_nome,
  };
}

export interface FiltroInconsistencias {
  cicloReferencia?: string;
  colaboradorId?: number;
  equipeId?: number;
  ufSigla?: string;
  localidadeId?: number;
  status?: StatusInconsistencia;
  tipo?: TipoInconsistencia;
}

export async function listarInconsistencias(db: D1Database, filtro: FiltroInconsistencias = {}): Promise<InconsistenciaDetalhada[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  if (filtro.cicloReferencia) {
    condicoes.push('i.ciclo_referencia = ?');
    params.push(filtro.cicloReferencia);
  }
  if (filtro.colaboradorId) {
    condicoes.push('i.colaborador_id = ?');
    params.push(filtro.colaboradorId);
  }
  if (filtro.equipeId) {
    condicoes.push('i.equipe_id = ?');
    params.push(filtro.equipeId);
  }
  if (filtro.ufSigla) {
    condicoes.push('c.uf_sigla = ?');
    params.push(filtro.ufSigla);
  }
  if (filtro.localidadeId) {
    condicoes.push('c.localidade_id = ?');
    params.push(filtro.localidadeId);
  }
  if (filtro.status) {
    condicoes.push('i.status = ?');
    params.push(filtro.status);
  }
  if (filtro.tipo) {
    condicoes.push('i.tipo = ?');
    params.push(filtro.tipo);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const rows = await query<InconsistenciaRow>(
    db,
    `${SELECT} ${where} ORDER BY (i.status = 'pendente') DESC, i.severidade DESC, i.data_referencia DESC`,
    params,
  );
  return rows.map(map);
}

export async function buscarInconsistenciaPorId(db: D1Database, id: number): Promise<InconsistenciaDetalhada | null> {
  const row = await queryOne<InconsistenciaRow>(db, `${SELECT} WHERE i.id = ?`, [id]);
  return row ? map(row) : null;
}

export async function contarPendentes(db: D1Database): Promise<number> {
  const row = await queryOne<{ total: number }>(
    db,
    `SELECT COUNT(*) AS total FROM inconsistencias WHERE status IN ('pendente', 'em_revisao')`,
  );
  return row?.total ?? 0;
}

export async function buscarPorChaveNatural(
  db: D1Database,
  tipo: TipoInconsistencia,
  colaboradorId: number | null,
  equipeId: number | null,
  dataReferencia: string,
): Promise<InconsistenciaDetalhada | null> {
  const row = await queryOne<InconsistenciaRow>(
    db,
    `${SELECT} WHERE i.tipo = ? AND i.colaborador_id IS NOT DISTINCT FROM ? AND i.equipe_id IS NOT DISTINCT FROM ? AND i.data_referencia = ?`,
    [tipo, colaboradorId, equipeId, dataReferencia],
  );
  return row ? map(row) : null;
}

export async function listarAtivasDoColaboradorNoCiclo(db: D1Database, colaboradorId: number, cicloReferencia: string): Promise<InconsistenciaDetalhada[]> {
  const rows = await query<InconsistenciaRow>(
    db,
    `${SELECT} WHERE i.colaborador_id = ? AND i.ciclo_referencia = ? AND i.status IN ('pendente', 'em_revisao')`,
    [colaboradorId, cicloReferencia],
  );
  return rows.map(map);
}

export async function criarInconsistencia(db: D1Database, dado: InconsistenciaDetectada, cicloReferencia: string): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO inconsistencias
      (tipo, colaborador_id, equipe_id, localidade_id, data_referencia, ciclo_referencia, severidade, descricao, entidade_relacionada_tipo, entidade_relacionada_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dado.tipo,
      dado.colaboradorId,
      dado.equipeId,
      dado.localidadeId,
      dado.dataReferencia,
      cicloReferencia,
      dado.severidade,
      dado.descricao,
      dado.entidadeRelacionadaTipo ?? null,
      dado.entidadeRelacionadaId ?? null,
    ],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarDescricaoSeveridade(db: D1Database, id: number, descricao: string, severidade: SeveridadeInconsistencia): Promise<void> {
  await execute(db, 'UPDATE inconsistencias SET descricao = ?, severidade = ? WHERE id = ?', [descricao, severidade, id]);
}

export async function marcarComoCorrigida(db: D1Database, id: number): Promise<void> {
  await execute(db, `UPDATE inconsistencias SET status = 'corrigida', revisado_em = datetime('now') WHERE id = ?`, [id]);
}

export async function atualizarStatusRevisao(
  db: D1Database,
  id: number,
  status: StatusInconsistencia,
  justificativa: string | null,
  usuarioId: number,
): Promise<void> {
  await execute(
    db,
    `UPDATE inconsistencias SET status = ?, justificativa = ?, revisado_por = ?, revisado_em = datetime('now') WHERE id = ?`,
    [status, justificativa, usuarioId, id],
  );
}
