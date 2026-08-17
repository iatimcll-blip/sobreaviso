import { describe, expect, it } from 'vitest';
import type { TurnoResolvido } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import { detectarEscalaDuranteAfastamento, detectarEscalaEmFeriadoSemConfiguracao } from './afastamentosFeriados';

function turno(data: string): TurnoResolvido {
  return {
    data,
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
    folga: false,
    escalaModeloId: 1,
    escalaNome: 'Padrão',
    escalaTipo: '5x2',
    possuiAcordoColetivo: false,
  };
}

function dados(parciais: Partial<DadosAnaliseColaborador>): DadosAnaliseColaborador {
  return {
    colaborador: { id: 1, equipeId: 10, localidadeId: 20, ufSigla: 'CE', gestorAdministrativoId: null, gestorOperacionalId: null },
    turnos: [],
    afastamentos: [],
    sobreavisos: [],
    feriados: [],
    ...parciais,
  };
}

describe('detectarEscalaDuranteAfastamento', () => {
  it('sinaliza escala em dia coberto por férias', () => {
    const resultado = detectarEscalaDuranteAfastamento(
      dados({ turnos: [turno('2026-09-05')], afastamentos: [{ tipo: 'ferias', dataInicio: '2026-09-01', dataFim: '2026-09-10' }] }),
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].descricao.toLowerCase()).toContain('férias');
  });

  it('não sinaliza fora do período de afastamento', () => {
    const resultado = detectarEscalaDuranteAfastamento(
      dados({ turnos: [turno('2026-09-15')], afastamentos: [{ tipo: 'ferias', dataInicio: '2026-09-01', dataFim: '2026-09-10' }] }),
    );
    expect(resultado).toHaveLength(0);
  });
});

describe('detectarEscalaEmFeriadoSemConfiguracao', () => {
  it('sinaliza escala em feriado obrigatório', () => {
    const resultado = detectarEscalaEmFeriadoSemConfiguracao(
      dados({ turnos: [turno('2026-09-07')], feriados: [{ data: '2026-09-07', tipo: 'feriado' }] }),
    );
    expect(resultado).toHaveLength(1);
  });

  it('não sinaliza em ponto facultativo', () => {
    const resultado = detectarEscalaEmFeriadoSemConfiguracao(
      dados({ turnos: [turno('2026-02-17')], feriados: [{ data: '2026-02-17', tipo: 'ponto_facultativo' }] }),
    );
    expect(resultado).toHaveLength(0);
  });
});
