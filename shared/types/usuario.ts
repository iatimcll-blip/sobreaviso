import type { PermissaoTela } from './permissao';

export type PapelUsuario = 'admin' | 'usuario';

export interface Usuario {
  id: number;
  username: string;
  role: PapelUsuario;
  nomeCompleto: string;
  colaboradorId: number | null;
  ativo: boolean;
  ultimoLoginEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface UsuarioComPermissoes extends Usuario {
  permissoes: PermissaoTela[];
}

export interface SessaoAutenticada {
  usuario: Usuario;
  permissoes: PermissaoTela[];
}
