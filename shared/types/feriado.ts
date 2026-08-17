export const ABRANGENCIAS_FERIADO = ['nacional', 'estadual', 'municipal'] as const;
export type AbrangenciaFeriado = (typeof ABRANGENCIAS_FERIADO)[number];

export const TIPOS_FERIADO = ['feriado', 'ponto_facultativo'] as const;
export type TipoFeriado = (typeof TIPOS_FERIADO)[number];

export const TIPO_FERIADO_LABEL: Record<TipoFeriado, string> = {
  feriado: 'Feriado',
  ponto_facultativo: 'Ponto facultativo',
};

export const ORIGENS_FERIADO = ['automatico', 'importado', 'manual'] as const;
export type OrigemFeriado = (typeof ORIGENS_FERIADO)[number];

export interface Feriado {
  id: number;
  data: string;
  ano: number;
  nome: string;
  abrangencia: AbrangenciaFeriado;
  ufSigla: string | null;
  localidadeId: number | null;
  tipo: TipoFeriado;
  origem: OrigemFeriado;
}

export interface FeriadoDetalhado extends Feriado {
  localidadeNome: string | null;
}

export interface FeriadoEntrada {
  data: string;
  nome: string;
  abrangencia: AbrangenciaFeriado;
  ufSigla?: string | null;
  localidadeId?: number | null;
  tipo: TipoFeriado;
}
