import { validar } from '../middleware/validar';
import { Hono } from 'hono';
import { afastamentoEntradaSchema, afastamentoStatusSchema } from '../../shared/validation/afastamento';
import { registrarAuditoria } from '../db/queries/auditoria';
import { anexarDocumento, atualizarStatusAfastamento, buscarAfastamento, criarAfastamento, listarAfastamentos } from '../db/queries/afastamentos';
import { autenticar } from '../middleware/auth';
import { requererPermissao } from '../middleware/rbac';
import { buscarConflitosAfastamento } from '../services/afastamentos/conflitos';
import type { AppEnv } from '../types/context';

export const afastamentosRoutes = new Hono<AppEnv>();
afastamentosRoutes.use('*', autenticar);

afastamentosRoutes.get('/', requererPermissao('afastamentos', 'visualizar'), async (c) => {
  const { colaboradorId, tipo, status, de, ate } = c.req.query();
  const afastamentos = await listarAfastamentos(c.env.DB, {
    colaboradorId: colaboradorId ? Number(colaboradorId) : undefined,
    tipo: tipo as never,
    status: status as never,
    de,
    ate,
  });
  return c.json({ afastamentos });
});

afastamentosRoutes.post('/', requererPermissao('afastamentos', 'criar'), validar('json', afastamentoEntradaSchema), async (c) => {
  const usuario = c.get('usuario');
  const dado = c.req.valid('json');

  const conflitos = await buscarConflitosAfastamento(c.env.DB, dado.colaboradorId, dado.dataInicio, dado.dataFim);
  if (conflitos.length > 0 && !dado.forcar) {
    return c.json({ erro: 'Existe conflito com escala ou sobreaviso já lançado para este período.', detalhes: conflitos }, 409);
  }

  const id = await criarAfastamento(c.env.DB, dado, usuario.id);
  await registrarAuditoria(c.env.DB, { entidade: 'afastamento', entidadeId: id, acao: 'criar', usuarioId: usuario.id, dadosDepois: dado });
  const afastamento = await buscarAfastamento(c.env.DB, id);
  return c.json({ afastamento }, 201);
});

afastamentosRoutes.patch(
  '/:id{[0-9]+}/status',
  requererPermissao('afastamentos', 'editar'),
  validar('json', afastamentoStatusSchema),
  async (c) => {
    const usuario = c.get('usuario');
    const id = Number(c.req.param('id'));
    const { status } = c.req.valid('json');
    const existente = await buscarAfastamento(c.env.DB, id);
    if (!existente) return c.json({ erro: 'Afastamento não encontrado.' }, 404);

    await atualizarStatusAfastamento(c.env.DB, id, status);
    await registrarAuditoria(c.env.DB, {
      entidade: 'afastamento',
      entidadeId: id,
      acao: 'editar_status',
      usuarioId: usuario.id,
      dadosAntes: { status: existente.status },
      dadosDepois: { status },
    });
    const afastamento = await buscarAfastamento(c.env.DB, id);
    return c.json({ afastamento });
  },
);

afastamentosRoutes.post('/:id{[0-9]+}/documento', requererPermissao('afastamentos', 'editar'), async (c) => {
  const usuario = c.get('usuario');
  const id = Number(c.req.param('id'));
  const existente = await buscarAfastamento(c.env.DB, id);
  if (!existente) return c.json({ erro: 'Afastamento não encontrado.' }, 404);

  const corpo = await c.req.parseBody();
  const arquivo = corpo.file;
  if (!(arquivo instanceof File)) return c.json({ erro: 'Envie um arquivo no campo "file".' }, 400);

  const chaveR2 = `afastamentos/${id}/${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
  await c.env.BUCKET.put(chaveR2, await arquivo.arrayBuffer());
  await anexarDocumento(c.env.DB, id, chaveR2, arquivo.name);
  await registrarAuditoria(c.env.DB, { entidade: 'afastamento', entidadeId: id, acao: 'anexar_documento', usuarioId: usuario.id, dadosDepois: { nomeArquivo: arquivo.name } });

  const afastamento = await buscarAfastamento(c.env.DB, id);
  return c.json({ afastamento });
});

afastamentosRoutes.get('/:id{[0-9]+}/documento', requererPermissao('afastamentos', 'visualizar'), async (c) => {
  const id = Number(c.req.param('id'));
  const afastamento = await buscarAfastamento(c.env.DB, id);
  if (!afastamento?.documentoR2Key) return c.json({ erro: 'Nenhum documento anexado.' }, 404);

  const objeto = await c.env.BUCKET.get(afastamento.documentoR2Key);
  if (!objeto) return c.json({ erro: 'Arquivo não encontrado.' }, 404);

  return new Response(objeto.body, {
    headers: { 'Content-Disposition': `attachment; filename="${afastamento.documentoNomeArquivo ?? 'documento'}"` },
  });
});
