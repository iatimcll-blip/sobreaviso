import type { EscalaTurno, TipoEscala } from '../types/escala';

export interface EscalaAtribuicao {
  escalaModeloId: number;
  escalaNome: string;
  tipo: TipoEscala;
  possuiAcordoColetivo: boolean;
  turnos: EscalaTurno[];
  vinculoDataInicio: string;
  vinculoDataFim: string | null;
  /** Vínculo direto no colaborador tem prioridade sobre vínculo por equipe, que tem prioridade sobre localidade. */
  origemVinculo: 'colaborador' | 'equipe' | 'localidade';
}

export interface TurnoResolvido {
  data: string;
  horaEntrada: string | null;
  horaSaida: string | null;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  folga: boolean;
  escalaModeloId: number;
  escalaNome: string;
  escalaTipo: TipoEscala;
  possuiAcordoColetivo: boolean;
}

function paraDataUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Número de dias corridos entre duas datas ISO (pode ser negativo). */
export function diferencaDias(deISO: string, ateISO: string): number {
  const ms = paraDataUTC(ateISO).getTime() - paraDataUTC(deISO).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** Dia da semana (0 = domingo ... 6 = sábado), consistente com shared/constants/escalaPresets.ts. */
export function diaDaSemanaUTC(dataISO: string): number {
  return paraDataUTC(dataISO).getUTCDay();
}

/** Lista todas as datas ISO entre duas datas, inclusive. */
export function listarDatasEntre(deISO: string, ateISO: string): string[] {
  const dias: string[] = [];
  const cursor = paraDataUTC(deISO);
  const fim = paraDataUTC(ateISO);
  while (cursor.getTime() <= fim.getTime()) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

/** Duração em minutos entre dois horários "HH:MM", assumindo virada de meia-noite quando o fim é menor ou igual ao início. */
export function duracaoMinutos(horaInicio: string, horaFim: string): number {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFim.split(':').map(Number);
  const inicio = h1 * 60 + m1;
  let fim = h2 * 60 + m2;
  if (fim <= inicio) fim += 24 * 60;
  return fim - inicio;
}

/** Qual posição do padrão cíclico de turnos (ciclo_dia) corresponde à data alvo. */
export function calcularCicloDia(tipo: TipoEscala, dataInicioVinculo: string, dataAlvo: string, totalDiasPadrao: number): number {
  if (tipo === '5x2' || tipo === '6x1') {
    return diaDaSemanaUTC(dataAlvo);
  }
  const n = totalDiasPadrao > 0 ? totalDiasPadrao : 1;
  const diff = diferencaDias(dataInicioVinculo, dataAlvo);
  return ((diff % n) + n) % n;
}

const PRIORIDADE_ORIGEM: Record<EscalaAtribuicao['origemVinculo'], number> = { colaborador: 0, equipe: 1, localidade: 2 };

/**
 * Resolve, para cada dia de um período, qual turno concreto (entrada/saída/intervalo/folga) se aplica
 * a um colaborador, a partir das escalas vinculadas a ele (diretamente, pela equipe ou pela localidade).
 * Função pura — os dados de escalas/vínculos já devem ter sido carregados do banco pelo chamador.
 */
export function resolverTurnosDoPeriodo(atribuicoes: EscalaAtribuicao[], dataInicio: string, dataFim: string): TurnoResolvido[] {
  const resultado: TurnoResolvido[] = [];

  for (const data of listarDatasEntre(dataInicio, dataFim)) {
    const candidatas = atribuicoes.filter((a) => a.vinculoDataInicio <= data && (!a.vinculoDataFim || a.vinculoDataFim >= data));
    if (candidatas.length === 0) continue;

    candidatas.sort((a, b) => PRIORIDADE_ORIGEM[a.origemVinculo] - PRIORIDADE_ORIGEM[b.origemVinculo]);
    const atribuicao = candidatas[0];

    const totalDiasPadrao = atribuicao.tipo === '5x2' || atribuicao.tipo === '6x1' ? 7 : atribuicao.turnos.length;
    const cicloDia = calcularCicloDia(atribuicao.tipo, atribuicao.vinculoDataInicio, data, totalDiasPadrao);
    const turno = atribuicao.turnos.find((t) => t.cicloDia === cicloDia);
    if (!turno) continue;

    resultado.push({
      data,
      horaEntrada: turno.horaEntrada,
      horaSaida: turno.horaSaida,
      intervaloInicio: turno.intervaloInicio,
      intervaloFim: turno.intervaloFim,
      folga: turno.folga,
      escalaModeloId: atribuicao.escalaModeloId,
      escalaNome: atribuicao.escalaNome,
      escalaTipo: atribuicao.tipo,
      possuiAcordoColetivo: atribuicao.possuiAcordoColetivo,
    });
  }

  return resultado;
}

/** Horas previstas de um turno (jornada menos intervalo), em horas decimais. 0 para folga ou dados incompletos. */
export function horasPrevistasTurno(turno: TurnoResolvido): number {
  if (turno.folga || !turno.horaEntrada || !turno.horaSaida) return 0;
  const jornadaMinutos = duracaoMinutos(turno.horaEntrada, turno.horaSaida);
  const intervaloMinutos =
    turno.intervaloInicio && turno.intervaloFim ? duracaoMinutos(turno.intervaloInicio, turno.intervaloFim) : 0;
  return Math.max(0, jornadaMinutos - intervaloMinutos) / 60;
}

/** Instante (Date) de início/fim de um turno em uma data — para comparações de interjornada/sobreposição. */
export function instantesTurno(turno: TurnoResolvido): { inicio: Date; fim: Date } | null {
  if (turno.folga || !turno.horaEntrada || !turno.horaSaida) return null;
  const [ano, mes, dia] = turno.data.split('-').map(Number);
  const [he, mE] = turno.horaEntrada.split(':').map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, dia, he, mE));
  const jornadaMinutos = duracaoMinutos(turno.horaEntrada, turno.horaSaida);
  const fim = new Date(inicio.getTime() + jornadaMinutos * 60 * 1000);
  return { inicio, fim };
}
