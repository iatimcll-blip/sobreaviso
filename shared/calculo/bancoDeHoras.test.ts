import { describe, expect, it } from 'vitest';
import type { TurnoResolvido } from './jornada';
import { calcularHorasCiclo } from './bancoDeHoras';

function turno(data: string, folga = false): TurnoResolvido {
  return {
    data,
    horaEntrada: folga ? null : '08:00',
    horaSaida: folga ? null : '17:00',
    intervaloInicio: folga ? null : '12:00',
    intervaloFim: folga ? null : '13:00',
    folga,
    escalaModeloId: 1,
    escalaNome: 'x',
    escalaTipo: '5x2',
    possuiAcordoColetivo: false,
  };
}

describe('calcularHorasCiclo', () => {
  it('soma previstas/trabalhadas/extras sem ajustes', () => {
    const resultado = calcularHorasCiclo([turno('2026-08-17'), turno('2026-08-18'), turno('2026-08-16', true)]);
    expect(resultado.totalPrevistas).toBe(16);
    expect(resultado.totalTrabalhadas).toBe(16);
    expect(resultado.totalExtras).toBe(0);
    expect(resultado.saldoBancoDeHoras).toBe(0);
  });

  it('aplica ajuste manual positivo como hora extra', () => {
    const resultado = calcularHorasCiclo([turno('2026-08-17')], [{ data: '2026-08-17', horasAjuste: 2 }]);
    expect(resultado.dias[0].horasTrabalhadas).toBe(10);
    expect(resultado.dias[0].horasExtras).toBe(2);
    expect(resultado.saldoBancoDeHoras).toBe(2);
  });

  it('ajuste negativo reduz horas trabalhadas sem gerar valor negativo', () => {
    const resultado = calcularHorasCiclo([turno('2026-08-17')], [{ data: '2026-08-17', horasAjuste: -20 }]);
    expect(resultado.dias[0].horasTrabalhadas).toBe(0);
    expect(resultado.saldoBancoDeHoras).toBe(-8);
  });
});
