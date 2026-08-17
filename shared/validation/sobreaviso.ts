import { z } from 'zod';

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const sobreavisoEntradaSchema = z
  .object({
    colaboradorId: z.number().int().positive().nullish(),
    equipeId: z.number().int().positive().nullish(),
    duplaId: z.number().int().positive().nullish(),
    localidadeId: z.number().int().positive().nullish(),
    inicio: z.string().min(1, 'Informe o início.'),
    fim: z.string().min(1, 'Informe o fim.'),
    observacoes: z.string().trim().max(500).nullish(),
    forcar: z.boolean().optional(),
  })
  .refine((dado) => Boolean(dado.colaboradorId) || Boolean(dado.equipeId), {
    message: 'Selecione um colaborador ou uma equipe.',
    path: ['colaboradorId'],
  })
  .refine((dado) => dado.fim > dado.inicio, { message: 'O fim deve ser depois do início.', path: ['fim'] });

export const sobreavisoRegraEntradaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da regra.').max(150),
  periodicidadeDias: z.number().int().min(1).max(365),
  horaTroca: z.string().regex(HORA_REGEX, 'Horário inválido.'),
  dataInicio: z.string().regex(DATA_REGEX, 'Data inválida.'),
  ativo: z.boolean().default(true),
  observacoes: z.string().trim().max(500).nullish(),
  equipeIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos uma equipe.'),
  localidadeIds: z.array(z.number().int().positive()).optional().default([]),
});
