import type { ConflitoAfastamento } from '../../../shared/types/afastamento';
import { query } from '../../db/client';

/**
 * Verificação em tempo real (não substitui a varredura completa da Fase 4 — Inconsistências),
 * usada para alertar já no lançamento do afastamento sobre conflito com sobreaviso ou escala vigente.
 */
export async function buscarConflitosAfastamento(
  db: D1Database,
  colaboradorId: number,
  dataInicio: string,
  dataFim: string,
): Promise<ConflitoAfastamento[]> {
  const inicioDatetime = `${dataInicio} 00:00:00`;
  const fimDatetime = `${dataFim} 23:59:59`;
  const conflitos: ConflitoAfastamento[] = [];

  const sobreavisos = await query<{ inicio: string; fim: string; equipe_nome: string | null }>(
    db,
    `SELECT s.inicio, s.fim, eq.nome AS equipe_nome FROM sobreavisos s
     LEFT JOIN equipes eq ON eq.id = s.equipe_id
     WHERE s.colaborador_id = ? AND s.status != 'cancelado' AND s.inicio < ? AND s.fim > ?`,
    [colaboradorId, fimDatetime, inicioDatetime],
  );
  for (const s of sobreavisos) {
    conflitos.push({ tipo: 'sobreaviso', descricao: 'Sobreaviso lançado para este colaborador no período.', inicio: s.inicio, fim: s.fim });
  }

  const escalas = await query<{ nome: string; data_inicio: string; data_fim: string | null }>(
    db,
    `SELECT DISTINCT m.nome, v.data_inicio, v.data_fim
     FROM escala_vinculos v
     JOIN escalas_modelo m ON m.id = v.escala_modelo_id
     WHERE (v.colaborador_id = ? OR v.equipe_id = (SELECT equipe_id FROM colaboradores WHERE id = ?))
       AND v.data_inicio <= ? AND (v.data_fim IS NULL OR v.data_fim >= ?)`,
    [colaboradorId, colaboradorId, dataFim, dataInicio],
  );
  for (const e of escalas) {
    conflitos.push({
      tipo: 'escala',
      descricao: `Escala "${e.nome}" vigente para este colaborador no período.`,
      inicio: e.data_inicio,
      fim: e.data_fim ?? 'indeterminado',
    });
  }

  return conflitos;
}
