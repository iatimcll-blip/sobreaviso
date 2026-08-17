import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { EquipeDetalhada } from '@shared/types/equipe';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { EquipeFormModal } from './EquipeFormModal';

export function EquipesTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [equipes, setEquipes] = useState<EquipeDetalhada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<EquipeDetalhada | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'equipes', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'equipes', 'editar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ equipes: EquipeDetalhada[] }>('/equipes');
      setEquipes(resposta.equipes);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar as equipes.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <>
      <div className="card card-padded">
        <div className="table-toolbar">
          <p>Cadastro de equipes, membros e gestores.</p>
          {podeCriar && (
            <div className="table-toolbar-actions">
              <button
                className="primary"
                onClick={() => {
                  setEmEdicao(null);
                  setModalAberto(true);
                }}
              >
                <Plus size={18} />
                Nova equipe
              </button>
            </div>
          )}
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipe</th>
                <th>Localidade</th>
                <th>Supervisor</th>
                <th>G.A / G.O</th>
                <th>Membros</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {equipes.map((equipe) => (
                <tr
                  key={equipe.id}
                  onClick={() => {
                    if (!podeEditar) return;
                    setEmEdicao(equipe);
                    setModalAberto(true);
                  }}
                >
                  <td>
                    <b>{equipe.nome}</b>
                  </td>
                  <td>{equipe.localidadeNome ?? '—'}</td>
                  <td>{equipe.supervisorNome ?? '—'}</td>
                  <td>
                    {equipe.gestorAdministrativoNome ?? '—'} / {equipe.gestorOperacionalNome ?? '—'}
                  </td>
                  <td>{equipe.totalMembros}</td>
                  <td>
                    <span className={`badge badge-${equipe.ativo ? 'ativo' : 'inativo'}`}>{equipe.ativo ? 'Ativa' : 'Inativa'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && equipes.length === 0 && <div className="data-table-empty">Nenhuma equipe cadastrada.</div>}
        </div>
      </div>

      {modalAberto && (
        <EquipeFormModal
          equipe={emEdicao}
          localidades={referencias.localidades}
          uf={referencias.uf}
          colaboradores={referencias.colaboradores}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={() => {
            setModalAberto(false);
            void carregar();
          }}
        />
      )}
    </>
  );
}
