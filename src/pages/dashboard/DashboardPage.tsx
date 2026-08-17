import { AlertTriangle, BellRing, Clock3, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TIPO_INCONSISTENCIA_LABEL } from '@shared/calculo/inconsistencias';
import { formatarDataBR, formatarDataHoraBR } from '@shared/format';
import type { AfastamentoDetalhado } from '@shared/types/afastamento';
import { TIPO_AFASTAMENTO_LABEL } from '@shared/types/afastamento';
import type { ColaboradorDetalhado } from '@shared/types/colaborador';
import type { FeriadoDetalhado } from '@shared/types/feriado';
import type { InconsistenciaDetalhada } from '@shared/types/inconsistencia';
import type { SobreavisoDetalhado, StatusRodizio } from '@shared/types/sobreaviso';
import { cicloAtual } from '@shared/calculo/ciclo';
import { PageHeader } from '../../app/layout/PageHeader';
import { PeriodBar } from '../../app/layout/PeriodBar';
import { api } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { temPermissao } from '../../lib/permissions';
import { Metric } from '../../components/Metric';
import { ExportButton } from '../../components/ExportButton';

const HOJE_ISO = new Date().toISOString().slice(0, 10);

interface ResumoDiaCiclo {
  data: string;
  previstas: number;
  trabalhadas: number;
}

function agruparPorSemana(dias: ResumoDiaCiclo[]): { rotulo: string; previstas: number; trabalhadas: number }[] {
  const grupos: { rotulo: string; previstas: number; trabalhadas: number }[] = [];
  for (let i = 0; i < dias.length; i += 7) {
    const bloco = dias.slice(i, i + 7);
    grupos.push({
      rotulo: `${bloco[0].data.slice(8, 10)}–${bloco[bloco.length - 1].data.slice(8, 10)}`,
      previstas: bloco.reduce((soma, d) => soma + d.previstas, 0),
      trabalhadas: bloco.reduce((soma, d) => soma + d.trabalhadas, 0),
    });
  }
  return grupos;
}

