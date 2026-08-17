import { z } from 'zod';
import { UF_SIGLAS } from '../constants/ufs';
import { TIPOS_LOCALIDADE } from '../types/localidade';

export const localidadeEntradaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da localidade.').max(150),
  ufSigla: z.enum(UF_SIGLAS as [string, ...string[]], { message: 'UF inválida.' }),
  tipo: z.enum(TIPOS_LOCALIDADE),
  ativo: z.boolean().default(true),
});
