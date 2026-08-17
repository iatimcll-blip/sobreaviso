/**
 * Data da Páscoa (domingo) para um ano, via algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
 * Base de todos os feriados/pontos facultativos móveis do calendário brasileiro.
 */
export function calcularPascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

function paraISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function somarDias(ano: number, mes: number, dia: number, deslocamento: number): string {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + deslocamento);
  return data.toISOString().slice(0, 10);
}

/** Data da Páscoa em formato ISO "aaaa-mm-dd". */
export function dataPascoaISO(ano: number): string {
  const { mes, dia } = calcularPascoa(ano);
  return paraISO(ano, mes, dia);
}

/** Datas móveis derivadas da Páscoa, em formato ISO "aaaa-mm-dd". */
export function datasMoveis(ano: number) {
  const { mes, dia } = calcularPascoa(ano);
  return {
    carnavalSegunda: somarDias(ano, mes, dia, -48),
    carnavalTerca: somarDias(ano, mes, dia, -47),
    sextaFeiraSanta: somarDias(ano, mes, dia, -2),
    pascoa: paraISO(ano, mes, dia),
    corpusChristi: somarDias(ano, mes, dia, 60),
  };
}
