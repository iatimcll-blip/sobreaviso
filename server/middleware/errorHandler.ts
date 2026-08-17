import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import type { AppEnv } from '../types/context';

export const tratarErro: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ZodError) {
    return c.json({ erro: 'Dados inválidos.', detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })) }, 400);
  }
  console.error(err);
  return c.json({ erro: 'Erro interno do servidor.' }, 500);
};
