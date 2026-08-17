import { UsersRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DuplaDetalhada, DuplaEntrada } from '@shared/types/dupla';
import type { Equipe } from '@shared/types/equipe';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  dupla: DuplaDetalhada | null;
  equipes: Equipe[];
  colaboradores: ColaboradorResumo[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);
const VAZIO: DuplaEntrada = { equipeId: null, nome: '', colaborador1Id: 0, colaborador2Id: null, ativo: true, dataInicio: hoje() };

export function DuplaFormModal({ dupla, equipes, colaboradores, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<DuplaEntrada>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (dupla) {
      setForm({
        equipeId: dupla.equipeId,
        nome: dupla.nome ?? '',
        colaborador1Id: dupla.colaborador1Id,
        colaborador2Id: dupla.colaborador2Id,
        ativo: dupla.ativo,
        dataInicio: dupla.dataInicio,
        dataFim: dupla.dataFim,
      });
    } else {
      setForm(VAZIO);
    }
    setErro(null);
  }, [dupla]);

  async function aoSubmeter() {
    setErro(null);
    if (!form.colaborador1Id) {
      setErro('Selecione o primeiro colaborador da dupla.');
      return;
    }
    if (form.colaborador2Id && form.colaborador2Id === form.colaborador1Id) {
      setErro('Selecione dois colaboradores diferentes.');
      return;
    }
    setSalvando(true);
    try {
      if (dupla) {
        await api.put(`/duplas/${dupla.id}`, form);
        notificar('Dupla atualizada.', 'sucesso');
      } else {
        await api.post('/duplas', form);
        notificar('Dupla criada.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar a dupla.');
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
          <UsersRound />
        </span>
        <h2>{dupla ? 'Editar dupla' : 'Nova dupla'}</h2>
        <p>Configure a dupla de trabalho e a equipe relacionada.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Nome da dupla (opcional)
          <input value={form.nome ?? ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>

        <label className="field">
          Equipe
          <select value={form.equipeId ?? ''} onChange={(e) => setForm({ ...form, equipeId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sem equipe definida</option>
            {equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="field-grid-2">
          <label className="field">
            Colaborador 1
            <select value={form.colaborador1Id || ''} onChange={(e) => setForm({ ...form, colaborador1Id: Number(e.target.value) })}>
              <option value="">Selecione</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Colaborador 2
            <select
              value={form.colaborador2Id ?? ''}
              onChange={(e) => setForm({ ...form, colaborador2Id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Dupla incompleta (sem par definido)</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            Início
            <input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
          </label>
          <label className="field checkbox-field">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Dupla ativa
          </label>
        </div>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : dupla ? 'Salvar alterações' : 'Criar dupla'}
          </button>
        </div>
      </div>
    </div>
  );
}
