import { calcularRodizio } from '../../../shared/calculo/rodizio';
import type { StatusRodizio } from '../../../shared/types/sobreaviso';
import { listarRegrasAtivas } from '../../db/queries/sobreaviso';

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
