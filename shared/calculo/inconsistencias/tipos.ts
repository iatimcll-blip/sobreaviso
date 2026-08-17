export const TIPOS_INCONSISTENCIA = [
  'interjornada_insuficiente',
  'intrajornada_insuficiente',
  'jornada_acima_permitido',
  'escala_12x36_irregular',
  'descanso_semanal_insuficiente',
  'sobreposicao_escala',
  'sobreposicao_sobreaviso',
  'escala_durante_afastamento',
  'escala_feriado_sem_configuracao',
  'cadastro_incompleto',
  'dupla_incompleta',
  'sobreaviso_sobrepoe_turno',
  'interjornada_insuficiente_sobreaviso',
  'sobreaviso_durante_afastamento',
] as const;
export type TipoInconsistencia = (typeof TIPOS_INCONSISTENCIA)[number];

export const TIPO_INCONSISTENCIA_LABEL: Record<TipoInconsistencia, string> = {
  interjornada_insuficiente: 'Descanso entre jornadas insuficiente',
  intrajornada_insuficiente: 'Intervalo intrajornada insuficiente',
  jornada_acima_permitido: 'Jornada acima do permitido',
  escala_12x36_irregular: 'Escala 12x36 irregular',
  descanso_semanal_insuficiente: 'Descanso semanal insuficiente',
  sobreposicao_escala: 'Sobreposição de escala',
  sobreposicao_sobreaviso: 'Sobreposição de sobreaviso',
  escala_durante_afastamento: 'Escala durante afastamento/férias',
  escala_feriado_sem_configuracao: 'Escala em feriado sem configuração',
  cadastro_incompleto: 'Cadastro incompleto',
  dupla_incompleta: 'Dupla incompleta',
  sobreaviso_sobrepoe_turno: 'Sobreaviso sobrepõe turno de trabalho',
  interjornada_insuficiente_sobreaviso: 'Descanso insuficiente entre sobreaviso e turno',
  sobreaviso_durante_afastamento: 'Sobreaviso durante afastamento/férias',
};

export const STATUS_INCONSISTENCIA = ['pendente', 'em_revisao', 'justificada', 'aprovada', 'corrigida', 'ignorada'] as const;
export type StatusInconsistencia = (typeof STATUS_INCONSISTENCIA)[number];

export const STATUS_INCONSISTENCIA_LABEL: Record<StatusInconsistencia, string> = {
  pendente: 'Pendente',
  em_revisao: 'Em revisão',
  justificada: 'Justificada',
  aprovada: 'Aprovada',
  corrigida: 'Corrigida',
  ignorada: 'Ignorada',
};

/** Status que já passaram por revisão humana — o motor de cálculo não sobrescreve a descrição nem o status destes. */
export const STATUS_REVISADOS: StatusInconsistencia[] = ['justificada', 'aprovada', 'corrigida', 'ignorada'];

export type SeveridadeInconsistencia = 'baixa' | 'media' | 'alta';

export interface InconsistenciaDetectada {
  tipo: TipoInconsistencia;
  colaboradorId: number | null;
  equipeId: number | null;
  localidadeId: number | null;
  dataReferencia: string;
  severidade: SeveridadeInconsistencia;
  descricao: string;
  entidadeRelacionadaTipo?: string | null;
  entidadeRelacionadaId?: number | null;
}
