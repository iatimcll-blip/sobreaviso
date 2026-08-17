import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TIPO_LOCALIDADE_LABEL, type Localidade } from '@shared/types/localidade';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { LocalidadeFormModal } from './LocalidadeFormModal';

export function LocalidadesTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Localidade | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'localidades', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'localidades', 'editar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ localidades: Localidade[] }>('/localidades');
      setLocalidades(resposta.localidades);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar as localidades.', 'erro');
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
          <p>Localidades vinculadas às UFs, usadas em colaboradores, escalas e feriados.</p>
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
                Nova localidade
              </button>
            </div>
          )}
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>UF</th>
                <th>Tipo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {localidades.map((loc) => (
                <tr
                  key={loc.id}
                  onClick={() => {
                    if (!podeEditar) return;
                    setEmEdicao(loc);
                    setModalAberto(true);
                  }}
                >
                  <td>
                    <b>{loc.nome}</b>
                  </td>
                  <td>{loc.ufSigla}</td>
                  <td>{TIPO_LOCALIDADE_LABEL[loc.tipo]}</td>
                  <td>
                    <span className={`badge badge-${loc.ativo ? 'ativo' : 'inativo'}`}>{loc.ativo ? 'Ativa' : 'Inativa'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && localidades.length === 0 && <div className="data-table-empty">Nenhuma localidade cadastrada.</div>}
        </div>
      </div>

      {modalAberto && (
        <LocalidadeFormModal
          localidade={emEdicao}
          uf={referencias.uf}
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
