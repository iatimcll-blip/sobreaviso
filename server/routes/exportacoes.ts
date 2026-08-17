import { Hono } from 'hono';
import type { FiltroRelatorio } from '../../shared/types/exportacao';
import { criarExportHistorico } from '../db/queries/exportHistorico';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import {
  gerarExportacaoAfastamentos,
  gerarExportacaoBancoHoras,
  gerarExportacaoColaboradores,
  gerarExportacaoEscalas,
  gerarExportacaoHorasTrabalhadas,
  gerarExportacaoInconsistencias,
  gerarExportacaoRelatorioConsolidado,
  gerarExportacaoSobreavisos,
  type ArquivoGerado,
} from '../services/export/geradores';
import type { AppEnv } from '../types/context';
import type { Tela } from '../../shared/types/permissao';

export const exportacoesRoutes = new Hono<AppEnv>();
exportacoesRoutes.use('*', autenticar);

function lerFiltro(c: { req: { query: (nome: string) => string | undefined } }): FiltroRelatorio {
  return {
    ciclo: c.req.query('ciclo') || undefined,
    colaboradorId: c.req.query('colaboradorId') ? Number(c.req.query('colaboradorId')) : undefined,
    equipeId: c.req.query('equipeId') ? Number(c.req.query('equipeId')) : undefined,
    ufSigla: c.req.query('uf') || undefined,
    localidadeId: c.req.query('localidadeId') ? Number(c.req.query('localidadeId')) : undefined,
  };
}

function registrar(
  tipo: string,
  tela: Tela,
  gerador: (db: D1Database, filtro: FiltroRelatorio) => Promise<ArquivoGerado>,
) {
  exportacoesRoutes.get(`/${tipo}`, requererPermissao(tela, 'exportar'), async (c) => {
    const usuario = c.get('usuario');
    const filtro = lerFiltro(c);

    const { nomeArquivo, bytes } = await gerador(c.env.DB, filtro);

    const chaveR2 = `exportacoes/${tipo}/${Date.now()}-${nomeArquivo}`;
    await c.env.BUCKET.put(chaveR2, bytes);
    await criarExportHistorico(c.env.DB, {
      tipo,
      filtros: filtro,
      cicloReferencia: filtro.ciclo ?? null,
      r2Key: chaveR2,
      nomeArquivo,
      usuarioId: usuario.id,
    });

    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    });
  });
}

registrar('colaboradores', 'colaboradores', gerarExportacaoColaboradores);
registrar('escalas', 'escalas', gerarExportacaoEscalas);
registrar('sobreavisos', 'sobreaviso', gerarExportacaoSobreavisos);
registrar('afastamentos', 'afastamentos', gerarExportacaoAfastamentos);
registrar('inconsistencias', 'inconsistencias', gerarExportacaoInconsistencias);
registrar('horas-trabalhadas', 'colaboradores', gerarExportacaoHorasTrabalhadas);
registrar('banco-horas', 'colaboradores', gerarExportacaoBancoHoras);
registrar('relatorio-consolidado', 'dashboard', gerarExportacaoRelatorioConsolidado);
