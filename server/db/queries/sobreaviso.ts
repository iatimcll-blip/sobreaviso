import type { Sobreaviso, SobreavisoDetalhado, SobreavisoEntrada, SobreavisoRegra, SobreavisoRegraEntrada } from '../../../shared/types/sobreaviso';
import { execute, query, queryOne } from '../client';

interface SobreavisoRow {
  id: number;
  colaborador_id: number | null;
  equipe_id: number | null;
  dupla_id: number | null;
  localidade_id: number | null;
  inicio: string;
  fim: string;
  origem: Sobreaviso['origem'];
  regra_id: number | null;
  observacoes: string | null;
  status: Sobreaviso['status'];
  criado_em: string;
  colaborador_nome: string | null;
  equipe_nome: string | null;
  dupla_nome: string | null;
  localidade_nome: string | null;
}

const SELECT = `
  SELECT s.*, c.nome AS colaborador_nome, eq.nome AS equipe_nome,
    (CASE WHEN d.id IS NOT NULL THEN COALESCE(d.nome, c1.nome || ' / ' || c2.nome) ELSE NULL END) AS dupla_nome,
    loc.nome AS localidade_nome
  FROM sobreavisos s
  LEFT JOIN colaboradores c ON c.id = s.colaborador_id
  LEFT JOIN equipes eq ON eq.id = s.equipe_id
  LEFT JOIN duplas d ON d.id = s.dupla_id
  LEFT JOIN colaboradores c1 ON c1.id = d.colaborador_1_id
  LEFT JOIN colaboradores c2 ON c2.id = d.colaborador_2_id
  LEFT JOIN localidades loc ON loc.id = s.localidade_id
`;

function map(row: SobreavisoRow): SobreavisoDetalhado {
  return {
    id: row.id,
    colaboradorId: row.colaborador_id,
    equipeId: row.equipe_id,
    duplaId: row.dupla_id,
    localidadeId: row.localidade_id,
    inicio: row.inicio,
    fim: row.fim,
    origem: row.origem,
    regraId: row.regra_id,
    observacoes: row.observacoes,
    status: row.status,
    criadoEm: row.criado_em,
    colaboradorNome: row.colaborador_nome,
    equipeNome: row.equipe_nome,
    duplaNome: row.dupla_nome,
    localidadeNome: row.localidade_nome,
  };
}

export interface FiltroSobreaviso {
  de?: string;
  ate?: string;
  colaboradorId?: number;
  equipeId?: number;
}

export async function listarSobreavisos(db: D1Database, filtro: FiltroSobreaviso = {}): Promise<SobreavisoDetalhado[]> {
  const condicoes: string[] = ["s.status != 'cancelado'"];
  const params: unknown[] = [];
  if (filtro.de) {
    condicoes.push('s.fim >= ?');
    params.push(filtro.de);
  }
  if (filtro.ate) {
    condicoes.push('s.inicio <= ?');
    params.push(filtro.ate);
  }
  if (filtro.colaboradorId) {
    condicoes.push('s.colaborador_id = ?');
    params.push(filtro.colaboradorId);
  }
  if (filtro.equipeId) {
    condicoes.push('s.equipe_id = ?');
    params.push(filtro.equipeId);
  }
  const rows = await query<SobreavisoRow>(db, `${SELECT} WHERE ${condicoes.join(' AND ')} ORDER BY s.inicio DESC`, params);
  return rows.map(map);
}

/**
 * Sobreavisos que se aplicam a um colaborador — lançados diretamente nele OU na equipe dele
 * (ex.: turno de rodízio automático gerado por equipe). Usado pelo motor de inconsistências, que
 * precisa enxergar os dois casos ao checar CLT contra a escala real do colaborador.
 */
export async function listarSobreavisosDoColaborador(
  db: D1Database,
  colaboradorId: number,
  equipeId: number | null,
  de: string,
  ate: string,
): Promise<SobreavisoDetalhado[]> {
  const rows = await query<SobreavisoRow>(
    db,
    `${SELECT} WHERE s.status != 'cancelado' AND s.fim >= ? AND s.inicio <= ? AND (s.colaborador_id = ? OR s.equipe_id = ?)
     ORDER BY s.inicio ASC`,
    [de, ate, colaboradorId, equipeId],
  );
  return rows.map(map);
}

export interface ConflitoSobreaviso {
  id: number;
  inicio: string;
  fim: string;
  colaboradorNome: string | null;
  equipeNome: string | null;
}

