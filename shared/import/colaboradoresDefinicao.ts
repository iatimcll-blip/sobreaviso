import { UF_SIGLAS } from '../constants/ufs';
import { celulasDaLinha, type ImportadorDefinicao } from './contract';

/** Forma bruta (texto) de uma linha da aba SOBREAVISO, antes de resolver relações no servidor. */
export interface ColaboradorImportado {
  nome: string;
  funcao: string;
  equipeNome: string;
  ufSigla: string;
  localidadeNome: string;
  gaNome: string;
  goNome: string;
}

export const colaboradoresDefinicao: ImportadorDefinicao<ColaboradorImportado> = {
  tipo: 'colaboradores',
  abaEsperada: 'SOBREAVISO',
  // XLSX.utils.sheet_to_json({ range: 2 }) pula as 2 primeiras linhas (cabeçalhos), dados a partir da 3ª linha.
  linhaInicial: 2,
  colunas: [
    { chave: 'COLABORADOR', obrigatorio: true },
    { chave: 'FUNÇÃO', obrigatorio: true },
    { chave: 'EQUIPE', obrigatorio: false },
    { chave: 'UF', obrigatorio: true },
    { chave: 'LOCALIDADE', obrigatorio: true },
    { chave: 'G.A', obrigatorio: false },
    { chave: 'G.O', obrigatorio: false },
  ],
  parseLinha(row) {
    const [nome, funcao, equipeNome, ufSigla, localidadeNome, gaNome, goNome] = celulasDaLinha(row, 7);
    const erros: string[] = [];

    if (!nome) erros.push('Nome do colaborador (coluna COLABORADOR) é obrigatório.');
    if (!funcao) erros.push('Função é obrigatória.');
    if (!ufSigla) {
      erros.push('UF é obrigatória.');
    } else if (!UF_SIGLAS.includes(ufSigla.toUpperCase())) {
      erros.push(`UF "${ufSigla}" não é uma sigla válida.`);
    }
    if (!localidadeNome) erros.push('Localidade é obrigatória.');

    return {
      dado: {
        nome,
        funcao,
        equipeNome,
        ufSigla: ufSigla.toUpperCase(),
        localidadeNome,
        gaNome,
        goNome,
      },
      erros,
    };
  },
  chaveDuplicidade(dado) {
    return (dado.nome ?? '').trim().toUpperCase();
  },
};
