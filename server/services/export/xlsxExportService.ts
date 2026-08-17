import * as XLSX from 'xlsx';

export interface PlanilhaDefinida {
  nomeAba: string;
  linhas: Record<string, string | number>[];
}

/** Gera um workbook .xlsx (uma ou mais abas) a partir de linhas já formatadas (datas em dd/mm/aaaa). */
export function gerarPlanilha(abas: PlanilhaDefinida[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  for (const aba of abas) {
    const linhas = aba.linhas.length > 0 ? aba.linhas : [{ Aviso: 'Nenhum registro encontrado para os filtros selecionados.' }];
    const planilha = XLSX.utils.json_to_sheet(linhas);
    XLSX.utils.book_append_sheet(workbook, planilha, aba.nomeAba.slice(0, 31));
  }
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
