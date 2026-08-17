import type { ColaboradorParaAnalise } from './dados';
import type { InconsistenciaDetectada } from './tipos';

/** Colaborador sem equipe, localidade ou nenhum gestor (G.A/G.O) definido. */
export function detectarCadastroIncompleto(colaborador: ColaboradorParaAnalise, dataReferencia: string): InconsistenciaDetectada[] {
  const faltando: string[] = [];
  if (!colaborador.equipeId) faltando.push('equipe');
  if (!colaborador.localidadeId) faltando.push('localidade');
  if (!colaborador.gestorAdministrativoId && !colaborador.gestorOperacionalId) faltando.push('gestor (G.A/G.O)');
  if (faltando.length === 0) return [];

  return [
    {
      tipo: 'cadastro_incompleto',
      colaboradorId: colaborador.id,
      equipeId: colaborador.equipeId,
      localidadeId: colaborador.localidadeId,
      dataReferencia,
      severidade: 'baixa',
      descricao: `Cadastro incompleto: faltando ${faltando.join(', ')}.`,
    },
  ];
}

export interface DuplaParaAnalise {
  id: number;
  equipeId: number | null;
  ativo: boolean;
  colaborador1Id: number;
  colaborador2Id: number | null;
  colaborador1EquipeId: number | null;
  colaborador2EquipeId: number | null;
}

/** Dupla sem o segundo colaborador definido, ou com os dois colaboradores em equipes diferentes. */
export function detectarDuplaIncompleta(dupla: DuplaParaAnalise, dataReferencia: string): InconsistenciaDetectada[] {
  if (!dupla.ativo) return [];

  const base = {
    tipo: 'dupla_incompleta' as const,
    colaboradorId: dupla.colaborador1Id,
    equipeId: dupla.equipeId,
    localidadeId: null,
    dataReferencia,
    severidade: 'baixa' as const,
    entidadeRelacionadaTipo: 'dupla',
    entidadeRelacionadaId: dupla.id,
  };

  if (dupla.colaborador2Id === null) {
    return [{ ...base, descricao: 'Dupla sem o segundo colaborador definido.' }];
  }
  if (dupla.colaborador1EquipeId !== null && dupla.colaborador2EquipeId !== null && dupla.colaborador1EquipeId !== dupla.colaborador2EquipeId) {
    return [{ ...base, descricao: 'Os dois colaboradores da dupla pertencem a equipes diferentes.' }];
  }
  return [];
}
