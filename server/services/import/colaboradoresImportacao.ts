import { colaboradoresDefinicao, type ColaboradorImportado } from '../../../shared/import/colaboradoresDefinicao';
import type { ResultadoImportacao } from '../../../shared/import/contract';
import { executarImportacao } from '../../../shared/import/executarImportacao';
import { atualizarColaborador, buscarColaboradorPorNome, criarColaborador, listarColaboradores } from '../../db/queries/colaboradores';
import { criarEquipeSeNaoExistir } from '../../db/queries/equipes';
import { criarLocalidadeSeNaoExistir } from '../../db/queries/localidades';
import { lerLinhasPlanilha } from './xlsxRead';

export async function previewImportacaoColaboradores(db: D1Database, bytes: ArrayBuffer): Promise<ResultadoImportacao<ColaboradorImportado>> {
  const linhasBrutas = lerLinhasPlanilha(bytes, colaboradoresDefinicao.abaEsperada, colaboradoresDefinicao.linhaInicial);
  const existentes = await listarColaboradores(db);
  const nomesExistentes = new Set(existentes.map((colaborador) => colaborador.nome.toUpperCase()));

  return executarImportacao(colaboradoresDefinicao, linhasBrutas, {
    existeNaBase: (chave) => nomesExistentes.has(chave),
  });
}

export interface ResumoConfirmacaoImportacao {
  importados: number;
  atualizados: number;
  ignorados: number;
  comErro: number;
}

/** Resolve o nome de um G.A/G.O contra a base de colaboradores; sem correspondência, guarda o texto bruto. */
async function resolverGestor(db: D1Database, nome: string): Promise<{ id: number | null; nomeImportado: string | null }> {
  if (!nome) return { id: null, nomeImportado: null };
  const encontrado = await buscarColaboradorPorNome(db, nome);
  return encontrado ? { id: encontrado.id, nomeImportado: null } : { id: null, nomeImportado: nome };
}

export async function confirmarImportacaoColaboradores(
  db: D1Database,
  resultado: ResultadoImportacao<ColaboradorImportado>,
  usuarioId: number,
): Promise<ResumoConfirmacaoImportacao> {
  const resumo: ResumoConfirmacaoImportacao = { importados: 0, atualizados: 0, ignorados: 0, comErro: 0 };

  for (const linha of resultado.linhas) {
    if (linha.acao === 'erro') {
      resumo.comErro += 1;
      continue;
    }
    if (linha.acao === 'ignorar') {
      resumo.ignorados += 1;
      continue;
    }

    const dado = linha.dado as ColaboradorImportado;
    const localidadeId = await criarLocalidadeSeNaoExistir(db, dado.localidadeNome, dado.ufSigla);
    const equipeId = dado.equipeNome ? await criarEquipeSeNaoExistir(db, dado.equipeNome) : null;
    const ga = await resolverGestor(db, dado.gaNome);
    const go = await resolverGestor(db, dado.goNome);

    const entrada = {
      nome: dado.nome,
      funcao: dado.funcao,
      equipeId,
      ufSigla: dado.ufSigla,
      localidadeId,
      gestorAdministrativoId: ga.id,
      gestorOperacionalId: go.id,
      gaNomeImportado: ga.nomeImportado,
      goNomeImportado: go.nomeImportado,
      situacaoCadastral: 'ativo' as const,
    };

    if (linha.acao === 'atualizar') {
      const existente = await buscarColaboradorPorNome(db, dado.nome);
      if (existente) {
        await atualizarColaborador(db, existente.id, entrada, usuarioId);
        resumo.atualizados += 1;
        continue;
      }
    }

    await criarColaborador(db, entrada, usuarioId);
    resumo.importados += 1;
  }

  return resumo;
}
