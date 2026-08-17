import { describe, expect, it } from 'vitest';
import { calcularHorasSobreaviso } from './horasSobreaviso';

describe('calcularHorasSobreaviso', () => {
  it('soma a duração real e aplica o fator legal (1/3)', () => {
    const resultado = calcularHorasSobreaviso(
      [
        { inicio: '2026-08-16T19:00:00.000Z', fim: '2026-08-17T07:00:00.000Z' }, // 12h
        { inicio: '2026-08-17T19:00:00.000Z', fim: '2026-08-18T07:00:00.000Z' }, // 12h
      ],
      1 / 3,
    );
    expect(resultado.horasTotais).toBe(24);
    expect(resultado.horasEquivalentes).toBeCloseTo(8, 5);
  });

  it('retorna zero para lista vazia', () => {
    expect(calcularHorasSobreaviso([], 1 / 3)).toEqual({ horasTotais: 0, horasEquivalentes: 0 });
  });
});
