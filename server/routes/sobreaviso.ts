import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { sobreavisoEntradaSchema, sobreavisoRegraEntradaSchema } from '../../shared/validation/sobreaviso';
import { registrarAuditoria } from '../db/queries/auditoria';
import {
  buscarConflitos,
  buscarRegra,
  cancelarSobreaviso,
  criarRegra,
  criarSobreaviso,
  listarRegras,
  listarSobreavisos,
  atualizarRegra,
} from '../db/queries/sobreaviso';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import { calcularStatusRodizios } from '../services/sobreaviso/rodizio';
import type { AppEnv } from '../types/context';

export const sobreavisoRoutes = new Hono<AppEnv>();
sobreavisoRoutes.use('*', autenticar);

sobreavisoRoutes.get('/', requererPermissao('sobreaviso', 'visualizar'), async (c) => {
  const { de, ate, colaboradorId, equipeId } = c.req.query();
  const sobreavisos = await listarSobreavisos(c.env.DB, {
    de,
    ate,
    colaboradorId: colaboradorId ? Number(colaboradorId) : undefined,
    equipeId: equipeId ? Number(equipeId) : undefined,
  });
  return c.json({ sobreavisos });
});

sobreavisoRoutes.get('/status-rodizio', requererPermissao('sobreaviso', 'visualizar'), async (c) => {
  const status = await calcularStatusRodizios(c.env.DB);
  return c.json({ status });
});

sobreavisoRoutes.post('/', requererPermissao('sobreaviso', 'criar'), validar('json', sobreavisoEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');

  const conflitos = await buscarConflitos(c.env.DB, dado);
  if (conflitos.length > 0 && !dado.forcar) {
    return c.json({ erro: 'Existe sobreposição com outro plantão de sobreaviso.', detalhes: conflitos }, 409);
  }

  const id = await criarSobreaviso(c.env.DB, dado, usuario.id);
  await registrarAuditoria(c.env.DB, { entidade: 'sobreaviso', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const sobreavisos = await listarSobreavisos(c.env.DB, {});
  const criado = sobreavisos.find((s) => s.id === id);
  return c.json({ sobreaviso: criado }, 201);
});

sobreavisoRoutes.delete('/:id{[0-9]+}', requererPermissao('sobreaviso', 'excluir'), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  await cancelarSobreaviso(c.env.DB, id);
  await registrarAuditoria(c.env.DB, { entidade: 'sobreaviso', entidadeId: id, acao: 'cancelar', usuarioId: usuario.id });
  return c.json({ ok: true });
});

sobreavisoRoutes.get('/regras', requererPermissao('sobreaviso', 'visualizar'), async (c) => {
  const regras = await listarRegras(c.env.DB);
  return c.json({ regras });
});

sobreavisoRoutes.post('/regras', requererPermissao('sobreaviso', 'criar'), validar('json', sobreavisoRegraEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarRegra(c.env.DB, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'sobreaviso_regra', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const regra = await buscarRegra(c.env.DB, id);
  return c.json({ regra }, 201);
});

sobreavisoRoutes.put(
  '/regras/:id{[0-9]+}',
  requererPermissao('sobreaviso', 'editar'),
  validar('json', sobreavisoRegraEntradaSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const dado = c.req.valid('json');
    const existente = await buscarRegra(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Regra não encontrada.' }, 404);

    await atualizarRegra(c.env.DB, id, dado);
    await registrarAuditoria(c.env.DB, { entidade: 'sobreaviso_regra', entidadeId: id, acao: 'editar', usuarioId: usuario.id, dadosAntes: existente, dadosDepois: dado });
    const regra = await buscarRegra(c.env.DB, id);
    return c.json({ regra });
  },
);
