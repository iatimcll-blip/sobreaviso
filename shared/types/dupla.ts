export interface Dupla {
  id: number;
  equipeId: number | null;
  nome: string | null;
  colaborador1Id: number;
  colaborador2Id: number | null;
  ativo: boolean;
  dataInicio: string;
  dataFim: string | null;
}

export interface DuplaDetalhada extends Dupla {
  equipeNome: string | null;
  colaborador1Nome: string;
  colaborador2Nome: string | null;
  incompleta: boolean;
}

export interface DuplaEntrada {
  equipeId?: number | null;
  nome?: string | null;
  colaborador1Id: number;
  colaborador2Id?: number | null;
  ativo?: boolean;
  dataInicio: string;
  dataFim?: string | null;
}
