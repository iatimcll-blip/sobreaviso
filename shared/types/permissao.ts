export const TELAS = [
  'dashboard',
  'escalas',
  'sobreaviso',
  'colaboradores',
  'inconsistencias',
  'configuracoes',
  'equipes',
  'duplas',
  'afastamentos',
  'localidades',
  'feriados',
  'usuarios',
] as const;

export type Tela = (typeof TELAS)[number];

export const ACOES_PERMISSAO = ['visualizar', 'criar', 'editar', 'excluir', 'exportar', 'importar'] as const;
export type AcaoPermissao = (typeof ACOES_PERMISSAO)[number];

export interface PermissaoTela {
  tela: Tela;
  podeVisualizar: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  podeExportar: boolean;
  podeImportar: boolean;
}

export const CAMPO_POR_ACAO: Record<AcaoPermissao, keyof Omit<PermissaoTela, 'tela'>> = {
  visualizar: 'podeVisualizar',
  criar: 'podeCriar',
  editar: 'podeEditar',
  excluir: 'podeExcluir',
  exportar: 'podeExportar',
  importar: 'podeImportar',
};

export function permissaoVazia(tela: Tela): PermissaoTela {
  return {
    tela,
    podeVisualizar: false,
    podeCriar: false,
    podeEditar: false,
    podeExcluir: false,
    podeExportar: false,
    podeImportar: false,
  };
}
