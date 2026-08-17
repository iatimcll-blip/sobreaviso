const DATA_HORA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function formatarDataBR(iso: string | Date): string {
  const data = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(data);
}

export function formatarDataHoraBR(iso: string | Date): string {
  const data = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd" (ISO). Retorna null se o formato for inválido. */
export function parseDataBR(valor: string): string | null {
  const match = DATA_HORA_BR.exec(valor.trim());
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

export function formatarHoras(horas: number): string {
  const sinal = horas < 0 ? '-' : '';
  const abs = Math.abs(horas);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sinal}${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}
