import { calcularHorasCiclo, type ResultadoHorasCiclo } from '../../../shared/calculo/bancoDeHoras';
import { cicloPorRotulo } from '../../../shared/calculo/ciclo';
import {
  detectarDuplaIncompleta,
  executarRegrasColaborador,
  STATUS_REVISADOS,
  type DadosAnaliseColaborador,
  type InconsistenciaDetectada,
} from '../../../shared/calculo/inconsistencias';
import { resolverTurnosDoPeriodo } from '../../../shared/calculo/jornada';
import { listarAfastamentos } from '../../db/queries/afastamentos';
import { buscarColaboradorPorId, listarColaboradores } from '../../db/queries/colaboradores';
import { buscarConfiguracoesClt } from '../../db/queries/configuracoesClt';
import { listarDuplas } from '../../db/queries/duplas';
import { listarAtribuicoesDoColaborador } from '../../db/queries/escalas';
import { listarFeriadosParaColaborador } from '../../db/queries/feriados';
import {
  atualizarDescricaoSeveridade,
  buscarPorChaveNatural,
  criarInconsistencia,
  listarAtivasDoColaboradorNoCiclo,
  listarInconsistencias,
  marcarComoCorrigida,
  type InconsistenciaDetalhada,
} from '../../db/queries/inconsistencias';
import { listarSobreavisos } from '../../db/queries/sobreaviso';

export interface ResultadoExecucaoColaborador {
  colaboradorId: number;
  inconsistenciasDetectadas: number;
  inconsistenciasCorrigidas: number;
  horas: ResultadoHorasCiclo;
}

/**
 * Concilia o que foi (re)detectado agora contra o que já estava ativo (pendente/em_revisao) para o
 * mesmo escopo: cria o que é novo, atualiza descrição/severidade do que já existia (sem tocar em
 * inconsistências já revisadas por alguém) e marca como "corrigida" o que não foi mais redetectado.
 */
async function conciliarDeteccoes(
  db: D1Database,
  cicloRotulo: string,
  existentesAtivas: InconsistenciaDetalhada[],
  detectadas: InconsistenciaDetectada[],
): Promise<number> {
  const chave = (tipo: string, dataReferencia: string) => `${tipo}|${dataReferencia}`;
  const chavesRedetectadas = new Set(detectadas.map((d) => chave(d.tipo, d.dataReferencia)));

  let corrigidas = 0;
  for (const existente of existentesAtivas) {
    if (!chavesRedetectadas.has(chave(existente.tipo, existente.dataReferencia))) {
      await marcarComoCorrigida(db, existente.id);
      corrigidas += 1;
    }
  }

  for (const dado of detectadas) {
    const existente = await buscarPorChaveNatural(db, dado.tipo, dado.colaboradorId, dado.equipeId, dado.dataReferencia);
    if (existente) {
      if (!STATUS_REVISADOS.includes(existente.status)) {
        await atualizarDescricaoSeveridade(db, existente.id, dado.descricao, dado.severidade);
      }
    } else {
      await criarInconsistencia(db, dado, cicloRotulo);
    }
  }

  return corrigidas;
}

export interface CalculoColaborador {
  detectadas: InconsistenciaDetectada[];
  horas: ResultadoHorasCiclo;
}

/** Só leitura: carrega os dados do colaborador no ciclo e roda o motor de cálculo puro — não grava nada. */
export async function calcularColaborador(db: D1Database, colaboradorId: number, cicloRotulo: string): Promise<CalculoColaborador> {
  const ciclo = cicloPorRotulo(cicloRotulo);
  const colaborador = await buscarColaboradorPorId(db, colaboradorId);
  if (!colaborador) throw new Error('Colaborador não encontrado.');

  const [atribuicoes, afastamentosDb, sobreavisosDb, feriadosDb, config] = await Promise.all([
    listarAtribuicoesDoColaborador(db, colaboradorId, colaborador.equipeId, colaborador.localidadeId),
    listarAfastamentos(db, { colaboradorId, de: ciclo.inicio, ate: ciclo.fim }),
    listarSobreavisos(db, { colaboradorId, de: ciclo.inicio, ate: ciclo.fim }),
    listarFeriadosParaColaborador(db, colaborador.ufSigla, colaborador.localidadeId, ciclo.inicio, ciclo.fim),
    buscarConfiguracoesClt(db),
  ]);

  const turnos = resolverTurnosDoPeriodo(atribuicoes, ciclo.inicio, ciclo.fim);

  const dadosAnalise: DadosAnaliseColaborador = {
    colaborador: {
      id: colaborador.id,
      equipeId: colaborador.equipeId,
      localidadeId: colaborador.localidadeId,
      ufSigla: colaborador.ufSigla,
      gestorAdministrativoId: colaborador.gestorAdministrativoId,
      gestorOperacionalId: colaborador.gestorOperacionalId,
    },
    turnos,
    afastamentos: afastamentosDb.filter((a) => a.status !== 'rejeitado').map((a) => ({ tipo: a.tipo, dataInicio: a.dataInicio, dataFim: a.dataFim })),
    sobreavisos: sobreavisosDb.map((s) => ({ inicio: s.inicio, fim: s.fim })),
    feriados: feriadosDb.map((f) => ({ data: f.data, tipo: f.tipo })),
  };

  return { detectadas: executarRegrasColaborador(dadosAnalise, config, ciclo.inicio), horas: calcularHorasCiclo(turnos) };
}

