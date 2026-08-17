export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const resultado = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return resultado.results ?? [];
}

export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const resultado = await db
    .prepare(sql)
    .bind(...params)
    .first<T>();
  return resultado ?? null;
}

export async function execute(db: D1Database, sql: string, params: unknown[] = []): Promise<D1Result> {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

export async function executeBatch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1Result[]> {
  return db.batch(statements);
}
