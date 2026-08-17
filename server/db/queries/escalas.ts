import type { EscalaAtribuicao } from '../../../shared/calculo/jornada';
import type { EscalaModelo, EscalaModeloDetalhado, EscalaModeloEntrada, EscalaTurno, EscalaVinculo, EscalaVinculoEntrada } from '../../../shared/types/escala';
import { execute, query, queryOne } from '../client';

interface EscalaModeloRow {
  id: number;
  nome: string;
  tipo: EscalaModelo['tipo'];
  turno: EscalaModelo['turno'];
  duracao_intervalo_minutos: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string | null;
  possui_acordo_coletivo: number;
  ativo: number;
  observacoes: string | null;
  duplicado_de_id: number | null;
  criado_em: string;
  atualizado_em: string;
  total_vinculos: number;
}

interface EscalaTurnoRow {
  id: number;
  ciclo_dia: number;
  hora_entrada: string | null;
  hora_saida: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  folga: number;
}

function mapModelo(row: EscalaModeloRow): EscalaModelo & { totalVinculos: number } {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    turno: row.turno,
    duracaoIntervaloMinutos: row.duracao_intervalo_minutos,
    dataInicioVigencia: row.data_inicio_vigencia,
    dataFimVigencia: row.data_fim_vigencia,
    possuiAcordoColetivo: row.possui_acordo_coletivo === 1,
    ativo: row.ativo === 1,
    observacoes: row.observacoes,
    duplicadoDeId: row.duplicado_de_id,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    totalVinculos: row.total_vinculos,
  };
}

function mapTurno(row: EscalaTurnoRow): EscalaTurno {
  return {
    id: row.id,
    cicloDia: row.ciclo_dia,
    horaEntrada: row.hora_entrada,
    horaSaida: row.hora_saida,
    intervaloInicio: row.intervalo_inicio,
    intervaloFim: row.intervalo_fim,
    folga: row.folga === 1,
  };
}

const SELECT_MODELO = `
  SELECT m.*, (SELECT COUNT(*) FROM escala_vinculos v WHERE v.escala_modelo_id = m.id) AS total_vinculos
  FROM escalas_modelo m
`;

export async function listarEscalasModelo(db: D1Database): Promise<(EscalaModelo & { totalVinculos: number })[]> {
  const rows = await query<EscalaModeloRow>(db, `${SELECT_MODELO} ORDER BY m.nome ASC`);
  return rows.map(mapModelo);
}

export async function buscarEscalaModeloDetalhada(db: D1Database, id: number): Promise<EscalaModeloDetalhado | null> {
  const row = await queryOne<EscalaModeloRow>(db, `${SELECT_MODELO} WHERE m.id = ?`, [id]);
  if (!row) return null;
  const turnos = await query<EscalaTurnoRow>(db, 'SELECT * FROM escalas_turno WHERE escala_modelo_id = ? ORDER BY ciclo_dia ASC', [id]);
  return { ...mapModelo(row), turnos: turnos.map(mapTurno) };
}

