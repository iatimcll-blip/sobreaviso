import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/router';
import { AuthProvider } from './lib/auth-context';
import { ToastProvider } from './app/layout/ToastProvider';
import './styles.css';
import './period.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  </AuthProvider>,
);
