import { describe, expect, it } from 'vitest';
import { calcularRodizio, gerarTurnosRodizio, type RegraRodizio } from './rodizio';

const regraDuasEquipes: RegraRodizio = {
  dataInicio: '2026-01-01',
  horaTroca: '07:00',
  periodicidadeDias: 7,
  equipes: [
    { equipeId: 1, ordem: 0, equipeNome: 'Equipe Norte' },
    { equipeId: 2, ordem: 1, equipeNome: 'Equipe Sul' },
  ],
};

describe('calcularRodizio', () => {
  it('equipe 0 assume exatamente no instante de início', () => {
    const resultado = calcularRodizio(regraDuasEquipes, new Date('2026-01-01T07:00:00.000Z'));
    expect(resultado?.equipeAtual.equipeNome).toBe('Equipe Norte');
    expect(resultado?.equipeProxima.equipeNome).toBe('Equipe Sul');
    expect(resultado?.inicioTurnoAtual).toBe('2026-01-01T07:00:00.000Z');
    expect(resultado?.fimTurnoAtual).toBe('2026-01-08T07:00:00.000Z');
  });

  it('permanece na mesma equipe um minuto antes da próxima troca', () => {
    const resultado = calcularRodizio(regraDuasEquipes, new Date('2026-01-08T06:59:00.000Z'));
    expect(resultado?.equipeAtual.equipeNome).toBe('Equipe Norte');
  });

  it('troca de equipe exatamente no instante da próxima troca', () => {
    const resultado = calcularRodizio(regraDuasEquipes, new Date('2026-01-08T07:00:00.000Z'));
    expect(resultado?.equipeAtual.equipeNome).toBe('Equipe Sul');
    expect(resultado?.equipeProxima.equipeNome).toBe('Equipe Norte');
  });

  it('roda de volta para a primeira equipe após um ciclo completo', () => {
    const resultado = calcularRodizio(regraDuasEquipes, new Date('2026-01-15T07:00:00.000Z'));
    expect(resultado?.equipeAtual.equipeNome).toBe('Equipe Norte');
  });

  it('antes do início do rodízio, assume a primeira equipe (sem datas negativas)', () => {
    const resultado = calcularRodizio(regraDuasEquipes, new Date('2025-12-01T00:00:00.000Z'));
    expect(resultado?.equipeAtual.equipeNome).toBe('Equipe Norte');
    expect(resultado?.inicioTurnoAtual).toBe('2026-01-01T07:00:00.000Z');
  });

  it('funciona com três equipes e ordena por "ordem" independente da ordem de entrada', () => {
    const regra: RegraRodizio = {
      dataInicio: '2026-01-01',
      horaTroca: '00:00',
      periodicidadeDias: 1,
      equipes: [
        { equipeId: 3, ordem: 2, equipeNome: 'C' },
        { equipeId: 1, ordem: 0, equipeNome: 'A' },
        { equipeId: 2, ordem: 1, equipeNome: 'B' },
      ],
    };
    expect(calcularRodizio(regra, new Date('2026-01-01T00:00:00.000Z'))?.equipeAtual.equipeNome).toBe('A');
    expect(calcularRodizio(regra, new Date('2026-01-02T00:00:00.000Z'))?.equipeAtual.equipeNome).toBe('B');
    expect(calcularRodizio(regra, new Date('2026-01-03T00:00:00.000Z'))?.equipeAtual.equipeNome).toBe('C');
    expect(calcularRodizio(regra, new Date('2026-01-04T00:00:00.000Z'))?.equipeAtual.equipeNome).toBe('A');
  });

  it('retorna null quando não há equipes configuradas', () => {
    expect(calcularRodizio({ ...regraDuasEquipes, equipes: [] })).toBeNull();
  });
});

describe('gerarTurnosRodizio', () => {
  it('enumera os turnos sucessivos dentro do período, alternando as equipes', () => {
    const turnos = gerarTurnosRodizio(regraDuasEquipes, '2026-01-01', '2026-01-21');
    expect(turnos.map((t) => t.equipeAtual.equipeNome)).toEqual(['Equipe Norte', 'Equipe Sul', 'Equipe Norte']);
    expect(turnos[0].inicioTurnoAtual).toBe('2026-01-01T07:00:00.000Z');
    expect(turnos[0].fimTurnoAtual).toBe(turnos[1].inicioTurnoAtual);
  });

  it('gera só o turno vigente quando o período é menor que a periodicidade', () => {
    const turnos = gerarTurnosRodizio(regraDuasEquipes, '2026-01-02', '2026-01-05');
    expect(turnos).toHaveLength(1);
    expect(turnos[0].equipeAtual.equipeNome).toBe('Equipe Norte');
  });

  it('período antes do início do rodízio começa no primeiro turno real', () => {
    const turnos = gerarTurnosRodizio(regraDuasEquipes, '2025-12-01', '2026-01-10');
    expect(turnos[0].inicioTurnoAtual).toBe('2026-01-01T07:00:00.000Z');
  });

  it('retorna vazio quando não há equipes configuradas', () => {
    expect(gerarTurnosRodizio({ ...regraDuasEquipes, equipes: [] }, '2026-01-01', '2026-01-31')).toEqual([]);
  });

  it('o primeiro turno pode começar antes de "de" quando a periodicidade não bate com a janela — quem consome isso (ex.: exclusão pra regenerar) precisa considerar overlap, não só "inicio >= de"', () => {
    const regraDezDias: RegraRodizio = { ...regraDuasEquipes, dataInicio: '2026-08-01', periodicidadeDias: 10, horaTroca: '08:00' };
    const turnos = gerarTurnosRodizio(regraDezDias, '2026-08-15', '2026-09-14');
    expect(turnos[0].inicioTurnoAtual).toBe('2026-08-11T08:00:00.000Z');
    expect(turnos[0].inicioTurnoAtual < '2026-08-15').toBe(true);
  });
});
