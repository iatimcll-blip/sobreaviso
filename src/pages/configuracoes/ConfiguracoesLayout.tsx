import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../app/layout/PageHeader';
import { Tabs, type TabItem } from '../../components/Tabs';
import { useAuth } from '../../lib/auth-context';

export function ConfiguracoesLayout() {
  const { usuario } = useAuth();

  const abas: TabItem[] = [
    ...(usuario?.role === 'admin' ? [{ to: '/configuracoes', label: 'Usuários e permissões', end: true }] : []),
    { to: '/configuracoes/localidades', label: 'Localidades e UF' },
    { to: '/configuracoes/feriados', label: 'Feriados' },
    { to: '/configuracoes/parametros-clt', label: 'Parâmetros CLT' },
  ];

  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs items={abas} />
      <Outlet />
    </>
  );
}
