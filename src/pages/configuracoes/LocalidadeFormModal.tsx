import { MapPin, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UfInfo } from '@shared/constants/ufs';
import { TIPOS_LOCALIDADE, TIPO_LOCALIDADE_LABEL, type Localidade, type LocalidadeEntrada } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  localidade: Localidade | null;
  uf: UfInfo[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const VAZIO: LocalidadeEntrada = { nome: '', ufSigla: '', tipo: 'municipio', ativo: true };

export function LocalidadeFormModal({ localidade, uf, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<LocalidadeEntrada>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (localidade) {
      setForm({ nome: localidade.nome, ufSigla: localidade.ufSigla, tipo: localidade.tipo, ativo: localidade.ativo });
    } else {
      setForm(VAZIO);
    }
    setErro(null);
  }, [localidade]);

  async function aoSubmeter() {
    setErro(null);
    if (!form.nome.trim() || !form.ufSigla) {
      setErro('Preencha nome e UF.');
      return;
    }
    setSalvando(true);
    try {
      if (localidade) {
        await api.put(`/localidades/${localidade.id}`, form);
        notificar('Localidade atualizada.', 'sucesso');
      } else {
        await api.post('/localidades', form);
        notificar('Localidade criada.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar a localidade.');
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
          <MapPin />
        </span>
        <h2>{localidade ? 'Editar localidade' : 'Nova localidade'}</h2>
        <p>Localidades são usadas em colaboradores, escalas, feriados e sobreaviso.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Nome
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>

        <div className="field-grid-2">
          <label className="field">
            UF
            <select value={form.ufSigla} onChange={(e) => setForm({ ...form, ufSigla: e.target.value })}>
              <option value="">Selecione</option>
              {uf.map((item) => (
                <option key={item.sigla} value={item.sigla}>
                  {item.sigla} — {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as LocalidadeEntrada['tipo'] })}>
              {TIPOS_LOCALIDADE.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_LOCALIDADE_LABEL[tipo]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field checkbox-field">
          <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
          Localidade ativa
        </label>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : localidade ? 'Salvar alterações' : 'Criar localidade'}
          </button>
        </div>
      </div>
    </div>
  );
}
