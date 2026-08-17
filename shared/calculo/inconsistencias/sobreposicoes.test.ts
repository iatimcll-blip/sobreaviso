import { describe, expect, it } from 'vitest';
import type { TurnoResolvido } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import { detectarSobreposicaoEscala, detectarSobreposicaoSobreaviso } from './sobreposicoes';

function turno(parciais: Partial<TurnoResolvido> & { data: string }): TurnoResolvido {
  return {
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloInicio: null,
    intervaloFim: null,
    folga: false,
    escalaModeloId: 1,
    escalaNome: 'A',
    escalaTipo: '5x2',
    possuiAcordoColetivo: false,
    ...parciais,
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

describe('detectarSobreposicaoEscala', () => {
  it('sinaliza quando um turno noturno invade o início do turno seguinte', () => {
    const t1 = turno({ data: '2026-08-17', horaEntrada: '19:00', horaSaida: '09:00' }); // termina 09:00 do dia 18
    const t2 = turno({ data: '2026-08-18', horaEntrada: '08:00', horaSaida: '17:00', escalaNome: 'B' });
    expect(detectarSobreposicaoEscala(dados({ turnos: [t1, t2] }))).toHaveLength(1);
  });

  it('não sinaliza turnos consecutivos sem sobreposição', () => {
    const t1 = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '17:00' });
    const t2 = turno({ data: '2026-08-18', horaEntrada: '08:00', horaSaida: '17:00' });
    expect(detectarSobreposicaoEscala(dados({ turnos: [t1, t2] }))).toHaveLength(0);
  });
});

describe('detectarSobreposicaoSobreaviso', () => {
  it('sinaliza períodos de sobreaviso sobrepostos', () => {
    const resultado = detectarSobreposicaoSobreaviso(
      dados({
        sobreavisos: [
          { inicio: '2026-08-17T19:00:00.000Z', fim: '2026-08-18T07:00:00.000Z' },
          { inicio: '2026-08-18T00:00:00.000Z', fim: '2026-08-18T12:00:00.000Z' },
        ],
      }),
    );
    expect(resultado).toHaveLength(1);
  });

  it('não sinaliza períodos adjacentes sem sobreposição', () => {
    const resultado = detectarSobreposicaoSobreaviso(
      dados({
        sobreavisos: [
          { inicio: '2026-08-17T19:00:00.000Z', fim: '2026-08-18T07:00:00.000Z' },
          { inicio: '2026-08-18T07:00:00.000Z', fim: '2026-08-18T19:00:00.000Z' },
        ],
      }),
    );
    expect(resultado).toHaveLength(0);
  });
});
