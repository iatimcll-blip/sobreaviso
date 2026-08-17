import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../app/layout/PageHeader';
import { Tabs } from '../../components/Tabs';

const ABAS = [
  { to: '/colaboradores', label: 'Cadastro', end: true },
  { to: '/colaboradores/equipes', label: 'Equipes' },
  { to: '/colaboradores/duplas', label: 'Duplas' },
  { to: '/colaboradores/afastamentos', label: 'Afastamentos' },
];

export function ColaboradoresLayout() {
  return (
    <>
      <PageHeader title="Colaboradores" />
      <Tabs items={ABAS} />
      <Outlet />
    </>
  );
}
