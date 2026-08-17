export const TIPOS_LOCALIDADE = ['municipio', 'base', 'site'] as const;
export type TipoLocalidade = (typeof TIPOS_LOCALIDADE)[number];

export const TIPO_LOCALIDADE_LABEL: Record<TipoLocalidade, string> = {
  municipio: 'Município',
  base: 'Base',
  site: 'Site',
};

export interface Localidade {
  id: number;
  nome: string;
  ufSigla: string;
  tipo: TipoLocalidade;
  ativo: boolean;
}

export interface LocalidadeEntrada {
  nome: string;
  ufSigla: string;
  tipo: TipoLocalidade;
  ativo?: boolean;
}
