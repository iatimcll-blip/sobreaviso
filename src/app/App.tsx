import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './layout/Sidebar';
import { MenuContext } from './layout/MenuContext';

export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <MenuContext.Provider value={{ abrirMenu: () => setMenuAberto(true) }}>
      <div className="app">
        <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
        <main>
          <Outlet />
        </main>
      </div>
    </MenuContext.Provider>
  );
}
