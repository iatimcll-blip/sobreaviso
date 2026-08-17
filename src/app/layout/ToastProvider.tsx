import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type TipoToast = 'info' | 'sucesso' | 'erro';
interface ToastItem {
  id: number;
  mensagem: string;
  tipo: TipoToast;
}

interface ToastContextValue {
  notificar: (mensagem: string, tipo?: TipoToast) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let proximoId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notificar = useCallback((mensagem: string, tipo: TipoToast = 'info') => {
    const id = proximoId++;
    setToasts((atual) => [...atual, { id, mensagem, tipo }]);
    setTimeout(() => setToasts((atual) => atual.filter((item) => item.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.tipo === 'erro' ? 'toast-erro' : toast.tipo === 'sucesso' ? 'toast-sucesso' : ''}`}>
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return context;
}
