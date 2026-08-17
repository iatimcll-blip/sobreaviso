import { CalendarDays } from 'lucide-react';
import { cicloAtual, formatarPeriodoCiclo } from '@shared/calculo/ciclo';

export function PeriodBar() {
  const ciclo = cicloAtual();

  return (
    <section className="period">
      <div className="period-icon">
        <CalendarDays size={20} />
      </div>
      <div>
        <span>Ciclo de apuração vigente</span>
        <b>{formatarPeriodoCiclo(ciclo)}</b>
        <small>Os períodos são iniciados automaticamente no dia 15 e encerrados no dia 14 do mês seguinte.</small>
      </div>
    </section>
  );
}
