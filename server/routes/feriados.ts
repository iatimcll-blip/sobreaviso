import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { feriadoEntradaSchema, gerarFeriadosNacionaisSchema } from '../../shared/validation/feriado';
import { registrarAuditoria } from '../db/queries/auditoria';
import { criarFeriado, excluirFeriado, gerarFeriadosNacionaisNoAno, listarFeriados } from '../db/queries/feriados';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import type { AppEnv } from '../types/context';

export const feriadosRoutes = new Hono<AppEnv>();
feriadosRoutes.use('*', autenticar);

feriadosRoutes.get('/', requererPermissao('feriados', 'visualizar'), async (c) => {
  const { ano, uf, localidadeId, abrangencia } = c.req.query();
  const feriados = await listarFeriados(c.env.DB, {
    ano: ano ? Number(ano) : undefined,
    ufSigla: uf,
    localidadeId: localidadeId ? Number(localidadeId) : undefined,
    abrangencia: abrangencia as 'nacional' | 'estadual' | 'municipal' | undefined,
  });
  return c.json({ feriados });
});

feriadosRoutes.post('/', requererPermissao('feriados', 'criar'), validar('json', feriadoEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');
  const id = await criarFeriado(c.env.DB, dado, 'manual');
  if (!id) return c.json({ erro: 'Este feriado já está cadastrado.' }, 409);
  await registrarAuditoria(c.env.DB, { entidade: 'feriado', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  return c.json({ ok: true, id }, 201);
});

feriadosRoutes.delete('/:id{[0-9]+}', requererPermissao('feriados', 'excluir'), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  await excluirFeriado(c.env.DB, id);
  await registrarAuditoria(c.env.DB, { entidade: 'feriado', entidadeId: id, acao: 'excluir', usuarioId: usuario.id });
  return c.json({ ok: true });
});

feriadosRoutes.post(
  '/gerar-nacionais',
  requererPermissao('feriados', 'criar'),
  validar('json', gerarFeriadosNacionaisSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const { ano } = c.req.valid('json');
    const resumo = await gerarFeriadosNacionaisNoAno(c.env.DB, ano);
    await registrarAuditoria(c.env.DB, { entidade: 'feriado', entidadeId: null, acao: 'gerar_nacionais', usuarioId: usuario.id, dadosDepois: { ano, ...resumo } });
    return c.json({ resumo });
  },
);
