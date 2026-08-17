import { CalendarDays, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { gerarTurnosPadrao } from '@shared/constants/escalaPresets';
import { TIPOS_ESCALA, TIPO_ESCALA_LABEL, TURNOS_ESCALA, type EscalaModeloDetalhado, type EscalaModeloEntrada, type EscalaVinculo, type TipoEscala, type TurnoEscala } from '@shared/types/escala';
import type { Equipe } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';
import { EscalaTurnosEditor } from './EscalaTurnosEditor';
import { EscalaVinculosManager } from './EscalaVinculosManager';

interface Props {
  escalaId: number | null;
  colaboradores: ColaboradorResumo[];
  equipes: Equipe[];
  localidades: Localidade[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function formVazio(): EscalaModeloEntrada {
  return {
    nome: '',
    tipo: '5x2',
    turno: 'diurno',
    duracaoIntervaloMinutos: 60,
    dataInicioVigencia: hoje(),
    dataFimVigencia: null,
    possuiAcordoColetivo: false,
    ativo: true,
    observacoes: '',
    turnos: gerarTurnosPadrao('5x2'),
  };
}

export function EscalaFormModal({ escalaId, colaboradores, equipes, localidades, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<EscalaModeloEntrada>(formVazio());
  const [vinculos, setVinculos] = useState<EscalaVinculo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(Boolean(escalaId));

  useEffect(() => {
    if (!escalaId) {
      setForm(formVazio());
      setVinculos([]);
      return;
    }
    setCarregando(true);
    api
      .get<{ escala: EscalaModeloDetalhado; vinculos: EscalaVinculo[] }>(`/escalas/${escalaId}`)
      .then((resposta) => {
        setForm({
          nome: resposta.escala.nome,
          tipo: resposta.escala.tipo,
          turno: resposta.escala.turno,
          duracaoIntervaloMinutos: resposta.escala.duracaoIntervaloMinutos,
          dataInicioVigencia: resposta.escala.dataInicioVigencia,
          dataFimVigencia: resposta.escala.dataFimVigencia,
          possuiAcordoColetivo: resposta.escala.possuiAcordoColetivo,
          ativo: resposta.escala.ativo,
          observacoes: resposta.escala.observacoes ?? '',
          turnos: resposta.escala.turnos,
        });
        setVinculos(resposta.vinculos);
      })
      .finally(() => setCarregando(false));
  }, [escalaId]);

  function aoMudarTipo(tipo: TipoEscala) {
    setForm({ ...form, tipo, turnos: gerarTurnosPadrao(tipo) });
  }

  async function aoSubmeter() {
    setErro(null);
    if (!form.nome.trim()) {
      setErro('Informe o nome da escala.');
      return;
    }
    setSalvando(true);
    try {
      if (escalaId) {
        await api.put(`/escalas/${escalaId}`, form);
        notificar('Escala atualizada.', 'sucesso');
      } else {
        await api.post('/escalas', form);
        notificar('Escala criada.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar a escala.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <CalendarDays />
        </span>
        <h2>{escalaId ? 'Editar escala' : 'Nova escala'}</h2>
        <p>Defina o modelo de escala, seus turnos e a quem ela se aplica.</p>

        {erro && <div className="auth-error">{erro}</div>}
        {carregando && <p>Carregando…</p>}

        {!carregando && (
          <>
            <div className="field-grid-2">
              <label className="field">
                Nome
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </label>
              <label className="field">
                Modelo de escala
                <select value={form.tipo} onChange={(e) => aoMudarTipo(e.target.value as TipoEscala)}>
                  {TIPOS_ESCALA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPO_ESCALA_LABEL[tipo]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                Turno
                <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value as TurnoEscala })}>
                  {TURNOS_ESCALA.map((turno) => (
                    <option key={turno} value={turno}>
                      {turno === 'diurno' ? 'Diurno' : turno === 'noturno' ? 'Noturno' : 'Misto'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Duração padrão do intervalo (minutos)
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={form.duracaoIntervaloMinutos}
                  onChange={(e) => setForm({ ...form, duracaoIntervaloMinutos: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                Início da vigência
                <input type="date" value={form.dataInicioVigencia} onChange={(e) => setForm({ ...form, dataInicioVigencia: e.target.value })} />
              </label>
              <label className="field">
                Fim da vigência (opcional)
                <input
                  type="date"
                  value={form.dataFimVigencia ?? ''}
                  onChange={(e) => setForm({ ...form, dataFimVigencia: e.target.value || null })}
                />
              </label>
            </div>

            <label className="field checkbox-field">
              <input
                type="checkbox"
                checked={form.possuiAcordoColetivo}
                onChange={(e) => setForm({ ...form, possuiAcordoColetivo: e.target.checked })}
              />
              Possui acordo/convenção coletiva amparando este modelo
            </label>

            <label className="field">
              Observações
              <input value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </label>

            <EscalaTurnosEditor tipo={form.tipo} turnos={form.turnos} onChange={(turnos) => setForm({ ...form, turnos })} />

            {escalaId && (
              <EscalaVinculosManager
                escalaModeloId={escalaId}
                vinculos={vinculos}
                colaboradores={colaboradores}
                equipes={equipes}
                localidades={localidades}
                onVinculosChange={setVinculos}
              />
            )}
            {!escalaId && (
              <p>
                <small>Salve a escala para poder vinculá-la a colaboradores, equipes ou localidades.</small>
              </p>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Fechar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando || carregando}>
            {salvando ? 'Salvando…' : escalaId ? 'Salvar alterações' : 'Criar escala'}
          </button>
        </div>
      </div>
    </div>
  );
}