async function substituirTurnos(db: D1Database, escalaModeloId: number, turnos: EscalaTurno[]): Promise<void> {
  await execute(db, 'DELETE FROM escalas_turno WHERE escala_modelo_id = ?', [escalaModeloId]);
  for (const turno of turnos) {
    await execute(
      db,
      `INSERT INTO escalas_turno (escala_modelo_id, ciclo_dia, hora_entrada, hora_saida, intervalo_inicio, intervalo_fim, folga)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [escalaModeloId, turno.cicloDia, turno.horaEntrada, turno.horaSaida, turno.intervaloInicio, turno.intervaloFim, turno.folga ? 1 : 0],
    );
  }
}

export async function criarEscalaModelo(db: D1Database, dado: EscalaModeloEntrada, usuarioId: number): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO escalas_modelo (
      nome, tipo, turno, duracao_intervalo_minutos, data_inicio_vigencia, data_fim_vigencia,
      possui_acordo_coletivo, ativo, observacoes, criado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dado.nome,
      dado.tipo,
      dado.turno,
      dado.duracaoIntervaloMinutos,
      dado.dataInicioVigencia,
      dado.dataFimVigencia ?? null,
      dado.possuiAcordoColetivo ? 1 : 0,
      dado.ativo === false ? 0 : 1,
      dado.observacoes ?? null,
      usuarioId,
    ],
  );
  const id = Number(resultado.meta.last_row_id);
  await substituirTurnos(db, id, dado.turnos);
  return id;
}

export async function atualizarEscalaModelo(db: D1Database, id: number, dado: EscalaModeloEntrada): Promise<void> {
  await execute(
    db,
    `UPDATE escalas_modelo SET
      nome = ?, tipo = ?, turno = ?, duracao_intervalo_minutos = ?, data_inicio_vigencia = ?, data_fim_vigencia = ?,
      possui_acordo_coletivo = ?, ativo = ?, observacoes = ?, atualizado_em = datetime('now')
    WHERE id = ?`,
    [
      dado.nome,
      dado.tipo,
      dado.turno,
      dado.duracaoIntervaloMinutos,
      dado.dataInicioVigencia,
      dado.dataFimVigencia ?? null,
      dado.possuiAcordoColetivo ? 1 : 0,
      dado.ativo === false ? 0 : 1,
      dado.observacoes ?? null,
      id,
    ],
  );
  await substituirTurnos(db, id, dado.turnos);
}

export async function duplicarEscalaModelo(db: D1Database, id: number, novoNome: string, usuarioId: number): Promise<number> {
  const original = await buscarEscalaModeloDetalhada(db, id);
  if (!original) throw new Error('Escala não encontrada.');

  const resultado = await execute(
    db,
    `INSERT INTO escalas_modelo (
      nome, tipo, turno, duracao_intervalo_minutos, data_inicio_vigencia, data_fim_vigencia,
      possui_acordo_coletivo, ativo, observacoes, duplicado_de_id, criado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      novoNome,
      original.tipo,
      original.turno,
      original.duracaoIntervaloMinutos,
      original.dataInicioVigencia,
      original.dataFimVigencia,
      original.possuiAcordoColetivo ? 1 : 0,
      1,
      original.observacoes,
      id,
      usuarioId,
    ],
  );
  const novoId = Number(resultado.meta.last_row_id);
  await substituirTurnos(db, novoId, original.turnos);
  return novoId;
}

const SELECT_VINCULO = `
  SELECT v.*, c.nome AS colaborador_nome, eq.nome AS equipe_nome, loc.nome AS localidade_nome
  FROM escala_vinculos v
  LEFT JOIN colaboradores c ON c.id = v.colaborador_id
  LEFT JOIN equipes eq ON eq.id = v.equipe_id
  LEFT JOIN localidades loc ON loc.id = v.localidade_id
`;

interface EscalaVinculoRow {
  id: number;
  escala_modelo_id: number;
  colaborador_id: number | null;
  equipe_id: number | null;
  localidade_id: number | null;
  data_inicio: string;
  data_fim: string | null;
  colaborador_nome: string | null;
  equipe_nome: string | null;
  localidade_nome: string | null;
}

function mapVinculo(row: EscalaVinculoRow): EscalaVinculo {
  return {
    id: row.id,
    escalaModeloId: row.escala_modelo_id,
    colaboradorId: row.colaborador_id,
    equipeId: row.equipe_id,
    localidadeId: row.localidade_id,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    colaboradorNome: row.colaborador_nome,
    equipeNome: row.equipe_nome,
    localidadeNome: row.localidade_nome,
  };
}

export async function listarVinculosDaEscala(db: D1Database, escalaModeloId: number): Promise<EscalaVinculo[]> {
  const rows = await query<EscalaVinculoRow>(db, `${SELECT_VINCULO} WHERE v.escala_modelo_id = ? ORDER BY v.data_inicio DESC`, [
    escalaModeloId,
  ]);
  return rows.map(mapVinculo);
}

export async function criarVinculo(db: D1Database, escalaModeloId: number, dado: EscalaVinculoEntrada): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO escala_vinculos (escala_modelo_id, colaborador_id, equipe_id, localidade_id, data_inicio, data_fim)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [escalaModeloId, dado.colaboradorId ?? null, dado.equipeId ?? null, dado.localidadeId ?? null, dado.dataInicio, dado.dataFim ?? null],
  );
  return Number(resultado.meta.last_row_id);
}

export async function excluirVinculo(db: D1Database, id: number): Promise<void> {
  await execute(db, 'DELETE FROM escala_vinculos WHERE id = ?', [id]);
}

interface AtribuicaoRow {
  data_inicio: string;
  data_fim: string | null;
  origem: EscalaAtribuicao['origemVinculo'];
  modelo_id: number;
  nome: string;
  tipo: EscalaModelo['tipo'];
  possui_acordo_coletivo: number;
}

interface EscalaTurnoRowSimples {
  escala_modelo_id: number;
  ciclo_dia: number;
  hora_entrada: string | null;
  hora_saida: string | null;
  intervalo_inicio: string | null;
  intervalo_fim: string | null;
  folga: number;
}

