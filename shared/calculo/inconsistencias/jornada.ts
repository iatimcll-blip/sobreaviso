import type { ConfiguracoesClt } from '../../constants/clt';
import { duracaoMinutos, instantesTurno } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import type { InconsistenciaDetectada } from './tipos';

function turnosDeTrabalhoOrdenados(dados: DadosAnaliseColaborador) {
  return [...dados.turnos].filter((t) => !t.folga).sort((a, b) => a.data.localeCompare(b.data));
}

/** Art. 66 CLT — mínimo de horas corridas entre o fim de uma jornada e o início da seguinte. */
export function detectarInterjornadaInsuficiente(dados: DadosAnaliseColaborador, config: ConfiguracoesClt): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const turnos = turnosDeTrabalhoOrdenados(dados);

  for (let i = 1; i < turnos.length; i += 1) {
    const anterior = instantesTurno(turnos[i - 1]);
    const atual = instantesTurno(turnos[i]);
    if (!anterior || !atual) continue;

    const gapHoras = (atual.inicio.getTime() - anterior.fim.getTime()) / 3_600_000;
    if (gapHoras < config.interjornadaMinimaHoras) {
      resultado.push({
        tipo: 'interjornada_insuficiente',
        colaboradorId: dados.colaborador.id,
        equipeId: dados.colaborador.equipeId,
        localidadeId: dados.colaborador.localidadeId,
        dataReferencia: turnos[i].data,
        severidade: gapHoras < config.interjornadaMinimaHoras / 2 ? 'alta' : 'media',
        descricao: `Intervalo de apenas ${gapHoras.toFixed(1)}h entre jornadas (mínimo legal: ${config.interjornadaMinimaHoras}h).`,
      });
    }
  }
  return resultado;
}

/** Art. 71 CLT — intervalo mínimo dentro da jornada, graduado pela duração da jornada. */
export function detectarIntrajornadaInsuficiente(dados: DadosAnaliseColaborador, config: ConfiguracoesClt): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];

  for (const turno of dados.turnos) {
    if (turno.folga || !turno.horaEntrada || !turno.horaSaida) continue;
    const jornadaHoras = duracaoMinutos(turno.horaEntrada, turno.horaSaida) / 60;

    let minimoMinutos = 0;
    if (jornadaHoras > config.intrajornadaJornadaLongaHoras) {
      minimoMinutos = turno.possuiAcordoColetivo ? config.intrajornadaMinimaLongaComAcordoMinutos : config.intrajornadaMinimaLongaMinutos;
    } else if (jornadaHoras > config.intrajornadaJornadaMediaHoras) {
      minimoMinutos = config.intrajornadaMinimaMediaMinutos;
    }
    if (minimoMinutos === 0) continue;

    const intervaloMinutos = turno.intervaloInicio && turno.intervaloFim ? duracaoMinutos(turno.intervaloInicio, turno.intervaloFim) : 0;
    if (intervaloMinutos < minimoMinutos) {
      resultado.push({
        tipo: 'intrajornada_insuficiente',
        colaboradorId: dados.colaborador.id,
        equipeId: dados.colaborador.equipeId,
        localidadeId: dados.colaborador.localidadeId,
        dataReferencia: turno.data,
        severidade: intervaloMinutos === 0 ? 'alta' : 'media',
        descricao: `Intervalo de ${intervaloMinutos}min em jornada de ${jornadaHoras.toFixed(1)}h (mínimo exigido: ${minimoMinutos}min).`,
      });
    }
  }
  return resultado;
}

