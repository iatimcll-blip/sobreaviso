export const TIPOS_ESCALA = ['5x2', '6x1', '12x36', '4x2', 'personalizada'] as const;
export type TipoEscala = (typeof TIPOS_ESCALA)[number];

export const TIPO_ESCALA_LABEL: Record<TipoEscala, string> = {
  '5x2': '5x2',
  '6x1': '6x1',
  '12x36': '12x36',
  '4x2': '4x2',
  personalizada: 'Personalizada',
};

export const TURNOS_ESCALA = ['diurno', 'noturno', 'misto'] as const;
export type TurnoEscala = (typeof TURNOS_ESCALA)[number];

export interface EscalaTurno {
  id?: number;
  cicloDia: number;
  horaEntrada: string | null;
  horaSaida: string | null;
  intervaloInicio: string | null;
  intervaloFim: string | null;
  folga: boolean;
}

export interface EscalaModelo {
  id: number;
  nome: string;
  tipo: TipoEscala;
  turno: TurnoEscala;
  duracaoIntervaloMinutos: number;
  dataInicioVigencia: string;
  dataFimVigencia: string | null;
  possuiAcordoColetivo: boolean;
  ativo: boolean;
  observacoes: string | null;
  duplicadoDeId: number | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface EscalaModeloDetalhado extends EscalaModelo {
  turnos: EscalaTurno[];
  totalVinculos: number;
}

export interface EscalaModeloEntrada {
  nome: string;
  tipo: TipoEscala;
  turno: TurnoEscala;
  duracaoIntervaloMinutos: number;
  dataInicioVigencia: string;
  dataFimVigencia?: string | null;
  possuiAcordoColetivo?: boolean;
  ativo?: boolean;
  observacoes?: string | null;
  turnos: EscalaTurno[];
}

export interface EscalaVinculo {
  id: number;
  escalaModeloId: number;
  colaboradorId: number | null;
  equipeId: number | null;
  localidadeId: number | null;
  dataInicio: string;
  dataFim: string | null;
  colaboradorNome: string | null;
  equipeNome: string | null;
  localidadeNome: string | null;
}

export interface EscalaVinculoEntrada {
  colaboradorId?: number | null;
  equipeId?: number | null;
  localidadeId?: number | null;
  dataInicio: string;
  dataFim?: string | null;
}