/**
 * Escalas aplicáveis a um colaborador (vínculo direto, pela equipe, ou pela localidade), já com os
 * turnos resolvidos — entrada pronta para shared/calculo/jornada.ts::resolverTurnosDoPeriodo.
 */
export async function listarAtribuicoesDoColaborador(
  db: D1Database,
  colaboradorId: number,
  equipeId: number | null,
  localidadeId: number | null,
): Promise<EscalaAtribuicao[]> {
  const rows = await query<AtribuicaoRow>(
    db,
    `SELECT v.data_inicio, v.data_fim,
       CASE WHEN v.colaborador_id IS NOT NULL THEN 'colaborador' WHEN v.equipe_id IS NOT NULL THEN 'equipe' ELSE 'localidade' END AS origem,
       m.id AS modelo_id, m.nome, m.tipo, m.possui_acordo_coletivo
     FROM escala_vinculos v
     JOIN escalas_modelo m ON m.id = v.escala_modelo_id
     WHERE v.colaborador_id = ? OR v.equipe_id = ? OR v.localidade_id = ?`,
    [colaboradorId, equipeId, localidadeId],
  );
  if (rows.length === 0) return [];

  const modeloIds = [...new Set(rows.map((r) => r.modelo_id))];
  const turnosRows = await query<EscalaTurnoRowSimples>(
    db,
    `SELECT * FROM escalas_turno WHERE escala_modelo_id IN (${modeloIds.map(() => '?').join(',')})`,
    modeloIds,
  );
  const turnosPorModelo = new Map<number, EscalaTurno[]>();
  for (const t of turnosRows) {
    const lista = turnosPorModelo.get(t.escala_modelo_id) ?? [];
    lista.push({
      cicloDia: t.ciclo_dia,
      horaEntrada: t.hora_entrada,
      horaSaida: t.hora_saida,
      intervaloInicio: t.intervalo_inicio,
      intervaloFim: t.intervalo_fim,
      folga: t.folga === 1,
    });
    turnosPorModelo.set(t.escala_modelo_id, lista);
  }

  return rows.map((r) => ({
    escalaModeloId: r.modelo_id,
    escalaNome: r.nome,
    tipo: r.tipo,
    possuiAcordoColetivo: r.possui_acordo_coletivo === 1,
    turnos: turnosPorModelo.get(r.modelo_id) ?? [],
    vinculoDataInicio: r.data_inicio,
    vinculoDataFim: r.data_fim,
    origemVinculo: r.origem,
  }));
}

export interface VinculoParaRelatorio {
  escalaModeloId: number;
  escalaNome: string;
  tipo: EscalaModelo['tipo'];
  colaboradorId: number | null;
  colaboradorNome: string | null;
  equipeId: number | null;
  equipeNome: string | null;
  localidadeId: number | null;
  localidadeNome: string | null;
  dataInicio: string;
  dataFim: string | null;
}

/** Todos os vínculos de escala (colaborador/equipe/localidade), com o nome do modelo — usado no relatório de Escalas. */
export async function listarTodosVinculosComEscala(db: D1Database): Promise<VinculoParaRelatorio[]> {
  const rows = await query<{
    id: number;
    escala_modelo_id: number;
    escala_nome: string;
    tipo: EscalaModelo['tipo'];
    colaborador_id: number | null;
    colaborador_nome: string | null;
    equipe_id: number | null;
    equipe_nome: string | null;
    localidade_id: number | null;
    localidade_nome: string | null;
    data_inicio: string;
    data_fim: string | null;
  }>(
    db,
    `SELECT v.id, v.escala_modelo_id, m.nome AS escala_nome, m.tipo,
       v.colaborador_id, c.nome AS colaborador_nome,
       v.equipe_id, eq.nome AS equipe_nome,
       v.localidade_id, loc.nome AS localidade_nome,
       v.data_inicio, v.data_fim
     FROM escala_vinculos v
     JOIN escalas_modelo m ON m.id = v.escala_modelo_id
     LEFT JOIN colaboradores c ON c.id = v.colaborador_id
     LEFT JOIN equipes eq ON eq.id = v.equipe_id
     LEFT JOIN localidades loc ON loc.id = v.localidade_id
     ORDER BY v.data_inicio DESC`,
  );

  return rows.map((r) => ({
    escalaModeloId: r.escala_modelo_id,
    escalaNome: r.escala_nome,
    tipo: r.tipo,
    colaboradorId: r.colaborador_id,
    colaboradorNome: r.colaborador_nome,
    equipeId: r.equipe_id,
    equipeNome: r.equipe_nome,
    localidadeId: r.localidade_id,
    localidadeNome: r.localidade_nome,
    dataInicio: r.data_inicio,
    dataFim: r.data_fim,
  }));
}
