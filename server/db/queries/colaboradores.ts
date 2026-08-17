import type { ColaboradorDetalhado, ColaboradorEntrada } from '../../../shared/types/colaborador';
import { query, queryOne, execute } from '../client';

interface ColaboradorRow {
  id: number;
  nome: string;
  matricula: string | null;
  funcao: string;
  equipe_id: number | null;
  uf_sigla: string;
  localidade_id: number;
  gestor_administrativo_id: number | null;
  gestor_operacional_id: number | null;
  ga_nome_importado: string | null;
  go_nome_importado: string | null;
  situacao_cadastral: ColaboradorDetalhado['situacaoCadastral'];
  criado_em: string;
  atualizado_em: string;
  equipe_nome: string | null;
  localidade_nome: string;
  gestor_administrativo_nome: string | null;
  gestor_operacional_nome: string | null;
}

const SELECT_DETALHADO = `
  SELECT
    c.id, c.nome, c.matricula, c.funcao, c.equipe_id, c.uf_sigla, c.localidade_id,
    c.gestor_administrativo_id, c.gestor_operacional_id, c.ga_nome_importado, c.go_nome_importado,
    c.situacao_cadastral, c.criado_em, c.atualizado_em,
    eq.nome AS equipe_nome,
    loc.nome AS localidade_nome,
    ga.nome AS gestor_administrativo_nome,
    go.nome AS gestor_operacional_nome
  FROM colaboradores c
  LEFT JOIN equipes eq ON eq.id = c.equipe_id
  LEFT JOIN localidades loc ON loc.id = c.localidade_id
  LEFT JOIN colaboradores ga ON ga.id = c.gestor_administrativo_id
  LEFT JOIN colaboradores go ON go.id = c.gestor_operacional_id
`;

function mapDetalhado(row: ColaboradorRow): ColaboradorDetalhado {
  return {
    id: row.id,
    nome: row.nome,
    matricula: row.matricula,
    funcao: row.funcao,
    equipeId: row.equipe_id,
    ufSigla: row.uf_sigla,
    localidadeId: row.localidade_id,
    gestorAdministrativoId: row.gestor_administrativo_id,
    gestorOperacionalId: row.gestor_operacional_id,
    gaNomeImportado: row.ga_nome_importado,
    goNomeImportado: row.go_nome_importado,
    situacaoCadastral: row.situacao_cadastral,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    equipeNome: row.equipe_nome,
    localidadeNome: row.localidade_nome,
    gestorAdministrativoNome: row.gestor_administrativo_nome,
    gestorOperacionalNome: row.gestor_operacional_nome,
  };
}

export interface FiltroColaboradores {
  busca?: string;
  equipeId?: number;
  ufSigla?: string;
  localidadeId?: number;
  situacaoCadastral?: string;
}

export async function listarColaboradores(db: D1Database, filtro: FiltroColaboradores = {}): Promise<ColaboradorDetalhado[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];

  if (filtro.busca) {
    condicoes.push('(c.nome LIKE ? OR c.funcao LIKE ?)');
    params.push(`%${filtro.busca}%`, `%${filtro.busca}%`);
  }
  if (filtro.equipeId) {
    condicoes.push('c.equipe_id = ?');
    params.push(filtro.equipeId);
  }
  if (filtro.ufSigla) {
    condicoes.push('c.uf_sigla = ?');
    params.push(filtro.ufSigla);
  }
  if (filtro.localidadeId) {
    condicoes.push('c.localidade_id = ?');
    params.push(filtro.localidadeId);
  }
  if (filtro.situacaoCadastral) {
    condicoes.push('c.situacao_cadastral = ?');
    params.push(filtro.situacaoCadastral);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const rows = await query<ColaboradorRow>(db, `${SELECT_DETALHADO} ${where} ORDER BY c.nome ASC`, params);
  return rows.map(mapDetalhado);
}

export async function buscarColaboradorPorId(db: D1Database, id: number): Promise<ColaboradorDetalhado | null> {
  const row = await queryOne<ColaboradorRow>(db, `${SELECT_DETALHADO} WHERE c.id = ?`, [id]);
  return row ? mapDetalhado(row) : null;
}

