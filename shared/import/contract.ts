export interface ColunaImportacao {
  chave: string;
  obrigatorio: boolean;
}

export type AcaoLinhaImportacao = 'criar' | 'atualizar' | 'ignorar' | 'erro';

export interface LinhaImportada<T> {
  /** Número da linha na planilha original (1-based), para exibição ao usuário. */
  linha: number;
  dado: Partial<T>;
  erros: string[];
  duplicadoNoArquivo: boolean;
  duplicadoNaBase: boolean;
  acao: AcaoLinhaImportacao;
}

export interface ResumoImportacao {
  totalLinhas: number;
  importados: number;
  atualizados: number;
  ignorados: number;
  comErro: number;
}

export interface ResultadoImportacao<T> {
  linhas: LinhaImportada<T>[];
  resumo: ResumoImportacao;
}

/**
 * Definição declarativa de um tipo de importação a partir de planilha .xlsx/.xls.
 * Reaproveitada tanto pela prévia no navegador quanto pela validação autoritativa no servidor,
 * garantindo que as duas rodadas de parsing apliquem exatamente as mesmas regras.
 */
export interface ImportadorDefinicao<T> {
  tipo: string;
  /** Nome da aba a ser lida; se ausente na planilha, usa-se a primeira aba. */
  abaEsperada: string;
  /** Índice (0-based) da primeira linha de dados, no formato aceito por XLSX.utils.sheet_to_json({range}). */
  linhaInicial: number;
  colunas: ColunaImportacao[];
  /** Extrai e valida os dados de uma linha bruta da planilha (array de células). */
  parseLinha(row: unknown[]): { dado: Partial<T>; erros: string[] };
  /** Chave usada para detectar duplicidade — tanto dentro do arquivo quanto contra a base existente. */
  chaveDuplicidade(dado: Partial<T>): string;
}

function celulaTexto(row: unknown[], indice: number): string {
  const valor = row[indice];
  if (valor === undefined || valor === null) return '';
  return String(valor).trim();
}

export function celulasDaLinha(row: unknown[], quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, indice) => celulaTexto(row, indice));
}
