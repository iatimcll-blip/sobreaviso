export const STATUS_SOBREAVISO = ['planejado', 'em_andamento', 'concluido', 'cancelado'] as const;
export type StatusSobreaviso = (typeof STATUS_SOBREAVISO)[number];

export const STATUS_SOBREAVISO_LABEL: Record<StatusSobreaviso, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export interface Sobreaviso {
  id: number;
  colaboradorId: number | null;
  equipeId: number | null;
  duplaId: number | null;
  localidadeId: number | null;
  inicio: string;
  fim: string;
  origem: 'manual' | 'rodizio_automatico';
  regraId: number | null;
  observacoes: string | null;
  status: StatusSobreaviso;
  criadoEm: string;
}

export interface SobreavisoDetalhado extends Sobreaviso {
  colaboradorNome: string | null;
  equipeNome: string | null;
  duplaNome: string | null;
  localidadeNome: string | null;
}

export interface SobreavisoEntrada {
  colaboradorId?: number | null;
  equipeId?: number | null;
  duplaId?: number | null;
  localidadeId?: number | null;
  inicio: string;
  fim: string;
  observacoes?: string | null;
  forcar?: boolean;
}

export interface SobreavisoRegraEquipe {
  equipeId: number;
  ordem: number;
  equipeNome: string;
}

export interface SobreavisoRegraLocalidade {
  localidadeId: number;
  localidadeNome: string;
}

export interface SobreavisoRegra {
  id: number;
  nome: string;
  periodicidadeDias: number;
  horaTroca: string;
  dataInicio: string;
  ativo: boolean;
  observacoes: string | null;
  equipes: SobreavisoRegraEquipe[];
  localidades: SobreavisoRegraLocalidade[];
}

export interface SobreavisoRegraEntrada {
  nome: string;
  periodicidadeDias: number;
  horaTroca: string;
  dataInicio: string;
  ativo?: boolean;
  observacoes?: string | null;
  equipeIds: number[];
  localidadeIds?: number[];
}

export interface StatusRodizio {
  regraId: number;
  regraNome: string;
  equipeAtualId: number;
  equipeAtualNome: string;
  equipeProximaId: number;
  equipeProximaNome: string;
  inicioTurnoAtual: string;
  fimTurnoAtual: string;
}
