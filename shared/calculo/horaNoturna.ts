import { duracaoMinutos, instantesTurno, type TurnoResolvido } from './jornada';

function deslocarData(dataISO: string, offsetDias: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + offsetDias);
  return data.toISOString().slice(0, 10);
}

function construirJanela(dataISO: string, horaInicio: string, horaFim: string): { inicio: Date; fim: Date } {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const [hi, mi] = horaInicio.split(':').map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, dia, hi, mi));
  const fim = new Date(inicio.getTime() + duracaoMinutos(horaInicio, horaFim) * 60_000);
  return { inicio, fim };
}

function sobreposicaoMinutos(aInicio: Date, aFim: Date, bInicio: Date, bFim: Date): number {
  const inicio = Math.max(aInicio.getTime(), bInicio.getTime());
  const fim = Math.min(aFim.getTime(), bFim.getTime());
  return Math.max(0, fim - inicio) / 60_000;
}

/**
 * Minutos reais (relógio) de um turno que caem dentro da janela noturna (default 22h–5h, Art. 73 §1 CLT).
 * Verifica a janela do dia do turno e dos dias adjacentes, para cobrir turnos que atravessam a meia-noite.
 */
export function calcularMinutosNoturnos(turno: TurnoResolvido, horaNoturnaInicio = '22:00', horaNoturnaFim = '05:00'): number {
  const instantes = instantesTurno(turno);
  if (!instantes) return 0;

  let total = 0;
  for (const offset of [-1, 0, 1]) {
    const janela = construirJanela(deslocarData(turno.data, offset), horaNoturnaInicio, horaNoturnaFim);
    total += sobreposicaoMinutos(instantes.inicio, instantes.fim, janela.inicio, janela.fim);
  }
  return total;
}

/** Converte minutos reais noturnos em "horas noturnas" legais — convenção da hora noturna reduzida (52min30s = 1h). */
export function converterParaHorasNoturnasLegais(minutosReais: number, fatorReducaoMinutos = 52.5): number {
  return minutosReais / fatorReducaoMinutos;
}

export interface ResultadoHoraNoturna {
  minutosReais: number;
  horasLegais: number;
  adicionalPct: number;
}

export function calcularHoraNoturna(
  turno: TurnoResolvido,
  config: { horaNoturnaInicio: string; horaNoturnaFim: string; horaNoturnaFatorReducao: number; horaNoturnaAdicionalPct: number },
): ResultadoHoraNoturna {
  const minutosReais = calcularMinutosNoturnos(turno, config.horaNoturnaInicio, config.horaNoturnaFim);
  return {
    minutosReais,
    horasLegais: converterParaHorasNoturnasLegais(minutosReais, config.horaNoturnaFatorReducao),
    adicionalPct: config.horaNoturnaAdicionalPct,
  };
}
