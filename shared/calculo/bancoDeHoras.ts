import { horasPrevistasTurno, type TurnoResolvido } from './jornada';

export interface AjusteHorasDia {
  data: string;
  horasAjuste: number;
}

export interface ResultadoHorasDia {
  data: string;
  horasPrevistas: number;
  horasTrabalhadas: number;
  horasExtras: number;
}

export interface ResultadoHorasCiclo {
  dias: ResultadoHorasDia[];
  totalPrevistas: number;
  totalTrabalhadas: number;
  totalExtras: number;
  saldoBancoDeHoras: number;
}

/**
 * Consolida horas previstas/trabalhadas/extras por dia e o saldo do banco de horas do período.
 * `horasTrabalhadas` parte das horas previstas pela escala e aplica ajustes manuais (correções lançadas
 * a partir do fluxo de inconsistências) — não há integração com ponto eletrônico neste projeto.
 */
export function calcularHorasCiclo(turnos: TurnoResolvido[], ajustes: AjusteHorasDia[] = []): ResultadoHorasCiclo {
  const ajustePorDia = new Map<string, number>();
  for (const ajuste of ajustes) {
    ajustePorDia.set(ajuste.data, (ajustePorDia.get(ajuste.data) ?? 0) + ajuste.horasAjuste);
  }

  const dias: ResultadoHorasDia[] = turnos.map((turno) => {
    const horasPrevistas = horasPrevistasTurno(turno);
    const horasTrabalhadas = Math.max(0, horasPrevistas + (ajustePorDia.get(turno.data) ?? 0));
    return { data: turno.data, horasPrevistas, horasTrabalhadas, horasExtras: Math.max(0, horasTrabalhadas - horasPrevistas) };
  });

  const totalPrevistas = dias.reduce((soma, d) => soma + d.horasPrevistas, 0);
  const totalTrabalhadas = dias.reduce((soma, d) => soma + d.horasTrabalhadas, 0);
  const totalExtras = dias.reduce((soma, d) => soma + d.horasExtras, 0);

  return { dias, totalPrevistas, totalTrabalhadas, totalExtras, saldoBancoDeHoras: totalTrabalhadas - totalPrevistas };
}
