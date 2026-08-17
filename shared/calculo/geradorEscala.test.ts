import { describe, expect, it } from 'vitest';
import { CONFIGURACOES_CLT_PADRAO } from '../constants/clt';
import { gerarTurnosAutomaticos } from './geradorEscala';

const config = CONFIGURACOES_CLT_PADRAO;

describe('gerarTurnosAutomaticos — 5x2', () => {
  it('gera 7 dias com fim de semana de folga e turno diurno de 8h', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: false, config });
    expect(resultado.turnos).toHaveLength(7);
    expect(resultado.turnos[0].folga).toBe(true); // domingo
    expect(resultado.turnos[6].folga).toBe(true); // sábado
    const segunda = resultado.turnos[1];
    expect(segunda.folga).toBe(false);
    expect(segunda.horaEntrada).toBe('08:00');
    expect(resultado.turnoSugerido).toBe('diurno');
  });

  it('jornada de 8h exige 1h de intervalo (> 6h) e calcula a saída certa (8h + 1h)', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: false, config });
    expect(resultado.intervaloMinutos).toBe(config.intrajornadaMinimaLongaMinutos);
    expect(resultado.horaSaida).toBe('17:00');
    const trabalho = resultado.turnos.find((t) => !t.folga)!;
    expect(trabalho.intervaloInicio).not.toBeNull();
    expect(trabalho.intervaloFim).not.toBeNull();
  });

  it('com acordo coletivo, usa o intervalo reduzido (30min) para jornada longa', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: true, config });
    expect(resultado.intervaloMinutos).toBe(config.intrajornadaMinimaLongaComAcordoMinutos);
  });

  it('jornada de 4h não exige intervalo', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 4, possuiAcordoColetivo: false, config });
    expect(resultado.intervaloMinutos).toBe(0);
    expect(resultado.horaSaida).toBe('12:00');
  });

  it('rejeita jornada acima do máximo diário configurado', () => {
    expect(() => gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 11, possuiAcordoColetivo: false, config })).toThrow(
      /excede o máximo diário/,
    );
  });

  it('rejeita combinação que fura a interjornada mínima', () => {
    // 13h de jornada + 1h de intervalo = 14h "ocupadas"; sobrariam só 10h de interjornada (< 11h mínimo)
    const configFrouxo = { ...config, jornadaMaximaDiariaHoras: 24 };
    expect(() =>
      gerarTurnosAutomaticos({ tipo: '5x2', horaEntrada: '08:00', duracaoJornadaHoras: 13, possuiAcordoColetivo: false, config: configFrouxo }),
    ).toThrow(/interjornada/);
  });
});

describe('gerarTurnosAutomaticos — 6x1', () => {
  it('gera 7 dias com só domingo de folga', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '6x1', horaEntrada: '07:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: false, config });
    expect(resultado.turnos).toHaveLength(7);
    expect(resultado.turnos[0].folga).toBe(true);
    expect(resultado.turnos.slice(1).every((t) => !t.folga)).toBe(true);
  });
});

describe('gerarTurnosAutomaticos — 4x2', () => {
  it('gera 6 dias: 4 de trabalho, 2 de folga', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '4x2', horaEntrada: '08:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: false, config });
    expect(resultado.turnos).toHaveLength(6);
    expect(resultado.turnos.filter((t) => t.folga)).toHaveLength(2);
    expect(resultado.turnos.filter((t) => !t.folga)).toHaveLength(4);
  });
});

describe('gerarTurnosAutomaticos — 12x36', () => {
  it('gera 2 dias: 1 de trabalho (12h) e 1 de folga completa (36h de descanso)', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '12x36', horaEntrada: '07:00', duracaoJornadaHoras: 12, possuiAcordoColetivo: true, config });
    expect(resultado.turnos).toHaveLength(2);
    expect(resultado.turnos[0].folga).toBe(false);
    expect(resultado.turnos[0].horaEntrada).toBe('07:00');
    expect(resultado.turnos[1].folga).toBe(true);
  });

  it('rejeita jornada diferente de 12h', () => {
    expect(() =>
      gerarTurnosAutomaticos({ tipo: '12x36', horaEntrada: '07:00', duracaoJornadaHoras: 10, possuiAcordoColetivo: true, config }),
    ).toThrow(/exatamente 12 horas/);
  });
});

describe('gerarTurnosAutomaticos — turno sugerido', () => {
  it('classifica como noturno quando toda a jornada cai na janela noturna configurada (22h-05h)', () => {
    // 6h de jornada cabem inteiras dentro da janela noturna padrão (22:00-05:00, 7h de span).
    const resultado = gerarTurnosAutomaticos({ tipo: '6x1', horaEntrada: '22:00', duracaoJornadaHoras: 6, possuiAcordoColetivo: false, config });
    expect(resultado.turnoSugerido).toBe('noturno');
  });

  it('classifica como misto quando a jornada cruza a janela noturna', () => {
    const resultado = gerarTurnosAutomaticos({ tipo: '12x36', horaEntrada: '19:00', duracaoJornadaHoras: 12, possuiAcordoColetivo: true, config });
    expect(resultado.turnoSugerido).toBe('misto');
  });
});

describe('gerarTurnosAutomaticos — personalizada', () => {
  it('rejeita geração automática (cada dia pode variar)', () => {
    expect(() =>
      gerarTurnosAutomaticos({ tipo: 'personalizada', horaEntrada: '08:00', duracaoJornadaHoras: 8, possuiAcordoColetivo: false, config }),
    ).toThrow(/personalizada/);
  });
});
