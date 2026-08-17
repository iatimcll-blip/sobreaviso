export const TIPOS_AFASTAMENTO = [
  'ferias',
  'banco_horas',
  'atestado',
  'falta',
  'medida_disciplinar',
  'licenca',
  'folga_compensatoria',
  'outros',
] as const;
export type TipoAfastamento = (typeof TIPOS_AFASTAMENTO)[number];

export const TIPO_AFASTAMENTO_LABEL: Record<TipoAfastamento, string> = {
  ferias: 'Férias',
  banco_horas: 'Banco de Horas',
  atestado: 'Atestado',
  falta: 'Falta',
  medida_disciplinar: 'Medida disciplinar',
  licenca: 'Licença',
  folga_compensatoria: 'Folga compensatória',
  outros: 'Outros',
};

export const STATUS_AFASTAMENTO = ['pendente', 'aprovado', 'rejeitado'] as const;
export type StatusAfastamento = (typeof STATUS_AFASTAMENTO)[number];

export const STATUS_AFASTAMENTO_LABEL: Record<StatusAfastamento, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export interface Afastamento {
  id: number;
  colaboradorId: number;
  tipo: TipoAfastamento;
  dataInicio: string;
  dataFim: string;
  justificativa: string | null;
  documentoR2Key: string | null;
  documentoNomeArquivo: string | null;
  observacao: string | null;
  status: StatusAfastamento;
  criadoEm: string;
  atualizadoEm: string;
}

export interface AfastamentoDetalhado extends Afastamento {
  colaboradorNome: string;
}

export interface AfastamentoEntrada {
  colaboradorId: number;
  tipo: TipoAfastamento;
  dataInicio: string;
  dataFim: string;
  justificativa?: string | null;
  observacao?: string | null;
  forcar?: boolean;
}

export interface ConflitoAfastamento {
  tipo: 'sobreaviso' | 'escala';
  descricao: string;
  inicio: string;
  fim: string;
}
