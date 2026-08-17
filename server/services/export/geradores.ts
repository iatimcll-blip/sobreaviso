import { cicloAtual, cicloPorRotulo, formatarPeriodoCiclo } from '../../../shared/calculo/ciclo';
import { TIPO_INCONSISTENCIA_LABEL } from '../../../shared/calculo/inconsistencias';
import { formatarDataBR, formatarDataHoraBR, formatarHoras } from '../../../shared/format';
import { SITUACAO_CADASTRAL_LABEL, type ColaboradorDetalhado } from '../../../shared/types/colaborador';
import { TIPO_AFASTAMENTO_LABEL } from '../../../shared/types/afastamento';
import type { FiltroRelatorio } from '../../../shared/types/exportacao';
import { listarAfastamentos } from '../../db/queries/afastamentos';
import { listarColaboradores } from '../../db/queries/colaboradores';
import { listarTodosVinculosComEscala } from '../../db/queries/escalas';
import { listarInconsistencias } from '../../db/queries/inconsistencias';
import { listarSobreavisos } from '../../db/queries/sobreaviso';
import { calcularColaborador } from '../calculo/executarCalculoCiclo';
import { gerarPlanilha, type PlanilhaDefinida } from './xlsxExportService';

function filtrarColaboradores(colaboradores: ColaboradorDetalhado[], filtro: FiltroRelatorio): ColaboradorDetalhado[] {
  return colaboradores.filter((c) => {
    if (filtro.colaboradorId && c.id !== filtro.colaboradorId) return false;
    if (filtro.equipeId && c.equipeId !== filtro.equipeId) return false;
    if (filtro.ufSigla && c.ufSigla !== filtro.ufSigla) return false;
    if (filtro.localidadeId && c.localidadeId !== filtro.localidadeId) return false;
    return true;
  });
}

function cicloDoFiltro(filtro: FiltroRelatorio) {
  return filtro.ciclo ? cicloPorRotulo(filtro.ciclo) : cicloAtual();
}

export interface ArquivoGerado {
  nomeArquivo: string;
  bytes: ArrayBuffer;
}

export async function gerarExportacaoColaboradores(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const todos = await listarColaboradores(db, { equipeId: filtro.equipeId, ufSigla: filtro.ufSigla, localidadeId: filtro.localidadeId });
  const colaboradores = filtrarColaboradores(todos, filtro);

  const linhas = colaboradores.map((c) => ({
    Nome: c.nome,
    Matrícula: c.matricula ?? '',
    Função: c.funcao,
    Equipe: c.equipeNome ?? '',
    UF: c.ufSigla,
    Localidade: c.localidadeNome,
    'Gestor Administrativo (G.A)': c.gestorAdministrativoNome ?? c.gaNomeImportado ?? '',
    'Gestor Operacional (G.O)': c.gestorOperacionalNome ?? c.goNomeImportado ?? '',
    'Situação cadastral': SITUACAO_CADASTRAL_LABEL[c.situacaoCadastral],
  }));

  return { nomeArquivo: 'colaboradores.xlsx', bytes: gerarPlanilha([{ nomeAba: 'Colaboradores', linhas }]) };
}

export async function gerarExportacaoEscalas(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const vinculos = await listarTodosVinculosComEscala(db);
  const filtrados = vinculos.filter((v) => {
    if (filtro.colaboradorId && v.colaboradorId !== filtro.colaboradorId) return false;
    if (filtro.equipeId && v.equipeId !== filtro.equipeId) return false;
    if (filtro.localidadeId && v.localidadeId !== filtro.localidadeId) return false;
    return true;
  });

  const linhas = filtrados.map((v) => ({
    'Modelo de escala': v.escalaNome,
    Tipo: v.tipo,
    'Vínculo com': v.colaboradorNome ?? v.equipeNome ?? v.localidadeNome ?? '',
    'Tipo de vínculo': v.colaboradorId ? 'Colaborador' : v.equipeId ? 'Equipe' : 'Localidade',
    Início: formatarDataBR(v.dataInicio),
    Fim: v.dataFim ? formatarDataBR(v.dataFim) : 'Indeterminado',
  }));

  return { nomeArquivo: 'escalas.xlsx', bytes: gerarPlanilha([{ nomeAba: 'Escalas', linhas }]) };
}

