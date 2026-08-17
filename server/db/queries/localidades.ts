import type { Localidade, LocalidadeEntrada } from '../../../shared/types/localidade';
import { execute, query, queryOne } from '../client';

interface LocalidadeRow {
  id: number;
  nome: string;
  uf_sigla: string;
  tipo: Localidade['tipo'];
  ativo: number;
}

function map(row: LocalidadeRow): Localidade {
  return { id: row.id, nome: row.nome, ufSigla: row.uf_sigla, tipo: row.tipo, ativo: row.ativo === 1 };
}

export async function listarLocalidades(db: D1Database, ufSigla?: string): Promise<Localidade[]> {
  const where = ufSigla ? 'WHERE uf_sigla = ?' : '';
  const rows = await query<LocalidadeRow>(db, `SELECT * FROM localidades ${where} ORDER BY nome ASC`, ufSigla ? [ufSigla] : []);
  return rows.map(map);
}

export async function buscarLocalidadePorNomeUf(db: D1Database, nome: string, ufSigla: string): Promise<{ id: number } | null> {
  return queryOne<{ id: number }>(db, 'SELECT id FROM localidades WHERE UPPER(nome) = UPPER(?) AND uf_sigla = ?', [
    nome.trim(),
    ufSigla,
  ]);
}

export async function criarLocalidadeSeNaoExistir(db: D1Database, nome: string, ufSigla: string): Promise<number> {
  const existente = await buscarLocalidadePorNomeUf(db, nome, ufSigla);
  if (existente) return existente.id;
  const resultado = await execute(db, 'INSERT INTO localidades (nome, uf_sigla) VALUES (?, ?)', [nome.trim(), ufSigla]);
  return Number(resultado.meta.last_row_id);
}

export async function buscarLocalidadePorId(db: D1Database, id: number): Promise<Localidade | null> {
  const row = await queryOne<LocalidadeRow>(db, 'SELECT * FROM localidades WHERE id = ?', [id]);
  return row ? map(row) : null;
}

export async function criarLocalidade(db: D1Database, dado: LocalidadeEntrada): Promise<number> {
  const resultado = await execute(db, 'INSERT INTO localidades (nome, uf_sigla, tipo, ativo) VALUES (?, ?, ?, ?)', [
    dado.nome,
    dado.ufSigla,
    dado.tipo,
    dado.ativo === false ? 0 : 1,
  ]);
  return Number(resultado.meta.last_row_id);
}

export async function atualizarLocalidade(db: D1Database, id: number, dado: LocalidadeEntrada): Promise<void> {
  await execute(db, `UPDATE localidades SET nome = ?, uf_sigla = ?, tipo = ?, ativo = ?, atualizado_em = datetime('now') WHERE id = ?`, [
    dado.nome,
    dado.ufSigla,
    dado.tipo,
    dado.ativo === false ? 0 : 1,
    id,
  ]);
}
