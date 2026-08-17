import { deleteCookie, getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import type { AppEnv } from '../types/context';
import { buscarUsuarioIdPorSessaoAtiva } from '../db/queries/sessions';
import { buscarUsuarioPorId, listarPermissoes } from '../db/queries/usuarios';
import { hashTokenSessao, NOME_COOKIE_SESSAO } from '../services/auth/session';

export async function autenticar(c: Context<AppEnv>, next: Next) {
  const token = getCookie(c, NOME_COOKIE_SESSAO);
  if (!token) return c.json({ erro: 'Não autenticado.' }, 401);

  const tokenHash = await hashTokenSessao(token);
  const usuarioId = await buscarUsuarioIdPorSessaoAtiva(c.env.DB, tokenHash);
  if (!usuarioId) {
    deleteCookie(c, NOME_COOKIE_SESSAO, { path: '/' });
    return c.json({ erro: 'Sessão expirada ou inválida.' }, 401);
  }

  const usuario = await buscarUsuarioPorId(c.env.DB, usuarioId);
  if (!usuario || !usuario.ativo) {
    deleteCookie(c, NOME_COOKIE_SESSAO, { path: '/' });
    return c.json({ erro: 'Usuário inativo.' }, 401);
  }

  const permissoes = usuario.role === 'admin' ? [] : await listarPermissoes(c.env.DB, usuario.id);
  c.set('usuario', usuario);
  c.set('permissoes', permissoes);
  await next();
}
