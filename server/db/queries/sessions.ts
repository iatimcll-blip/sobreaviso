import { execute, queryOne } from '../client';

export interface NovaSessao {
  id: string;
  userId: number;
  tokenHash: string;
  expiraEm: string;
  userAgent: string | null;
  ip: string | null;
}

export async function criarSessao(db: D1Database, sessao: NovaSessao): Promise<void> {
  await execute(
    db,
    'INSERT INTO sessions (id, user_id, token_hash, expira_em, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?)',
    [sessao.id, sessao.userId, sessao.tokenHash, sessao.expiraEm, sessao.userAgent, sessao.ip],
  );
}

export async function buscarUsuarioIdPorSessaoAtiva(db: D1Database, tokenHash: string): Promise<number | null> {
  const row = await queryOne<{ user_id: number }>(
    db,
    `SELECT user_id FROM sessions
     WHERE token_hash = ? AND revogado_em IS NULL AND expira_em > datetime('now')`,
    [tokenHash],
  );
  return row?.user_id ?? null;
}

export async function revogarSessao(db: D1Database, tokenHash: string): Promise<void> {
  await execute(db, `UPDATE sessions SET revogado_em = datetime('now') WHERE token_hash = ?`, [tokenHash]);
}

export async function revogarSessoesDoUsuario(db: D1Database, userId: number): Promise<void> {
  await execute(db, `UPDATE sessions SET revogado_em = datetime('now') WHERE user_id = ? AND revogado_em IS NULL`, [userId]);
}
