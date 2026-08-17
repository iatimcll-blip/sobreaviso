import { z } from 'zod';
import { PAPEIS_EQUIPE_MEMBRO } from '../types/equipe';

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const equipeEntradaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da equipe.').max(150),
  localidadeId: z.number().int().positive().nullish(),
  supervisorId: z.number().int().positive().nullish(),
  gestorAdministrativoId: z.number().int().positive().nullish(),
  gestorOperacionalId: z.number().int().positive().nullish(),
  ativo: z.boolean().default(true),
});

export const equipeMembroEntradaSchema = z.object({
  colaboradorId: z.number().int().positive(),
  papel: z.enum(PAPEIS_EQUIPE_MEMBRO),
  dataInicio: z.string().regex(DATA_REGEX, 'Data inválida.'),
  dataFim: z.string().regex(DATA_REGEX).nullish(),
});
