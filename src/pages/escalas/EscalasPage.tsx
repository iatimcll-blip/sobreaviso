import { Copy, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TIPO_ESCALA_LABEL, type EscalaModelo } from '@shared/types/escala';
import { PageHeader } from '../../app/layout/PageHeader';
import { useToast } from '../../app/layout/ToastProvider';
import { ExportButton } from '../../components/ExportButton';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { EscalaFormModal } from './EscalaFormModal';

type EscalaListada = EscalaModelo & { totalVinculos: number };

export function EscalasPage() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [escalas, setEscalas] = useState<EscalaListada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [escalaIdEmEdicao, setEscalaIdEmEdicao] = useState<number | null>(null);

  const podeCriar = temPermissao(usuario, permissoes, 'escalas', 'criar');
  const podeEditar = temPermissao(usuario, permissoes, 'escalas', 'editar');
  const podeExportar = temPermissao(usuario, permissoes, 'escalas', 'exportar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await api.get<{ escalas: EscalaListada[] }>('/escalas');
      setEscalas(resposta.escalas);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar as escalas.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function duplicar(escala: EscalaListada, evento: React.MouseEvent) {
    evento.stopPropagation();
    const nome = prompt('Nome da nova escala (cópia):', `${escala.nome} (cópia)`);
    if (!nome) return;
    try {
      await api.post(`/escalas/${escala.id}/duplicar`, { nome });
      notificar('Escala duplicada.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível duplicar a escala.', 'erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Escalas"
        actions={
          <>
            {podeExportar && <ExportButton tipo="escalas" />}
            {podeCriar && (
              <button
                className="primary"
                onClick={() => {
                  setEscalaIdEmEdicao(null);
                  setModalAberto(true);
                }}
              >
                <Plus size={18} />
                Nova escala
              </button>
            )}
          </>
        }
      />

      <div className="card card-padded">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Modelo</th>
                <th>Turno</th>
                <th>Vigência</th>
                <th>Vínculos</th>
                <th>Situação</th>
                {podeCriar && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {escalas.map((escala) => (
                <tr
                  key={escala.id}
                  onClick={() => {
                    if (!podeEditar) return;
                    setEscalaIdEmEdicao(escala.id);
                    setModalAberto(true);
                  }}
                >
                  <td>
                    <b>{escala.nome}</b>
                    {escala.duplicadoDeId && (
                      <div>
                        <small>Duplicada de outro modelo</small>
                      </div>
                    )}
                  </td>
                  <td>{TIPO_ESCALA_LABEL[escala.tipo]}</td>
                  <td>{escala.turno === 'diurno' ? 'Diurno' : escala.turno === 'noturno' ? 'Noturno' : 'Misto'}</td>
                  <td>
                    {escala.dataInicioVigencia}
                    {escala.dataFimVigencia ? ` — ${escala.dataFimVigencia}` : ' (indeterminado)'}
                  </td>
                  <td>{escala.totalVinculos}</td>
                  <td>
                    <span className={`badge badge-${escala.ativo ? 'ativo' : 'inativo'}`}>{escala.ativo ? 'Ativa' : 'Inativa'}</span>
                  </td>
                  {podeCriar && (
                    <td className="col-acoes">
                      <button onClick={(e) => void duplicar(escala, e)} title="Duplicar escala">
                        <Copy size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && escalas.length === 0 && <div className="data-table-empty">Nenhuma escala cadastrada.</div>}
        </div>
      </div>

      {modalAberto && (
        <EscalaFormModal
          escalaId={escalaIdEmEdicao}
          colaboradores={referencias.colaboradores}
          equipes={referencias.equipes}
          localidades={referencias.localidades}
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
