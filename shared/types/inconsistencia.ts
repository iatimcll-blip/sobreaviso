import type { SeveridadeInconsistencia, StatusInconsistencia, TipoInconsistencia } from '../calculo/inconsistencias/tipos';

export interface InconsistenciaDetalhada {
  id: number;
  tipo: TipoInconsistencia;
  colaboradorId: number | null;
  equipeId: number | null;
  localidadeId: number | null;
  dataReferencia: string;
  cicloReferencia: string;
  severidade: SeveridadeInconsistencia;
  descricao: string;
  entidadeRelacionadaTipo: string | null;
  entidadeRelacionadaId: number | null;
  status: StatusInconsistencia;
  justificativa: string | null;
  revisadoPor: number | null;
  revisadoEm: string | null;
  detectadoEm: string;
  colaboradorNome: string | null;
  equipeNome: string | null;
  localidadeNome: string | null;
}
