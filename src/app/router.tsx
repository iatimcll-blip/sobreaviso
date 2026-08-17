import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './App';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { EscalasPage } from '../pages/escalas/EscalasPage';
import { SobreavisoPage } from '../pages/sobreaviso/SobreavisoPage';
import { InconsistenciasPage } from '../pages/inconsistencias/InconsistenciasPage';
import { ColaboradoresLayout } from '../pages/colaboradores/ColaboradoresLayout';
import { CadastroTab } from '../pages/colaboradores/CadastroTab';
import { EquipesTab } from '../pages/colaboradores/EquipesTab';
import { DuplasTab } from '../pages/colaboradores/DuplasTab';
import { AfastamentosTab } from '../pages/colaboradores/AfastamentosTab';
import { ConfiguracoesLayout } from '../pages/configuracoes/ConfiguracoesLayout';
import { UsuariosTab } from '../pages/configuracoes/UsuariosTab';
import { LocalidadesTab } from '../pages/configuracoes/LocalidadesTab';
import { FeriadosTab } from '../pages/configuracoes/FeriadosTab';
import { ParametrosCltTab } from '../pages/configuracoes/ParametrosCltTab';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="escalas" element={<EscalasPage />} />
          <Route path="sobreaviso" element={<SobreavisoPage />} />
          <Route path="inconsistencias" element={<InconsistenciasPage />} />

          <Route path="colaboradores" element={<ColaboradoresLayout />}>
            <Route index element={<CadastroTab />} />
            <Route path="equipes" element={<EquipesTab />} />
            <Route path="duplas" element={<DuplasTab />} />
            <Route path="afastamentos" element={<AfastamentosTab />} />
          </Route>

          <Route path="configuracoes" element={<ConfiguracoesLayout />}>
            <Route index element={<UsuariosTab />} />
            <Route path="localidades" element={<LocalidadesTab />} />
            <Route path="feriados" element={<FeriadosTab />} />
            <Route path="parametros-clt" element={<ParametrosCltTab />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
