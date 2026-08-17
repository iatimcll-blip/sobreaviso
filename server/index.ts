import { Hono } from 'hono';
import { afastamentosRoutes } from './routes/afastamentos';
import { authRoutes } from './routes/auth';
import { calculosRoutes } from './routes/calculos';
import { colaboradoresRoutes } from './routes/colaboradores';
import { duplasRoutes } from './routes/duplas';
import { equipesRoutes } from './routes/equipes';
import { escalasRoutes } from './routes/escalas';
import { exportacoesRoutes } from './routes/exportacoes';
import { feriadosRoutes } from './routes/feriados';
import { importacoesRoutes } from './routes/importacoes';
import { inconsistenciasRoutes } from './routes/inconsistencias';
import { localidadesRoutes } from './routes/localidades';
import { referenciasRoutes } from './routes/referencias';
import { sobreavisoRoutes } from './routes/sobreaviso';
import { usuariosRoutes } from './routes/usuarios';
import { tratarErro } from './middleware/errorHandler';
import type { AppEnv } from './types/context';

const app = new Hono<AppEnv>();

app.onError(tratarErro);

app.route('/api/auth', authRoutes);
app.route('/api/colaboradores', colaboradoresRoutes);
app.route('/api/importacoes', importacoesRoutes);
app.route('/api/usuarios', usuariosRoutes);
app.route('/api/referencias', referenciasRoutes);
app.route('/api/escalas', escalasRoutes);
app.route('/api/equipes', equipesRoutes);
app.route('/api/duplas', duplasRoutes);
app.route('/api/sobreaviso', sobreavisoRoutes);
app.route('/api/localidades', localidadesRoutes);
app.route('/api/feriados', feriadosRoutes);
app.route('/api/afastamentos', afastamentosRoutes);
app.route('/api/calculos', calculosRoutes);
app.route('/api/inconsistencias', inconsistenciasRoutes);
app.route('/api/exportacoes', exportacoesRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ erro: 'Rota não encontrada.' }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