/** Calcula e grava: persiste as inconsistências detectadas (upsert por chave natural + auto-correção). */
export async function executarCalculoColaborador(db: D1Database, colaboradorId: number, cicloRotulo: string): Promise<ResultadoExecucaoColaborador> {
  const { detectadas, horas } = await calcularColaborador(db, colaboradorId, cicloRotulo);
  const existentesAtivas = await listarAtivasDoColaboradorNoCiclo(db, colaboradorId, cicloRotulo);
  const corrigidas = await conciliarDeteccoes(db, cicloRotulo, existentesAtivas, detectadas);

  return { colaboradorId, inconsistenciasDetectadas: detectadas.length, inconsistenciasCorrigidas: corrigidas, horas };
}

export async function executarCalculoDuplas(db: D1Database, cicloRotulo: string): Promise<{ detectadas: number; corrigidas: number }> {
  const ciclo = cicloPorRotulo(cicloRotulo);
  const [duplas, colaboradores] = await Promise.all([listarDuplas(db), listarColaboradores(db)]);
  const colaboradoresPorId = new Map(colaboradores.map((c) => [c.id, c]));

  const detectadas: InconsistenciaDetectada[] = [];
  for (const dupla of duplas) {
    detectadas.push(
      ...detectarDuplaIncompleta(
        {
          id: dupla.id,
          equipeId: dupla.equipeId,
          ativo: dupla.ativo,
          colaborador1Id: dupla.colaborador1Id,
          colaborador2Id: dupla.colaborador2Id,
          colaborador1EquipeId: colaboradoresPorId.get(dupla.colaborador1Id)?.equipeId ?? null,
          colaborador2EquipeId: dupla.colaborador2Id ? (colaboradoresPorId.get(dupla.colaborador2Id)?.equipeId ?? null) : null,
        },
        ciclo.inicio,
      ),
    );
  }

  const todasDoTipo = await listarInconsistencias(db, { cicloReferencia: cicloRotulo, tipo: 'dupla_incompleta' });
  const existentesAtivas = todasDoTipo.filter((i) => i.status === 'pendente' || i.status === 'em_revisao');
  const corrigidas = await conciliarDeteccoes(db, cicloRotulo, existentesAtivas, detectadas);

  return { detectadas: detectadas.length, corrigidas };
}

export interface ResultadoExecucaoCiclo {
  cicloRotulo: string;
  colaboradoresProcessados: number;
  inconsistenciasDetectadas: number;
  inconsistenciasCorrigidas: number;
}

export async function executarCalculoCicloCompleto(db: D1Database, cicloRotulo: string): Promise<ResultadoExecucaoCiclo> {
  const colaboradores = await listarColaboradores(db, { situacaoCadastral: 'ativo' });

  let inconsistenciasDetectadas = 0;
  let inconsistenciasCorrigidas = 0;

  for (const colaborador of colaboradores) {
    const resultado = await executarCalculoColaborador(db, colaborador.id, cicloRotulo);
    inconsistenciasDetectadas += resultado.inconsistenciasDetectadas;
    inconsistenciasCorrigidas += resultado.inconsistenciasCorrigidas;
  }

  const duplasResultado = await executarCalculoDuplas(db, cicloRotulo);
  inconsistenciasDetectadas += duplasResultado.detectadas;
  inconsistenciasCorrigidas += duplasResultado.corrigidas;

  return { cicloRotulo, colaboradoresProcessados: colaboradores.length, inconsistenciasDetectadas, inconsistenciasCorrigidas };
}

export interface ResumoDiaCiclo {
  data: string;
  previstas: number;
  trabalhadas: number;
}

/** Soma, por dia, as horas previstas/trabalhadas de todos os colaboradores ativos no ciclo — usado no gráfico do dashboard. */
export async function calcularResumoCiclo(db: D1Database, cicloRotulo: string): Promise<ResumoDiaCiclo[]> {
  const colaboradores = await listarColaboradores(db, { situacaoCadastral: 'ativo' });
  const totaisPorDia = new Map<string, { previstas: number; trabalhadas: number }>();

  for (const colaborador of colaboradores) {
    const { horas } = await calcularColaborador(db, colaborador.id, cicloRotulo);
    for (const dia of horas.dias) {
      const atual = totaisPorDia.get(dia.data) ?? { previstas: 0, trabalhadas: 0 };
      atual.previstas += dia.horasPrevistas;
      atual.trabalhadas += dia.horasTrabalhadas;
      totaisPorDia.set(dia.data, atual);
    }
  }

  return [...totaisPorDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([data, valores]) => ({ data, ...valores }));
}
