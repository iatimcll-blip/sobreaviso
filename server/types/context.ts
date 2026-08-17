import type { PermissaoTela } from '../../shared/types/permissao';
import type { Usuario } from '../../shared/types/usuario';
import type { Env } from './env';

export interface Variables {
  usuario: Usuario;
  permissoes: PermissaoTela[];
}

export type AppEnv = { Bindings: Env; Variables: Variables };
