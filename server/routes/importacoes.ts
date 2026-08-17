import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { registrarAuditoria } from '../db/queries/auditoria';
import { buscarImportHistoricoPorId, concluirImportHistorico, criarImportHistorico, listarImportHistorico } from '../db/queries/importHistorico';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import { confirmarImportacaoColaboradores, previewImportacaoColaboradores } from '../services/import/colaboradoresImportacao';
import { confirmarImportacaoFeriados, previewImportacaoFeriados } from '../services/import/feriadosImportacao';
import type { AppEnv } from '../types/context';

export const importacoesRoutes = new Hono<AppEnv>();
importacoesRoutes.use('*', autenticar);

function saneiarNomeArquivo(nome: string): string {
  return nome.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

importacoesRoutes.get('/colaboradores/historico', requererPermissao('colaboradores', 'importar'), async (c) => {
  const historico = await listarImportHistorico(c.env.DB, 'colaboradores');
  return c.json({ historico });
});

importacoesRoutes.post('/colaboradores/preview', requererPermissao('colaboradores', 'importar'), async (c) => {
  const usuario = c.get('usuario');
  const corpo = await c.req.parseBody();
  const arquivo = corpo.file;

  if (!(arquivo instanceof File)) {
    return c.json({ erro: 'Envie um arquivo .xlsx ou .xls no campo "file".' }, 400);
  }

  const bytes = await arquivo.arrayBuffer();
  const chaveR2 = `importacoes/colaboradores/${Date.now()}-${saneiarNomeArquivo(arquivo.name)}`;
  await c.env.BUCKET.put(chaveR2, bytes);

  let resultado;
  try {
    resultado = await previewImportacaoColaboradores(c.env.DB, bytes);
  } catch {
    return c.json({ erro: 'Não foi possível ler a planilha. Confira o padrão de aba e colunas esperado.' }, 422);
  }

  const importId = await criarImportHistorico(c.env.DB, {
    tipo: 'colaboradores',
    nomeArquivo: arquivo.name,
    r2Key: chaveR2,
    usuarioId: usuario.id,
    totalLinhas: resultado.resumo.totalLinhas,
  });

  return c.json({ importId, resultado });
});

importacoesRoutes.post(
  '/colaboradores/confirmar',
  requererPermissao('colaboradores', 'importar'),
  validar('json', z.object({ importId: z.number().int().positive() })),
  async (c) => {
    const usuario = c.get('usuario');
    const { importId } = c.req.valid('json');

    const registro = await buscarImportHistoricoPorId(c.env.DB, importId);
    if (!registro) return c.json({ erro: 'Importação não encontrada.' }, 404);
    if (registro.status !== 'processando') return c.json({ erro: 'Esta importação já foi concluída.' }, 409);

    const objeto = await c.env.BUCKET.get(registro.r2_key);
    if (!objeto) return c.json({ erro: 'Arquivo da importação não está mais disponível.' }, 410);

    const bytes = await objeto.arrayBuffer();
    const resultado = await previewImportacaoColaboradores(c.env.DB, bytes);
    const resumo = await confirmarImportacaoColaboradores(c.env.DB, resultado, usuario.id);

    const status = resumo.comErro > 0 ? 'concluido_com_erros' : 'concluido';
    await concluirImportHistorico(c.env.DB, importId, {
      status,
      totalImportados: resumo.importados,
      totalAtualizados: resumo.atualizados,
      totalIgnorados: resumo.ignorados,
      totalErros: resumo.comErro,
      detalhes: resultado.linhas.filter((l) => l.acao === 'erro'),
    });

    await registrarAuditoria(c.env.DB, {
      entidade: 'import_historico',
      entidadeId: importId,
      acao: 'importar',
      usuarioId: usuario.id,
      dadosDepois: resumo,
    });

    return c.json({ resumo, status });
  },
);

importacoesRoutes.get('/feriados/historico', requererPermissao('feriados', 'importar'), async (c) => {
  const historico = await listarImportHistorico(c.env.DB, 'feriados');
  return c.json({ historico });
});

importacoesRoutes.post('/feriados/preview', requererPermissao('feriados', 'importar'), async (c) => {
  const usuario = c.get('usuario');
  const corpo = await c.req.parseBody();
  const arquivo = corpo.file;

  if (!(arquivo instanceof File)) {
    return c.json({ erro: 'Envie um arquivo .xlsx ou .xls no campo "file".' }, 400);
  }

  const bytes = await arquivo.arrayBuffer();
  const chaveR2 = `importacoes/feriados/${Date.now()}-${saneiarNomeArquivo(arquivo.name)}`;
  await c.env.BUCKET.put(chaveR2, bytes);

  let resultado;
  try {
    resultado = await previewImportacaoFeriados(c.env.DB, bytes);
  } catch {
    return c.json({ erro: 'Não foi possível ler a planilha. Confira o padrão de aba e colunas esperado.' }, 422);
  }

  const importId = await criarImportHistorico(c.env.DB, {
    tipo: 'feriados',
    nomeArquivo: arquivo.name,
    r2Key: chaveR2,
    usuarioId: usuario.id,
    totalLinhas: resultado.resumo.totalLinhas,
  });

  return c.json({ importId, resultado });
});

importacoesRoutes.post(
  '/feriados/confirmar',
  requererPermissao('feriados', 'importar'),
  validar('json', z.object({ importId: z.number().int().positive() })),
  async (c) => {
    const usuario = c.get('usuario');
    const { importId } = c.req.valid('json');

    const registro = await buscarImportHistoricoPorId(c.env.DB, importId);
    if (!registro) return c.json({ erro: 'Importação não encontrada.' }, 404);
    if (registro.status !== 'processando') return c.json({ erro: 'Esta importação já foi concluída.' }, 409);

    const objeto = await c.env.BUCKET.get(registro.r2_key);
    if (!objeto) return c.json({ erro: 'Arquivo da importação não está mais disponível.' }, 410);

    const bytes = await objeto.arrayBuffer();
    const resultado = await previewImportacaoFeriados(c.env.DB, bytes);
    const resumo = await confirmarImportacaoFeriados(c.env.DB, resultado);

    const status = resumo.comErro > 0 ? 'concluido_com_erros' : 'concluido';
    await concluirImportHistorico(c.env.DB, importId, {
      status,
      totalImportados: resumo.importados,
      totalAtualizados: 0,
      totalIgnorados: resumo.ignorados,
      totalErros: resumo.comErro,
      detalhes: resultado.linhas.filter((l) => l.acao === 'erro'),
    });

    await registrarAuditoria(c.env.DB, {
      entidade: 'import_historico',
      entidadeId: importId,
      acao: 'importar',
      usuarioId: usuario.id,
      dadosDepois: resumo,
    });

    return c.json({ resumo, status });
  },
);
