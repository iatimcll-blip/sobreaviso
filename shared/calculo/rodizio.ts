export interface RodizioEquipeInfo {
  equipeId: number;
  ordem: number;
  equipeNome: string;
}

export interface RegraRodizio {
  /** Data em que a primeira equipe da lista assume o plantão, formato ISO "aaaa-mm-dd". */
  dataInicio: string;
  periodicidadeDias: number;
  /** Horário da troca de plantão, formato "HH:MM". */
  horaTroca: string;
  /** Equipes na ordem do rodízio (posição 0 assume em `dataInicio`). */
  equipes: RodizioEquipeInfo[];
}

export interface ResultadoRodizio {
  equipeAtual: RodizioEquipeInfo;
  equipeProxima: RodizioEquipeInfo;
  inicioTurnoAtual: string;
  fimTurnoAtual: string;
}

function ancoraUTC(dataInicio: string, horaTroca: string): number {
  const [ano, mes, dia] = dataInicio.split('-').map(Number);
  const [hora, minuto] = horaTroca.split(':').map(Number);
  return Date.UTC(ano, mes - 1, dia, hora, minuto);
}

/**
 * Determina qual equipe está de plantão (e qual é a próxima) em um rodízio automático, dado um
 * instante de referência. Matemática pura — sem acesso a banco — para ser testável isoladamente.
 * `horaTroca`/`dataInicio` são tratados como um instante UTC (o painel ainda não modela fuso
 * horário por localidade); ajustar aqui quando essa necessidade aparecer.
 */
export function calcularRodizio(regra: RegraRodizio, agora: Date = new Date()): ResultadoRodizio | null {
  const equipesOrdenadas = [...regra.equipes].sort((a, b) => a.ordem - b.ordem);
  if (equipesOrdenadas.length === 0 || regra.periodicidadeDias <= 0) return null;

  const ancoraMs = ancoraUTC(regra.dataInicio, regra.horaTroca);
  const periodicidadeMs = regra.periodicidadeDias * 24 * 60 * 60 * 1000;
  const deltaMs = Math.max(0, agora.getTime() - ancoraMs);
  const voltasCompletas = Math.floor(deltaMs / periodicidadeMs);

  const indiceAtual = voltasCompletas % equipesOrdenadas.length;
  const indiceProximo = (indiceAtual + 1) % equipesOrdenadas.length;
  const inicioTurnoAtualMs = ancoraMs + voltasCompletas * periodicidadeMs;
  const fimTurnoAtualMs = inicioTurnoAtualMs + periodicidadeMs;

  return {
    equipeAtual: equipesOrdenadas[indiceAtual],
    equipeProxima: equipesOrdenadas[indiceProximo],
    inicioTurnoAtual: new Date(inicioTurnoAtualMs).toISOString(),
    fimTurnoAtual: new Date(fimTurnoAtualMs).toISOString(),
  };
}
