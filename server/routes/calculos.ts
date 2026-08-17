import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { cicloAtual } from '../../shared/calculo/ciclo';
import { registrarAuditoria } from '../db/queries/auditoria';
import { atualizarConfiguracoesClt, buscarConfiguracoesClt } from '../db/queries/configuracoesClt';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import { calcularColaborador, calcularResumoCiclo, executarCalculoCicloCompleto, executarCalculoColaborador } from '../services/calculo/executarCalculoCiclo';
import type { AppEnv } from '../types/context';

export const calculosRoutes = new Hono<AppEnv>();
calculosRoutes.use('*', autenticar);

const configuracoesCltSchema = z.object({
  interjornadaMinimaHoras: z.number().positive(),
  jornadaMaximaDiariaHoras: z.number().positive(),
  intrajornadaJornadaLongaHoras: z.number().positive(),
  intrajornadaMinimaLongaMinutos: z.number().int().min(0),
  intrajornadaMinimaLongaComAcordoMinutos: z.number().int().min(0),
  intrajornadaJornadaMediaHoras: z.number().positive(),
  intrajornadaMinimaMediaMinutos: z.number().int().min(0),
  horaNoturnaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  horaNoturnaFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  horaNoturnaFatorReducao: z.number().positive(),
  horaNoturnaAdicionalPct: z.number().min(0),
  sobreavisoFator: z.number().min(0).max(1),
  descansoSemanalHoras: z.number().positive(),
  descanso12x36Horas: z.number().positive(),
  tetoHorasExtrasDia: z.number().min(0),
});

calculosRoutes.get('/configuracoes-clt', requererPermissao('configuracoes', 'visualizar'), async (c) => {
  const configuracoes = await buscarConfiguracoesClt(c.env.DB);
  return c.json({ configuracoes });
});

calculosRoutes.put('/configuracoes-clt', requererPermissao('configuracoes', 'editar'), validar('json', configuracoesCltSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  await atualizarConfiguracoesClt(c.env.DB, dado);
  await registrarAuditoria(c.env.DB, { entidade: 'configuracoes_clt', entidadeId: null, acao: 'editar', usuarioId: usuario.id, dadosDepois: dado });
  return c.json({ configuracoes: dado });
});

calculosRoutes.post(
  '/executar',
  requererPermissao('inconsistencias', 'editar'),
  validar('json', z.object({ ciclo: z.string().regex(/^\d{4}-\d{2}$/).optional(), colaboradorId: z.number().int().positive().optional() })),
  async (c) => {
    const usuario = c.get('usuario');
    const { ciclo, colaboradorId } = c.req.valid('json');
    const cicloRotulo = ciclo ?? cicloAtual().rotulo;

    if (colaboradorId) {
      const resultado = await executarCalculoColaborador(c.env.DB, colaboradorId, cicloRotulo);
      await registrarAuditoria(c.env.DB, { entidade: 'calculo', entidadeId: colaboradorId, acao: 'executar', usuarioId: usuario.id, dadosDepois: resultado });
      return c.json({ resultado });
    }

    const resultado = await executarCalculoCicloCompleto(c.env.DB, cicloRotulo);
    await registrarAuditoria(c.env.DB, { entidade: 'calculo', entidadeId: null, acao: 'executar_ciclo', usuarioId: usuario.id, dadosDepois: resultado });
    return c.json({ resultado });
  },
);

calculosRoutes.get(
  '/horas',
  requererPermissao('inconsistencias', 'visualizar'),
  validar('query', z.object({ colaboradorId: z.coerce.number().int().positive(), ciclo: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const { colaboradorId, ciclo } = c.req.valid('query');
    const cicloRotulo = ciclo ?? cicloAtual().rotulo;
    const resultado = await calcularColaborador(c.env.DB, colaboradorId, cicloRotulo);
    return c.json({ horas: resultado.horas, cicloRotulo });
  },
);

calculosRoutes.get(
  '/resumo-ciclo',
  requererPermissao('dashboard', 'visualizar'),
  validar('query', z.object({ ciclo: z.string().regex(/^\d{4}-\d{2}$/).optional() })),
  async (c) => {
    const { ciclo } = c.req.valid('query');
    const cicloRotulo = ciclo ?? cicloAtual().rotulo;
    const dias = await calcularResumoCiclo(c.env.DB, cicloRotulo);
    return c.json({ cicloRotulo, dias });
  },
);
