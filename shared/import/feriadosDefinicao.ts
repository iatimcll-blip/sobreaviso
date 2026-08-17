import { UF_SIGLAS } from '../constants/ufs';
import { parseDataBR } from '../format';
import { celulasDaLinha, type ImportadorDefinicao } from './contract';

/** Forma bruta (texto) de uma linha da aba FERIADOS, antes de resolver a localidade no servidor. */
export interface FeriadoImportado {
  data: string;
  nome: string;
  abrangencia: string;
  ufSigla: string;
  localidadeNome: string;
  tipo: string;
}

export const feriadosDefinicao: ImportadorDefinicao<FeriadoImportado> = {
  tipo: 'feriados',
  abaEsperada: 'FERIADOS',
  // XLSX.utils.sheet_to_json({ range: 1 }) pula a 1ª linha (cabeçalho), dados a partir da 2ª linha.
  linhaInicial: 1,
  colunas: [
    { chave: 'DATA', obrigatorio: true },
    { chave: 'NOME', obrigatorio: true },
    { chave: 'ABRANGENCIA', obrigatorio: true },
    { chave: 'UF', obrigatorio: false },
    { chave: 'LOCALIDADE', obrigatorio: false },
    { chave: 'TIPO', obrigatorio: false },
  ],
  parseLinha(row) {
    const [dataTexto, nome, abrangenciaTexto, ufSigla, localidadeNome, tipoTexto] = celulasDaLinha(row, 6);
    const erros: string[] = [];

    const dataISO = parseDataBR(dataTexto);
    if (!dataTexto) erros.push('Data (coluna DATA) é obrigatória.');
    else if (!dataISO) erros.push(`Data "${dataTexto}" deve estar no formato dd/mm/aaaa.`);

    if (!nome) erros.push('Nome do feriado é obrigatório.');

    const abrangencia = abrangenciaTexto.trim().toLowerCase();
    if (!['nacional', 'estadual', 'municipal'].includes(abrangencia)) {
      erros.push('Abrangência deve ser "nacional", "estadual" ou "municipal".');
    }
    if (abrangencia !== 'nacional' && !ufSigla) {
      erros.push('UF é obrigatória para feriados estaduais/municipais.');
    } else if (ufSigla && !UF_SIGLAS.includes(ufSigla.toUpperCase())) {
      erros.push(`UF "${ufSigla}" não é uma sigla válida.`);
    }
    if (abrangencia === 'municipal' && !localidadeNome) {
      erros.push('Localidade é obrigatória para feriados municipais.');
    }

    const tipo = tipoTexto.trim().toLowerCase() === 'ponto_facultativo' ? 'ponto_facultativo' : 'feriado';

    return {
      dado: {
        data: dataISO ?? '',
        nome,
        abrangencia,
        ufSigla: ufSigla.toUpperCase(),
        localidadeNome,
        tipo,
      },
      erros,
    };
  },
  chaveDuplicidade(dado) {
    return [dado.data, dado.nome, dado.abrangencia, dado.ufSigla, dado.localidadeNome].join('|').toUpperCase();
  },
};
