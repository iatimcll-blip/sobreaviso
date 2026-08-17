import { TIPO_AFASTAMENTO_LABEL, type TipoAfastamento } from '../../types/afastamento';
import type { ConfiguracoesClt } from '../../constants/clt';
import { instantesTurno, type TurnoResolvido } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import type { InconsistenciaDetectada } from './tipos';

function turnosComInstantes(dados: DadosAnaliseColaborador): { turno: TurnoResolvido; instantes: { inicio: Date; fim: Date } }[] {
  return dados.turnos
    .map((turno) => ({ turno, instantes: instantesTurno(turno) }))
    .filter((x): x is { turno: TurnoResolvido; instantes: { inicio: Date; fim: Date } } => x.instantes !== null);
}

/** Sobreaviso lançado num horário em que o colaborador já está escalado para trabalhar. */
export function detectarSobreavisoSobrepoeTurno(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];

  for (const sobreaviso of dados.sobreavisos) {
    const inicioSobreaviso = new Date(sobreaviso.inicio);
    const fimSobreaviso = new Date(sobreaviso.fim);

    for (const { turno, instantes } of turnosComInstantes(dados)) {
      if (inicioSobreaviso.getTime() < instantes.fim.getTime() && fimSobreaviso.getTime() > instantes.inicio.getTime()) {
        resultado.push({
          tipo: 'sobreaviso_sobrepoe_turno',
          colaboradorId: dados.colaborador.id,
          equipeId: dados.colaborador.equipeId,
          localidadeId: dados.colaborador.localidadeId,
          dataReferencia: turno.data,
          severidade: 'alta',
          descricao: `Sobreaviso de ${sobreaviso.inicio} a ${sobreaviso.fim} se sobrepõe ao turno de trabalho "${turno.escalaNome}" (${turno.data}).`,
        });
      }
    }
  }
  return resultado;
}

/** Art. 66 CLT — o mesmo mínimo de descanso entre jornadas também deve valer entre um turno de trabalho e um sobreaviso adjacente. */
export function detectarInterjornadaInsuficienteSobreaviso(
  dados: DadosAnaliseColaborador,
  config: ConfiguracoesClt,
): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const turnos = turnosComInstantes(dados);

  for (const sobreaviso of dados.sobreavisos) {
    const inicioSobreaviso = new Date(sobreaviso.inicio);
    const fimSobreaviso = new Date(sobreaviso.fim);

    for (const { turno, instantes } of turnos) {
      if (instantes.fim.getTime() <= inicioSobreaviso.getTime()) {
        const gapHoras = (inicioSobreaviso.getTime() - instantes.fim.getTime()) / 3_600_000;
        if (gapHoras < config.interjornadaMinimaHoras) {
          resultado.push({
            tipo: 'interjornada_insuficiente_sobreaviso',
            colaboradorId: dados.colaborador.id,
            equipeId: dados.colaborador.equipeId,
            localidadeId: dados.colaborador.localidadeId,
            dataReferencia: turno.data,
            severidade: gapHoras < config.interjornadaMinimaHoras / 2 ? 'alta' : 'media',
            descricao: `Apenas ${gapHoras.toFixed(1)}h entre o fim do turno "${turno.escalaNome}" e o início do sobreaviso (mínimo legal: ${config.interjornadaMinimaHoras}h).`,
          });
        }
        continue;
      }

      if (instantes.inicio.getTime() >= fimSobreaviso.getTime()) {
        const gapHoras = (instantes.inicio.getTime() - fimSobreaviso.getTime()) / 3_600_000;
        if (gapHoras < config.interjornadaMinimaHoras) {
          resultado.push({
            tipo: 'interjornada_insuficiente_sobreaviso',
            colaboradorId: dados.colaborador.id,
            equipeId: dados.colaborador.equipeId,
            localidadeId: dados.colaborador.localidadeId,
            dataReferencia: turno.data,
            severidade: gapHoras < config.interjornadaMinimaHoras / 2 ? 'alta' : 'media',
            descricao: `Apenas ${gapHoras.toFixed(1)}h entre o fim do sobreaviso e o início do turno "${turno.escalaNome}" (mínimo legal: ${config.interjornadaMinimaHoras}h).`,
          });
        }
      }
    }
  }
  return resultado;
}

/** Sobreaviso lançado em dia coberto por afastamento/férias do colaborador. */
export function detectarSobreavisoDuranteAfastamento(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];

  for (const sobreaviso of dados.sobreavisos) {
    const dataInicioSobreaviso = sobreaviso.inicio.slice(0, 10);
    const dataFimSobreaviso = sobreaviso.fim.slice(0, 10);
    const afastamento = dados.afastamentos.find((a) => dataInicioSobreaviso <= a.dataFim && dataFimSobreaviso >= a.dataInicio);
    if (!afastamento) continue;

    const rotuloTipo = TIPO_AFASTAMENTO_LABEL[afastamento.tipo as TipoAfastamento] ?? afastamento.tipo;
    resultado.push({
      tipo: 'sobreaviso_durante_afastamento',
      colaboradorId: dados.colaborador.id,
      equipeId: dados.colaborador.equipeId,
      localidadeId: dados.colaborador.localidadeId,
      dataReferencia: dataInicioSobreaviso,
      severidade: 'alta',
      descricao: `Sobreaviso de ${dataInicioSobreaviso} a ${dataFimSobreaviso} ativo durante ${rotuloTipo.toLowerCase()} (${afastamento.dataInicio} a ${afastamento.dataFim}).`,
    });
  }
  return resultado;
}
