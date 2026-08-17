export const TIPOS_EXPORTACAO = [
  'colaboradores',
  'escalas',
  'sobreavisos',
  'afastamentos',
  'inconsistencias',
  'horas-trabalhadas',
  'banco-horas',
  'relatorio-consolidado',
] as const;
export type TipoExportacao = (typeof TIPOS_EXPORTACAO)[number];

export const TIPO_EXPORTACAO_LABEL: Record<TipoExportacao, string> = {
  colaboradores: 'Colaboradores',
  escalas: 'Escalas',
  sobreavisos: 'Sobreavisos',
  afastamentos: 'Afastamentos',
  inconsistencias: 'Inconsistências',
  'horas-trabalhadas': 'Horas trabalhadas',
  'banco-horas': 'Banco de horas',
  'relatorio-consolidado': 'Relatório consolidado do período',
};

/** Mesmo formato de filtro em todas as telas com exportação — respeitado também pelos geradores de planilha. */
export interface FiltroRelatorio {
  ciclo?: string;
  colaboradorId?: number;
  equipeId?: number;
  ufSigla?: string;
  localidadeId?: number;
}
