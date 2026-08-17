import { z } from 'zod';
import { SITUACOES_CADASTRAIS } from '../types/colaborador';
import { UF_SIGLAS } from '../constants/ufs';

export const colaboradorEntradaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do colaborador.').max(200),
  matricula: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform((valor) => (valor ? valor : null)),
  funcao: z.string().trim().min(1, 'Informe a função.').max(120),
  equipeId: z.number().int().positive().nullish(),
  ufSigla: z.enum(UF_SIGLAS as [string, ...string[]], { message: 'UF inválida.' }),
  localidadeId: z.number().int().positive({ message: 'Selecione a localidade.' }),
  gestorAdministrativoId: z.number().int().positive().nullish(),
  gestorOperacionalId: z.number().int().positive().nullish(),
  gaNomeImportado: z.string().trim().max(200).nullish(),
  goNomeImportado: z.string().trim().max(200).nullish(),
  situacaoCadastral: z.enum(SITUACOES_CADASTRAIS).default('ativo'),
});

export type ColaboradorEntradaValidada = z.infer<typeof colaboradorEntradaSchema>;

export const colaboradorAtribuirEquipeSchema = z.object({
  colaboradorIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um colaborador.'),
  equipeId: z.number().int().positive().nullable(),
});

export const colaboradorFiltroSchema = z.object({
  busca: z.string().trim().optional(),
  equipeId: z.coerce.number().int().positive().optional(),
  ufSigla: z.string().optional(),
  localidadeId: z.coerce.number().int().positive().optional(),
  situacaoCadastral: z.enum(SITUACOES_CADASTRAIS).optional(),
});
