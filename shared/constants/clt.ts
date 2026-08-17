export interface ConfiguracoesClt {
  interjornadaMinimaHoras: number;
  jornadaMaximaDiariaHoras: number;
  intrajornadaJornadaLongaHoras: number;
  intrajornadaMinimaLongaMinutos: number;
  intrajornadaMinimaLongaComAcordoMinutos: number;
  intrajornadaJornadaMediaHoras: number;
  intrajornadaMinimaMediaMinutos: number;
  horaNoturnaInicio: string;
  horaNoturnaFim: string;
  horaNoturnaFatorReducao: number;
  horaNoturnaAdicionalPct: number;
  sobreavisoFator: number;
  descansoSemanalHoras: number;
  descanso12x36Horas: number;
  tetoHorasExtrasDia: number;
}

/** Espelha os defaults da migration 0004 — usado como fallback e como base para testes do motor de cálculo. */
export const CONFIGURACOES_CLT_PADRAO: ConfiguracoesClt = {
  interjornadaMinimaHoras: 11,
  jornadaMaximaDiariaHoras: 10,
  intrajornadaJornadaLongaHoras: 6,
  intrajornadaMinimaLongaMinutos: 60,
  intrajornadaMinimaLongaComAcordoMinutos: 30,
  intrajornadaJornadaMediaHoras: 4,
  intrajornadaMinimaMediaMinutos: 15,
  horaNoturnaInicio: '22:00',
  horaNoturnaFim: '05:00',
  horaNoturnaFatorReducao: 52.5,
  horaNoturnaAdicionalPct: 20,
  sobreavisoFator: 0.333333,
  descansoSemanalHoras: 24,
  descanso12x36Horas: 36,
  tetoHorasExtrasDia: 2,
};
