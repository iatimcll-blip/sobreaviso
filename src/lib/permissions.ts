import { CAMPO_POR_ACAO, type AcaoPermissao, type PermissaoTela, type Tela } from '@shared/types/permissao';
import type { Usuario } from '@shared/types/usuario';

/**
 * Espelha a checagem de permissão do servidor apenas para esconder/desabilitar UI.
 * Nunca é a barreira real — o servidor reforça o mesmo mapa em server/middleware/rbac.ts.
 */
export function temPermissao(
  usuario: Usuario | null,
  permissoes: PermissaoTela[],
  tela: Tela,
  acao: AcaoPermissao,
): boolean {
  if (!usuario) return false;
  if (usuario.role === 'admin') return true;
  const permissao = permissoes.find((p) => p.tela === tela);
  return permissao ? permissao[CAMPO_POR_ACAO[acao]] : false;
}
