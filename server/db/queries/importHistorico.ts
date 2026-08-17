import { execute, query, queryOne } from '../client';

export type StatusImportacao = 'processando' | 'concluido' | 'concluido_com_erros' | 'falhou';

export interface ImportHistoricoRow {
  id: number;
  tipo: string;
  nome_arquivo: string;
  r2_key: string;
  usuario_id: number;
  iniciado_em: string;
  concluido_em: string | null;
  status: StatusImportacao;
  total_linhas: number;
  total_importados: number;
  total_atualizados: number;
  total_ignorados: number;
  total_erros: number;
  detalhes_json: string | null;
}

export async function criarImportHistorico(
  db: D1Database,
  dado: { tipo: string; nomeArquivo: string; r2Key: string; usuarioId: number; totalLinhas: number },
): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO import_historico (tipo, nome_arquivo, r2_key, usuario_id, total_linhas) VALUES (?, ?, ?, ?, ?)',
    [dado.tipo, dado.nomeArquivo, dado.r2Key, dado.usuarioId, dado.totalLinhas],
  );
  return Number(resultado.meta.last_row_id);
}

export async function buscarImportHistoricoPorId(db: D1Database, id: number): Promise<ImportHistoricoRow | null> {
  return queryOne<ImportHistoricoRow>(db, 'SELECT * FROM import_historico WHERE id = ?', [id]);
}

export async function listarImportHistorico(db: D1Database, tipo?: string): Promise<ImportHistoricoRow[]> {
  const where = tipo ? 'WHERE tipo = ?' : '';
  return query<ImportHistoricoRow>(db, `SELECT * FROM import_historico ${where} ORDER BY iniciado_em DESC LIMIT 50`, tipo ? [tipo] : []);
}

export async function concluirImportHistorico(
  db: D1Database,
  id: number,
  dado: {
    status: StatusImportacao;
    totalImportados: number;
    totalAtualizados: number;
    totalIgnorados: number;
    totalErros: number;
    detalhes?: unknown;
  },
): Promise<void> {
  await execute(
    db,
    `UPDATE import_historico SET
      status = ?, total_importados = ?, total_atualizados = ?, total_ignorados = ?, total_erros = ?,
      detalhes_json = ?, concluido_em = datetime('now')
     WHERE id = ?`,
    [
      dado.status,
      dado.totalImportados,
      dado.totalAtualizados,
      dado.totalIgnorados,
      dado.totalErros,
      dado.detalhes ? JSON.stringify(dado.detalhes) : null,
      id,
    ],
  );
}
