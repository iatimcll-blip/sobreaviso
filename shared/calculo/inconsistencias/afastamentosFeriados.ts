import { TIPO_AFASTAMENTO_LABEL, type TipoAfastamento } from '../../types/afastamento';
import type { DadosAnaliseColaborador } from './dados';
import type { InconsistenciaDetectada } from './tipos';

/** Escala prevendo trabalho em um dia coberto por afastamento (inclui férias, já que é um dos tipos de afastamento). */
export function detectarEscalaDuranteAfastamento(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];

  for (const turno of dados.turnos) {
    if (turno.folga) continue;
    const afastamento = dados.afastamentos.find((a) => turno.data >= a.dataInicio && turno.data <= a.dataFim);
    if (!afastamento) continue;

    const rotuloTipo = TIPO_AFASTAMENTO_LABEL[afastamento.tipo as TipoAfastamento] ?? afastamento.tipo;
    resultado.push({
      tipo: 'escala_durante_afastamento',
      colaboradorId: dados.colaborador.id,
      equipeId: dados.colaborador.equipeId,
      localidadeId: dados.colaborador.localidadeId,
      dataReferencia: turno.data,
      severidade: 'alta',
      descricao: `Escala "${turno.escalaNome}" ativa durante ${rotuloTipo.toLowerCase()} (${afastamento.dataInicio} a ${afastamento.dataFim}).`,
    });
  }
  return resultado;
}

/** Escala prevendo trabalho em feriado, sem nenhuma configuração de exceção cadastrada para o dia. */
export function detectarEscalaEmFeriadoSemConfiguracao(dados: DadosAnaliseColaborador): InconsistenciaDetectada[] {
  const resultado: InconsistenciaDetectada[] = [];
  const feriadosObrigatorios = new Set(dados.feriados.filter((f) => f.tipo === 'feriado').map((f) => f.data));

  for (const turno of dados.turnos) {
    if (turno.folga || !feriadosObrigatorios.has(turno.data)) continue;
    resultado.push({
      tipo: 'escala_feriado_sem_configuracao',
      colaboradorId: dados.colaborador.id,
      equipeId: dados.colaborador.equipeId,
      localidadeId: dados.colaborador.localidadeId,
      dataReferencia: turno.data,
      severidade: 'media',
      descricao: `Escala "${turno.escalaNome}" prevê trabalho em feriado (${turno.data}) sem configuração de exceção cadastrada.`,
    });
  }
  return resultado;
}