/** Sobreposições existentes para o mesmo colaborador OU mesma equipe no intervalo informado. */
export async function buscarConflitos(
  db: D1Database,
  dado: Pick<SobreavisoEntrada, 'colaboradorId' | 'equipeId' | 'inicio' | 'fim'>,
  ignorarId?: number,
): Promise<ConflitoSobreaviso[]> {
  const condicoes = ["s.status != 'cancelado'", 's.inicio < ?', 's.fim > ?'];
  const params: unknown[] = [dado.fim, dado.inicio];

  const alvo: string[] = [];
  if (dado.colaboradorId) {
    alvo.push('s.colaborador_id = ?');
    params.push(dado.colaboradorId);
  }
  if (dado.equipeId) {
    alvo.push('s.equipe_id = ?');
    params.push(dado.equipeId);
  }
  if (alvo.length === 0) return [];
  condicoes.push(`(${alvo.join(' OR ')})`);

  if (ignorarId) {
    condicoes.push('s.id != ?');
    params.push(ignorarId);
  }

  const rows = await query<SobreavisoRow>(db, `${SELECT} WHERE ${condicoes.join(' AND ')}`, params);
  return rows.map((row) => ({
    id: row.id,
    inicio: row.inicio,
    fim: row.fim,
    colaboradorNome: row.colaborador_nome,
    equipeNome: row.equipe_nome,
  }));
}

export async function criarSobreaviso(db: D1Database, dado: SobreavisoEntrada, usuarioId: number): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO sobreavisos (colaborador_id, equipe_id, dupla_id, localidade_id, inicio, fim, origem, observacoes, criado_por)
     VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
    [
      dado.colaboradorId ?? null,
      dado.equipeId ?? null,
      dado.duplaId ?? null,
      dado.localidadeId ?? null,
      dado.inicio,
      dado.fim,
      dado.observacoes ?? null,
      usuarioId,
    ],
  );
  return Number(resultado.meta.last_row_id);
}

export interface SobreavisoRodizioEntrada {
  equipeId: number;
  regraId: number;
  inicio: string;
  fim: string;
}

