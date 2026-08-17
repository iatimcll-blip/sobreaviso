import type { Context, Next } from 'hono';
import { CAMPO_POR_ACAO, type AcaoPermissao, type Tela } from '../../shared/types/permissao';
import type { AppEnv } from '../types/context';

/**
 * Única porta de decisão de autorização do sistema. O frontend também espelha essas
 * permissões para esconder/desabilitar botões, mas isso é só cosmético — a barreira real é aqui.
 */
export function requererPermissao(tela: Tela, acao: AcaoPermissao) {
  return async (c: Context<AppEnv>, next: Next) => {
    const usuario = c.get('usuario');
    if (usuario.role === 'admin') {
      await next();
      return;
    }

    const permissoes = c.get('permissoes');
    const permissaoTela = permissoes.find((p) => p.tela === tela);
    const campo = CAMPO_POR_ACAO[acao];
    if (!permissaoTela || !permissaoTela[campo]) {
      return c.json({ erro: `Você não tem permissão para "${acao}" em "${tela}".` }, 403);
    }
    await next();
  };
}

/** Telas sensíveis (usuários/permissões) que nunca são governáveis via user_permissions — sempre admin-only. */
export function apenasAdmin() {
  return async (c: Context<AppEnv>, next: Next) => {
    const usuario = c.get('usuario');
    if (usuario.role !== 'admin') {
      return c.json({ erro: 'Acesso restrito ao administrador.' }, 403);
    }
    await next();
  };
}
