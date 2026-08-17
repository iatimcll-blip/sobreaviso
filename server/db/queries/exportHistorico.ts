import { execute, query } from '../client';

export interface RegistroExportHistorico {
  tipo: string;
  filtros: unknown;
  cicloReferencia: string | null;
  r2Key: string;
  nomeArquivo: string;
  usuarioId: number;
}

export async function criarExportHistorico(db: D1Database, registro: RegistroExportHistorico): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO export_historico (tipo, filtros_json, ciclo_referencia, r2_key, nome_arquivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
    [registro.tipo, JSON.stringify(registro.filtros ?? {}), registro.cicloReferencia, registro.r2Key, registro.nomeArquivo, registro.usuarioId],
  );
  return Number(resultado.meta.last_row_id);
}

export interface ExportHistoricoRow {
  id: number;
  tipo: string;
  filtros_json: string | null;
  ciclo_referencia: string | null;
  r2_key: string;
  nome_arquivo: string;
  usuario_id: number;
  gerado_em: string;
}

export async function listarExportHistorico(db: D1Database, tipo?: string): Promise<ExportHistoricoRow[]> {
  const where = tipo ? 'WHERE tipo = ?' : '';
  return query<ExportHistoricoRow>(db, `SELECT * FROM export_historico ${where} ORDER BY gerado_em DESC LIMIT 50`, tipo ? [tipo] : []);
}
