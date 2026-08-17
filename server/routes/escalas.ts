import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { duplicarEscalaSchema, escalaModeloEntradaSchema, escalaVinculoEntradaSchema } from '../../shared/validation/escala';
import { registrarAuditoria } from '../db/queries/auditoria';
import {
  atualizarEscalaModelo,
  buscarEscalaModeloDetalhada,
  criarEscalaModelo,
  criarVinculo,
  duplicarEscalaModelo,
  excluirVinculo,
  listarEscalasModelo,
  listarVinculosDaEscala,
} from '../db/queries/escalas';
import { execute } from '../db/client';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const escalasRoutes = new Hono<AppEnv>();
escalasRoutes.use('*', autenticar);

escalasRoutes.get('/', requererPermissao('escalas', 'visualizar'), async (c) => {
  const escalas = await listarEscalasModelo(c.env.DB);
  return c.json({ escalas });
});

escalasRoutes.get('/:id{[0-9]+}', requererPermissao('escalas', 'visualizar'), async (c) => {
  const id = Number(c.req.param('id'));
  const escala = await buscarEscalaModeloDetalhada(c.env.DB, id);
  if (!escala) return c.json({ erro: 'Escala não encontrada.' }, 404);
  const vinculos = await listarVinculosDaEscala(c.env.DB, id);
  return c.json({ escala, vinculos });
});

escalasRoutes.post('/', requererPermissao('escalas', 'criar'), validar('json', escalaModeloEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarEscalaModelo(c.env.DB, dado, usuario.id);
  await registrarAuditoria(c.env.DB, { entidade: 'escala_modelo', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const escala = await buscarEscalaModeloDetalhada(c.env.DB, id);
  return c.json({ escala }, 201);
});

escalasRoutes.put('/:id{[0-9]+}', requererPermissao('escalas', 'editar'), validar('json', escalaModeloEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const dado = c.req.valid('json');
  const existente = await buscarEscalaModeloDetalhada(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Escala não encontrada.' }, 404);

  await atualizarEscalaModelo(c.env.DB, id, dado);
  await registrarAuditoria(c.env.DB, {
    entidade: 'escala_modelo',
    entidadeId: id,
    acao: 'editar',
    usuarioId: usuario.id,
    dadosAntes: existente,
    dadosDepois: dado,
  });
  const escala = await buscarEscalaModeloDetalhada(c.env.DB, id);
  return c.json({ escala });
});

escalasRoutes.patch(
  '/:id{[0-9]+}/ativo',
  requererPermissao('escalas', 'editar'),
  validar('json', z.object({ ativo: z.boolean() })),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const { ativo } = c.req.valid('json');
    const existente = await buscarEscalaModeloDetalhada(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Escala não encontrada.' }, 404);

    await execute(c.env.DB, `UPDATE escalas_modelo SET ativo = ?, atualizado_em = datetime('now') WHERE id = ?`, [ativo ? 1 : 0, id]);
    await registrarAuditoria(c.env.DB, { entidade: 'escala_modelo', entidadeId: id, acao: 'editar_ativo', usuarioId: usuario.id, dadosDepois: { ativo } });
    const escala = await buscarEscalaModeloDetalhada(c.env.DB, id);
    return c.json({ escala });
  },
);

escalasRoutes.post(
  '/:id{[0-9]+}/duplicar',
  requererPermissao('escalas', 'criar'),
  validar('json', duplicarEscalaSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const { nome } = c.req.valid('json');
    const existente = await buscarEscalaModeloDetalhada(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Escala não encontrada.' }, 404);

    const novoId = await duplicarEscalaModelo(c.env.DB, id, nome, usuario.id);
    await registrarAuditoria(c.env.DB, { entidade: 'escala_modelo', entidadeId: novoId, acao: 'duplicar', usuarioId: usuario.id, dadosAntes: { duplicadoDeId: id } });
    const escala = await buscarEscalaModeloDetalhada(c.env.DB, novoId);
    return c.json({ escala }, 201);
  },
);

escalasRoutes.get('/:id{[0-9]+}/vinculos', requererPermissao('escalas', 'visualizar'), async (c) => {
  const vinculos = await listarVinculosDaEscala(c.env.DB, Number(c.req.param('id')));
  return c.json({ vinculos });
});

escalasRoutes.post(
  '/:id{[0-9]+}/vinculos',
  requererPermissao('escalas', 'editar'),
  validar('json', escalaVinculoEntradaSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const escalaModeloId = Number(c.req.param('id'));
    const dado = c.req.valid('json');
    const vinculoId = await criarVinculo(c.env.DB, escalaModeloId, dado);
    await registrarAuditoria(c.env.DB, { entidade: 'escala_vinculo', entidadeId: vinculoId, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
    const vinculos = await listarVinculosDaEscala(c.env.DB, escalaModeloId);
    return c.json({ vinculos }, 201);
  },
);

escalasRoutes.delete('/vinculos/:vinculoId{[0-9]+}', requererPermissao('escalas', 'editar'), async (c) => {
  const usuario = c.get('usuario');
  const vinculoId = Number(c.req.param('vinculoId'));
  await excluirVinculo(c.env.DB, vinculoId);
  await registrarAuditoria(c.env.DB, { entidade: 'escala_vinculo', entidadeId: vinculoId, acao: 'excluir', usuarioId: usuario.id });
  return c.json({ ok: true });
});
