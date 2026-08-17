export interface PeriodoSobreaviso {
  inicio: string;
  fim: string;
}

/** Duração real (em horas) de um período de sobreaviso. */
export function horasReaisSobreaviso(periodo: PeriodoSobreaviso): number {
  const ms = new Date(periodo.fim).getTime() - new Date(periodo.inicio).getTime();
  return Math.max(0, ms / (60 * 60 * 1000));
}

/** Horas de sobreaviso equivalentes em horas normais (Art. 244 §2 CLT/Súmula 428 TST, fator padrão 1/3). */
export function calcularHorasSobreaviso(periodos: PeriodoSobreaviso[], fator: number): { horasTotais: number; horasEquivalentes: number } {
  const horasTotais = periodos.reduce((soma, periodo) => soma + horasReaisSobreaviso(periodo), 0);
  return { horasTotais, horasEquivalentes: horasTotais * fator };
}
