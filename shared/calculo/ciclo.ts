export interface Ciclo {
  /** Data de início do ciclo (dia 15), formato ISO "aaaa-mm-dd". */
  inicio: string;
  /** Data de término do ciclo (dia 14 do mês seguinte), formato ISO "aaaa-mm-dd". */
  fim: string;
  /** Rótulo único do ciclo, "aaaa-mm" referente ao mês em que o ciclo se inicia. */
  rotulo: string;
}

const DIA_INICIO_CICLO = 15;

function paraDataUTC(valor: Date | string): Date {
  if (typeof valor === 'string') {
    const [ano, mes, dia] = valor.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia));
  }
  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function rotuloDe(ano: number, mesIndex0: number): string {
  return `${ano}-${String(mesIndex0 + 1).padStart(2, '0')}`;
}

/**
 * Determina o ciclo de apuração (15 do mês → 14 do mês seguinte) ao qual uma data pertence.
 * Fonte da verdade de toda a matemática de ciclo: nenhum outro lugar do código deve
 * recalcular esses limites manualmente.
 */
export function getCiclo(valor: Date | string): Ciclo {
  const data = paraDataUTC(valor);
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth(); // 0-based
  const dia = data.getUTCDate();

  const mesInicioCiclo = dia >= DIA_INICIO_CICLO ? mes : mes - 1;
  const anoInicioCiclo = mesInicioCiclo < 0 ? ano - 1 : ano;
  const mesInicioNormalizado = ((mesInicioCiclo % 12) + 12) % 12;

  const inicio = new Date(Date.UTC(anoInicioCiclo, mesInicioNormalizado, DIA_INICIO_CICLO));
  const fim = new Date(Date.UTC(anoInicioCiclo, mesInicioNormalizado + 1, 14));

  return {
    inicio: paraISO(inicio),
    fim: paraISO(fim),
    rotulo: rotuloDe(anoInicioCiclo, mesInicioNormalizado),
  };
}

export function cicloAtual(agora: Date = new Date()): Ciclo {
  return getCiclo(agora);
}

/** Reconstrói o ciclo a partir do rótulo "aaaa-mm" (mês em que o ciclo se inicia). */
export function cicloPorRotulo(rotulo: string): Ciclo {
  const [ano, mes] = rotulo.split('-').map(Number);
  return getCiclo(new Date(Date.UTC(ano, mes - 1, DIA_INICIO_CICLO)));
}

/** Lista todas as datas (ISO "aaaa-mm-dd") contidas em um ciclo, do início ao fim, inclusive. */
export function diasDoCiclo(ciclo: Ciclo): string[] {
  const dias: string[] = [];
  const cursor = paraDataUTC(ciclo.inicio);
  const fim = paraDataUTC(ciclo.fim);
  while (cursor.getTime() <= fim.getTime()) {
    dias.push(paraISO(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

/** Verifica se uma data está dentro do ciclo informado. */
export function dataNoCiclo(dataISO: string, ciclo: Ciclo): boolean {
  return dataISO >= ciclo.inicio && dataISO <= ciclo.fim;
}

/** Retorna o ciclo anterior e o próximo ciclo em relação ao informado. */
export function cicloAdjacente(ciclo: Ciclo, direcao: -1 | 1): Ciclo {
  const referencia = paraDataUTC(ciclo.inicio);
  referencia.setUTCMonth(referencia.getUTCMonth() + direcao);
  return getCiclo(referencia);
}

/** Texto de exibição em pt-BR, ex.: "15 de agosto de 2026 — 14 de setembro de 2026". */
export function formatarPeriodoCiclo(ciclo: Ciclo): string {
  const formatarPorExtenso = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      paraDataUTC(iso),
    );
  return `${formatarPorExtenso(ciclo.inicio)} — ${formatarPorExtenso(ciclo.fim)}`;
}
