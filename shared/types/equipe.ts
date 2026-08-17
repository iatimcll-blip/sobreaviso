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

export const PAPEIS_EQUIPE_MEMBRO = ['tecnico', 'oficial', 'auxiliar', 'supervisor', 'ga', 'go'] as const;
export type PapelEquipeMembro = (typeof PAPEIS_EQUIPE_MEMBRO)[number];

export const PAPEL_EQUIPE_MEMBRO_LABEL: Record<PapelEquipeMembro, string> = {
  tecnico: 'Técnico',
  oficial: 'Oficial',
  auxiliar: 'Auxiliar',
  supervisor: 'Supervisor',
  ga: 'Gestor Administrativo',
  go: 'Gestor Operacional',
};

/** Sugere o papel de equipe mais provável a partir do texto livre de `colaboradores.funcao`. */
export function sugerirPapelPorFuncao(funcao: string): PapelEquipeMembro | null {
  const texto = funcao.toLocaleLowerCase('pt-BR');
  if (texto.includes('auxiliar')) return 'auxiliar';
  if (texto.includes('oficial')) return 'oficial';
  if (texto.includes('técnico') || texto.includes('tecnico')) return 'tecnico';
  return null;
}

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
