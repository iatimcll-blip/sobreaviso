import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { TIPO_INCONSISTENCIA_LABEL, type StatusInconsistencia } from '@shared/calculo/inconsistencias';
import type { InconsistenciaDetalhada } from '@shared/types/inconsistencia';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  inconsistencia: InconsistenciaDetalhada;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const ACOES: { status: StatusInconsistencia; label: string; exigeJustificativa: boolean }[] = [
  { status: 'em_revisao', label: 'Marcar como em revisão', exigeJustificativa: false },
  { status: 'justificada', label: 'Justificar', exigeJustificativa: true },
  { status: 'aprovada', label: 'Aprovar', exigeJustificativa: false },
  { status: 'corrigida', label: 'Marcar como corrigida', exigeJustificativa: false },
  { status: 'ignorada', label: 'Ignorar', exigeJustificativa: true },
];

export function InconsistenciaReviewModal({ inconsistencia, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [justificativa, setJustificativa] = useState(inconsistencia.justificativa ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<StatusInconsistencia | null>(null);

  async function aplicar(status: StatusInconsistencia, exigeJustificativa: boolean) {
    setErro(null);
    if (exigeJustificativa && !justificativa.trim()) {
      setErro('Informe uma justificativa para esta ação.');
      return;
    }
    setSalvando(status);
    try {
      await api.patch(`/inconsistencias/${inconsistencia.id}`, { status, justificativa: justificativa || null });
      notificar('Inconsistência atualizada.', 'sucesso');
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível atualizar a inconsistência.');
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <AlertTriangle />
        </span>
        <h2>{TIPO_INCONSISTENCIA_LABEL[inconsistencia.tipo]}</h2>
        <p>{inconsistencia.descricao}</p>

        {erro && <div className="auth-error">{erro}</div>}

        <div className="field-grid-2">
          <div className="field">
            Colaborador
            <input value={inconsistencia.colaboradorNome ?? inconsistencia.equipeNome ?? '—'} disabled />
          </div>
          <div className="field">
            Data de referência
            <input value={inconsistencia.dataReferencia} disabled />
          </div>
        </div>

        <label className="field">
          Justificativa (obrigatória para justificar ou ignorar)
          <input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        </label>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        <div className="table-toolbar-actions mt-10">
          {ACOES.map((acao) => (
            <button key={acao.status} className="outline" onClick={() => void aplicar(acao.status, acao.exigeJustificativa)} disabled={salvando !== null}>
              {salvando === acao.status ? 'Salvando…' : acao.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
