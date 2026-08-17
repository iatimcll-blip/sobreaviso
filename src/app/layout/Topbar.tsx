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
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { SobreavisoDetalhado, StatusRodizio } from '@shared/types/sobreaviso';
import { api } from '../../lib/api-client';
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

interface PlantaoAtual {
  nome: string;
  local: string | null;
}

function usePlantaoAtual(): PlantaoAtual | null {
  const [plantao, setPlantao] = useState<PlantaoAtual | null>(null);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      api.get<{ sobreavisos: SobreavisoDetalhado[] }>('/sobreaviso').catch(() => ({ sobreavisos: [] as SobreavisoDetalhado[] })),
      api.get<{ status: StatusRodizio[] }>('/sobreaviso/status-rodizio').catch(() => ({ status: [] as StatusRodizio[] })),
    ]).then(([respSobreavisos, respStatus]) => {
      if (cancelado) return;
      const agora = new Date();
      const manualAtivo = respSobreavisos.sobreavisos.find(
        (s) => s.colaboradorNome && new Date(s.inicio) <= agora && agora <= new Date(s.fim),
      );
      if (manualAtivo) {
        setPlantao({ nome: manualAtivo.colaboradorNome as string, local: manualAtivo.localidadeNome });
        return;
      }
      const rodizio = respStatus.status[0];
      if (rodizio) {
        setPlantao({ nome: `Equipe ${rodizio.equipeAtualNome}`, local: 'Rodízio automático' });
      }
    });

    return () => {
      cancelado = true;
    };
  }, []);

  return plantao;
}

interface Props {
  aberto: boolean;
  aoAlternar: () => void;
  aoFechar: () => void;
}

export function Topbar({ aberto, aoAlternar, aoFechar }: Props) {
  const { usuario, logout } = useAuth();
  const plantao = usePlantaoAtual();

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="logo">S</div>
        <div>
          <strong>Sobreaviso</strong>
          <span>Gestão de escalas</span>
        </div>
      </div>

      <button className="hamb" onClick={aoAlternar} aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}>
        {aberto ? <X /> : <Menu />}
      </button>

      <nav className="topbar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, fim }) => (
          <NavLink key={to} to={to} end={fim}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-right">
        {plantao && (
          <div className="plantao-chip" title={plantao.local ?? undefined}>
            <span className="plantao-atual-dot" aria-hidden="true" />
            <div>
              <b>{plantao.nome}</b>
              {plantao.local && <small>{plantao.local}</small>}
            </div>
          </div>
        )}
        {usuario && (
          <div className="topbar-profile">
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

      {aberto && (
        <div className="topbar-dropdown">
          <nav>
            {NAV_ITEMS.map(({ to, label, icon: Icon, fim }) => (
              <NavLink key={to} to={to} end={fim} onClick={aoFechar}>
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>
          {plantao && (
            <div className="plantao-atual">
              <span className="plantao-atual-dot" aria-hidden="true" />
              <div className="plantao-atual-info">
                <span className="plantao-atual-label">Em plantão agora</span>
                <span className="plantao-atual-nome">{plantao.nome}</span>
                {plantao.local && <span className="plantao-atual-local">{plantao.local}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
