export interface Equipe {
  id: number;
  nome: string;
  localidadeId: number | null;
  supervisorId: number | null;
  gestorAdministrativoId: number | null;
  gestorOperacionalId: number | null;
  ativo: boolean;
}

export interface EquipeDetalhada extends Equipe {
  localidadeNome: string | null;
  supervisorNome: string | null;
  gestorAdministrativoNome: string | null;
  gestorOperacionalNome: string | null;
  totalMembros: number;
}

export interface EquipeEntrada {
  nome: string;
  localidadeId?: number | null;
  supervisorId?: number | null;
  gestorAdministrativoId?: number | null;
  gestorOperacionalId?: number | null;
  ativo?: boolean;
}

export const PAPEIS_EQUIPE_MEMBRO = ['tecnico', 'supervisor', 'ga', 'go'] as const;
export type PapelEquipeMembro = (typeof PAPEIS_EQUIPE_MEMBRO)[number];

export const PAPEL_EQUIPE_MEMBRO_LABEL: Record<PapelEquipeMembro, string> = {
  tecnico: 'Técnico',
  supervisor: 'Supervisor',
  ga: 'Gestor Administrativo',
  go: 'Gestor Operacional',
};

export interface EquipeMembro {
  id: number;
  equipeId: number;
  colaboradorId: number;
  papel: PapelEquipeMembro;
  dataInicio: string;
  dataFim: string | null;
  colaboradorNome: string;
}

export interface EquipeMembroEntrada {
  colaboradorId: number;
  papel: PapelEquipeMembro;
  dataInicio: string;
  dataFim?: string | null;
}