export async function gerarExportacaoSobreavisos(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const ciclo = filtro.ciclo ? cicloDoFiltro(filtro) : undefined;
  const sobreavisos = await listarSobreavisos(db, {
    de: ciclo?.inicio,
    ate: ciclo?.fim,
    colaboradorId: filtro.colaboradorId,
    equipeId: filtro.equipeId,
  });

  const linhas = sobreavisos.map((s) => ({
    'Colaborador/Equipe': s.colaboradorNome ?? s.equipeNome ?? '',
    Dupla: s.duplaNome ?? '',
    Localidade: s.localidadeNome ?? '',
    Início: formatarDataHoraBR(s.inicio),
    Fim: formatarDataHoraBR(s.fim),
    Origem: s.origem === 'manual' ? 'Manual' : 'Rodízio automático',
    Status: s.status,
    Observações: s.observacoes ?? '',
  }));

  return { nomeArquivo: 'sobreavisos.xlsx', bytes: gerarPlanilha([{ nomeAba: 'Sobreavisos', linhas }]) };
}

export async function gerarExportacaoAfastamentos(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const ciclo = filtro.ciclo ? cicloDoFiltro(filtro) : undefined;
  const [afastamentos, colaboradores] = await Promise.all([
    listarAfastamentos(db, { de: ciclo?.inicio, ate: ciclo?.fim, colaboradorId: filtro.colaboradorId }),
    listarColaboradores(db),
  ]);
  const colaboradoresPorId = new Map(colaboradores.map((c) => [c.id, c]));

  const filtrados = afastamentos.filter((a) => {
    const colaborador = colaboradoresPorId.get(a.colaboradorId);
    if (filtro.equipeId && colaborador?.equipeId !== filtro.equipeId) return false;
    if (filtro.ufSigla && colaborador?.ufSigla !== filtro.ufSigla) return false;
    if (filtro.localidadeId && colaborador?.localidadeId !== filtro.localidadeId) return false;
    return true;
  });

  const linhas = filtrados.map((a) => ({
    Colaborador: a.colaboradorNome,
    Tipo: TIPO_AFASTAMENTO_LABEL[a.tipo],
    'Data inicial': formatarDataBR(a.dataInicio),
    'Data final': formatarDataBR(a.dataFim),
    Status: a.status,
    Justificativa: a.justificativa ?? '',
    Observação: a.observacao ?? '',
  }));

  return { nomeArquivo: 'afastamentos.xlsx', bytes: gerarPlanilha([{ nomeAba: 'Afastamentos', linhas }]) };
}

export async function gerarExportacaoInconsistencias(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const inconsistencias = await listarInconsistencias(db, {
    cicloReferencia: filtro.ciclo,
    colaboradorId: filtro.colaboradorId,
    equipeId: filtro.equipeId,
    ufSigla: filtro.ufSigla,
    localidadeId: filtro.localidadeId,
  });

  const linhas = inconsistencias.map((i) => ({
    Tipo: TIPO_INCONSISTENCIA_LABEL[i.tipo],
    'Colaborador/Equipe': i.colaboradorNome ?? i.equipeNome ?? '',
    Data: formatarDataBR(i.dataReferencia),
    Ciclo: i.cicloReferencia,
    Severidade: i.severidade,
    Status: i.status,
    Descrição: i.descricao,
    Justificativa: i.justificativa ?? '',
  }));

  return { nomeArquivo: 'inconsistencias.xlsx', bytes: gerarPlanilha([{ nomeAba: 'Inconsistências', linhas }]) };
}

export async function gerarExportacaoHorasTrabalhadas(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const ciclo = cicloDoFiltro(filtro);
  const colaboradores = filtrarColaboradores(await listarColaboradores(db, { situacaoCadastral: 'ativo' }), filtro);

  const linhas: Record<string, string | number>[] = [];
  for (const colaborador of colaboradores) {
    const { horas } = await calcularColaborador(db, colaborador.id, ciclo.rotulo);
    for (const dia of horas.dias) {
      if (dia.horasPrevistas === 0 && dia.horasTrabalhadas === 0) continue;
      linhas.push({
        Colaborador: colaborador.nome,
        Equipe: colaborador.equipeNome ?? '',
        Data: formatarDataBR(dia.data),
        'Horas previstas': formatarHoras(dia.horasPrevistas),
        'Horas trabalhadas': formatarHoras(dia.horasTrabalhadas),
        'Horas extras': formatarHoras(dia.horasExtras),
      });
    }
  }

  return { nomeArquivo: `horas-trabalhadas-${ciclo.rotulo}.xlsx`, bytes: gerarPlanilha([{ nomeAba: 'Horas trabalhadas', linhas }]) };
}

