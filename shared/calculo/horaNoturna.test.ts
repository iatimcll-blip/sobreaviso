import { describe, expect, it } from 'vitest';
import type { TurnoResolvido } from './jornada';
import { calcularMinutosNoturnos, converterParaHorasNoturnasLegais } from './horaNoturna';

function turno(horaEntrada: string, horaSaida: string): TurnoResolvido {
  return {
    data: '2026-08-16',
    horaEntrada,
    horaSaida,
    intervaloInicio: null,
    intervaloFim: null,
    folga: false,
    escalaModeloId: 1,
    escalaNome: 'x',
    escalaTipo: '12x36',
    possuiAcordoColetivo: false,
  };
}

describe('calcularMinutosNoturnos', () => {
  it('turno totalmente diurno não tem minutos noturnos', () => {
    expect(calcularMinutosNoturnos(turno('08:00', '17:00'))).toBe(0);
  });

  it('turno 22:00–06:00 conta só até 05:00 como noturno (420 min de 480)', () => {
    expect(calcularMinutosNoturnos(turno('22:00', '06:00'))).toBe(420);
  });

  it('turno 19:00–07:00 (12x36 noturno) cobre toda a janela 22h–5h (420 min)', () => {
    expect(calcularMinutosNoturnos(turno('19:00', '07:00'))).toBe(420);
  });

  it('turno 00:00–05:00 é inteiramente noturno', () => {
    expect(calcularMinutosNoturnos(turno('00:00', '05:00'))).toBe(300);
  });
});

describe('converterParaHorasNoturnasLegais', () => {
  it('60 minutos reais equivalem a ~1,142857 horas noturnas legais', () => {
    expect(converterParaHorasNoturnasLegais(60)).toBeCloseTo(1.142857, 5);
  });
  it('52,5 minutos reais equivalem a exatamente 1 hora noturna legal', () => {
    expect(converterParaHorasNoturnasLegais(52.5)).toBeCloseTo(1, 10);
  });
});
