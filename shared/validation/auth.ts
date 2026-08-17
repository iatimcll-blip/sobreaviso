import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(100),
  password: z.string().min(1, 'Informe a senha.').max(200),
});

export type LoginEntrada = z.infer<typeof loginSchema>;
