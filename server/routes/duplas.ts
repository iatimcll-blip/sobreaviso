import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { duplaEntradaSchema } from '../../shared/validation/dupla';
import { registrarAuditoria } from '../db/queries/auditoria';
import { atualizarDupla, buscarDupla, criarDupla, excluirDupla, listarDuplas } from '../db/queries/duplas';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const duplasRoutes = new Hono<AppEnv>();
duplasRoutes.use('*', autenticar);

duplasRoutes.get('/', requererPermissao('duplas', 'visualizar'), async (c) => {
  const duplas = await listarDuplas(c.env.DB);
  return c.json({ duplas });
});

duplasRoutes.post('/', requererPermissao('duplas', 'criar'), validar('json', duplaEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarDupla(c.env.DB, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'dupla', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const dupla = await buscarDupla(c.env.DB, id);
  return c.json({ dupla }, 201);
});

duplasRoutes.put('/:id{[0-9]+}', requererPermissao('duplas', 'editar'), validar('json', duplaEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const dado = c.req.valid('json');
  const existente = await buscarDupla(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Dupla não encontrada.' }, 404);

  await atualizarDupla(c.env.DB, id, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'dupla', entidadeId: id, acao: 'editar', usuarioId: usuario.id, dadosAntes: existente, dadosDepois: dado });
  const dupla = await buscarDupla(c.env.DB, id);
  return c.json({ dupla });
});

duplasRoutes.delete('/:id{[0-9]+}', requererPermissao('duplas', 'excluir'), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const existente = await buscarDupla(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Dupla não encontrada.' }, 404);

  await excluirDupla(c.env.DB, id);
  await registrarAuditoria(c.env.DB, { entidade: 'dupla', entidadeId: id, acao: 'excluir', usuarioId: usuario.id, dadosAntes: existente });
  return c.json({ ok: true });
});
