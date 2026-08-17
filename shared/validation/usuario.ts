import { z } from 'zod';
import { TELAS } from '../types/permissao';

export const permissaoEntradaSchema = z.object({
  tela: z.enum(TELAS),
  podeVisualizar: z.boolean().default(false),
  podeCriar: z.boolean().default(false),
  podeEditar: z.boolean().default(false),
  podeExcluir: z.boolean().default(false),
  podeExportar: z.boolean().default(false),
  podeImportar: z.boolean().default(false),
});

export const usuarioEntradaSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'O usuário deve ter ao menos 3 caracteres.')
    .max(100)
    .regex(/^[a-z0-9._-]+$/i, 'Use apenas letras, números, ponto, hífen ou underline.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(200).optional(),
  role: z.enum(['admin', 'usuario']),
  nomeCompleto: z.string().trim().min(1, 'Informe o nome completo.').max(200),
  colaboradorId: z.number().int().positive().nullish(),
  ativo: z.boolean().default(true),
  permissoes: z.array(permissaoEntradaSchema).default([]),
});

export type UsuarioEntradaValidada = z.infer<typeof usuarioEntradaSchema>;
