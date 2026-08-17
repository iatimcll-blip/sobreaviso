import type { AcaoLinhaImportacao, ImportadorDefinicao, LinhaImportada, ResultadoImportacao, ResumoImportacao } from './contract';

export interface OpcoesExecutarImportacao {
  /** Consulta se já existe um registro com essa chave de duplicidade na base — quando ausente, nenhuma linha vira "atualizar". */
  existeNaBase?: (chave: string) => boolean;
}

function linhaVazia(row: unknown[]): boolean {
  return row.every((celula) => celula === undefined || celula === null || String(celula).trim() === '');
}

/**
 * Motor único de importação, reaproveitado por todos os tipos (colaboradores, feriados, ...).
 * Recebe as linhas já extraídas da planilha (via XLSX.utils.sheet_to_json({header:1, range})) e aplica
 * a mesma definição declarativa tanto na prévia do navegador quanto na confirmação autoritativa do servidor.
 */
export function executarImportacao<T>(
  definicao: ImportadorDefinicao<T>,
  linhasBrutas: unknown[][],
  opcoes: OpcoesExecutarImportacao = {},
): ResultadoImportacao<T> {
  const vistosNoArquivo = new Set<string>();
  const linhas: LinhaImportada<T>[] = [];

  linhasBrutas.forEach((row, indice) => {
    if (linhaVazia(row)) return;

    const numeroLinha = definicao.linhaInicial + indice + 1;
    const { dado, erros } = definicao.parseLinha(row);
    const chave = definicao.chaveDuplicidade(dado);
    const duplicadoNoArquivo = chave !== '' && vistosNoArquivo.has(chave);
    if (chave) vistosNoArquivo.add(chave);
    const duplicadoNaBase = chave !== '' && !duplicadoNoArquivo && !!opcoes.existeNaBase?.(chave);

    let acao: AcaoLinhaImportacao;
    if (erros.length > 0) acao = 'erro';
    else if (duplicadoNoArquivo) acao = 'ignorar';
    else if (duplicadoNaBase) acao = 'atualizar';
    else acao = 'criar';

    linhas.push({ linha: numeroLinha, dado, erros, duplicadoNoArquivo, duplicadoNaBase, acao });
  });

  const resumo: ResumoImportacao = {
    totalLinhas: linhas.length,
    importados: linhas.filter((linha) => linha.acao === 'criar').length,
    atualizados: linhas.filter((linha) => linha.acao === 'atualizar').length,
    ignorados: linhas.filter((linha) => linha.acao === 'ignorar').length,
    comErro: linhas.filter((linha) => linha.acao === 'erro').length,
  };

  return { linhas, resumo };
}
