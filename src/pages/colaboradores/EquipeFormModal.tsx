import { Trash2, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UfInfo } from '@shared/constants/ufs';
import { PAPEIS_EQUIPE_MEMBRO, PAPEL_EQUIPE_MEMBRO_LABEL, type EquipeDetalhada, type EquipeEntrada, type EquipeMembro, type PapelEquipeMembro } from '@shared/types/equipe';
import type { Localidade } from '@shared/types/localidade';
import { ApiError, api } from '../../lib/api-client';
import type { ColaboradorResumo } from '../../lib/useReferencias';
import { useToast } from '../../app/layout/ToastProvider';

interface Props {
  equipe: EquipeDetalhada | null;
  localidades: Localidade[];
  uf: UfInfo[];
  colaboradores: ColaboradorResumo[];
  aoFechar: () => void;
  aoSalvar: () => void;
}

const VAZIO: EquipeEntrada = { nome: '', localidadeId: null, supervisorId: null, gestorAdministrativoId: null, gestorOperacionalId: null, ativo: true };

export function EquipeFormModal({ equipe, localidades, colaboradores, aoFechar, aoSalvar }: Props) {
  const { notificar } = useToast();
  const [form, setForm] = useState<EquipeEntrada>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [membros, setMembros] = useState<EquipeMembro[]>([]);
  const [novoMembroId, setNovoMembroId] = useState('');
  const [novoMembroPapel, setNovoMembroPapel] = useState<PapelEquipeMembro>('tecnico');

  useEffect(() => {
    if (equipe) {
      setForm({
        nome: equipe.nome,
        localidadeId: equipe.localidadeId,
        supervisorId: equipe.supervisorId,
        gestorAdministrativoId: equipe.gestorAdministrativoId,
        gestorOperacionalId: equipe.gestorOperacionalId,
        ativo: equipe.ativo,
      });
      api.get<{ equipe: EquipeDetalhada; membros: EquipeMembro[] }>(`/equipes/${equipe.id}`).then((r) => setMembros(r.membros));
    } else {
      setForm(VAZIO);
      setMembros([]);
    }
    setErro(null);
  }, [equipe]);

  async function aoSubmeter() {
    setErro(null);
    if (!form.nome.trim()) {
      setErro('Informe o nome da equipe.');
      return;
    }
    setSalvando(true);
    try {
      if (equipe) {
        await api.put(`/equipes/${equipe.id}`, form);
        notificar('Equipe atualizada.', 'sucesso');
      } else {
        await api.post('/equipes', form);
        notificar('Equipe criada.', 'sucesso');
      }
      aoSalvar();
    } catch (erroCapturado) {
      setErro(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível salvar a equipe.');
    } finally {
      setSalvando(false);
    }
  }

  async function adicionarMembro() {
    if (!equipe || !novoMembroId) return;
    try {
      const resposta = await api.post<{ membros: EquipeMembro[] }>(`/equipes/${equipe.id}/membros`, {
        colaboradorId: Number(novoMembroId),
        papel: novoMembroPapel,
        dataInicio: new Date().toISOString().slice(0, 10),
      });
      setMembros(resposta.membros);
      setNovoMembroId('');
      notificar('Membro adicionado à equipe.', 'sucesso');
    } catch (erroCapturado) {
      notificar(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível adicionar o membro.', 'erro');
    }
  }

  async function removerMembro(membroId: number) {
    try {
      await api.delete(`/equipes/membros/${membroId}`);
      setMembros((atual) => atual.filter((m) => m.id !== membroId));
    } catch (erroCapturado) {
      notificar(erroCapturado instanceof ApiError ? erroCapturado.message : 'Não foi possível remover o membro.', 'erro');
    }
  }

  const membrosIds = new Set(membros.map((m) => m.colaboradorId));
  const candidatos = colaboradores.filter((c) => !membrosIds.has(c.id));

  return (
    <div className="overlay">
      <div className="modal modal-wide">
        <button className="modal-x" onClick={aoFechar} aria-label="Fechar">
          <X />
        </button>
        <span className="modal-icon">
          <Users />
        </span>
        <h2>{equipe ? 'Editar equipe' : 'Nova equipe'}</h2>
        <p>Defina os dados da equipe e sua estrutura de gestão.</p>

        {erro && <div className="auth-error">{erro}</div>}

        <label className="field">
          Nome
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </label>

        <label className="field">
          Localidade
          <select value={form.localidadeId ?? ''} onChange={(e) => setForm({ ...form, localidadeId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sem localidade definida</option>
            {localidades.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.nome}, {loc.ufSigla}
              </option>
            ))}
          </select>
        </label>

        <div className="field-grid-2">
          <label className="field">
            Supervisor
            <select value={form.supervisorId ?? ''} onChange={(e) => setForm({ ...form, supervisorId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Não definido</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field checkbox-field">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
            Equipe ativa
          </label>
        </div>

        <div className="field-grid-2">
          <label className="field">
            Gestor Administrativo (G.A)
            <select
              value={form.gestorAdministrativoId ?? ''}
              onChange={(e) => setForm({ ...form, gestorAdministrativoId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Não definido</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Gestor Operacional (G.O)
            <select
              value={form.gestorOperacionalId ?? ''}
              onChange={(e) => setForm({ ...form, gestorOperacionalId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Não definido</option>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {equipe && (
          <div className="field">
            Membros da equipe
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Papel</th>
                    <th className="col-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {membros.map((membro) => (
                    <tr key={membro.id}>
                      <td>{membro.colaboradorNome}</td>
                      <td>{PAPEL_EQUIPE_MEMBRO_LABEL[membro.papel]}</td>
                      <td className="col-acoes">
                        <button onClick={() => void removerMembro(membro.id)} title="Remover da equipe">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {membros.length === 0 && (
                    <tr>
                      <td colSpan={3} className="data-table-empty">
                        Nenhum membro na equipe ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-toolbar mt-10">
              <select value={novoMembroId} onChange={(e) => setNovoMembroId(e.target.value)}>
                <option value="">Selecione um colaborador…</option>
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <select value={novoMembroPapel} onChange={(e) => setNovoMembroPapel(e.target.value as PapelEquipeMembro)}>
                {PAPEIS_EQUIPE_MEMBRO.map((papel) => (
                  <option key={papel} value={papel}>
                    {PAPEL_EQUIPE_MEMBRO_LABEL[papel]}
                  </option>
                ))}
              </select>
              <button className="outline" onClick={() => void adicionarMembro()} disabled={!novoMembroId}>
                Adicionar
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="outline" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="primary" onClick={() => void aoSubmeter()} disabled={salvando}>
            {salvando ? 'Salvando…' : equipe ? 'Salvar alterações' : 'Criar equipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
