import { feriadosDefinicao, type FeriadoImportado } from '../../../shared/import/feriadosDefinicao';
import type { ResultadoImportacao } from '../../../shared/import/contract';
import { executarImportacao } from '../../../shared/import/executarImportacao';
import { criarFeriado, listarFeriados } from '../../db/queries/feriados';
import { criarLocalidadeSeNaoExistir } from '../../db/queries/localidades';
import { lerLinhasPlanilha } from './xlsxRead';

export async function previewImportacaoFeriados(db: D1Database, bytes: ArrayBuffer): Promise<ResultadoImportacao<FeriadoImportado>> {
  const linhasBrutas = lerLinhasPlanilha(bytes, feriadosDefinicao.abaEsperada, feriadosDefinicao.linhaInicial);
  const existentes = await listarFeriados(db);
  const chavesExistentes = new Set(
    existentes.map((f) => [f.data, f.nome, f.abrangencia, f.ufSigla ?? '', f.localidadeNome ?? ''].join('|').toUpperCase()),
  );

  return executarImportacao(feriadosDefinicao, linhasBrutas, {
    existeNaBase: (chave) => chavesExistentes.has(chave),
  });
}

export interface ResumoConfirmacaoFeriados {
  importados: number;
  ignorados: number;
  comErro: number;
}

export async function confirmarImportacaoFeriados(
  db: D1Database,
  resultado: ResultadoImportacao<FeriadoImportado>,
): Promise<ResumoConfirmacaoFeriados> {
  const resumo: ResumoConfirmacaoFeriados = { importados: 0, ignorados: 0, comErro: 0 };

  for (const linha of resultado.linhas) {
    if (linha.acao === 'erro') {
      resumo.comErro += 1;
      continue;
    }
    if (linha.acao === 'ignorar' || linha.acao === 'atualizar') {
      // feriados não têm um conceito útil de "atualização" — duplicidade na base é apenas ignorada.
      resumo.ignorados += 1;
      continue;
    }

    const dado = linha.dado as FeriadoImportado;
    const localidadeId =
      dado.abrangencia === 'municipal' && dado.localidadeNome ? await criarLocalidadeSeNaoExistir(db, dado.localidadeNome, dado.ufSigla) : null;

    const id = await criarFeriado(
      db,
      {
        data: dado.data,
        nome: dado.nome,
        abrangencia: dado.abrangencia as 'nacional' | 'estadual' | 'municipal',
        ufSigla: dado.abrangencia === 'nacional' ? null : dado.ufSigla,
        localidadeId,
        tipo: dado.tipo as 'feriado' | 'ponto_facultativo',
      },
      'importado',
    );
    if (id) resumo.importados += 1;
    else resumo.ignorados += 1;
  }

  return resumo;
}
