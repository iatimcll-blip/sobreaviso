import { execute } from '../client';

export interface RegistroAuditoria {
  entidade: string;
  entidadeId: number | null;
  acao: string;
  usuarioId: number | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
}

export async function registrarAuditoria(db: D1Database, registro: RegistroAuditoria): Promise<void> {
  await execute(
    db,
    'INSERT INTO auditoria (entidade, entidade_id, acao, usuario_id, dados_antes, dados_depois, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      registro.entidade,
      registro.entidadeId,
      registro.acao,
      registro.usuarioId,
      registro.dadosAntes ? JSON.stringify(registro.dadosAntes) : null,
      registro.dadosDepois ? JSON.stringify(registro.dadosDepois) : null,
      registro.ip ?? null,
    ],
  );
}