export function DashboardPage() {
  const { usuario, permissoes } = useAuth();
  const podeExportar = temPermissao(usuario, permissoes, 'dashboard', 'exportar');

  const [colaboradores, setColaboradores] = useState<ColaboradorDetalhado[]>([]);
  const [status, setStatus] = useState<StatusRodizio[]>([]);
  const [sobreavisos, setSobreavisos] = useState<SobreavisoDetalhado[]>([]);
  const [feriados, setFeriados] = useState<FeriadoDetalhado[]>([]);
  const [afastamentos, setAfastamentos] = useState<AfastamentoDetalhado[]>([]);
  const [inconsistenciasPendentes, setInconsistenciasPendentes] = useState<InconsistenciaDetalhada[]>([]);
  const [totalPendentes, setTotalPendentes] = useState<number | null>(null);
  const [resumoCiclo, setResumoCiclo] = useState<ResumoDiaCiclo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ colaboradores: ColaboradorDetalhado[] }>('/colaboradores'),
      api.get<{ status: StatusRodizio[] }>('/sobreaviso/status-rodizio').catch(() => ({ status: [] })),
      api.get<{ sobreavisos: SobreavisoDetalhado[] }>('/sobreaviso').catch(() => ({ sobreavisos: [] })),
      api.get<{ feriados: FeriadoDetalhado[] }>(`/feriados?ano=${new Date().getFullYear()}&abrangencia=nacional`).catch(() => ({ feriados: [] })),
      api.get<{ afastamentos: AfastamentoDetalhado[] }>('/afastamentos').catch(() => ({ afastamentos: [] })),
      api.get<{ inconsistencias: InconsistenciaDetalhada[] }>('/inconsistencias?status=pendente').catch(() => ({ inconsistencias: [] })),
      api.get<{ total: number }>('/inconsistencias/pendentes/total').catch(() => ({ total: null })),
      api.get<{ dias: ResumoDiaCiclo[] }>('/calculos/resumo-ciclo').catch(() => ({ dias: [] })),
    ])
      .then(([respColaboradores, respStatus, respSobreavisos, respFeriados, respAfastamentos, respInconsistencias, respTotal, respResumo]) => {
        setColaboradores(respColaboradores.colaboradores);
        setStatus(respStatus.status);
        setSobreavisos(respSobreavisos.sobreavisos);
        setFeriados(respFeriados.feriados);
        setAfastamentos(respAfastamentos.afastamentos);
        setInconsistenciasPendentes(respInconsistencias.inconsistencias.slice(0, 3));
        setTotalPendentes(respTotal.total);
        setResumoCiclo(respResumo.dias);
      })
      .finally(() => setCarregando(false));
  }, []);

  const proximosFeriados = feriados.filter((f) => f.data >= HOJE_ISO).slice(0, 3);
  const proximosAfastamentos = afastamentos
    .filter((a) => a.status !== 'rejeitado' && a.dataFim >= HOJE_ISO)
    .slice(0, 3);

  const ativos = colaboradores.filter((c) => c.situacaoCadastral === 'ativo').length;
  const afastados = colaboradores.filter((c) => c.situacaoCadastral === 'afastado').length;

  const agora = new Date();
  const manuaisAtivos = sobreavisos.filter((s) => new Date(s.inicio) <= agora && agora <= new Date(s.fim));
  const emSobreaviso = manuaisAtivos.length + status.length;

  const semanasCiclo = agruparPorSemana(resumoCiclo);
  const maiorValorSemana = Math.max(1, ...semanasCiclo.flatMap((s) => [s.previstas, s.trabalhadas]));

  return (
    <>
      <PageHeader
        title="Operação sob controle"
        actions={podeExportar && <ExportButton tipo="relatorio-consolidado" filtro={{ ciclo: cicloAtual().rotulo }} label="Exportar relatório do ciclo" />}
      />
      <PeriodBar />

      <section className="metrics">
        <Metric title="Colaboradores ativos" value={carregando ? '—' : String(ativos)} hint="Cadastro atual" icon={Users} color="blue" />
        <Metric title="Colaboradores afastados" value={carregando ? '—' : String(afastados)} hint="Cadastro atual" icon={AlertTriangle} color="orange" />
        <Metric
          title="Em sobreaviso"
          value={carregando ? '—' : String(emSobreaviso)}
          hint="Equipes em rodízio + lançamentos manuais ativos"
          icon={BellRing}
          color="purple"
        />
        <Metric
          title="Inconsistências pendentes"
          value={totalPendentes === null ? '—' : String(totalPendentes)}
          hint="Ciclo atual e ciclos anteriores"
          icon={Clock3}
          color="green"
        />
      </section>

      <section className="content-grid">
        <div className="card schedule">
          <div className="card-head">
            <div>
              <h2>Colaboradores cadastrados</h2>
              <p>{carregando ? 'Carregando…' : `${colaboradores.length} colaborador(es) no cadastro`}</p>
            </div>
            <Link className="link" to="/colaboradores">
              Ver cadastro completo
            </Link>
          </div>
          <div className="table-head">
            <span>COLABORADOR</span>
            <span>EQUIPE</span>
            <span>SITUAÇÃO</span>
          </div>
          {colaboradores.slice(0, 6).map((colaborador) => (
            <div className="person" key={colaborador.id}>
              <span className="avatar">
                {colaborador.nome
                  .split(' ')
                  .filter(Boolean)
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="identity">
                <b>{colaborador.nome}</b>
                <small>
                  {colaborador.funcao} · {colaborador.localidadeNome}, {colaborador.ufSigla}
                </small>
              </div>
              <span className="pill">{colaborador.equipeNome ?? 'Sem equipe'}</span>
              <div>
                <b>{colaborador.situacaoCadastral}</b>
              </div>
            </div>
          ))}
          {!carregando && colaboradores.length === 0 && (
            <p>
              Nenhum colaborador cadastrado ainda. <Link to="/colaboradores">Cadastre o primeiro colaborador</Link> ou importe uma
              planilha.
            </p>
          )}
        </div>

        <div className="right-col">
          <div className="card">
            <div className="card-head">
              <div>
                <h2>Sobreaviso</h2>
                <p>Plantão vigente</p>
              </div>
            </div>
            {status.length === 0 && (
              <p>
                <small>Nenhuma regra de rodízio automático configurada ainda.</small>
              </p>
            )}
            {status.map((s) => (
              <div className="standby" key={s.regraId}>
                <div className="status-dot" />
                <div>
                  <b>{s.equipeAtualNome} está de plantão</b>
                  <p>
                    {s.regraNome} · próxima: {s.equipeProximaNome} em {formatarDataHoraBR(s.fimTurnoAtual)}
                  </p>
                </div>
              </div>
            ))}
            <Link className="outline" to="/sobreaviso">
              Gerenciar sobreaviso
            </Link>
          </div>
          <div className="card holidays">
            <div className="card-head">
              <div>
                <h2>Próximos eventos</h2>
                <p>Feriados e afastamentos</p>
              </div>
              <Link className="link" to="/configuracoes/feriados">
                Calendário
              </Link>
            </div>
            {proximosFeriados.map((feriado) => {
              const [, mes, dia] = feriado.data.split('-');
              return (
                <div className="event" key={feriado.id}>
                  <div>
                    <b>{dia}</b>
                    <span>{['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][Number(mes) - 1]}</span>
                  </div>
                  <p>
                    <b>{feriado.nome}</b>
                    <small>Feriado nacional</small>
                  </p>
                </div>
              );
            })}
            {proximosAfastamentos.map((afastamento) => {
              const [, mes, dia] = afastamento.dataInicio.split('-');
              return (
                <div className="event" key={`af-${afastamento.id}`}>
                  <div className="purple-bg">
                    <b>{dia}</b>
                    <span>{['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][Number(mes) - 1]}</span>
                  </div>
                  <p>
                    <b>
                      {TIPO_AFASTAMENTO_LABEL[afastamento.tipo]} — {afastamento.colaboradorNome}
                    </b>
                    <small>
                      {formatarDataBR(afastamento.dataInicio)} a {formatarDataBR(afastamento.dataFim)}
                    </small>
                  </p>
                </div>
              );
            })}
            {proximosFeriados.length === 0 && proximosAfastamentos.length === 0 && (
              <p>
                <small>Nenhum feriado ou afastamento próximo cadastrado.</small>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bottom-cards mt-10">
        <div className="card chart">
          <div>
            <h2>Horas planejadas × realizadas</h2>
            <p>Ciclo atual · somado por semana, em horas</p>
          </div>
          {semanasCiclo.length > 0 ? (
            <>
              <div className="bars">
                {semanasCiclo.flatMap((semana) => [
                  <span key={`${semana.rotulo}-p`} title={`Previstas ${semana.rotulo}: ${semana.previstas.toFixed(0)}h`} style={{ height: `${(semana.previstas / maiorValorSemana) * 100}%` }} />,
                  <span key={`${semana.rotulo}-r`} title={`Trabalhadas ${semana.rotulo}: ${semana.trabalhadas.toFixed(0)}h`} style={{ height: `${(semana.trabalhadas / maiorValorSemana) * 100}%` }} />,
                ])}
              </div>
              <div className="legend">
                <i />
                Planejadas <i className="actual" />
                Realizadas
              </div>
            </>
          ) : (
            <p>
              <small>Sem escalas vinculadas neste ciclo ainda.</small>
            </p>
          )}
        </div>

        <div className="card issues">
          <div className="card-head">
            <div>
              <h2>Inconsistências recentes</h2>
              <p>Revisão necessária</p>
            </div>
            <Link className="link" to="/inconsistencias">
              Ver todas
            </Link>
          </div>
          {inconsistenciasPendentes.map((item) => (
            <div className="issue" key={item.id}>
              <span className="issue-icon">!</span>
              <p>
                <b>{TIPO_INCONSISTENCIA_LABEL[item.tipo]}</b>
                <small>
                  {item.colaboradorNome ?? item.equipeNome ?? '—'} · {formatarDataBR(item.dataReferencia)}
                </small>
              </p>
              <Link to="/inconsistencias">Revisar</Link>
            </div>
          ))}
          {!carregando && inconsistenciasPendentes.length === 0 && (
            <p>
              <small>Nenhuma inconsistência pendente no momento.</small>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
