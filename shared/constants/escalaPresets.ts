import type { EscalaTurno, TipoEscala } from '../types/escala';

/** Quantidade de dias no padrão cíclico de cada tipo de escala (usado para montar o editor de turnos). */
export function diasDoPadrao(tipo: TipoEscala): number {
  switch (tipo) {
    case '12x36':
      return 2;
    case '4x2':
      return 6;
    case '5x2':
    case '6x1':
    case 'personalizada':
    default:
      return 7;
  }
}

/** Rótulo de cada dia do padrão — dia da semana para 5x2/6x1, "Dia N" para os cíclicos. */
export function rotuloDiaPadrao(tipo: TipoEscala, cicloDia: number): string {
  if (tipo === '5x2' || tipo === '6x1') {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return dias[cicloDia] ?? `Dia ${cicloDia + 1}`;
  }
  return `Dia ${cicloDia + 1}`;
}

/** Gera um padrão de turnos padrão/sugerido para o tipo de escala escolhido — ponto de partida editável. */
export function gerarTurnosPadrao(tipo: TipoEscala): EscalaTurno[] {
  const diurno = (folga: boolean): Omit<EscalaTurno, 'cicloDia'> =>
    folga
      ? { horaEntrada: null, horaSaida: null, intervaloInicio: null, intervaloFim: null, folga: true }
      : { horaEntrada: '08:00', horaSaida: '17:00', intervaloInicio: '12:00', intervaloFim: '13:00', folga: false };

  switch (tipo) {
    case '5x2':
      return Array.from({ length: 7 }, (_, cicloDia) => ({
        cicloDia,
        ...diurno(cicloDia === 0 || cicloDia === 6),
      }));
    case '6x1':
      return Array.from({ length: 7 }, (_, cicloDia) => ({ cicloDia, ...diurno(cicloDia === 0) }));
    case '12x36':
      return [
        { cicloDia: 0, horaEntrada: '07:00', horaSaida: '19:00', intervaloInicio: '12:00', intervaloFim: '13:00', folga: false },
        { cicloDia: 1, horaEntrada: null, horaSaida: null, intervaloInicio: null, intervaloFim: null, folga: true },
      ];
    case '4x2':
      return Array.from({ length: 6 }, (_, cicloDia) => ({ cicloDia, ...diurno(cicloDia >= 4) }));
    case 'personalizada':
    default:
      return [{ cicloDia: 0, horaEntrada: '08:00', horaSaida: '17:00', intervaloInicio: '12:00', intervaloFim: '13:00', folga: false }];
  }
}
