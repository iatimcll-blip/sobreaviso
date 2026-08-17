import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { localidadeEntradaSchema } from '../../shared/validation/localidade';
import { registrarAuditoria } from '../db/queries/auditoria';
import { atualizarLocalidade, buscarLocalidadePorId, criarLocalidade, listarLocalidades } from '../db/queries/localidades';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const localidadesRoutes = new Hono<AppEnv>();
localidadesRoutes.use('*', autenticar);

localidadesRoutes.get('/', requererPermissao('localidades', 'visualizar'), async (c) => {
  const localidades = await listarLocalidades(c.env.DB, c.req.query('uf'));
  return c.json({ localidades });
});

localidadesRoutes.post('/', requererPermissao('localidades', 'criar'), validar('json', localidadeEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarLocalidade(c.env.DB, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'localidade', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const localidade = await buscarLocalidadePorId(c.env.DB, id);
  return c.json({ localidade }, 201);
});

localidadesRoutes.put('/:id{[0-9]+}', requererPermissao('localidades', 'editar'), validar('json', localidadeEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const dado = c.req.valid('json');
  const existente = await buscarLocalidadePorId(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Localidade não encontrada.' }, 404);

  await atualizarLocalidade(c.env.DB, id, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'localidade', entidadeId: id, acao: 'editar', usuarioId: usuario.id, dadosAntes: existente, dadosDepois: dado });
  const localidade = await buscarLocalidadePorId(c.env.DB, id);
  return c.json({ localidade });
});
