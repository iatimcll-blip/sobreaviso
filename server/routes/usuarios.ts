import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { usuarioEntradaSchema } from '../../shared/validation/usuario';
import { registrarAuditoria } from '../db/queries/auditoria';
import { revogarSessoesDoUsuario } from '../db/queries/sessions';
import {
  atualizarSenha,
  atualizarUsuario,
  buscarUsuarioComSenhaPorUsername,
  buscarUsuarioPorId,
  criarUsuario,
  listarPermissoes,
  listarUsuarios,
  substituirPermissoes,
} from '../db/queries/usuarios';
import { autenticar } from '../middleware/auth';
import { apenasAdmin } from '../middleware/rbac';
import { gerarHashSenha } from '../services/auth/hash';
import type { AppEnv } from '../types/context';

export const usuariosRoutes = new Hono<AppEnv>();
usuariosRoutes.use('*', autenticar, apenasAdmin());

usuariosRoutes.get('/', async (c) => {
  const usuarios = await listarUsuarios(c.env.DB);
  const comPermissoes = await Promise.all(
    usuarios.map(async (usuario) => ({
      ...usuario,
      permissoes: usuario.role === 'admin' ? [] : await listarPermissoes(c.env.DB, usuario.id),
    })),
  );
  return c.json({ usuarios: comPermissoes });
});

usuariosRoutes.post('/', validar('json', usuarioEntradaSchema.extend({ password: z.string().min(8) })), async (c) => {
  const admin = c.get('usuario');
  const dado = c.req.valid('json');

  const existente = await buscarUsuarioComSenhaPorUsername(c.env.DB, dado.username);
  if (existente) return c.json({ erro: 'Já existe um usuário com este nome de usuário.' }, 409);

  const passwordHash = await gerarHashSenha(dado.password);
  const id = await criarUsuario(c.env.DB, {
    username: dado.username,
    passwordHash,
    role: dado.role,
    nomeCompleto: dado.nomeCompleto,
    colaboradorId: dado.colaboradorId ?? null,
    ativo: dado.ativo,
  });
  if (dado.role === 'usuario') {
    await substituirPermissoes(c.env.DB, id, dado.permissoes);
  }
  await registrarAuditoria(c.env.DB, {
    entidade: 'usuario',
    entidadeId: id,
    acao: 'criar',
    usuarioId: admin.id,
    dadosDepois: { ...dado, password: undefined },
  });

  const usuario = await buscarUsuarioPorId(c.env.DB, id);
  return c.json({ usuario }, 201);
});

usuariosRoutes.put('/:id{[0-9]+}', validar('json', usuarioEntradaSchema), async (c) => {
  const admin = c.get('usuario');
  const id = Number(c.req.param('id'));
  const dado = c.req.valid('json');

  const existente = await buscarUsuarioPorId(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Usuário não encontrado.' }, 404);

  await atualizarUsuario(c.env.DB, id, {
    role: dado.role,
    nomeCompleto: dado.nomeCompleto,
    colaboradorId: dado.colaboradorId ?? null,
    ativo: dado.ativo,
  });
  await substituirPermissoes(c.env.DB, id, dado.role === 'usuario' ? dado.permissoes : []);
  if (!dado.ativo) await revogarSessoesDoUsuario(c.env.DB, id);

  await registrarAuditoria(c.env.DB, {
    entidade: 'usuario',
    entidadeId: id,
    acao: 'editar',
    usuarioId: admin.id,
    dadosAntes: existente,
    dadosDepois: dado,
  });

  const usuario = await buscarUsuarioPorId(c.env.DB, id);
  return c.json({ usuario });
});

usuariosRoutes.patch('/:id{[0-9]+}/senha', validar('json', z.object({ password: z.string().min(8) })), async (c) => {
  const admin = c.get('usuario');
  const id = Number(c.req.param('id'));
  const { password } = c.req.valid('json');

  const existente = await buscarUsuarioPorId(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Usuário não encontrado.' }, 404);

  await atualizarSenha(c.env.DB, id, await gerarHashSenha(password));
  await revogarSessoesDoUsuario(c.env.DB, id);
  await registrarAuditoria(c.env.DB, { entidade: 'usuario', entidadeId: id, acao: 'redefinir_senha', usuarioId: admin.id });
  return c.json({ ok: true });
});