/** Art. 59/59-A CLT — teto diário de horas (jornadas comuns) e validação do padrão 12x36 (12h + 36h de descanso). */
export function detectarJornadaAcimaPermitido(dados: DadosAnaliseColaborador, config: ConfiguracoesClt): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const turnos = turnosDeTrabalhoOrdenados(dados);
  const base = {
    colaboradorId: dados.colaborador.id,
    equipeId: dados.colaborador.equipeId,
    localidadeId: dados.colaborador.localidadeId,
  };

  for (const turno of turnos) {
    if (!turno.horaEntrada || !turno.horaSaida) continue;
    const jornadaHoras = duracaoMinutos(turno.horaEntrada, turno.horaSaida) / 60;

    if (turno.escalaTipo === '12x36') {
      if (Math.abs(jornadaHoras - 12) > 0.01) {
        resultado.push({
          ...base,
          tipo: 'escala_12x36_irregular',
          dataReferencia: turno.data,
          severidade: 'alta',
          descricao: `Turno de ${jornadaHoras.toFixed(1)}h não corresponde ao padrão 12x36 (deveria durar 12h).`,
        });
      }
      continue;
    }

    if (jornadaHoras > config.jornadaMaximaDiariaHoras) {
      resultado.push({
        ...base,
        tipo: 'jornada_acima_permitido',
        dataReferencia: turno.data,
        severidade: 'alta',
        descricao: `Jornada de ${jornadaHoras.toFixed(1)}h excede o máximo permitido de ${config.jornadaMaximaDiariaHoras}h.`,
      });
    }
  }

  const turnos12x36 = turnos.filter((t) => t.escalaTipo === '12x36');
  for (let i = 1; i < turnos12x36.length; i += 1) {
    const anterior = instantesTurno(turnos12x36[i - 1]);
    const atual = instantesTurno(turnos12x36[i]);
    if (!anterior || !atual) continue;
    const descansoHoras = (atual.inicio.getTime() - anterior.fim.getTime()) / 3_600_000;
    if (descansoHoras < config.descanso12x36Horas) {
      resultado.push({
        ...base,
        tipo: 'escala_12x36_irregular',
        dataReferencia: turnos12x36[i].data,
        severidade: 'alta',
        descricao: `Apenas ${descansoHoras.toFixed(1)}h de descanso entre turnos 12x36 (mínimo legal: ${config.descanso12x36Horas}h).`,
      });
    }
  }

  return resultado;
}

/** Art. 67 CLT / Lei 605/49 — ao menos 24h corridas de descanso a cada janela semanal. Janelas não sobrepostas, alinhadas ao período analisado. */
export function detectarDescansoSemanalInsuficiente(dados: DadosAnaliseColaborador, config: ConfiguracoesClt): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const instantes = turnosDeTrabalhoOrdenados(dados)
    .map((t) => instantesTurno(t))
    .filter((x): x is { inicio: Date; fim: Date } => x !== null)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  if (instantes.length === 0) return resultado;

  const diasOrdenados = [...new Set(dados.turnos.map((t) => t.data))].sort();
  const primeiroDia = diasOrdenados[0];

  for (let offset = 0; offset < diasOrdenados.length; offset += 7) {
    const inicioJanelaISO = diasOrdenados[offset] ?? primeiroDia;
    const [ano, mes, dia] = inicioJanelaISO.split('-').map(Number);
    const inicioJanela = new Date(Date.UTC(ano, mes - 1, dia));
    const fimJanela = new Date(inicioJanela.getTime() + 7 * 24 * 60 * 60 * 1000);

    let maiorDescansoHoras = 0;
    for (let i = 1; i < instantes.length; i += 1) {
      const gapInicio = instantes[i - 1].fim;
      const gapFim = instantes[i].inicio;
      if (gapFim.getTime() <= inicioJanela.getTime() || gapInicio.getTime() >= fimJanela.getTime()) continue;
      maiorDescansoHoras = Math.max(maiorDescansoHoras, (gapFim.getTime() - gapInicio.getTime()) / 3_600_000);
    }

    if (maiorDescansoHoras < config.descansoSemanalHoras) {
      resultado.push({
        tipo: 'descanso_semanal_insuficiente',
        colaboradorId: dados.colaborador.id,
        equipeId: dados.colaborador.equipeId,
        localidadeId: dados.colaborador.localidadeId,
        dataReferencia: inicioJanelaISO,
        severidade: 'media',
        descricao: `Nenhum descanso de ${config.descansoSemanalHoras}h corridas na semana a partir de ${inicioJanelaISO} (maior descanso encontrado: ${maiorDescansoHoras.toFixed(1)}h).`,
      });
    }
  }

  return resultado;
}
