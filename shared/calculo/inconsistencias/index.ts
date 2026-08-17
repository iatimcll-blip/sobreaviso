import type { ConfiguracoesClt } from '../../constants/clt';
import { detectarEscalaDuranteAfastamento, detectarEscalaEmFeriadoSemConfiguracao } from './afastamentosFeriados';
import { detectarCadastroIncompleto } from './cadastro';
import type { DadosAnaliseColaborador } from './dados';
import { detectarDescansoSemanalInsuficiente, detectarInterjornadaInsuficiente, detectarIntrajornadaInsuficiente, detectarJornadaAcimaPermitido } from './jornada';
import { detectarSobreposicaoEscala, detectarSobreposicaoSobreaviso } from './sobreposicoes';
import type { InconsistenciaDetectada } from './tipos';

export * from './afastamentosFeriados';
export * from './cadastro';
export * from './dados';
export * from './jornada';
export * from './sobreposicoes';
export * from './tipos';

/**
 * Executa todas as regras de inconsistência aplicáveis a um colaborador em um ciclo (exceto
 * "dupla incompleta", que não é escopada por colaborador — ver detectarDuplaIncompleta em cadastro.ts).
 */
export function executarRegrasColaborador(
  dados: DadosAnaliseColaborador,
  config: ConfiguracoesClt,
  dataReferenciaCadastro: string,
): InconsistenciaDetectada[] {
  return [
    ...detectarInterjornadaInsuficiente(dados, config),
    ...detectarIntrajornadaInsuficiente(dados, config),
    ...detectarJornadaAcimaPermitido(dados, config),
    ...detectarDescansoSemanalInsuficiente(dados, config),
    ...detectarSobreposicaoEscala(dados),
    ...detectarSobreposicaoSobreaviso(dados),
    ...detectarEscalaDuranteAfastamento(dados),
    ...detectarEscalaEmFeriadoSemConfiguracao(dados),
    ...detectarCadastroIncompleto(dados.colaborador, dataReferenciaCadastro),
  ];
}
