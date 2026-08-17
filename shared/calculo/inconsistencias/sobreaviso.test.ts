import { describe, expect, it } from 'vitest';
import { CONFIGURACOES_CLT_PADRAO } from '../../constants/clt';
import type { TurnoResolvido } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import { detectarInterjornadaInsuficienteSobreaviso, detectarSobreavisoDuranteAfastamento, detectarSobreavisoSobrepoeTurno } from './sobreaviso';

function turno(data: string, horaEntrada = '08:00', horaSaida = '17:00'): TurnoResolvido {
  return {
    data,
    horaEntrada,
    horaSaida,
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

describe('detectarSobreavisoSobrepoeTurno', () => {
  it('sinaliza sobreaviso no mesmo horário de um turno de trabalho', () => {
    const resultado = detectarSobreavisoSobrepoeTurno(
      dados({
        turnos: [turno('2026-09-05')],
        sobreavisos: [{ inicio: '2026-09-05T10:00:00', fim: '2026-09-05T20:00:00' }],
      }),
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe('sobreaviso_sobrepoe_turno');
  });

  it('não sinaliza sobreaviso fora do horário de trabalho', () => {
    const resultado = detectarSobreavisoSobrepoeTurno(
      dados({
        turnos: [turno('2026-09-05')],
        sobreavisos: [{ inicio: '2026-09-05T18:00:00', fim: '2026-09-06T08:00:00' }],
      }),
    );
    expect(resultado).toHaveLength(0);
  });
});

describe('detectarInterjornadaInsuficienteSobreaviso', () => {
  it('sinaliza sobreaviso iniciado logo após o fim do turno, sem 11h de descanso', () => {
    const resultado = detectarInterjornadaInsuficienteSobreaviso(
      dados({
        turnos: [turno('2026-09-05')],
        sobreavisos: [{ inicio: '2026-09-05T19:00:00', fim: '2026-09-06T07:00:00' }],
      }),
      CONFIGURACOES_CLT_PADRAO,
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe('interjornada_insuficiente_sobreaviso');
  });

  it('sinaliza turno iniciado logo após o fim do sobreaviso, sem 11h de descanso', () => {
    const resultado = detectarInterjornadaInsuficienteSobreaviso(
      dados({
        turnos: [turno('2026-09-06', '06:00', '15:00')],
        sobreavisos: [{ inicio: '2026-09-05T18:00:00', fim: '2026-09-06T02:00:00' }],
      }),
      CONFIGURACOES_CLT_PADRAO,
    );
    expect(resultado).toHaveLength(1);
  });

  it('não sinaliza quando há 11h ou mais de descanso', () => {
    const resultado = detectarInterjornadaInsuficienteSobreaviso(
      dados({
        turnos: [turno('2026-09-05')],
        sobreavisos: [{ inicio: '2026-09-06T04:00:00', fim: '2026-09-06T08:00:00' }],
      }),
      CONFIGURACOES_CLT_PADRAO,
    );
    expect(resultado).toHaveLength(0);
  });
});

describe('detectarSobreavisoDuranteAfastamento', () => {
  it('sinaliza sobreaviso lançado durante férias', () => {
    const resultado = detectarSobreavisoDuranteAfastamento(
      dados({
        sobreavisos: [{ inicio: '2026-09-05T08:00:00', fim: '2026-09-05T20:00:00' }],
        afastamentos: [{ tipo: 'ferias', dataInicio: '2026-09-01', dataFim: '2026-09-10' }],
      }),
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].descricao.toLowerCase()).toContain('férias');
  });

  it('não sinaliza sobreaviso fora do período de afastamento', () => {
    const resultado = detectarSobreavisoDuranteAfastamento(
      dados({
        sobreavisos: [{ inicio: '2026-09-15T08:00:00', fim: '2026-09-15T20:00:00' }],
        afastamentos: [{ tipo: 'ferias', dataInicio: '2026-09-01', dataFim: '2026-09-10' }],
      }),
    );
    expect(resultado).toHaveLength(0);
  });
});
