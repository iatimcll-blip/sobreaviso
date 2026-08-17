import { PlayCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cicloAtual } from '@shared/calculo/ciclo';
import { STATUS_INCONSISTENCIA, STATUS_INCONSISTENCIA_LABEL, TIPOS_INCONSISTENCIA, TIPO_INCONSISTENCIA_LABEL } from '@shared/calculo/inconsistencias';
import type { InconsistenciaDetalhada } from '@shared/types/inconsistencia';
import { PageHeader } from '../../app/layout/PageHeader';
import { useToast } from '../../app/layout/ToastProvider';
import { ExportButton } from '../../components/ExportButton';
import { ApiError, api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { useReferencias } from '../../lib/useReferencias';
import { InconsistenciaReviewModal } from './InconsistenciaReviewModal';

const BADGE_SEVERIDADE: Record<string, string> = { alta: 'desligado', media: 'afastado', baixa: 'inativo' };
const BADGE_STATUS: Record<string, string> = {
  pendente: 'afastado',
  em_revisao: 'usuario',
  justificada: 'inativo',
  aprovada: 'ativo',
  corrigida: 'ativo',
  ignorada: 'inativo',
};

export function InconsistenciasPage() {
  const { usuario, permissoes } = useAuth();
  const { notificar } = useToast();
  const referencias = useReferencias();

  const [inconsistencias, setInconsistencias] = useState<InconsistenciaDetalhada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [emEdicao, setEmEdicao] = useState<InconsistenciaDetalhada | null>(null);

  const [ciclo, setCiclo] = useState(cicloAtual().rotulo);
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [ufSigla, setUfSigla] = useState('');

  const podeEditar = temPermissao(usuario, permissoes, 'inconsistencias', 'editar');
  const podeExportar = temPermissao(usuario, permissoes, 'inconsistencias', 'exportar');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (ciclo) params.set('ciclo', ciclo);
      if (status) params.set('status', status);
      if (tipo) params.set('tipo', tipo);
      if (equipeId) params.set('equipeId', equipeId);
      if (ufSigla) params.set('uf', ufSigla);
      const resposta = await api.get<{ inconsistencias: InconsistenciaDetalhada[] }>(`/inconsistencias?${params.toString()}`);
      setInconsistencias(resposta.inconsistencias);
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível carregar as inconsistências.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [ciclo, status, tipo, equipeId, ufSigla, notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function executarCalculo() {
    setExecutando(true);
    try {
      const resposta = await api.post<{ resultado: { colaboradoresProcessados: number; inconsistenciasDetectadas: number; inconsistenciasCorrigidas: number } }>(
        '/calculos/executar',
        { ciclo },
      );
      notificar(
        `Cálculo executado para ${resposta.resultado.colaboradoresProcessados} colaborador(es): ${resposta.resultado.inconsistenciasDetectadas} inconsistência(s) ativa(s), ${resposta.resultado.inconsistenciasCorrigidas} corrigida(s) automaticamente.`,
        'sucesso',
      );
      void carregar();
    } catch (erro) {
      notificar(erro instanceof ApiError ? erro.message : 'Não foi possível executar o cálculo.', 'erro');
    } finally {
      setExecutando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Inconsistências"
        actions={
          <>
            {podeExportar && <ExportButton tipo="inconsistencias" filtro={{ ciclo, equipeId: equipeId ? Number(equipeId) : undefined, ufSigla: ufSigla || undefined }} />}
            {podeEditar && (
              <button className="primary" onClick={() => void executarCalculo()} disabled={executando}>
                <PlayCircle size={18} />
                {executando ? 'Executando…' : `Executar cálculo do ciclo`}
              </button>
            )}
          </>
        }
      />

      <div className="card card-padded">
        <div className="table-toolbar">
          <input placeholder="Ciclo (aaaa-mm)" value={ciclo} onChange={(e) => setCiclo(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS_INCONSISTENCIA.map((s) => (
              <option key={s} value={s}>
                {STATUS_INCONSISTENCIA_LABEL[s]}
              </option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {TIPOS_INCONSISTENCIA.map((t) => (
              <option key={t} value={t}>
                {TIPO_INCONSISTENCIA_LABEL[t]}
              </option>
            ))}
          </select>
          <select value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
            <option value="">Todas as equipes</option>
            {referencias.equipes.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nome}
              </option>
            ))}
          </select>
          <select value={ufSigla} onChange={(e) => setUfSigla(e.target.value)}>
            <option value="">Todas as UFs</option>
            {referencias.uf.map((item) => (
              <option key={item.sigla} value={item.sigla}>
                {item.sigla}
              </option>
            ))}
          </select>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Colaborador / Equipe</th>
                <th>Data</th>
                <th>Severidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inconsistencias.map((item) => (
                <tr key={item.id} onClick={() => setEmEdicao(item)}>
                  <td>{TIPO_INCONSISTENCIA_LABEL[item.tipo]}</td>
                  <td>{item.colaboradorNome ?? item.equipeNome ?? '—'}</td>
                  <td>{item.dataReferencia}</td>
                  <td>
                    <span className={`badge badge-${BADGE_SEVERIDADE[item.severidade]}`}>{item.severidade}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${BADGE_STATUS[item.status]}`}>{STATUS_INCONSISTENCIA_LABEL[item.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && inconsistencias.length === 0 && (
            <div className="data-table-empty">Nenhuma inconsistência encontrada para os filtros selecionados.</div>
          )}
        </div>
      </div>

      {emEdicao && podeEditar && (
        <InconsistenciaReviewModal
          inconsistencia={emEdicao}
          aoFechar={() => setEmEdicao(null)}
          aoSalvar={() => {
            setEmEdicao(null);
            void carregar();
          }}
        />
      )}
    </>
  );
}
