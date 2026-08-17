import postgres from 'postgres';

/**
 * Adaptador que expõe a mesma superfície usada de D1Database (prepare/bind/all/first/run/batch)
 * sobre um Postgres real (Supabase). Mantém server/db/client.ts e as ~90 chamadas a c.env.DB
 * inalteradas — só o que constrói o binding muda.
 */

function paraPlaceholdersPostgres(sqlText: string): string {
  let indice = 0;
  return sqlText.replace(/\?/g, () => `$${++indice}`);
}

function ehInsertSemReturning(sqlText: string): boolean {
  return /^\s*insert\s/i.test(sqlText) && !/\breturning\b/i.test(sqlText);
}

class D1PreparedStatementAdapter implements D1PreparedStatement {
  constructor(
    private readonly client: postgres.Sql,
    private readonly sqlText: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new D1PreparedStatementAdapter(this.client, this.sqlText, values);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const linhas = await this.client.unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]);
    return { results: linhas as unknown as T[], meta: { last_row_id: 0, changes: linhas.length } };
  }

  async first<T = unknown>(): Promise<T | null> {
    const linhas = await this.client.unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]);
    return (linhas[0] as T) ?? null;
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    if (ehInsertSemReturning(this.sqlText)) {
      const comRetorno = `${this.sqlText} RETURNING id`;
      const linhas = await this.client.unsafe(paraPlaceholdersPostgres(comRetorno), this.params as never[]);
      const lastRowId = Number((linhas[0] as { id?: number } | undefined)?.id ?? 0);
      return { results: linhas as unknown as T[], meta: { last_row_id: lastRowId, changes: linhas.length } };
    }
    const linhas = await this.client.unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]);
    return { results: linhas as unknown as T[], meta: { last_row_id: 0, changes: linhas.length } };
  }
}

class PostgresD1Adapter implements D1Database {
  constructor(private readonly client: postgres.Sql) {}

  prepare(sqlText: string): D1PreparedStatement {
    return new D1PreparedStatementAdapter(this.client, sqlText);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const resultados: D1Result<T>[] = [];
    for (const statement of statements) {
      resultados.push(await statement.run<T>());
    }
    return resultados;
  }
}

let clientSingleton: postgres.Sql | undefined;
let adapterSingleton: D1Database | undefined;

/** Reaproveita a mesma conexão (pool) entre invocações a frio de uma mesma instância serverless. */
export function obterBancoPostgres(connectionString: string): D1Database {
  if (!adapterSingleton) {
    clientSingleton = postgres(connectionString, {
      ssl: 'require',
      max: 3,
      idle_timeout: 20,
      // Recicla conexões periodicamente: conexões longas demais através do pooler do Supabase
      // eventualmente ficam "mudas" (o pooler derruba do lado dele sem avisar o cliente) e uma
      // query nessa conexão trava até o statement_timeout do servidor, em vez de falhar rápido.
      max_lifetime: 60 * 3,
      connect_timeout: 10,
      // Pede um statement_timeout curto por sessão: preferível falhar rápido e com erro claro a
      // travar por até 2 minutos numa conexão problemática.
      connection: { statement_timeout: 15000 },
      // O Supabase "Transaction pooler" (pgbouncer) não garante a mesma conexão física entre
      // idas ao servidor — prepared statements (o padrão do postgres.js) ficam associados à
      // conexão errada e travam/falham de forma silenciosa. Desativar é a recomendação oficial
      // do Supabase para uso via pooler.
      prepare: false,
    });
    adapterSingleton = new PostgresD1Adapter(clientSingleton);
  }
  return adapterSingleton;
}
