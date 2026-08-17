import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { colaboradorAtribuirEquipeSchema, colaboradorEntradaSchema, colaboradorFiltroSchema } from '../../shared/validation/colaborador';
import { SITUACOES_CADASTRAIS } from '../../shared/types/colaborador';
import { registrarAuditoria } from '../db/queries/auditoria';
import {
  atribuirEquipeEmLote,
  atualizarColaborador,
  buscarColaboradorPorId,
  criarColaborador,
  definirSituacaoCadastral,
  excluirColaborador,
  listarColaboradores,
} from '../db/queries/colaboradores';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const colaboradoresRoutes = new Hono<AppEnv>();
colaboradoresRoutes.use('*', autenticar);

colaboradoresRoutes.get('/', requererPermissao('colaboradores', 'visualizar'), validar('query', colaboradorFiltroSchema), async (c) => {
  const filtro = c.req.valid('query');
  const colaboradores = await listarColaboradores(c.env.DB, filtro);
  return c.json({ colaboradores });
});

colaboradoresRoutes.get('/:id{[0-9]+}', requererPermissao('colaboradores', 'visualizar'), async (c) => {
  const id = Number(c.req.param('id'));
  const colaborador = await buscarColaboradorPorId(c.env.DB, id);
  if (!colaborador) return c.json({ erro: 'Colaborador não encontrado.' }, 404);
  return c.json({ colaborador });
});

colaboradoresRoutes.post('/', requererPermissao('colaboradores', 'criar'), validar('json', colaboradorEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarColaborador(c.env.DB, dado, usuario.id);
  await registrarAuditoria(c.env.DB, { entidade: 'colaborador', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const colaborador = await buscarColaboradorPorId(c.env.DB, id);
  return c.json({ colaborador }, 201);
});

colaboradoresRoutes.put(
  '/:id{[0-9]+}',
  requererPermissao('colaboradores', 'editar'),
  validar('json', colaboradorEntradaSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const dado = c.req.valid('json');

    const existente = await buscarColaboradorPorId(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Colaborador não encontrado.' }, 404);

    await atualizarColaborador(c.env.DB, id, dado, usuario.id);
    await registrarAuditoria(c.env.DB, {
      entidade: 'colaborador',
      entidadeId: id,
      acao: 'editar',
      usuarioId: usuario.id,
      dadosAntes: existente,
      dadosDepois: dado,
    });
    const colaborador = await buscarColaboradorPorId(c.env.DB, id);
    return c.json({ colaborador });
  },
);

colaboradoresRoutes.patch(
  '/:id{[0-9]+}/situacao',
  requererPermissao('colaboradores', 'editar'),
  validar('json', z.object({ situacaoCadastral: z.enum(SITUACOES_CADASTRAIS) })),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const { situacaoCadastral } = c.req.valid('json');

    const existente = await buscarColaboradorPorId(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Colaborador não encontrado.' }, 404);

    await definirSituacaoCadastral(c.env.DB, id, situacaoCadastral, usuario.id);
    await registrarAuditoria(c.env.DB, {
      entidade: 'colaborador',
      entidadeId: id,
      acao: 'editar_situacao',
      usuarioId: usuario.id,
      dadosAntes: { situacaoCadastral: existente.situacaoCadastral },
      dadosDepois: { situacaoCadastral },
    });
    const colaborador = await buscarColaboradorPorId(c.env.DB, id);
    return c.json({ colaborador });
  },
);

colaboradoresRoutes.patch(
  '/atribuir-equipe',
  requererPermissao('colaboradores', 'editar'),
  validar('json', colaboradorAtribuirEquipeSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const { colaboradorIds, equipeId } = c.req.valid('json');

    const existentes = await Promise.all(colaboradorIds.map((id) => buscarColaboradorPorId(c.env.DB, id)));
    const encontrados = existentes.filter((colaborador): colaborador is NonNullable<typeof colaborador> => colaborador !== null);
    if (encontrados.length === 0) return c.json({ erro: 'Nenhum colaborador encontrado.' }, 404);

    await atribuirEquipeEmLote(
      c.env.DB,
      encontrados.map((colaborador) => colaborador.id),
      equipeId,
      usuario.id,
    );

    for (const colaborador of encontrados) {
      await registrarAuditoria(c.env.DB, {
        entidade: 'colaborador',
        entidadeId: colaborador.id,
        acao: 'editar_equipe',
        usuarioId: usuario.id,
        dadosAntes: { equipeId: colaborador.equipeId },
        dadosDepois: { equipeId },
      });
    }

    return c.json({ atualizados: encontrados.length });
  },
);

colaboradoresRoutes.delete('/:id{[0-9]+}', requererPermissao('colaboradores', 'excluir'), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const existente = await buscarColaboradorPorId(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Colaborador não encontrado.' }, 404);

  await excluirColaborador(c.env.DB, id);
  await registrarAuditoria(c.env.DB, { entidade: 'colaborador', entidadeId: id, acao: 'excluir', usuarioId: usuario.id, dadosAntes: existente });
  return c.json({ ok: true });
});
