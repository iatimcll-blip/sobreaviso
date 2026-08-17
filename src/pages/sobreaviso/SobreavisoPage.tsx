import { Plus, Settings, Users, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Dupla } from '@shared/types/dupla';
import { STATUS_SOBREAVISO_LABEL, type SobreavisoDetalhado, type SobreavisoRegra, type StatusRodizio } from '@shared/types/sobreaviso';
import { formatarDataHoraBR } from '@shared/format';
import { PageHeader } from '../../app/layout/PageHeader';
import { useToast } from '../../app/layout/ToastProvider';
import { ExportButton } from '../../components/ExportButton';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { SobreavisoFormModal } from './SobreavisoFormModal';
import { SobreavisoRegraFormModal } from './SobreavisoRegraFormModal';

export function SobreavisoPage() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [status, setStatus] = useState<StatusRodizio[]>([]);
  const [sobreavisos, setSobreavisos] = useState<SobreavisoDetalhado[]>([]);
  const [regras, setRegras] = useState<SobreavisoRegra[]>([]);
  const [duplas, setDuplas] = useState<Dupla[]>([]);
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  const [regraEmEdicao, setRegraEmEdicao] = useState<SobreavisoRegra | null>(null);
  const [modalRegraAberto, setModalRegraAberto] = useState(false);

  const podeCriar = temPermissao(usuario, permissoes, 'sobreaviso', 'criar');
  const podeExcluir = temPermissao(usuario, permissoes, 'sobreaviso', 'excluir');
  const podeExportar = temPermissao(usuario, permissoes, 'sobreaviso', 'exportar');

  const carregar = useCallback(async () => {
    try {
      const [respStatus, respSobreavisos, respRegras] = await Promise.all([
        api.get<{ status: StatusRodizio[] }>('/sobreaviso/status-rodizio'),
        api.get<{ sobreavisos: SobreavisoDetalhado[] }>('/sobreaviso'),
        api.get<{ regras: SobreavisoRegra[] }>('/sobreaviso/regras'),
      ]);
      setStatus(respStatus.status);
      setSobreavisos(respSobreavisos.sobreavisos);
      setRegras(respRegras.regras);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar o sobreaviso.', 'erro');
    }
    try {
      const respDuplas = await api.get<{ duplas: Dupla[] }>('/duplas');
      setDuplas(respDuplas.duplas);
    } catch {
      setDuplas([]);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function cancelar(id: number) {
    if (!confirm('Cancelar este plantão de sobreaviso?')) return;
    try {
      await api.delete(`/sobreaviso/${id}`);
      notificar('Sobreaviso cancelado.', 'sucesso');
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível cancelar.', 'erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Sobreaviso"
        actions={
          <>
            {podeExportar && <ExportButton tipo="sobreavisos" />}
            {podeCriar && (
              <button className="primary" onClick={() => setModalLancamentoAberto(true)}>
                <Plus size={18} />
                Novo sobreaviso
              </button>
            )}
          </>
        }
      />

      {status.length > 0 && (
        <section className="metrics">
          {status.map((s) => (
            <div className="card metric" key={s.regraId}>
              <div className="metric-icon purple">
                <Users size={21} />
              </div>
              <p>{s.regraNome}</p>
              <h2>{s.equipeAtualNome}</h2>
              <small>Próxima: {s.equipeProximaNome} · troca em {formatarDataHoraBR(s.fimTurnoAtual)}</small>
            </div>
          ))}
        </section>
      )}

      <div className="card card-padded">
        <div className="table-toolbar">
          <p>Plantões lançados (manuais ou por equipe)</p>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alvo</th>
                <th>Dupla</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Status</th>
                {podeExcluir && <th className="col-acoes">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {sobreavisos.map((s) => (
                <tr key={s.id}>
                  <td>{s.colaboradorNome ?? s.equipeNome}</td>
                  <td>{s.duplaNome ?? '—'}</td>
                  <td>{formatarDataHoraBR(s.inicio)}</td>
                  <td>{formatarDataHoraBR(s.fim)}</td>
                  <td>{STATUS_SOBREAVISO_LABEL[s.status]}</td>
                  {podeExcluir && (
                    <td className="col-acoes">
                      <button onClick={() => void cancelar(s.id)} title="Cancelar">
                        <X size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {sobreavisos.length === 0 && (
                <tr>
                  <td colSpan={6} className="data-table-empty">
                    Nenhum sobreaviso lançado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-padded mt-10">
        <div className="table-toolbar">
          <p>Regras de rodízio automático</p>
          {podeCriar && (
            <div className="table-toolbar-actions">
              <button
                className="outline"
                onClick={() => {
                  setRegraEmEdicao(null);
                  setModalRegraAberto(true);
                }}
              >
                <Settings size={16} />
                Nova regra
              </button>
            </div>
          )}
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Periodicidade</th>
                <th>Troca</th>
                <th>Equipes (ordem)</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {regras.map((regra) => (
                <tr
                  key={regra.id}
                  onClick={() => {
                    if (!podeCriar) return;
                    setRegraEmEdicao(regra);
                    setModalRegraAberto(true);
                  }}
                >
                  <td>{regra.nome}</td>
                  <td>{regra.periodicidadeDias} dia(s)</td>
                  <td>{regra.horaTroca}</td>
                  <td>{regra.equipes.map((e) => e.equipeNome).join(' → ')}</td>
                  <td>
                    <span className={`badge badge-${regra.ativo ? 'ativo' : 'inativo'}`}>{regra.ativo ? 'Ativa' : 'Inativa'}</span>
                  </td>
                </tr>
              ))}
              {regras.length === 0 && (
                <tr>
                  <td colSpan={5} className="data-table-empty">
                    Nenhuma regra de rodízio configurada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalLancamentoAberto && (
        <SobreavisoFormModal
          colaboradores={referencias.colaboradores}
          equipes={referencias.equipes}
          duplas={duplas}
          localidades={referencias.localidades}
          aoFechar={() => setModalLancamentoAberto(false)}
          aoSalvar={() => {
            setModalLancamentoAberto(false);
            void carregar();
          }}
        />
      )}

      {modalRegraAberto && (
        <SobreavisoRegraFormModal
          regra={regraEmEdicao}
          equipes={referencias.equipes}
          aoFechar={() => setModalRegraAberto(false)}
          aoSalvar={() => {
            setModalRegraAberto(false);
            void carregar();
          }}
        />
      )}
    </>
  );
}
