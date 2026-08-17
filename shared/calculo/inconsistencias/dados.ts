import type { TurnoResolvido } from '../jornada';

export interface AfastamentoParaAnalise {
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

export interface SobreavisoParaAnalise {
  inicio: string;
  fim: string;
}

export interface FeriadoParaAnalise {
  data: string;
  tipo: 'feriado' | 'ponto_facultativo';
}

export interface ColaboradorParaAnalise {
  id: number;
  equipeId: number | null;
  localidadeId: number | null;
  ufSigla: string | null;
  gestorAdministrativoId: number | null;
  gestorOperacionalId: number | null;
}

/** Pacote de dados de um colaborador em um ciclo, já carregado do banco pelo chamador — as regras em si são puras. */
export interface DadosAnaliseColaborador {
  colaborador: ColaboradorParaAnalise;
  turnos: TurnoResolvido[];
  afastamentos: AfastamentoParaAnalise[];
  sobreavisos: SobreavisoParaAnalise[];
  feriados: FeriadoParaAnalise[];
}
