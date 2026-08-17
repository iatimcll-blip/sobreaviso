import type { ConfiguracoesClt } from '../constants/clt';
import type { EscalaTurno, TipoEscala, TurnoEscala } from '../types/escala';

export interface ParametrosGeracaoEscala {
  tipo: TipoEscala;
  /** "HH:MM" */
  horaEntrada: string;
  duracaoJornadaHoras: number;
  possuiAcordoColetivo: boolean;
  config: ConfiguracoesClt;
}

export interface ResultadoGeracaoEscala {
  turnos: EscalaTurno[];
  turnoSugerido: TurnoEscala;
  intervaloMinutos: number;
  horaSaida: string;
}

const TIPOS_SUPORTADOS: TipoEscala[] = ['5x2', '6x1', '12x36', '4x2'];

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function paraHHMM(minutosAbsolutos: number): string {
  const m = ((minutosAbsolutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Mesma graduação de shared/calculo/inconsistencias/jornada.ts::detectarIntrajornadaInsuficiente — não duplica o limite, só o reaplica. */
function intervaloMinimoMinutos(jornadaHoras: number, possuiAcordoColetivo: boolean, config: ConfiguracoesClt): number {
  if (jornadaHoras > config.intrajornadaJornadaLongaHoras) {
    return possuiAcordoColetivo ? config.intrajornadaMinimaLongaComAcordoMinutos : config.intrajornadaMinimaLongaMinutos;
  }
  if (jornadaHoras > config.intrajornadaJornadaMediaHoras) {
    return config.intrajornadaMinimaMediaMinutos;
  }
  return 0;
}

function classificarTurno(entradaMin: number, saidaTrabalhadaMin: number, config: ConfiguracoesClt): TurnoEscala {
  const noturnoInicio = paraMinutos(config.horaNoturnaInicio);
  const noturnoFim = paraMinutos(config.horaNoturnaFim);
  const estaNaJanelaNoturna = (min: number) => {
    const m = ((min % 1440) + 1440) % 1440;
    return noturnoInicio <= noturnoFim ? m >= noturnoInicio && m < noturnoFim : m >= noturnoInicio || m < noturnoFim;
  };

  let dentro = 0;
  let fora = 0;
  for (let m = entradaMin; m < saidaTrabalhadaMin; m += 30) {
    if (estaNaJanelaNoturna(m)) dentro += 1;
    else fora += 1;
  }
  if (fora === 0) return 'noturno';
  if (dentro === 0) return 'diurno';
  return 'misto';
}

/**
 * Gera automaticamente os turnos de um modelo de escala (5x2/6x1/12x36/4x2) a partir do horário de
 * entrada e da duração de jornada desejados, calculando saída e posicionamento do intervalo e
 * respeitando os parâmetros CLT configurados: interjornada mínima (Art. 66), intervalo
 * intrajornada graduado pela duração (Art. 71, com redução por acordo coletivo), jornada máxima
 * diária (Art. 59) e a jornada fixa de 12h do padrão 12x36 (Art. 59-A). Lança erro descritivo
 * quando a combinação pedida violaria algum desses limites, em vez de produzir um padrão que o
 * motor de detecção de inconsistências (shared/calculo/inconsistencias) acusaria em seguida.
 *
 * Escalas "personalizada" ficam de fora de propósito: cada dia pode ter um horário diferente, não
 * há um único par entrada/duração que descreva o padrão inteiro.
 */
export function gerarTurnosAutomaticos(params: ParametrosGeracaoEscala): ResultadoGeracaoEscala {
  const { tipo, horaEntrada, duracaoJornadaHoras, possuiAcordoColetivo, config } = params;

  if (!TIPOS_SUPORTADOS.includes(tipo)) {
    throw new Error(
      'Geração automática disponível para 5x2, 6x1, 12x36 e 4x2. Escalas personalizadas variam de dia a dia e exigem configuração manual.',
    );
  }
  if (!Number.isFinite(duracaoJornadaHoras) || duracaoJornadaHoras <= 0 || duracaoJornadaHoras > 24) {
    throw new Error('Informe uma duração de jornada válida (entre 0 e 24 horas).');
  }
  if (tipo === '12x36' && Math.abs(duracaoJornadaHoras - 12) > 0.01) {
    throw new Error('O padrão 12x36 exige jornada de exatamente 12 horas (Art. 59-A da CLT) — ajuste a duração para 12.');
  }
  if (tipo !== '12x36' && duracaoJornadaHoras > config.jornadaMaximaDiariaHoras) {
    throw new Error(
      `Jornada de ${duracaoJornadaHoras}h excede o máximo diário configurado em Configurações → Parâmetros CLT (${config.jornadaMaximaDiariaHoras}h).`,
    );
  }

  const intervaloMin = intervaloMinimoMinutos(duracaoJornadaHoras, possuiAcordoColetivo, config);
  const entradaMin = paraMinutos(horaEntrada);
  const saidaMin = entradaMin + duracaoJornadaHoras * 60 + intervaloMin;

  if (tipo !== '12x36') {
    const interjornadaHoras = 24 - duracaoJornadaHoras - intervaloMin / 60;
    if (interjornadaHoras < config.interjornadaMinimaHoras) {
      throw new Error(
        `Essa combinação deixa só ${interjornadaHoras.toFixed(1)}h entre o fim de um turno e o início do seguinte — abaixo do mínimo de ${config.interjornadaMinimaHoras}h (Art. 66 da CLT, interjornada). Reduza a duração da jornada.`,
      );
    }
  }

  // Centraliza o intervalo no meio da jornada trabalhada.
  const metadeJornadaMin = Math.floor((duracaoJornadaHoras * 60) / 2);
  const intervaloInicioMin = entradaMin + metadeJornadaMin - Math.floor(intervaloMin / 2);
  const intervaloFimMin = intervaloInicioMin + intervaloMin;

  const diaTrabalho = (): Omit<EscalaTurno, 'cicloDia'> => ({
    horaEntrada,
    horaSaida: paraHHMM(saidaMin),
    intervaloInicio: intervaloMin > 0 ? paraHHMM(intervaloInicioMin) : null,
    intervaloFim: intervaloMin > 0 ? paraHHMM(intervaloFimMin) : null,
    folga: false,
  });
  const diaFolga = (): Omit<EscalaTurno, 'cicloDia'> => ({
    horaEntrada: null,
    horaSaida: null,
    intervaloInicio: null,
    intervaloFim: null,
    folga: true,
  });

  let turnos: EscalaTurno[];
  switch (tipo) {
    case '5x2':
      turnos = Array.from({ length: 7 }, (_, cicloDia) => ({
        cicloDia,
        ...(cicloDia === 0 || cicloDia === 6 ? diaFolga() : diaTrabalho()),
      }));
      break;
    case '6x1':
      turnos = Array.from({ length: 7 }, (_, cicloDia) => ({ cicloDia, ...(cicloDia === 0 ? diaFolga() : diaTrabalho()) }));
      break;
    case '4x2':
      turnos = Array.from({ length: 6 }, (_, cicloDia) => ({ cicloDia, ...(cicloDia >= 4 ? diaFolga() : diaTrabalho()) }));
      break;
    case '12x36':
    default:
      turnos = [
        { cicloDia: 0, ...diaTrabalho() },
        { cicloDia: 1, ...diaFolga() },
      ];
      break;
  }

  return {
    turnos,
    turnoSugerido: classificarTurno(entradaMin, entradaMin + duracaoJornadaHoras * 60, config),
    intervaloMinutos: intervaloMin,
    horaSaida: paraHHMM(saidaMin),
  };
}
