import { cicloPorRotulo } from '../../../shared/calculo/ciclo';
import { calcularRodizio, gerarTurnosRodizio } from '../../../shared/calculo/rodizio';
import type { EquipeMembro } from '../../../shared/types/equipe';
import type { StatusRodizio } from '../../../shared/types/sobreaviso';
import { listarMembrosAtivos } from '../../db/queries/equipes';
import { buscarRegra, criarSobreavisoRodizio, excluirSobreavisosGeradosDaRegra, listarRegrasAtivas } from '../../db/queries/sobreaviso';

/** Calcula, para cada regra de rodízio ativa, qual equipe está de plantão agora e qual é a próxima. */
export async function calcularStatusRodizios(db: D1Database, agora: Date = new Date()): Promise<StatusRodizio[]> {
  const regras = await listarRegrasAtivas(db);
  const resultado: StatusRodizio[] = [];

  for (const regra of regras) {
    const calculo = calcularRodizio(
      { dataInicio: regra.dataInicio, horaTroca: regra.horaTroca, periodicidadeDias: regra.periodicidadeDias, equipes: regra.equipes },
      agora,
    );
    if (!calculo) continue;
    resultado.push({
      regraId: regra.id,
      regraNome: regra.nome,
      equipeAtualId: calculo.equipeAtual.equipeId,
      equipeAtualNome: calculo.equipeAtual.equipeNome,
      equipeProximaId: calculo.equipeProxima.equipeId,
      equipeProximaNome: calculo.equipeProxima.equipeNome,
      inicioTurnoAtual: calculo.inicioTurnoAtual,
      fimTurnoAtual: calculo.fimTurnoAtual,
    });
  }

  return resultado;
}

export interface TurnoGerado {
  equipeId: number;
  equipeNome: string;
  colaboradorId: number | null;
  colaboradorNome: string | null;
  inicio: string;
  fim: string;
}

export interface ResultadoGeracaoSobreaviso {
  regraId: number;
  cicloRotulo: string;
  removidos: number;
  criados: number;
  turnos: TurnoGerado[];
}

/**
 * Materializa o rodízio de uma regra como lançamentos reais de sobreaviso (origem =
 * 'rodizio_automatico') para o ciclo informado — um lançamento por colaborador membro ativo da
 * equipe de plantão em cada turno (não um só pra equipe toda), pra refletir o sobreaviso completo
 * dos colaboradores. Se a equipe não tiver membro cadastrado, cai de volta pra um lançamento
 * equipe-scoped (colaboradorId null) só pra não perder a rotação silenciosamente. Idempotente:
 * primeiro remove só o que essa mesma regra já havia gerado automaticamente nesse período (nunca
 * lançamentos manuais) e recria do zero — pode ser chamado de novo com segurança se a regra ou os
 * membros da equipe mudarem.
 */
export async function gerarSobreavisoAutomatico(
  db: D1Database,
  regraId: number,
  cicloRotulo: string,
  usuarioId: number,
): Promise<ResultadoGeracaoSobreaviso> {
  const regra = await buscarRegra(db, regraId);
  if (!regra) throw new Error('Regra de rodízio não encontrada.');
  if (regra.equipes.length === 0) throw new Error('A regra não tem equipes configuradas no rodízio.');

  const ciclo = cicloPorRotulo(cicloRotulo);
  const turnos = gerarTurnosRodizio(
    { dataInicio: regra.dataInicio, horaTroca: regra.horaTroca, periodicidadeDias: regra.periodicidadeDias, equipes: regra.equipes },
    ciclo.inicio,
    ciclo.fim,
  );

  const removidos = await excluirSobreavisosGeradosDaRegra(db, regraId, `${ciclo.inicio}T00:00:00.000Z`, `${ciclo.fim}T23:59:59.999Z`);

  const membrosPorEquipe = new Map<number, EquipeMembro[]>();
  async function membrosDaEquipe(equipeId: number): Promise<EquipeMembro[]> {
    let membros = membrosPorEquipe.get(equipeId);
    if (!membros) {
      membros = await listarMembrosAtivos(db, equipeId);
      membrosPorEquipe.set(equipeId, membros);
    }
    return membros;
  }

  const turnosGerados: TurnoGerado[] = [];
  for (const turno of turnos) {
    const equipeId = turno.equipeAtual.equipeId;
    const equipeNome = turno.equipeAtual.equipeNome;
    const membros = await membrosDaEquipe(equipeId);

    if (membros.length === 0) {
      await criarSobreavisoRodizio(db, { equipeId, regraId, inicio: turno.inicioTurnoAtual, fim: turno.fimTurnoAtual }, usuarioId);
      turnosGerados.push({ equipeId, equipeNome, colaboradorId: null, colaboradorNome: null, inicio: turno.inicioTurnoAtual, fim: turno.fimTurnoAtual });
      continue;
    }

    for (const membro of membros) {
      await criarSobreavisoRodizio(
        db,
        { equipeId, colaboradorId: membro.colaboradorId, regraId, inicio: turno.inicioTurnoAtual, fim: turno.fimTurnoAtual },
        usuarioId,
      );
      turnosGerados.push({
        equipeId,
        equipeNome,
        colaboradorId: membro.colaboradorId,
        colaboradorNome: membro.colaboradorNome,
        inicio: turno.inicioTurnoAtual,
        fim: turno.fimTurnoAtual,
      });
    }
  }

  return { regraId, cicloRotulo, removidos, criados: turnosGerados.length, turnos: turnosGerados };
}

export interface ResultadoGeracaoSobreavisoGeral {
  cicloRotulo: string;
  regrasProcessadas: number;
  regrasComErro: number;
  totalCriados: number;
  totalRemovidos: number;
  detalhes: (ResultadoGeracaoSobreaviso & { regraNome: string })[];
}

/**
 * Versão "geral" de gerarSobreavisoAutomatico: roda pra todas as regras ativas de uma vez. Uma
 * regra mal configurada (ex.: sem equipes) não derruba as demais — só é contada em `regrasComErro`.
 */
export async function gerarSobreavisoAutomaticoTodasRegras(
  db: D1Database,
  cicloRotulo: string,
  usuarioId: number,
): Promise<ResultadoGeracaoSobreavisoGeral> {
  const regras = await listarRegrasAtivas(db);
  const detalhes: (ResultadoGeracaoSobreaviso & { regraNome: string })[] = [];
  let regrasComErro = 0;

  for (const regra of regras) {
    try {
      const resultado = await gerarSobreavisoAutomatico(db, regra.id, cicloRotulo, usuarioId);
      detalhes.push({ ...resultado, regraNome: regra.nome });
    } catch {
      regrasComErro += 1;
    }
  }

  return {
    cicloRotulo,
    regrasProcessadas: detalhes.length,
    regrasComErro,
    totalCriados: detalhes.reduce((soma, d) => soma + d.criados, 0),
    totalRemovidos: detalhes.reduce((soma, d) => soma + d.removidos, 0),
    detalhes,
  };
}
