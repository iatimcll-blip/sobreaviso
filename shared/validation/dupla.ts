import { z } from 'zod';

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const duplaEntradaSchema = z
  .object({
    equipeId: z.number().int().positive().nullish(),
    nome: z.string().trim().max(150).nullish(),
    colaborador1Id: z.number().int().positive(),
    colaborador2Id: z.number().int().positive().nullish(),
    ativo: z.boolean().default(true),
    dataInicio: z.string().regex(DATA_REGEX, 'Data inválida.'),
    dataFim: z.string().regex(DATA_REGEX).nullish(),
  })
  .refine((dado) => !dado.colaborador2Id || dado.colaborador2Id !== dado.colaborador1Id, {
    message: 'Selecione dois colaboradores diferentes.',
    path: ['colaborador2Id'],
  });
