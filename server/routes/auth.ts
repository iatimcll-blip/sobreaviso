import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { loginSchema } from '../../shared/validation/auth';
import { registrarAuditoria } from '../db/queries/auditoria';
import { buscarUsuarioIdPorSessaoAtiva, criarSessao, revogarSessao } from '../db/queries/sessions';
import { buscarUsuarioComSenhaPorUsername, listarPermissoes, registrarUltimoLogin } from '../db/queries/usuarios';
import { autenticar } from '../middleware/auth';
import { verificarSenha } from '../services/auth/hash';
import { calcularExpiracaoSessao, gerarIdSessao, gerarTokenSessao, hashTokenSessao, NOME_COOKIE_SESSAO } from '../services/auth/session';
import type { AppEnv } from '../types/context';
import { isDev } from '../lib/env';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/login', validar('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');
  const usuario = await buscarUsuarioComSenhaPorUsername(c.env.DB, username);

  if (!usuario || !usuario.ativo || !(await verificarSenha(password, usuario.passwordHash))) {
    return c.json({ erro: 'Usuário ou senha inválidos.' }, 401);
  }

  const token = gerarTokenSessao();
  const tokenHash = await hashTokenSessao(token);
  await criarSessao(c.env.DB, {
    id: gerarIdSessao(),
    userId: usuario.id,
    tokenHash,
    expiraEm: calcularExpiracaoSessao(),
    userAgent: c.req.header('user-agent') ?? null,
    ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null,
  });
  await registrarUltimoLogin(c.env.DB, usuario.id);
  await registrarAuditoria(c.env.DB, { entidade: 'usuario', entidadeId: usuario.id, acao: 'login', usuarioId: usuario.id });

  setCookie(c, NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: !isDev(c.env),
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  const permissoes = usuario.role === 'admin' ? [] : await listarPermissoes(c.env.DB, usuario.id);
  const { passwordHash: _passwordHash, ...usuarioSemSenha } = usuario;
  return c.json({ usuario: usuarioSemSenha, permissoes });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, NOME_COOKIE_SESSAO);
  if (token) {
    const tokenHash = await hashTokenSessao(token);
    const usuarioId = await buscarUsuarioIdPorSessaoAtiva(c.env.DB, tokenHash);
    await revogarSessao(c.env.DB, tokenHash);
    if (usuarioId) {
      await registrarAuditoria(c.env.DB, { entidade: 'usuario', entidadeId: usuarioId, acao: 'logout', usuarioId });
    }
  }
  deleteCookie(c, NOME_COOKIE_SESSAO, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/me', autenticar, async (c) => {
  return c.json({ usuario: c.get('usuario'), permissoes: c.get('permissoes') });
});
