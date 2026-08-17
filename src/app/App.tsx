import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Topbar } from './layout/Topbar';

export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="app">
      <Topbar aberto={menuAberto} aoAlternar={() => setMenuAberto((atual) => !atual)} aoFechar={() => setMenuAberto(false)} />
      <main>
        <Outlet />
      </main>
      <footer className="app-footer marca-footer">Jarvis MCLL · alloha FIBRA</footer>
    </div>
  );
}