export async function gerarExportacaoBancoHoras(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const ciclo = cicloDoFiltro(filtro);
  const colaboradores = filtrarColaboradores(await listarColaboradores(db, { situacaoCadastral: 'ativo' }), filtro);

  const linhas: Record<string, string | number>[] = [];
  for (const colaborador of colaboradores) {
    const { horas } = await calcularColaborador(db, colaborador.id, ciclo.rotulo);
    linhas.push({
      Colaborador: colaborador.nome,
      Equipe: colaborador.equipeNome ?? '',
      Ciclo: ciclo.rotulo,
      'Horas previstas': formatarHoras(horas.totalPrevistas),
      'Horas trabalhadas': formatarHoras(horas.totalTrabalhadas),
      'Horas extras': formatarHoras(horas.totalExtras),
      'Saldo banco de horas': formatarHoras(horas.saldoBancoDeHoras),
    });
  }

  return { nomeArquivo: `banco-horas-${ciclo.rotulo}.xlsx`, bytes: gerarPlanilha([{ nomeAba: 'Banco de horas', linhas }]) };
}

export async function gerarExportacaoRelatorioConsolidado(db: D1Database, filtro: FiltroRelatorio): Promise<ArquivoGerado> {
  const ciclo = cicloDoFiltro(filtro);
  const colaboradores = filtrarColaboradores(await listarColaboradores(db, { situacaoCadastral: 'ativo' }), filtro);

  const resumoColaboradores: Record<string, string | number>[] = [];
  const bancoHoras: Record<string, string | number>[] = [];
  for (const colaborador of colaboradores) {
    resumoColaboradores.push({
      Nome: colaborador.nome,
      Função: colaborador.funcao,
      Equipe: colaborador.equipeNome ?? '',
      UF: colaborador.ufSigla,
      Localidade: colaborador.localidadeNome,
      Situação: SITUACAO_CADASTRAL_LABEL[colaborador.situacaoCadastral],
    });
    const { horas } = await calcularColaborador(db, colaborador.id, ciclo.rotulo);
    bancoHoras.push({
      Colaborador: colaborador.nome,
      'Horas previstas': formatarHoras(horas.totalPrevistas),
      'Horas trabalhadas': formatarHoras(horas.totalTrabalhadas),
      'Horas extras': formatarHoras(horas.totalExtras),
      'Saldo banco de horas': formatarHoras(horas.saldoBancoDeHoras),
    });
  }

  const inconsistencias = await listarInconsistencias(db, {
    cicloReferencia: ciclo.rotulo,
    equipeId: filtro.equipeId,
    ufSigla: filtro.ufSigla,
    localidadeId: filtro.localidadeId,
  });
  const inconsistenciasLinhas = inconsistencias.map((i) => ({
    Tipo: TIPO_INCONSISTENCIA_LABEL[i.tipo],
    'Colaborador/Equipe': i.colaboradorNome ?? i.equipeNome ?? '',
    Data: formatarDataBR(i.dataReferencia),
    Severidade: i.severidade,
    Status: i.status,
  }));

  const sobreavisos = await listarSobreavisos(db, { de: ciclo.inicio, ate: ciclo.fim, equipeId: filtro.equipeId });
  const sobreavisosLinhas = sobreavisos.map((s) => ({
    'Colaborador/Equipe': s.colaboradorNome ?? s.equipeNome ?? '',
    Início: formatarDataHoraBR(s.inicio),
    Fim: formatarDataHoraBR(s.fim),
    Origem: s.origem === 'manual' ? 'Manual' : 'Rodízio automático',
  }));

  const capa: Record<string, string | number>[] = [
    { Campo: 'Ciclo de apuração', Valor: formatarPeriodoCiclo(ciclo) },
    { Campo: 'Colaboradores no relatório', Valor: colaboradores.length },
    { Campo: 'Inconsistências no ciclo', Valor: inconsistencias.length },
    { Campo: 'Sobreavisos no ciclo', Valor: sobreavisos.length },
  ];

  const abas: PlanilhaDefinida[] = [
    { nomeAba: 'Resumo', linhas: capa },
    { nomeAba: 'Colaboradores', linhas: resumoColaboradores },
    { nomeAba: 'Banco de horas', linhas: bancoHoras },
    { nomeAba: 'Inconsistências', linhas: inconsistenciasLinhas },
    { nomeAba: 'Sobreavisos', linhas: sobreavisosLinhas },
  ];

  return { nomeArquivo: `relatorio-consolidado-${ciclo.rotulo}.xlsx`, bytes: gerarPlanilha(abas) };
}
