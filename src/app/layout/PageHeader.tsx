import type { ReactNode } from 'react';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header>
      <div>
        <p>{subtitle ?? capitalizar(FORMATADOR_DATA.format(new Date()))}</p>
        <h1>{title}</h1>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
