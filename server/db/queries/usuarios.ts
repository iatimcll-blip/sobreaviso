import type { PapelUsuario, Usuario } from '../../../shared/types/usuario';
import type { PermissaoTela, Tela } from '../../../shared/types/permissao';
import { execute, query, queryOne } from '../client';

interface UsuarioRow {
  id: number;
  username: string;
  role: PapelUsuario;
  nome_completo: string;
  colaborador_id: number | null;
  ativo: number;
  ultimo_login_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

interface UsuarioComSenhaRow extends UsuarioRow {
  password_hash: string;
}

interface PermissaoRow {
  tela: Tela;
  pode_visualizar: number;
  pode_criar: number;
  pode_editar: number;
  pode_excluir: number;
  pode_exportar: number;
  pode_importar: number;
}

function mapUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    nomeCompleto: row.nome_completo,
    colaboradorId: row.colaborador_id,
    ativo: row.ativo === 1,
    ultimoLoginEm: row.ultimo_login_em,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

function mapPermissao(row: PermissaoRow): PermissaoTela {
  return {
    tela: row.tela,
    podeVisualizar: row.pode_visualizar === 1,
    podeCriar: row.pode_criar === 1,
    podeEditar: row.pode_editar === 1,
    podeExcluir: row.pode_excluir === 1,
    podeExportar: row.pode_exportar === 1,
    podeImportar: row.pode_importar === 1,
  };
}

export async function buscarUsuarioComSenhaPorUsername(
  db: D1Database,
  username: string,
): Promise<(Usuario & { passwordHash: string }) | null> {
  const row = await queryOne<UsuarioComSenhaRow>(db, 'SELECT * FROM users WHERE UPPER(username) = UPPER(?)', [username.trim()]);
  if (!row) return null;
  return { ...mapUsuario(row), passwordHash: row.password_hash };
}

export async function buscarUsuarioPorId(db: D1Database, id: number): Promise<Usuario | null> {
  const row = await queryOne<UsuarioRow>(db, 'SELECT * FROM users WHERE id = ?', [id]);
  return row ? mapUsuario(row) : null;
}

export async function listarUsuarios(db: D1Database): Promise<Usuario[]> {
  const rows = await query<UsuarioRow>(db, 'SELECT * FROM users ORDER BY nome_completo ASC');
  return rows.map(mapUsuario);
}

export async function listarPermissoes(db: D1Database, usuarioId: number): Promise<PermissaoTela[]> {
  const rows = await query<PermissaoRow>(db, 'SELECT * FROM user_permissions WHERE user_id = ?', [usuarioId]);
  return rows.map(mapPermissao);
}

export async function criarUsuario(
  db: D1Database,
  dado: { username: string; passwordHash: string; role: PapelUsuario; nomeCompleto: string; colaboradorId: number | null; ativo: boolean },
): Promise<number> {
  const resultado = await execute(
    db,
    'INSERT INTO users (username, password_hash, role, nome_completo, colaborador_id, ativo) VALUES (?, ?, ?, ?, ?, ?)',
    [dado.username, dado.passwordHash, dado.role, dado.nomeCompleto, dado.colaboradorId, dado.ativo ? 1 : 0],
  );
  return Number(resultado.meta.last_row_id);
}

export async function atualizarUsuario(
  db: D1Database,
  id: number,
  dado: { role: PapelUsuario; nomeCompleto: string; colaboradorId: number | null; ativo: boolean },
): Promise<void> {
  await execute(
    db,
    `UPDATE users SET role = ?, nome_completo = ?, colaborador_id = ?, ativo = ?, atualizado_em = datetime('now') WHERE id = ?`,
    [dado.role, dado.nomeCompleto, dado.colaboradorId, dado.ativo ? 1 : 0, id],
  );
}

export async function atualizarSenha(db: D1Database, id: number, passwordHash: string): Promise<void> {
  await execute(db, `UPDATE users SET password_hash = ?, atualizado_em = datetime('now') WHERE id = ?`, [passwordHash, id]);
}

export async function registrarUltimoLogin(db: D1Database, id: number): Promise<void> {
  await execute(db, `UPDATE users SET ultimo_login_em = datetime('now') WHERE id = ?`, [id]);
}

export async function substituirPermissoes(db: D1Database, usuarioId: number, permissoes: PermissaoTela[]): Promise<void> {
  await execute(db, 'DELETE FROM user_permissions WHERE user_id = ?', [usuarioId]);
  for (const permissao of permissoes) {
    await execute(
      db,
      `INSERT INTO user_permissions
        (user_id, tela, pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_exportar, pode_importar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        permissao.tela,
        permissao.podeVisualizar ? 1 : 0,
        permissao.podeCriar ? 1 : 0,
        permissao.podeEditar ? 1 : 0,
        permissao.podeExcluir ? 1 : 0,
        permissao.podeExportar ? 1 : 0,
        permissao.podeImportar ? 1 : 0,
      ],
    );
  }
}
