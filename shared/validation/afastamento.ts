import { z } from 'zod';
import { TIPOS_AFASTAMENTO } from '../types/afastamento';

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const afastamentoEntradaSchema = z
  .object({
    colaboradorId: z.number().int().positive(),
    tipo: z.enum(TIPOS_AFASTAMENTO),
    dataInicio: z.string().regex(DATA_REGEX, 'Data inválida.'),
    dataFim: z.string().regex(DATA_REGEX, 'Data inválida.'),
    justificativa: z.string().trim().max(1000).nullish(),
    observacao: z.string().trim().max(1000).nullish(),
    forcar: z.boolean().optional(),
  })
  .refine((dado) => dado.dataFim >= dado.dataInicio, { message: 'A data final deve ser igual ou posterior à inicial.', path: ['dataFim'] });

export const afastamentoStatusSchema = z.object({
  status: z.enum(['pendente', 'aprovado', 'rejeitado']),
});
