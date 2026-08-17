export const SITUACOES_CADASTRAIS = ['ativo', 'afastado', 'inativo', 'desligado'] as const;
export type SituacaoCadastral = (typeof SITUACOES_CADASTRAIS)[number];

export const SITUACAO_CADASTRAL_LABEL: Record<SituacaoCadastral, string> = {
  ativo: 'Ativo',
  afastado: 'Afastado',
  inativo: 'Inativo',
  desligado: 'Desligado',
};

export interface Colaborador {
  id: number;
  nome: string;
  matricula: string | null;
  funcao: string;
  equipeId: number | null;
  ufSigla: string;
  localidadeId: number;
  gestorAdministrativoId: number | null;
  gestorOperacionalId: number | null;
  /** Preenchido quando o G.A informado na importação não corresponde a um colaborador cadastrado. */
  gaNomeImportado: string | null;
  /** Preenchido quando o G.O informado na importação não corresponde a um colaborador cadastrado. */
  goNomeImportado: string | null;
  situacaoCadastral: SituacaoCadastral;
  criadoEm: string;
  atualizadoEm: string;
}

/** Colaborador com nomes resolvidos das relações, para exibição em listas e tabelas. */
export interface ColaboradorDetalhado extends Colaborador {
  equipeNome: string | null;
  localidadeNome: string;
  gestorAdministrativoNome: string | null;
  gestorOperacionalNome: string | null;
}

export interface ColaboradorEntrada {
  nome: string;
  matricula?: string | null;
  funcao: string;
  equipeId?: number | null;
  ufSigla: string;
  localidadeId: number;
  gestorAdministrativoId?: number | null;
  gestorOperacionalId?: number | null;
  gaNomeImportado?: string | null;
  goNomeImportado?: string | null;
  situacaoCadastral?: SituacaoCadastral;
}
