import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

/**
 * Substitui o zValidator padrão para garantir que falhas de validação sigam o mesmo formato
 * { erro, detalhes } usado pelo restante da API (server/middleware/errorHandler.ts) — sem este hook,
 * o zValidator responde no seu próprio formato ({ success:false, error:{...} }), que o cliente não
 * reconhece, e a mensagem específica do campo inválido nunca chega ao usuário.
 */
export function validar<T extends ZodType>(alvo: 'json' | 'query' | 'param' | 'form', schema: T) {
  return zValidator(alvo, schema, (resultado, c) => {
    if (!resultado.success) {
      return c.json(
        { erro: 'Dados inválidos.', detalhes: resultado.error.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message })) },
        400,
      );
    }
  });
}
