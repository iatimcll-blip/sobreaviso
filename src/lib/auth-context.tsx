import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PermissaoTela } from '@shared/types/permissao';
import type { Usuario } from '@shared/types/usuario';
import { api } from './api-client';

interface RespostaSessao {
  usuario: Usuario;
  permissoes: PermissaoTela[];
}

interface AuthContextValue {
  usuario: Usuario | null;
  permissoes: PermissaoTela[];
  carregando: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<PermissaoTela[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<RespostaSessao>('/auth/me')
      .then((resposta) => {
        setUsuario(resposta.usuario);
        setPermissoes(resposta.permissoes);
      })
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const resposta = await api.post<RespostaSessao>('/auth/login', { username, password });
    setUsuario(resposta.usuario);
    setPermissoes(resposta.permissoes);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setUsuario(null);
    setPermissoes([]);
  }, []);

  return <AuthContext.Provider value={{ usuario, permissoes, carregando, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return context;
}
