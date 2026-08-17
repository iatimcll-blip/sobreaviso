import * as XLSX from 'xlsx';

/** Lê uma planilha (.xlsx/.xls) em memória e devolve as linhas brutas de uma aba, a partir de uma linha inicial. */
export function lerLinhasPlanilha(bytes: ArrayBuffer, abaEsperada: string, linhaInicial: number): unknown[][] {
  const workbook = XLSX.read(bytes, { type: 'array' });
  const sheet = workbook.Sheets[abaEsperada] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('A planilha não contém nenhuma aba legível.');
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: linhaInicial, defval: '' });
}