export async function buscarColaboradorPorNome(db: D1Database, nome: string): Promise<{ id: number } | null> {
  return queryOne<{ id: number }>(db, 'SELECT id FROM colaboradores WHERE UPPER(nome) = UPPER(?)', [nome.trim()]);
}

export interface ColaboradorResumo {
  id: number;
  nome: string;
  funcao: string;
  situacaoCadastral: ColaboradorDetalhado['situacaoCadastral'];
}

/** Lista enxuta (id/nome/função/situação) para preencher seletores em outras telas, sem exigir a permissão de "colaboradores". */
export async function listarColaboradoresResumo(db: D1Database): Promise<ColaboradorResumo[]> {
  const rows = await query<{ id: number; nome: string; funcao: string; situacao_cadastral: ColaboradorDetalhado['situacaoCadastral'] }>(
    db,
    "SELECT id, nome, funcao, situacao_cadastral FROM colaboradores WHERE situacao_cadastral != 'desligado' ORDER BY nome ASC",
  );
  return rows.map((row) => ({ id: row.id, nome: row.nome, funcao: row.funcao, situacaoCadastral: row.situacao_cadastral }));
}

export async function criarColaborador(db: D1Database, dado: ColaboradorEntrada, usuarioId: number | null): Promise<number> {
  const resultado = await execute(
    db,
    `INSERT INTO colaboradores (
      nome, matricula, funcao, equipe_id, uf_sigla, localidade_id,
      gestor_administrativo_id, gestor_operacional_id, ga_nome_importado, go_nome_importado,
      situacao_cadastral, criado_por, atualizado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dado.nome,
      dado.matricula ?? null,
      dado.funcao,
      dado.equipeId ?? null,
      dado.ufSigla,
      dado.localidadeId,
      dado.gestorAdministrativoId ?? null,
      dado.gestorOperacionalId ?? null,
      dado.gaNomeImportado ?? null,
      dado.goNomeImportado ?? null,
      dado.situacaoCadastral ?? 'ativo',
      usuarioId,
      usuarioId,
    ],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarColaborador(
  db: D1Database,
  id: number,
  dado: ColaboradorEntrada,
  usuarioId: number | null,
): Promise<void> {
  await execute(
    db,
    `UPDATE colaboradores SET
      nome = ?, matricula = ?, funcao = ?, equipe_id = ?, uf_sigla = ?, localidade_id = ?,
      gestor_administrativo_id = ?, gestor_operacional_id = ?, ga_nome_importado = ?, go_nome_importado = ?,
      situacao_cadastral = ?, atualizado_por = ?, atualizado_em = datetime('now')
    WHERE id = ?`,
    [
      dado.nome,
      dado.matricula ?? null,
      dado.funcao,
      dado.equipeId ?? null,
      dado.ufSigla,
      dado.localidadeId,
      dado.gestorAdministrativoId ?? null,
      dado.gestorOperacionalId ?? null,
      dado.gaNomeImportado ?? null,
      dado.goNomeImportado ?? null,
      dado.situacaoCadastral ?? 'ativo',
      usuarioId,
      id,
    ],
  );
}

export async function definirSituacaoCadastral(
  db: D1Database,
  id: number,
  situacao: ColaboradorDetalhado['situacaoCadastral'],
  usuarioId: number | null,
): Promise<void> {
  await execute(
    db,
    `UPDATE colaboradores SET situacao_cadastral = ?, atualizado_por = ?, atualizado_em = datetime('now') WHERE id = ?`,
    [situacao, usuarioId, id],
  );
}

export async function atribuirEquipeEmLote(
  db: D1Database,
  colaboradorIds: number[],
  equipeId: number | null,
  usuarioId: number | null,
): Promise<void> {
  const placeholders = colaboradorIds.map(() => '?').join(', ');
  await execute(
    db,
    `UPDATE colaboradores SET equipe_id = ?, atualizado_por = ?, atualizado_em = datetime('now') WHERE id IN (${placeholders})`,
    [equipeId, usuarioId, ...colaboradorIds],
  );
}

export async function excluirColaborador(db: D1Database, id: number): Promise<void> {
  await execute(db, 'DELETE FROM colaboradores WHERE id = ?', [id]);
}
