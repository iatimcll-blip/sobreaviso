import { z } from 'zod';
import { ABRANGENCIAS_FERIADO, TIPOS_FERIADO } from '../types/feriado';
import { UF_SIGLAS } from '../constants/ufs';

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const feriadoEntradaSchema = z
  .object({
    data: z.string().regex(DATA_REGEX, 'Data inválida.'),
    nome: z.string().trim().min(1, 'Informe o nome do feriado.').max(150),
    abrangencia: z.enum(ABRANGENCIAS_FERIADO),
    ufSigla: z.enum(UF_SIGLAS as [string, ...string[]]).nullish(),
    localidadeId: z.number().int().positive().nullish(),
    tipo: z.enum(TIPOS_FERIADO),
  })
  .refine((dado) => dado.abrangencia === 'nacional' || dado.ufSigla, {
    message: 'Informe a UF para feriados estaduais ou municipais.',
    path: ['ufSigla'],
  })
  .refine((dado) => dado.abrangencia !== 'municipal' || dado.localidadeId, {
    message: 'Informe a localidade para feriados municipais.',
    path: ['localidadeId'],
  });

export const gerarFeriadosNacionaisSchema = z.object({
  ano: z.number().int().min(2000).max(2100),
});
