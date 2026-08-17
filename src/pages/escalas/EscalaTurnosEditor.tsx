import { Plus, Trash2 } from 'lucide-react';
import { rotuloDiaPadrao } from '@shared/constants/escalaPresets';
import type { EscalaTurno, TipoEscala } from '@shared/types/escala';

interface Props {
  tipo: TipoEscala;
  turnos: EscalaTurno[];
  onChange: (turnos: EscalaTurno[]) => void;
}

export function EscalaTurnosEditor({ tipo, turnos, onChange }: Props) {
  function atualizarDia(cicloDia: number, alteracoes: Partial<EscalaTurno>) {
    onChange(turnos.map((turno) => (turno.cicloDia === cicloDia ? { ...turno, ...alteracoes } : turno)));
  }

  function adicionarDia() {
    const proximoCiclo = turnos.length > 0 ? Math.max(...turnos.map((t) => t.cicloDia)) + 1 : 0;
    onChange([...turnos, { cicloDia: proximoCiclo, horaEntrada: '08:00', horaSaida: '17:00', intervaloInicio: null, intervaloFim: null, folga: false }]);
  }

  function removerDia(cicloDia: number) {
    onChange(turnos.filter((t) => t.cicloDia !== cicloDia));
  }

  const ordenados = [...turnos].sort((a, b) => a.cicloDia - b.cicloDia);

  return (
    <div className="field">
      Turnos do padrão
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Folga</th>
              <th>Entrada</th>
              <th>Saída</th>
              <th>Intervalo início</th>
              <th>Intervalo fim</th>
              {tipo === 'personalizada' && <th className="col-acoes">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((turno) => (
              <tr key={turno.cicloDia}>
                <td>{rotuloDiaPadrao(tipo, turno.cicloDia)}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={turno.folga}
                    onChange={(e) =>
                      atualizarDia(turno.cicloDia, e.target.checked ? { folga: true, horaEntrada: null, horaSaida: null, intervaloInicio: null, intervaloFim: null } : { folga: false, horaEntrada: '08:00', horaSaida: '17:00' })
                    }
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={turno.horaEntrada ?? ''}
                    disabled={turno.folga}
                    onChange={(e) => atualizarDia(turno.cicloDia, { horaEntrada: e.target.value || null })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={turno.horaSaida ?? ''}
                    disabled={turno.folga}
                    onChange={(e) => atualizarDia(turno.cicloDia, { horaSaida: e.target.value || null })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={turno.intervaloInicio ?? ''}
                    disabled={turno.folga}
                    onChange={(e) => atualizarDia(turno.cicloDia, { intervaloInicio: e.target.value || null })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={turno.intervaloFim ?? ''}
                    disabled={turno.folga}
                    onChange={(e) => atualizarDia(turno.cicloDia, { intervaloFim: e.target.value || null })}
                  />
                </td>
                {tipo === 'personalizada' && (
                  <td className="col-acoes">
                    <button onClick={() => removerDia(turno.cicloDia)} title="Remover dia" disabled={turnos.length <= 1}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tipo === 'personalizada' && (
        <button className="outline mt-10" onClick={adicionarDia} type="button">
          <Plus size={16} />
          Adicionar dia ao padrão
        </button>
      )}
    </div>
  );
}
