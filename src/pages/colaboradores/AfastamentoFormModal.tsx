import { CalendarPlus, X } from 'lucide-react';
import { useState } from 'react';
import { TIPOS_AFASTAMENTO, TIPO_AFASTAMENTO_LABEL, type AfastamentoEntrada, type ConflitoAfastamento } from '@shared/types/afastamento';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  colaboradores: ColaboradorResumo[];
  colaboradorFixoId?: number;
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function AfastamentoFormModal({ colaboradores, colaboradorFixoId, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [colaboradorId, setColaboradorId] = useState(colaboradorFixoId ? String(colaboradorFixoId) : '');
  const [tipo, setTipo] = useState<AfastamentoEntrada['tipo']>('ferias');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(forcar: boolean) {
    setErro(null);
    if (!colaboradorId || !dataInicio || !dataFim) {
      setErro('Selecione o colaborador e o período.');
      return;
    }
    const dado: AfastamentoEntrada = {
      colaboradorId: Number(colaboradorId),
      tipo,
      dataInicio,
      dataFim,
      justificativa: justificativa || null,
      observacao: observacao || null,
      forcar,
    };
    setSalvando(true);
    try {
      await api.post('/afastamentos', dado);
      notificar('Afastamento lançado.', 'sucesso');
      aoSalvar();
    } catch (erroCapturado) {
      if (erroCapturado instanceof ApiError && erroCapturado.status === 409) {
        const conflitos = erroCapturado.detalhes as ConflitoAfastamento[] | undefined;
        const resumo = conflitos?.map((cf) => `${cf.descricao} (${cf.inicio} — ${cf.fim})`).join('\n');
        if (confirm(`Conflito detectado:\n${resumo ?? erroCapturado.message}\n\nLançar mesmo assim?`)) {
          await enviar(true);
          return;
        }
        setErro('Lançamento cancelado por conflito com escala/sobreaviso.');
      } else {
        setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível lançar o afastamento.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <CalendarPlus />
        </span>
        <h2>Novo afastamento</h2>
        <p>Lance férias, atestados, faltas e demais ocorrências do colaborador.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <div className="field-grid-2">
          <label className="field">
            Colaborador
            <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} disabled={Boolean(colaboradorFixoId)}>
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as AfastamentoEntrada['tipo'])}>
              {TIPOS_AFASTAMENTO.map((t) => (
                <option key={t} value={t}>
                  {TIPO_AFASTAMENTO_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            Data inicial
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </label>
          <label className="field">
            Data final
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
        </div>

        <label className="field">
          Justificativa
          <input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        </label>
        <label className="field">
          Observação
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>

        <p>
          <small>O documento/anexo pode ser enviado após o lançamento, ao abrir o afastamento na lista.</small>
        </p>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void enviar(false)} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Lançar afastamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
