import { describe, expect, it } from 'vitest';
import { CONFIGURACOES_CLT_PADRAO } from '../../constants/clt';
import type { TurnoResolvido } from '../jornada';
import type { DadosAnaliseColaborador } from './dados';
import {
  detectarDescansoSemanalInsuficiente,
  detectarInterjornadaInsuficiente,
  detectarIntrajornadaInsuficiente,
  detectarJornadaAcimaPermitido,
} from './jornada';

function turno(parciais: Partial<TurnoResolvido> & { data: string }): TurnoResolvido {
  return {
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
    folga: false,
    escalaModeloId: 1,
    escalaNome: 'Padrão',
    escalaTipo: '5x2',
    possuiAcordoColetivo: false,
    ...parciais,
  };
}

function dados(turnos: TurnoResolvido[], parciais: Partial<DadosAnaliseColaborador> = {}): DadosAnaliseColaborador {
  return {
    colaborador: { id: 1, equipeId: 10, localidadeId: 20, ufSigla: 'CE', gestorAdministrativoId: null, gestorOperacionalId: null },
    turnos,
    afastamentos: [],
    sobreavisos: [],
    feriados: [],
    ...parciais,
  };
}

describe('detectarInterjornadaInsuficiente', () => {
  it('10h50 de intervalo entre jornadas sinaliza (abaixo de 11h)', () => {
    const dia1 = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '18:00' }); // termina 18:00
    const dia2 = turno({ data: '2026-08-18', horaEntrada: '04:50', horaSaida: '13:00' }); // 10h50 depois
    expect(detectarInterjornadaInsuficiente(dados([dia1, dia2]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(1);
  });

  it('exatamente 11h00 de intervalo não sinaliza', () => {
    const dia1 = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '18:00' });
    const dia2 = turno({ data: '2026-08-18', horaEntrada: '05:00', horaSaida: '13:00' }); // exatos 11h
    expect(detectarInterjornadaInsuficiente(dados([dia1, dia2]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });
});

describe('detectarIntrajornadaInsuficiente', () => {
  it('jornada de 8h sem nenhum intervalo sinaliza', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '16:00', intervaloInicio: null, intervaloFim: null });
    const resultado = detectarIntrajornadaInsuficiente(dados([t]), CONFIGURACOES_CLT_PADRAO);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].severidade).toBe('alta');
  });

  it('jornada de 8h com exatos 60min de intervalo não sinaliza', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '17:00', intervaloInicio: '12:00', intervaloFim: '13:00' });
    expect(detectarIntrajornadaInsuficiente(dados([t]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });

  it('com acordo coletivo, 30min bastam para jornada longa', () => {
    const t = turno({
      data: '2026-08-17',
      horaEntrada: '08:00',
      horaSaida: '17:00',
      intervaloInicio: '12:00',
      intervaloFim: '12:30',
      possuiAcordoColetivo: true,
    });
    expect(detectarIntrajornadaInsuficiente(dados([t]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });

  it('jornada de 5h exige 15min, 10min sinaliza', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '13:00', intervaloInicio: '10:00', intervaloFim: '10:10' });
    expect(detectarIntrajornadaInsuficiente(dados([t]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(1);
  });

  it('jornada de 3h não exige intervalo', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '11:00', intervaloInicio: null, intervaloFim: null });
    expect(detectarIntrajornadaInsuficiente(dados([t]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });
});

describe('detectarJornadaAcimaPermitido', () => {
  it('jornada comum de 10h01 sinaliza (acima de 10h)', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '18:01', intervaloInicio: null, intervaloFim: null });
    const resultado = detectarJornadaAcimaPermitido(dados([t]), CONFIGURACOES_CLT_PADRAO);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe('jornada_acima_permitido');
  });

  it('jornada comum de exatas 10h não sinaliza', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '08:00', horaSaida: '18:00', intervaloInicio: null, intervaloFim: null });
    expect(detectarJornadaAcimaPermitido(dados([t]), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });

  it('turno 12x36 com 13h de duração é irregular', () => {
    const t = turno({ data: '2026-08-17', horaEntrada: '07:00', horaSaida: '20:00', escalaTipo: '12x36', intervaloInicio: null, intervaloFim: null });
    const resultado = detectarJornadaAcimaPermitido(dados([t]), CONFIGURACOES_CLT_PADRAO);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipo).toBe('escala_12x36_irregular');
  });

  it('dois turnos 12x36 com só 35h de descanso entre eles é irregular', () => {
    const t1 = turno({ data: '2026-08-17', horaEntrada: '07:00', horaSaida: '19:00', escalaTipo: '12x36', intervaloInicio: null, intervaloFim: null });
    const t2 = turno({ data: '2026-08-19', horaEntrada: '06:00', horaSaida: '18:00', escalaTipo: '12x36', intervaloInicio: null, intervaloFim: null }); // 35h depois
    const resultado = detectarJornadaAcimaPermitido(dados([t1, t2]), CONFIGURACOES_CLT_PADRAO);
    expect(resultado.some((r) => r.descricao.includes('descanso'))).toBe(true);
  });

  it('dois turnos 12x36 com exatas 36h de descanso não sinaliza irregularidade de descanso', () => {
    const t1 = turno({ data: '2026-08-17', horaEntrada: '07:00', horaSaida: '19:00', escalaTipo: '12x36', intervaloInicio: null, intervaloFim: null });
    const t2 = turno({ data: '2026-08-19', horaEntrada: '07:00', horaSaida: '19:00', escalaTipo: '12x36', intervaloInicio: null, intervaloFim: null }); // exatas 36h
    const resultado = detectarJornadaAcimaPermitido(dados([t1, t2]), CONFIGURACOES_CLT_PADRAO);
    expect(resultado.some((r) => r.descricao.includes('descanso'))).toBe(false);
  });
});

describe('detectarDescansoSemanalInsuficiente', () => {
  it('sinaliza quando não há 24h consecutivas de descanso na semana', () => {
    const turnos = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'].map((data) =>
      turno({ data, horaEntrada: '08:00', horaSaida: '17:00' }),
    );
    expect(detectarDescansoSemanalInsuficiente(dados(turnos), CONFIGURACOES_CLT_PADRAO).length).toBeGreaterThan(0);
  });

  it('não sinaliza quando há uma folga de domingo garantindo 24h+ de descanso', () => {
    const diasTrabalhados = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-24'].map(
      (data) => turno({ data, horaEntrada: '08:00', horaSaida: '17:00' }),
    );
    // domingo 2026-08-23 é folga (sem turno de trabalho): descanso de 22/08 17:00 até 24/08 08:00 (~39h)
    expect(detectarDescansoSemanalInsuficiente(dados(diasTrabalhados), CONFIGURACOES_CLT_PADRAO)).toHaveLength(0);
  });
});
