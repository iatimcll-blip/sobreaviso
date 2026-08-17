import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, fim: true },
  { to: '/escalas', label: 'Escalas', icon: CalendarDays },
  { to: '/sobreaviso', label: 'Sobreaviso', icon: BellRing },
  { to: '/colaboradores', label: 'Colaboradores', icon: Users },
  { to: '/inconsistencias', label: 'Inconsistências', icon: AlertTriangle },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Sidebar({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { usuario, logout } = useAuth();

  return (
    <aside className={aberto ? 'sidebar mobile-open' : 'sidebar'}>
      <div className="brand">
        <div className="logo">S</div>
        <div>
          <strong>Sobreaviso</strong>
          <span>Gestão de escalas</span>
        </div>
        <button className="close" onClick={aoFechar} aria-label="Fechar menu">
          <X />
        </button>
      </div>

      <nav>
        {NAV_ITEMS.map(({ to, label, icon: Icon, fim }) => (
          <NavLink key={to} to={to} end={fim} onClick={aoFechar}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="side-bottom">
        {usuario && (
          <div className="profile">
            <span>{iniciais(usuario.nomeCompleto)}</span>
            <div>
              <b>{usuario.nomeCompleto}</b>
              <small>{usuario.role === 'admin' ? 'Administrador' : 'Usuário'}</small>
            </div>
            <button onClick={() => void logout()} aria-label="Sair" title="Sair">
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