/** Materializa um turno do rodízio automático como um lançamento real de sobreaviso (origem = 'rodizio_automatico'). */
export async function criarSobreavisoRodizio(db: D1Database, dado: SobreavisoRodizioEntrada, usuarioId: number | null): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO sobreavisos (equipe_id, inicio, fim, origem, regra_id, criado_por) VALUES (?, ?, ?, 'rodizio_automatico', ?, ?)`,
    [dado.equipeId, dado.inicio, dado.fim, dado.regraId, usuarioId],
  );
  return Number(resultado.meta.last_row_id);
}

/**
 * Remove os lançamentos gerados automaticamente por uma regra que se sobrepõem a um período — pra
 * regenerar de forma idempotente. Overlap (`fim > de AND inicio <= ate`), não `inicio >= de`: o
 * primeiro turno de um ciclo pode começar antes de `de` quando a periodicidade da regra não bate
 * exatamente com a virada do ciclo (ex.: periodicidade de 10 dias) — um filtro só por `inicio` deixa
 * esse turno para trás a cada regeneração, acumulando duplicata.
 */
export async function excluirSobreavisosGeradosDaRegra(db: D1Database, regraId: number, de: string, ate: string): Promise<number> {
  const resultado = await execute(
    db,
    `DELETE FROM sobreavisos WHERE regra_id = ? AND origem = 'rodizio_automatico' AND fim > ? AND inicio <= ? RETURNING id`,
    [regraId, de, ate],
  );
  return resultado.results.length;
}

export async function cancelarSobreaviso(db: D1Database, id: number): Promise<void> {
  await execute(db, `UPDATE sobreavisos SET status = 'cancelado' WHERE id = ?`, [id]);
}

// ---- Regras de rodízio ----

interface RegraRow {
  id: number;
  nome: string;
  periodicidade_dias: number;
  hora_troca: string;
  data_inicio: string;
  ativo: number;
  observacoes: string | null;
}

interface RegraEquipeRow {
  equipe_id: number;
  ordem: number;
  equipe_nome: string;
}

interface RegraLocalidadeRow {
  localidade_id: number;
  localidade_nome: string;
}

async function anexarEquipes(db: D1Database, regras: RegraRow[]): Promise<SobreavisoRegra[]> {
  const resultado: SobreavisoRegra[] = [];
  for (const regra of regras) {
    const equipes = await query<RegraEquipeRow>(
      db,
      `SELECT re.equipe_id, re.ordem, eq.nome AS equipe_nome FROM sobreaviso_regra_equipes re
       JOIN equipes eq ON eq.id = re.equipe_id WHERE re.regra_id = ? ORDER BY re.ordem ASC`,
      [regra.id],
    );
    const localidades = await query<RegraLocalidadeRow>(
      db,
      `SELECT rl.localidade_id, loc.nome AS localidade_nome FROM sobreaviso_regra_localidades rl
       JOIN localidades loc ON loc.id = rl.localidade_id WHERE rl.regra_id = ? ORDER BY loc.nome ASC`,
      [regra.id],
    );
    resultado.push({
      id: regra.id,
      nome: regra.nome,
      periodicidadeDias: regra.periodicidade_dias,
      horaTroca: regra.hora_troca,
      dataInicio: regra.data_inicio,
      ativo: regra.ativo === 1,
      observacoes: regra.observacoes,
      equipes: equipes.map((e) => ({ equipeId: e.equipe_id, ordem: e.ordem, equipeNome: e.equipe_nome })),
      localidades: localidades.map((l) => ({ localidadeId: l.localidade_id, localidadeNome: l.localidade_nome })),
    });
  }
  return resultado;
}

export async function listarRegras(db: D1Database): Promise<SobreavisoRegra[]> {
  const rows = await query<RegraRow>(db, 'SELECT * FROM sobreaviso_regras ORDER BY ativo DESC, nome ASC');
  return anexarEquipes(db, rows);
}

export async function listarRegrasAtivas(db: D1Database): Promise<SobreavisoRegra[]> {
  const rows = await query<RegraRow>(db, 'SELECT * FROM sobreaviso_regras WHERE ativo = 1 ORDER BY nome ASC');
  return anexarEquipes(db, rows);
}

export async function buscarRegra(db: D1Database, id: number): Promise<SobreavisoRegra | null> {
  const row = await queryOne<RegraRow>(db, 'SELECT * FROM sobreaviso_regras WHERE id = ?', [id]);
  if (!row) return null;
  const [detalhada] = await anexarEquipes(db, [row]);
  return detalhada;
}

async function substituirEquipesDaRegra(db: D1Database, regraId: number, equipeIds: number[]): Promise<void> {
  await execute(db, 'DELETE FROM sobreaviso_regra_equipes WHERE regra_id = ?', [regraId]);
  for (const [ordem, equipeId] of equipeIds.entries()) {
    await execute(db, 'INSERT INTO sobreaviso_regra_equipes (regra_id, equipe_id, ordem) VALUES (?, ?, ?)', [regraId, equipeId, ordem]);
  }
}

async function substituirLocalidadesDaRegra(db: D1Database, regraId: number, localidadeIds: number[]): Promise<void> {
  await execute(db, 'DELETE FROM sobreaviso_regra_localidades WHERE regra_id = ?', [regraId]);
  for (const localidadeId of localidadeIds) {
    await execute(db, 'INSERT INTO sobreaviso_regra_localidades (regra_id, localidade_id) VALUES (?, ?)', [regraId, localidadeId]);
  }
}

export async function criarRegra(db: D1Database, dado: SobreavisoRegraEntrada): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO sobreaviso_regras (nome, periodicidade_dias, hora_troca, data_inicio, ativo, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
    [dado.nome, dado.periodicidadeDias, dado.horaTroca, dado.dataInicio, dado.ativo === false ? 0 : 1, dado.observacoes ?? null],
  );
  const id = Number(resultado.meta.last_row_id);
  await substituirEquipesDaRegra(db, id, dado.equipeIds);
  await substituirLocalidadesDaRegra(db, id, dado.localidadeIds ?? []);
  return id;
}

export async function atualizarRegra(db: D1Database, id: number, dado: SobreavisoRegraEntrada): Promise<void> {
  await execute(
    db,
    'UPDATE sobreaviso_regras SET nome = ?, periodicidade_dias = ?, hora_troca = ?, data_inicio = ?, ativo = ?, observacoes = ? WHERE id = ?',
    [dado.nome, dado.periodicidadeDias, dado.horaTroca, dado.dataInicio, dado.ativo === false ? 0 : 1, dado.observacoes ?? null, id],
  );
  await substituirEquipesDaRegra(db, id, dado.equipeIds);
  await substituirLocalidadesDaRegra(db, id, dado.localidadeIds ?? []);
}
