import { Hono } from 'hono';
import { UFS } from '../../shared/constants/ufs';
import { listarColaboradoresResumo } from '../db/queries/colaboradores';
import { listarEquipes } from '../db/queries/equipes';
import { listarLocalidades } from '../db/queries/localidades';
import { autenticar } from '../middleware/auth';
import type { AppEnv } from '../types/context';

/**
 * Dados de referência (UF, localidades, equipes) usados para preencher formulários e filtros
 * em várias telas. Somente leitura e liberado para qualquer usuário autenticado — a criação/edição
 * dessas entidades tem suas próprias permissões dedicadas (telas "localidades"/"equipes").
 */
export const referenciasRoutes = new Hono<AppEnv>();
referenciasRoutes.use('*', autenticar);

referenciasRoutes.get('/uf', (c) => c.json({ uf: UFS }));

referenciasRoutes.get('/localidades', async (c) => {
  const ufSigla = c.req.query('uf');
  const localidades = await listarLocalidades(c.env.DB, ufSigla);
  return c.json({ localidades });
});

referenciasRoutes.get('/equipes', async (c) => {
  const equipes = await listarEquipes(c.env.DB);
  return c.json({ equipes });
});

referenciasRoutes.get('/colaboradores', async (c) => {
  const colaboradores = await listarColaboradoresResumo(c.env.DB);
  return c.json({ colaboradores });
});
