import { CalendarDays, X } from 'lucide-react';
import { useState } from 'react';
import type { UfInfo } from '@shared/constants/ufs';
import { TIPOS_FERIADO, TIPO_FERIADO_LABEL, type FeriadoEntrada } from '@shared/types/feriado';
import type { Localidade } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  uf: UfInfo[];
  localidades: Localidade[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

export function FeriadoFormModal({ uf, localidades, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<FeriadoEntrada>({ data: '', nome: '', abrangencia: 'nacional', ufSigla: null, localidadeId: null, tipo: 'feriado' });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const localidadesDaUf = localidades.filter((l) => !form.ufSigla || l.ufSigla === form.ufSigla);

  async function aoSubmeter() {
    setErro(null);
    if (!form.data || !form.nome.trim()) {
      setErro('Preencha data e nome.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/feriados', form);
      notificar('Feriado cadastrado.', 'sucesso');
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar o feriado.');
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
          <CalendarDays />
        </span>
        <h2>Novo feriado</h2>
        <p>Cadastre um feriado ou ponto facultativo manualmente.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <div className="field-grid-2">
          <label className="field">
            Data
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </label>
          <label className="field">
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as FeriadoEntrada['tipo'] })}>
              {TIPOS_FERIADO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_FERIADO_LABEL[tipo]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          Nome
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>

        <label className="field">
          Abrangência
          <select
            value={form.abrangencia}
            onChange={(e) =>
              setForm({ ...form, abrangencia: e.target.value as FeriadoEntrada['abrangencia'], ufSigla: null, localidadeId: null })
            }
          >
            <option value="nacional">Nacional</option>
            <option value="estadual">Estadual</option>
            <option value="municipal">Municipal</option>
          </select>
        </label>

        {form.abrangencia !== 'nacional' && (
          <div className="field-grid-2">
            <label className="field">
              UF
              <select value={form.ufSigla ?? ''} onChange={(e) => setForm({ ...form, ufSigla: e.target.value || null, localidadeId: null })}>
                <option value="">Selecione</option>
                {uf.map((item) => (
                  <option key={item.sigla} value={item.sigla}>
                    {item.sigla} — {item.nome}
                  </option>
                ))}
              </select>
            </label>
            {form.abrangencia === 'municipal' && (
              <label className="field">
                Localidade
                <select value={form.localidadeId ?? ''} onChange={(e) => setForm({ ...form, localidadeId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Selecione</option>
                  {localidadesDaUf.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Criar feriado'}
          </button>
        </div>
      </div>
    </div>
  );
}
