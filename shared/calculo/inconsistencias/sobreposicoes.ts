import { instantesTurno } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import type { InconsistenciaDetectada } from './tipos';

/** Dois turnos de escala do mesmo colaborador com horários que se cruzam. */
export function detectarSobreposicaoEscala(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const turnos = [...dados.turnos]
    .filter((t) => !t.folga)
    .sort((a, b) => a.data.localeCompare(b.data));

  for (let i = 1; i < turnos.length; i += 1) {
    const anterior = instantesTurno(turnos[i - 1]);
    const atual = instantesTurno(turnos[i]);
    if (!anterior || !atual) continue;

    if (atual.inicio.getTime() < anterior.fim.getTime()) {
      resultado.push({
        tipo: 'sobreposicao_escala',
        colaboradorId: dados.colaborador.id,
        equipeId: dados.colaborador.equipeId,
        localidadeId: dados.colaborador.localidadeId,
        dataReferencia: turnos[i].data,
        severidade: 'alta',
        descricao: `Turno da escala "${turnos[i].escalaNome}" se sobrepõe ao turno anterior ("${turnos[i - 1].escalaNome}").`,
      });
    }
  }
  return resultado;
}

/** Dois lançamentos de sobreaviso do mesmo colaborador com períodos que se cruzam. */
export function detectarSobreposicaoSobreaviso(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const ordenados = [...dados.sobreavisos].sort((a, b) => a.inicio.localeCompare(b.inicio));

  for (let i = 1; i < ordenados.length; i += 1) {
    if (new Date(ordenados[i].inicio).getTime() < new Date(ordenados[i - 1].fim).getTime()) {
      resultado.push({
        tipo: 'sobreposicao_sobreaviso',
        colaboradorId: dados.colaborador.id,
        equipeId: dados.colaborador.equipeId,
        localidadeId: dados.colaborador.localidadeId,
        dataReferencia: ordenados[i].inicio.slice(0, 10),
        severidade: 'alta',
        descricao: 'Plantão de sobreaviso sobreposto a outro já lançado para este colaborador.',
      });
    }
  }
  return resultado;
}
