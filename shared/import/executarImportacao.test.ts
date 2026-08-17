import { describe, expect, it } from 'vitest';
import { colaboradoresDefinicao } from './colaboradoresDefinicao';
import { executarImportacao } from './executarImportacao';

describe('executarImportacao (colaboradores)', () => {
  const linhas = [
    ['Amanda Martins', 'Técnica de campo', 'Equipe Norte', 'CE', 'Fortaleza', 'Carlos Gestor', 'Diego Operacional'],
    ['', '', '', '', '', '', ''],
    ['Bruno Lima', 'Técnico de campo', 'Equipe Norte', 'XX', 'Fortaleza', '', ''],
    ['Amanda Martins', 'Técnica de campo', 'Equipe Norte', 'CE', 'Fortaleza', '', ''],
    ['Camila Souza', '', 'Equipe Sul', 'CE', 'Maracanaú', '', ''],
  ];

  it('classifica linhas válidas, com erro, duplicadas no arquivo e vazias', () => {
    const resultado = executarImportacao(colaboradoresDefinicao, linhas);

    expect(resultado.resumo.totalLinhas).toBe(4); // a linha vazia é descartada
    expect(resultado.resumo.importados).toBe(1); // Amanda (primeira ocorrência)
    expect(resultado.resumo.comErro).toBe(2); // UF inválida + função ausente
    expect(resultado.resumo.ignorados).toBe(1); // Amanda duplicada no arquivo

    const amandaDuplicada = resultado.linhas.find((l) => l.dado.nome === 'Amanda Martins' && l.duplicadoNoArquivo);
    expect(amandaDuplicada?.acao).toBe('ignorar');
  });

  it('marca como "atualizar" quando já existe na base', () => {
    const resultado = executarImportacao(colaboradoresDefinicao, [linhas[0]], {
      existeNaBase: (chave) => chave === 'AMANDA MARTINS',
    });
    expect(resultado.linhas[0].acao).toBe('atualizar');
    expect(resultado.resumo.atualizados).toBe(1);
  });
});
