import { Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { DuplaDetalhada } from '@shared/types/dupla';
import { useToast } from '../../app/layout/ToastProvider';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { DuplaFormModal } from './DuplaFormModal';

export function DuplasTab() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [duplas, setDuplas] = useState<DuplaDetalhada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<DuplaDetalhada | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'duplas', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'duplas', 'editar');
  const podeExcluir = temPermissao(usuario, permissoes, 'duplas', 'excluir');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ duplas: DuplaDetalhada[] }>('/duplas');
      setDuplas(resposta.duplas);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar as duplas.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function excluir(dupla: DuplaDetalhada, evento: React.MouseEvent) {
    evento.stopPropagation();
    if (!confirm(`Excluir a dupla de "${dupla.colaborador1Nome}"?`)) return;
    try {
      await api.delete(`/duplas/${dupla.id}`);
      notificar('Dupla excluída.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível excluir a dupla.', 'erro');
    }
  }

  return (
    <>
      <div className="card card-padded">
        <div className="table-toolbar">
          <p>Duplas de trabalho — duplas sem o segundo colaborador ficam marcadas como incompletas.</p>
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
                Nova dupla
              </button>
            </div>
          )}
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dupla</th>
                <th>Equipe</th>
                <th>Situação</th>
                {podeExcluir && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {duplas.map((dupla) => (
                <tr
                  key={dupla.id}
                  onClick={() => {
                    if (!podeEditar) return;
                    setEmEdicao(dupla);
                    setModalAberto(true);
                  }}
                >
                  <td>
                    <b>{dupla.nome || `${dupla.colaborador1Nome} / ${dupla.colaborador2Nome ?? '—'}`}</b>
                    {dupla.nome && (
                      <div>
                        <small>
                          {dupla.colaborador1Nome} / {dupla.colaborador2Nome ?? '—'}
                        </small>
                      </div>
                    )}
                  </td>
                  <td>{dupla.equipeNome ?? '—'}</td>
                  <td>
                    {dupla.incompleta && <span className="badge badge-afastado">Incompleta</span>}
                    {!dupla.incompleta && <span className={`badge badge-${dupla.ativo ? 'ativo' : 'inativo'}`}>{dupla.ativo ? 'Ativa' : 'Inativa'}</span>}
                  </td>
                  {podeExcluir && (
                    <td className="col-acoes">
                      <button onClick={(e) => void excluir(dupla, e)} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && duplas.length === 0 && <div className="data-table-empty">Nenhuma dupla cadastrada.</div>}
        </div>
      </div>

      {modalAberto && (
        <DuplaFormModal
          dupla={emEdicao}
          equipes={referencias.equipes}
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
