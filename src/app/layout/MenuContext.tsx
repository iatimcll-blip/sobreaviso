import { createContext, useContext } from 'react';

export interface MenuContextValue {
  abrirMenu: () => void;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

export function useMenu(): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu deve ser usado dentro de <AppShell>.');
  return context;
}
