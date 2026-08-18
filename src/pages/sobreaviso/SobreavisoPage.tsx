import { Plus, Settings, Users, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cicloAtual } from '@shared/calculo/ciclo';
import type { Dupla } from '@shared/types/dupla';
import {
  ORIGEM_SOBREAVISO_LABEL,
  STATUS_SOBREAVISO_LABEL,
  type SobreavisoDetalhado,
  type SobreavisoRegra,
  type StatusRodizio,
} from '@shared/types/sobreaviso';
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

type AlvoGeracao = { tipo: 'regra'; regra: SobreavisoRegra } | { tipo: 'geral' };

interface TurnoGeradoView {
  regraNome?: string;
  equipeNome: string;
  inicio: string;
  fim: string;
}

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
  const [alvoGeracao, setAlvoGeracao] = useState<AlvoGeracao | null>(null);
  const [cicloGerar, setCicloGerar] = useState(cicloAtual().rotulo);
  const [gerando, setGerando] = useState(false);
  const [resultadoGeracao, setResultadoGeracao] = useState<TurnoGeradoView[] | null>(null);

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

  function abrirGeracao(regra: SobreavisoRegra, evento: React.MouseEvent) {
    evento.stopPropagation();
    setCicloGerar(cicloAtual().rotulo);
    setResultadoGeracao(null);
    setAlvoGeracao({ tipo: 'regra', regra });
  }

  function abrirGeracaoGeral() {
    setCicloGerar(cicloAtual().rotulo);
    setResultadoGeracao(null);
    setAlvoGeracao({ tipo: 'geral' });
  }

  function fecharModalGeracao() {
    setAlvoGeracao(null);
    setResultadoGeracao(null);
  }

  async function gerarAutomaticamente() {
    if (!alvoGeracao) return;
    setGerando(true);
    try {
      if (alvoGeracao.tipo === 'regra') {
        const resposta = await api.post<{ resultado: { criados: number; removidos: number; turnos: TurnoGeradoView[] } }>(
          `/sobreaviso/regras/${alvoGeracao.regra.id}/gerar`,
          { ciclo: cicloGerar },
        );
        notificar(
          `${resposta.resultado.criados} plantão(ões) gerado(s) para o ciclo ${cicloGerar}${resposta.resultado.removidos > 0 ? ` (substituindo ${resposta.resultado.removidos} anterior(es))` : ''}.`,
          'sucesso',
        );
        setResultadoGeracao(resposta.resultado.turnos);
      } else {
        const resposta = await api.post<{
          resultado: {
            regrasProcessadas: number;
            regrasComErro: number;
            totalCriados: number;
            totalRemovidos: number;
            detalhes: { regraNome: string; turnos: TurnoGeradoView[] }[];
          };
        }>('/sobreaviso/regras/gerar-todas', { ciclo: cicloGerar });
        const { regrasProcessadas, regrasComErro, totalCriados, totalRemovidos, detalhes } = resposta.resultado;
        notificar(
          `${totalCriados} plantão(ões) gerado(s) em ${regrasProcessadas} regra(s) para o ciclo ${cicloGerar}` +
            `${totalRemovidos > 0 ? ` (substituindo ${totalRemovidos} anterior(es))` : ''}` +
            `${regrasComErro > 0 ? ` — ${regrasComErro} regra(s) ignorada(s) por não ter equipes configuradas` : ''}.`,
          'sucesso',
        );
        setResultadoGeracao(detalhes.flatMap((d) => d.turnos.map((t) => ({ ...t, regraNome: d.regraNome }))));
      }
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível gerar o sobreaviso automaticamente.', 'erro');
    } finally {
      setGerando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sobreaviso"
        actions={
          <>
            {podeExportar && <ExportButton tipo="sobreavisos" />}
            {podeCriar && regras.some((r) => r.ativo && r.equipes.length > 0) && (
              <button className="outline" onClick={abrirGeracaoGeral}>
                <Zap size={18} />
                Gerar sobreaviso
              </button>
            )}
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
                <th>Origem</th>
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
                  <td>{ORIGEM_SOBREAVISO_LABEL[s.origem]}</td>
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
                  <td colSpan={7} className="data-table-empty">
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
                <th>Localidades</th>
                <th>Situação</th>
                {podeCriar && <th className="col-acoes">Ações</th>}
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
                  <td>{regra.localidades.length > 0 ? regra.localidades.map((l) => l.localidadeNome).join(', ') : '—'}</td>
                  <td>
                    <span className={`badge badge-${regra.ativo ? 'ativo' : 'inativo'}`}>{regra.ativo ? 'Ativa' : 'Inativa'}</span>
                  </td>
                  {podeCriar && (
                    <td className="col-acoes">
                      <button onClick={(e) => abrirGeracao(regra, e)} title="Gerar sobreaviso automaticamente" disabled={regra.equipes.length === 0}>
                        <Zap size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {regras.length === 0 && (
                <tr>
                  <td colSpan={7} className="data-table-empty">
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
          localidades={referencias.localidades}
          aoFechar={() => setModalRegraAberto(false)}
          aoSalvar={() => {
            setModalRegraAberto(false);
            void carregar();
          }}
        />
      )}

      {alvoGeracao && (
        <div className="overlay">
          <div className="modal">
            <button className="modal-x" onClick={fecharModalGeracao} aria-label="Fechar">
              <X />
            </button>
            <span className="modal-icon">
              <Zap />
            </span>
            <h2>Gerar sobreaviso automaticamente</h2>

            {resultadoGeracao ? (
              <>
                <p>
                  {resultadoGeracao.length} plantão(ões) lançado(s) para o ciclo {cicloGerar}:
                </p>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {alvoGeracao.tipo === 'geral' && <th>Regra</th>}
                        <th>Equipe</th>
                        <th>Início</th>
                        <th>Fim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoGeracao.map((t, indice) => (
                        <tr key={`${t.equipeNome}-${t.inicio}-${indice}`}>
                          {alvoGeracao.tipo === 'geral' && <td>{t.regraNome}</td>}
                          <td>{t.equipeNome}</td>
                          <td>{formatarDataHoraBR(t.inicio)}</td>
                          <td>{formatarDataHoraBR(t.fim)}</td>
                        </tr>
                      ))}
                      {resultadoGeracao.length === 0 && (
                        <tr>
                          <td colSpan={alvoGeracao.tipo === 'geral' ? 4 : 3} className="data-table-empty">
                            Nenhum turno cai dentro desse ciclo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="modal-actions">
                  <button className="outline" onClick={() => setResultadoGeracao(null)}>
                    Gerar outro ciclo
                  </button>
                  <button className="primary" onClick={fecharModalGeracao}>
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                {alvoGeracao.tipo === 'regra' ? (
                  <p>
                    Materializa o rodízio de "{alvoGeracao.regra.nome}" ({alvoGeracao.regra.equipes.map((e) => e.equipeNome).join(' → ')})
                    como lançamentos reais de sobreaviso no ciclo escolhido. Rodar de novo substitui só o que essa regra já havia gerado
                    automaticamente nesse ciclo — nunca mexe em sobreaviso lançado manualmente.
                  </p>
                ) : (
                  <p>
                    Materializa o rodízio de <b>todas as regras ativas</b> ({regras.filter((r) => r.ativo && r.equipes.length > 0).length})
                    como lançamentos reais de sobreaviso no ciclo escolhido. Rodar de novo substitui só o que cada regra já havia gerado
                    automaticamente nesse ciclo — nunca mexe em sobreaviso lançado manualmente.
                  </p>
                )}

                <label className="field">
                  Ciclo (aaaa-mm)
                  <input value={cicloGerar} onChange={(e) => setCicloGerar(e.target.value)} placeholder="2026-08" />
                </label>

                <div className="modal-actions">
                  <button className="outline" onClick={fecharModalGeracao}>
                    Cancelar
                  </button>
                  <button className="primary" onClick={() => void gerarAutomaticamente()} disabled={gerando}>
                    {gerando ? 'Gerando…' : 'Gerar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
