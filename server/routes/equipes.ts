import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { equipeEntradaSchema, equipeMembroEntradaSchema } from '../../shared/validation/equipe';
import { registrarAuditoria } from '../db/queries/auditoria';
import {
  adicionarMembro,
  atualizarEquipe,
  buscarEquipeDetalhada,
  criarEquipe,
  encerrarMembro,
  listarEquipesDetalhadas,
  listarMembrosAtivos,
} from '../db/queries/equipes';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const equipesRoutes = new Hono<AppEnv>();
equipesRoutes.use('*', autenticar);

equipesRoutes.get('/', requererPermissao('equipes', 'visualizar'), async (c) => {
  const equipes = await listarEquipesDetalhadas(c.env.DB);
  return c.json({ equipes });
});

equipesRoutes.get('/:id{[0-9]+}', requererPermissao('equipes', 'visualizar'), async (c) => {
  const id = Number(c.req.param('id'));
  const equipe = await buscarEquipeDetalhada(c.env.DB, id);
  if (!equipe) return c.json({ erro: 'Equipe não encontrada.' }, 404);
  const membros = await listarMembrosAtivos(c.env.DB, id);
  return c.json({ equipe, membros });
});

equipesRoutes.post('/', requererPermissao('equipes', 'criar'), validar('json', equipeEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarEquipe(c.env.DB, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'equipe', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const equipe = await buscarEquipeDetalhada(c.env.DB, id);
  return c.json({ equipe }, 201);
});

equipesRoutes.put('/:id{[0-9]+}', requererPermissao('equipes', 'editar'), validar('json', equipeEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const dado = c.req.valid('json');
  const existente = await buscarEquipeDetalhada(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Equipe não encontrada.' }, 404);

  await atualizarEquipe(c.env.DB, id, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'equipe', entidadeId: id, acao: 'editar', usuarioId: usuario.id, dadosAntes: existente, dadosDepois: dado });
  const equipe = await buscarEquipeDetalhada(c.env.DB, id);
  return c.json({ equipe });
});

equipesRoutes.post(
  '/:id{[0-9]+}/membros',
  requererPermissao('equipes', 'editar'),
  validar('json', equipeMembroEntradaSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const equipeId = Number(c.req.param('id'));
    const dado = c.req.valid('json');
    const membroId = await adicionarMembro(c.env.DB, equipeId, dado);
    await registrarAuditoria(c.env.DB, { entidade: 'equipe_membro', entidadeId: membroId, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
    const membros = await listarMembrosAtivos(c.env.DB, equipeId);
    return c.json({ membros }, 201);
  },
);

equipesRoutes.delete('/membros/:membroId{[0-9]+}', requererPermissao('equipes', 'editar'), async (c) => {
  const usuario = c.get('usuario');
  const membroId = Number(c.req.param('membroId'));
  await encerrarMembro(c.env.DB, membroId);
  await registrarAuditoria(c.env.DB, { entidade: 'equipe_membro', entidadeId: membroId, acao: 'encerrar', usuarioId: usuario.id });
  return c.json({ ok: true });
});
