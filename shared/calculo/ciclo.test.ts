import { describe, expect, it } from 'vitest';
import { cicloAdjacente, cicloPorRotulo, dataNoCiclo, diasDoCiclo, getCiclo } from './ciclo';

describe('getCiclo', () => {
  it('inclui o dia 15 no ciclo que se inicia nele', () => {
    const ciclo = getCiclo('2026-08-15');
    expect(ciclo.inicio).toBe('2026-08-15');
    expect(ciclo.fim).toBe('2026-09-14');
    expect(ciclo.rotulo).toBe('2026-08');
  });

  it('dia 14 pertence ao ciclo iniciado no mês anterior', () => {
    const ciclo = getCiclo('2026-09-14');
    expect(ciclo.inicio).toBe('2026-08-15');
    expect(ciclo.fim).toBe('2026-09-14');
    expect(ciclo.rotulo).toBe('2026-08');
  });

  it('dia 01 pertence ao ciclo iniciado no mês anterior', () => {
    const ciclo = getCiclo('2026-09-01');
    expect(ciclo.inicio).toBe('2026-08-15');
    expect(ciclo.fim).toBe('2026-09-14');
  });

  it('lida corretamente com virada de ano', () => {
    const ciclo = getCiclo('2026-01-05');
    expect(ciclo.inicio).toBe('2025-12-15');
    expect(ciclo.fim).toBe('2026-01-14');
    expect(ciclo.rotulo).toBe('2025-12');
  });
});

describe('diasDoCiclo', () => {
  it('retorna 31 dias para um ciclo de agosto (31 dias em ago + set)', () => {
    const ciclo = getCiclo('2026-08-20');
    const dias = diasDoCiclo(ciclo);
    expect(dias[0]).toBe('2026-08-15');
    expect(dias[dias.length - 1]).toBe('2026-09-14');
    expect(dias).toHaveLength(31);
  });
});

describe('dataNoCiclo', () => {
  it('confirma limites inclusivos', () => {
    const ciclo = getCiclo('2026-08-20');
    expect(dataNoCiclo('2026-08-15', ciclo)).toBe(true);
    expect(dataNoCiclo('2026-09-14', ciclo)).toBe(true);
    expect(dataNoCiclo('2026-08-14', ciclo)).toBe(false);
    expect(dataNoCiclo('2026-09-15', ciclo)).toBe(false);
  });
});

describe('cicloAdjacente', () => {
  it('avança e retrocede um ciclo completo', () => {
    const atual = getCiclo('2026-08-20');
    const proximo = cicloAdjacente(atual, 1);
    const anterior = cicloAdjacente(atual, -1);
    expect(proximo.inicio).toBe('2026-09-15');
    expect(anterior.inicio).toBe('2026-07-15');
  });
});

describe('cicloPorRotulo', () => {
  it('reconstrói o ciclo a partir do rótulo "aaaa-mm"', () => {
    expect(cicloPorRotulo('2026-08')).toEqual(getCiclo('2026-08-15'));
  });
});
