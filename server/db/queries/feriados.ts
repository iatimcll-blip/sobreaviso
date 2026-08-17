import type { Feriado, FeriadoDetalhado, FeriadoEntrada, OrigemFeriado } from '../../../shared/types/feriado';
import { gerarFeriadosNacionais } from '../../../shared/calculo/feriadosNacionais';
import { execute, query, queryOne } from '../client';

interface FeriadoRow {
  id: number;
  data: string;
  ano: number;
  nome: string;
  abrangencia: Feriado['abrangencia'];
  uf_sigla: string | null;
  localidade_id: number | null;
  tipo: Feriado['tipo'];
  origem: OrigemFeriado;
  localidade_nome: string | null;
}

function map(row: FeriadoRow): FeriadoDetalhado {
  return {
    id: row.id,
    data: row.data,
    ano: row.ano,
    nome: row.nome,
    abrangencia: row.abrangencia,
    ufSigla: row.uf_sigla,
    localidadeId: row.localidade_id,
    tipo: row.tipo,
    origem: row.origem,
    localidadeNome: row.localidade_nome,
  };
}

const SELECT = `
  SELECT f.*, loc.nome AS localidade_nome
  FROM feriados f
  LEFT JOIN localidades loc ON loc.id = f.localidade_id
`;

export interface FiltroFeriados {
  ano?: number;
  ufSigla?: string;
  localidadeId?: number;
  abrangencia?: Feriado['abrangencia'];
}

export async function listarFeriados(db: D1Database, filtro: FiltroFeriados = {}): Promise<FeriadoDetalhado[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  if (filtro.ano) {
    condicoes.push('f.ano = ?');
    params.push(filtro.ano);
  }
  if (filtro.ufSigla) {
    condicoes.push('f.uf_sigla = ?');
    params.push(filtro.ufSigla);
  }
  if (filtro.localidadeId) {
    condicoes.push('f.localidade_id = ?');
    params.push(filtro.localidadeId);
  }
  if (filtro.abrangencia) {
    condicoes.push('f.abrangencia = ?');
    params.push(filtro.abrangencia);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const rows = await query<FeriadoRow>(db, `${SELECT} ${where} ORDER BY f.data ASC`, params);
  return rows.map(map);
}

/** Feriados aplicáveis a um colaborador (nacionais + estaduais da sua UF + municipais da sua localidade) em um período. */
export async function listarFeriadosParaColaborador(
  db: D1Database,
  ufSigla: string,
  localidadeId: number,
  de: string,
  ate: string,
): Promise<FeriadoDetalhado[]> {
  const rows = await query<FeriadoRow>(
    db,
    `${SELECT}
     WHERE f.data BETWEEN ? AND ?
       AND (f.abrangencia = 'nacional' OR (f.abrangencia = 'estadual' AND f.uf_sigla = ?) OR (f.abrangencia = 'municipal' AND f.localidade_id = ?))
     ORDER BY f.data ASC`,
    [de, ate, ufSigla, localidadeId],
  );
  return rows.map(map);
}

export async function criarFeriado(db: D1Database, dado: FeriadoEntrada, origem: OrigemFeriado = 'manual'): Promise<number | null> {
  const ano = Number(dado.data.slice(0, 4));
  const ufSigla = dado.ufSigla ?? null;
  const localidadeId = dado.localidadeId ?? null;

  // Checagem explícita em vez de depender só da constraint UNIQUE: no SQL, NULL nunca é igual a NULL,
  // então "uf_sigla = ?"/"localidade_id = ?" nunca bloqueariam duas linhas nacionais (ambas com NULL).
  // "IS NOT DISTINCT FROM" faz a comparação NULL-safe (equivalente Postgres do "IS" do SQLite).
  const existente = await queryOne<{ id: number }>(
    db,
    `SELECT id FROM feriados WHERE data = ? AND nome = ? AND abrangencia = ? AND uf_sigla IS NOT DISTINCT FROM ? AND localidade_id IS NOT DISTINCT FROM ?`,
    [dado.data, dado.nome, dado.abrangencia, ufSigla, localidadeId],
  );
  if (existente) return null;

  const resultado = await execute(
    db,
    `INSERT INTO feriados (data, ano, nome, abrangencia, uf_sigla, localidade_id, tipo, origem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [dado.data, ano, dado.nome, dado.abrangencia, ufSigla, localidadeId, dado.tipo, origem],
  );
  return Number(resultado.meta.last_row_id);
}

export async function excluirFeriado(db: D1Database, id: number): Promise<void> {
  await execute(db, 'DELETE FROM feriados WHERE id = ?', [id]);
}

export interface ResumoGeracaoNacionais {
  inseridos: number;
  jaExistentes: number;
}

export async function gerarFeriadosNacionaisNoAno(db: D1Database, ano: number): Promise<ResumoGeracaoNacionais> {
  const feriados = gerarFeriadosNacionais(ano);
  let inseridos = 0;
  for (const feriado of feriados) {
    const id = await criarFeriado(
      db,
      { data: feriado.data, nome: feriado.nome, abrangencia: 'nacional', tipo: feriado.tipo },
      'automatico',
    );
    if (id) inseridos += 1;
  }
  return { inseridos, jaExistentes: feriados.length - inseridos };
}
