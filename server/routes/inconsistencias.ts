import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { z } from 'zod';
import { STATUS_INCONSISTENCIA } from '../../shared/calculo/inconsistencias';
import { registrarAuditoria } from '../db/queries/auditoria';
import { atualizarStatusRevisao, buscarInconsistenciaPorId, contarPendentes, listarInconsistencias } from '../db/queries/inconsistencias';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const inconsistenciasRoutes = new Hono<AppEnv>();
inconsistenciasRoutes.use('*', autenticar);

inconsistenciasRoutes.get('/', requererPermissao('inconsistencias', 'visualizar'), async (c) => {
  const { ciclo, colaboradorId, equipeId, uf, localidadeId, status, tipo } = c.req.query();
  const inconsistencias = await listarInconsistencias(c.env.DB, {
    cicloReferencia: ciclo,
    colaboradorId: colaboradorId ? Number(colaboradorId) : undefined,
    equipeId: equipeId ? Number(equipeId) : undefined,
    ufSigla: uf,
    localidadeId: localidadeId ? Number(localidadeId) : undefined,
    status: status as never,
    tipo: tipo as never,
  });
  return c.json({ inconsistencias });
});

inconsistenciasRoutes.get('/pendentes/total', requererPermissao('inconsistencias', 'visualizar'), async (c) => {
  const total = await contarPendentes(c.env.DB);
  return c.json({ total });
});

inconsistenciasRoutes.patch(
  '/:id{[0-9]+}',
  requererPermissao('inconsistencias', 'editar'),
  validar(
    'json',
    z.object({
      status: z.enum(STATUS_INCONSISTENCIA).exclude(['pendente']),
      justificativa: z.string().trim().max(1000).nullish(),
    }),
  ),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const existente = await buscarInconsistenciaPorId(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Inconsistência não encontrada.' }, 404);

    const { status, justificativa } = c.req.valid('json');
    await atualizarStatusRevisao(c.env.DB, id, status, justificativa ?? null, usuario.id);
    await registrarAuditoria(c.env.DB, {
      entidade: 'inconsistencia',
      entidadeId: id,
      acao: 'revisar',
      usuarioId: usuario.id,
      dadosAntes: { status: existente.status },
      dadosDepois: { status, justificativa },
    });

    const inconsistencia = await buscarInconsistenciaPorId(c.env.DB, id);
    return c.json({ inconsistencia });
  },
);
