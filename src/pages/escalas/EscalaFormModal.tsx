import { CalendarDays, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CONFIGURACOES_CLT_PADRAO, type ConfiguracoesClt } from '@shared/constants/clt';
import { gerarTurnosPadrao } from '@shared/constants/escalaPresets';
import { gerarTurnosAutomaticos } from '@shared/calculo/geradorEscala';
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

  const [configClt, setConfigClt] = useState<ConfiguracoesClt>(CONFIGURACOES_CLT_PADRAO);
  const [horaEntradaGerador, setHoraEntradaGerador] = useState('08:00');
  const [duracaoGerador, setDuracaoGerador] = useState(8);
  const [erroGerador, setErroGerador] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ configuracoes: ConfiguracoesClt }>('/calculos/configuracoes-clt')
      .then((resposta) => setConfigClt(resposta.configuracoes))
      .catch(() => setConfigClt(CONFIGURACOES_CLT_PADRAO));
  }, []);

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
    setErroGerador(null);
    if (tipo === '12x36') {
      setHoraEntradaGerador('07:00');
      setDuracaoGerador(12);
    } else if (duracaoGerador === 12) {
      setDuracaoGerador(8);
    }
  }

  function aoGerarAutomaticamente() {
    setErroGerador(null);
    try {
      const resultado = gerarTurnosAutomaticos({
        tipo: form.tipo,
        horaEntrada: horaEntradaGerador,
        duracaoJornadaHoras: duracaoGerador,
        possuiAcordoColetivo: form.possuiAcordoColetivo ?? false,
        config: configClt,
      });
      setForm({ ...form, turnos: resultado.turnos, turno: resultado.turnoSugerido, duracaoIntervaloMinutos: resultado.intervaloMinutos });
      notificar(`Turnos gerados — saída às ${resultado.horaSaida}, intervalo de ${resultado.intervaloMinutos}min.`, 'sucesso');
    } catch (erroCapturado) {
      setErroGerador(erroCapturado instanceof Error ? erroCapturado.message : 'Não foi possível gerar os turnos.');
    }
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

            {form.tipo === 'personalizada' ? (
              <p className="mt-10">
                <small>
                  Geração automática não está disponível para escalas personalizadas — cada dia pode ter um horário diferente. Configure os
                  turnos manualmente abaixo.
                </small>
              </p>
            ) : (
              <fieldset className="fieldset-plano">
                <h2>Gerador automático de turnos</h2>
                <p>
                  <small>
                    Informe entrada e duração da jornada — a saída, o intervalo e a distribuição de folgas são calculados automaticamente
                    respeitando os limites CLT configurados (interjornada, intervalo intrajornada e jornada máxima).
                  </small>
                </p>
                <div className="field-grid-2">
                  <label className="field">
                    Horário de entrada
                    <input type="time" value={horaEntradaGerador} onChange={(e) => setHoraEntradaGerador(e.target.value)} />
                  </label>
                  <label className="field">
                    Duração da jornada (horas)
                    <input
                      type="number"
                      min={0.5}
                      max={24}
                      step={0.5}
                      value={duracaoGerador}
                      disabled={form.tipo === '12x36'}
                      onChange={(e) => setDuracaoGerador(Number(e.target.value))}
                    />
                  </label>
                </div>
                {erroGerador && <div className="auth-error">{erroGerador}</div>}
                <button type="button" className="outline mt-10" onClick={aoGerarAutomaticamente}>
                  <Sparkles size={16} />
                  Gerar turnos automaticamente
                </button>
              </fieldset>
            )}

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
