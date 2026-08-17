import { describe, expect, it } from 'vitest';
import {
  calcularCicloDia,
  diaDaSemanaUTC,
  diferencaDias,
  duracaoMinutos,
  horasPrevistasTurno,
  instantesTurno,
  resolverTurnosDoPeriodo,
  type EscalaAtribuicao,
} from './jornada';

describe('duracaoMinutos', () => {
  it('calcula duração dentro do mesmo dia', () => {
    expect(duracaoMinutos('08:00', '17:00')).toBe(540);
  });
  it('calcula duração com virada de meia-noite', () => {
    expect(duracaoMinutos('19:00', '07:00')).toBe(720);
  });
});

describe('diferencaDias / diaDaSemanaUTC', () => {
  it('conta dias corridos entre duas datas', () => {
    expect(diferencaDias('2026-08-01', '2026-08-10')).toBe(9);
    expect(diferencaDias('2026-08-10', '2026-08-01')).toBe(-9);
  });
  it('16/08/2026 é um domingo (0)', () => {
    expect(diaDaSemanaUTC('2026-08-16')).toBe(0);
  });
});

describe('calcularCicloDia', () => {
  it('para 5x2, usa o dia da semana', () => {
    expect(calcularCicloDia('5x2', '2026-01-01', '2026-08-16', 7)).toBe(0); // domingo
    expect(calcularCicloDia('5x2', '2026-01-01', '2026-08-17', 7)).toBe(1); // segunda
  });
  it('para 12x36 (ciclo de 2 dias), alterna a partir do início do vínculo', () => {
    expect(calcularCicloDia('12x36', '2026-08-01', '2026-08-01', 2)).toBe(0);
    expect(calcularCicloDia('12x36', '2026-08-01', '2026-08-02', 2)).toBe(1);
    expect(calcularCicloDia('12x36', '2026-08-01', '2026-08-03', 2)).toBe(0);
    expect(calcularCicloDia('12x36', '2026-08-01', '2026-08-04', 2)).toBe(1);
  });
});

describe('resolverTurnosDoPeriodo', () => {
  const escala12x36: EscalaAtribuicao = {
    escalaModeloId: 1,
    escalaNome: '12x36 Diurna',
    tipo: '12x36',
    possuiAcordoColetivo: true,
    turnos: [
      { cicloDia: 0, horaEntrada: '07:00', horaSaida: '19:00', intervaloInicio: '12:00', intervaloFim: '13:00', folga: false },
      { cicloDia: 1, horaEntrada: null, horaSaida: null, intervaloInicio: null, intervaloFim: null, folga: true },
    ],
    vinculoDataInicio: '2026-08-01',
    vinculoDataFim: null,
    origemVinculo: 'equipe',
  };

  it('resolve turnos de trabalho e folga corretamente ao longo de 4 dias', () => {
    const turnos = resolverTurnosDoPeriodo([escala12x36], '2026-08-01', '2026-08-04');
    expect(turnos.map((t) => t.folga)).toEqual([false, true, false, true]);
    expect(turnos[0].horaEntrada).toBe('07:00');
  });

  it('vínculo direto no colaborador tem prioridade sobre o vínculo por equipe', () => {
    const escalaColaborador: EscalaAtribuicao = {
      ...escala12x36,
      escalaModeloId: 2,
      escalaNome: 'Administrativa',
      tipo: '5x2',
      turnos: Array.from({ length: 7 }, (_, cicloDia) => ({
        cicloDia,
        horaEntrada: cicloDia === 0 || cicloDia === 6 ? null : '08:00',
        horaSaida: cicloDia === 0 || cicloDia === 6 ? null : '17:00',
        intervaloInicio: null,
        intervaloFim: null,
        folga: cicloDia === 0 || cicloDia === 6,
      })),
      origemVinculo: 'colaborador',
    };
    const turnos = resolverTurnosDoPeriodo([escala12x36, escalaColaborador], '2026-08-01', '2026-08-01');
    expect(turnos[0].escalaNome).toBe('Administrativa');
  });

  it('ignora atribuições fora do intervalo de vigência do vínculo', () => {
    const turnos = resolverTurnosDoPeriodo(
      [{ ...escala12x36, vinculoDataFim: '2026-08-02' }],
      '2026-08-03',
      '2026-08-03',
    );
    expect(turnos).toHaveLength(0);
  });
});

describe('horasPrevistasTurno', () => {
  it('desconta o intervalo da jornada', () => {
    const turno = {
      data: '2026-08-01',
      horaEntrada: '07:00',
      horaSaida: '19:00',
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
      folga: false,
      escalaModeloId: 1,
      escalaNome: 'x',
      escalaTipo: '12x36' as const,
      possuiAcordoColetivo: false,
    };
    expect(horasPrevistasTurno(turno)).toBe(11);
  });
  it('retorna 0 para folga', () => {
    expect(
      horasPrevistasTurno({
        data: '2026-08-02',
        horaEntrada: null,
        horaSaida: null,
        intervaloInicio: null,
        intervaloFim: null,
        folga: true,
        escalaModeloId: 1,
        escalaNome: 'x',
        escalaTipo: '12x36',
        possuiAcordoColetivo: false,
      }),
    ).toBe(0);
  });
});

describe('instantesTurno', () => {
  it('calcula início e fim considerando virada de meia-noite', () => {
    const resultado = instantesTurno({
      data: '2026-08-16',
      horaEntrada: '19:00',
      horaSaida: '07:00',
      intervaloInicio: null,
      intervaloFim: null,
      folga: false,
      escalaModeloId: 1,
      escalaNome: 'x',
      escalaTipo: '12x36',
      possuiAcordoColetivo: false,
    });
    expect(resultado?.inicio.toISOString()).toBe('2026-08-16T19:00:00.000Z');
    expect(resultado?.fim.toISOString()).toBe('2026-08-17T07:00:00.000Z');
  });
});
