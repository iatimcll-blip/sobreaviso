import { ArrowDown, ArrowUp, BellRing, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Equipe } from '@shared/types/equipe';
import type { SobreavisoRegra, SobreavisoRegraEntrada } from '@shared/types/sobreaviso';
import { ApiError, api } from '../../lib/api-client';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  regra: SobreavisoRegra | null;
  equipes: Equipe[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function formVazio(): SobreavisoRegraEntrada {
  return { nome: '', periodicidadeDias: 7, horaTroca: '07:00', dataInicio: hoje(), ativo: true, observacoes: '', equipeIds: [] };
}

export function SobreavisoRegraFormModal({ regra, equipes, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<SobreavisoRegraEntrada>(formVazio());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (regra) {
      setForm({
        nome: regra.nome,
        periodicidadeDias: regra.periodicidadeDias,
        horaTroca: regra.horaTroca,
        dataInicio: regra.dataInicio,
        ativo: regra.ativo,
        observacoes: regra.observacoes ?? '',
        equipeIds: regra.equipes.sort((a, b) => a.ordem - b.ordem).map((e) => e.equipeId),
      });
    } else {
      setForm(formVazio());
    }
    setErro(null);
  }, [regra]);

  const equipesNoRodizio = form.equipeIds.map((id) => equipes.find((e) => e.id === id)).filter((e): e is Equipe => Boolean(e));
  const equipesDisponiveis = equipes.filter((e) => !form.equipeIds.includes(e.id));

  function mover(indice: number, direcao: -1 | 1) {
    const novaOrdem = [...form.equipeIds];
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= novaOrdem.length) return;
    [novaOrdem[indice], novaOrdem[alvo]] = [novaOrdem[alvo], novaOrdem[indice]];
    setForm({ ...form, equipeIds: novaOrdem });
  }

  async function aoSubmeter() {
    setErro(null);
    if (!form.nome.trim()) {
      setErro('Informe o nome da regra.');
      return;
    }
    if (form.equipeIds.length === 0) {
      setErro('Adicione ao menos uma equipe ao rodízio.');
      return;
    }
    setSalvando(true);
    try {
      if (regra) {
        await api.put(`/sobreaviso/regras/${regra.id}`, form);
        notificar('Regra de rodízio atualizada.', 'sucesso');
      } else {
        await api.post('/sobreaviso/regras', form);
        notificar('Regra de rodízio criada.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar a regra.');
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
          <BellRing />
        </span>
        <h2>{regra ? 'Editar regra de rodízio' : 'Nova regra de rodízio'}</h2>
        <p>Defina a periodicidade e a ordem das equipes na alternância automática de sobreaviso.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Nome
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>

        <div className="field-grid-2">
          <label className="field">
            Periodicidade (dias)
            <input
              type="number"
              min={1}
              max={365}
              value={form.periodicidadeDias}
              onChange={(e) => setForm({ ...form, periodicidadeDias: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            Horário da troca
            <input type="time" value={form.horaTroca} onChange={(e) => setForm({ ...form, horaTroca: e.target.value })} />
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            Início do rodízio
            <input type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
          </label>
          <label className="field checkbox-field">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Regra ativa
          </label>
        </div>

        <div className="field">
          Ordem das equipes no rodízio
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Equipe</th>
                  <th className="col-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipesNoRodizio.map((equipe, indice) => (
                  <tr key={equipe.id}>
                    <td>{indice + 1}º</td>
                    <td>{equipe.nome}</td>
                    <td className="col-acoes">
                      <button onClick={() => mover(indice, -1)} disabled={indice === 0} title="Mover para cima">
                        <ArrowUp size={16} />
                      </button>
                      <button onClick={() => mover(indice, 1)} disabled={indice === equipesNoRodizio.length - 1} title="Mover para baixo">
                        <ArrowDown size={16} />
                      </button>
                      <button onClick={() => setForm({ ...form, equipeIds: form.equipeIds.filter((id) => id !== equipe.id) })} title="Remover">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {equipesNoRodizio.length === 0 && (
                  <tr>
                    <td colSpan={3} className="data-table-empty">
                      Nenhuma equipe adicionada ao rodízio ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {equipesDisponiveis.length > 0 && (
            <div className="table-toolbar mt-10">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setForm({ ...form, equipeIds: [...form.equipeIds, Number(e.target.value)] });
                }}
              >
                <option value="">Adicionar equipe ao rodízio…</option>
                {equipesDisponiveis.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : regra ? 'Salvar alterações' : 'Criar regra'}
          </button>
        </div>
      </div>
    </div>
  );
}
