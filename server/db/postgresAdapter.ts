import postgres from 'postgres';

/**
 * Adaptador que expõe a mesma superfície usada de D1Database (prepare/bind/all/first/run/batch)
 * sobre um Postgres real (Supabase). Mantém server/db/client.ts e as ~90 chamadas a c.env.DB
 * inalteradas — só o que constrói o binding muda.
 *
 * server/vercelHandler.ts chama obterBancoPostgres() uma única vez, no carregamento do módulo, e
 * reaproveita o mesmo objeto `env.DB` durante toda a vida da instância serverless (invocações
 * subsequentes reusam a mesma instância "morna"). Por isso o adaptador não pode simplesmente
 * trocar de identidade quando precisa reconectar — ele guarda o cliente Postgres atual numa
 * variável de módulo e sempre lê essa variável na hora de rodar uma query, permitindo reconectar
 * "por dentro" sem invalidar a referência que o Hono app já está segurando.
 */

function paraPlaceholdersPostgres(sqlText: string): string {
  let indice = 0;
  return sqlText.replace(/\?/g, () => `$${++indice}`);
}

function ehInsertSemReturning(sqlText: string): boolean {
  return /^\s*insert\s/i.test(sqlText) && !/\breturning\b/i.test(sqlText);
}

const TIMEOUT_QUERY_MS = 5000;

class QueryTimeoutError extends Error {
  constructor(sqlText: string) {
    super(`Consulta ao banco travou (sem resposta em ${TIMEOUT_QUERY_MS}ms): ${sqlText.slice(0, 120)}`);
    this.name = 'QueryTimeoutError';
  }
}

let connectionStringAtual: string | undefined;
let clienteAtual: postgres.Sql | undefined;

function criarCliente(connectionString: string): postgres.Sql {
  return postgres(connectionString, {
    ssl: 'require',
    // O dashboard sozinho já dispara ~8 chamadas em paralelo no carregamento (sidebar + anel de
    // cobertura somam mais algumas) — um pool de poucas conexões vira gargalo/contenção real e
    // aumenta a chance de bater no cenário de conexão travada tratado em comTimeout().
    max: 10,
    idle_timeout: 20,
    // Recicla conexões com frequência: o pooler "Transaction" do Supabase às vezes derruba uma
    // conexão do lado dele sem avisar o cliente, e o postgres.js só percebe na próxima tentativa
    // de uso — max_lifetime curto reduz a janela em que isso pode acontecer.
    max_lifetime: 45,
    connect_timeout: 10,
    connection: { statement_timeout: 15000 },
    // O pooler "Transaction" não garante a mesma conexão física entre idas ao servidor —
    // prepared statements (o padrão do postgres.js) ficam associados à conexão errada e
    // travam/falham de forma imprevisível. Desativar é a recomendação oficial do Supabase.
    prepare: false,
  });
}

function obterClienteAtual(): postgres.Sql {
  if (!clienteAtual) {
    if (!connectionStringAtual) throw new Error('obterBancoPostgres() precisa ser chamado antes de qualquer query.');
    clienteAtual = criarCliente(connectionStringAtual);
  }
  return clienteAtual;
}

/**
 * O pooler "Transaction" do Supabase às vezes derruba uma conexão do lado dele sem avisar o
 * cliente — a próxima query nessa conexão fica esperando resposta de um socket morto, sem erro,
 * sem timeout (TCP não percebe isso sozinho na escala de segundos). statement_timeout no Postgres
 * não ajuda aqui porque a query nunca chega a ser executada do lado do servidor. Por isso toda
 * query passa por essa corrida contra um timeout local — se estourar, descarta o cliente atual
 * (a próxima chamada a obterClienteAtual() abre uma conexão nova) em vez de continuar reusando
 * uma conexão morta pro resto da vida da instância serverless.
 */
async function comTimeout<T>(promessa: Promise<T>, sqlText: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promessa,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new QueryTimeoutError(sqlText)), TIMEOUT_QUERY_MS);
      }),
    ]);
  } catch (erro) {
    if (erro instanceof QueryTimeoutError) {
      const antigo = clienteAtual;
      clienteAtual = undefined;
      void antigo?.end({ timeout: 1 }).catch(() => {});
    }
    throw erro;
  } finally {
    clearTimeout(timer!);
  }
}

class D1PreparedStatementAdapter implements D1PreparedStatement {
  constructor(
    private readonly sqlText: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new D1PreparedStatementAdapter(this.sqlText, values);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const linhas = await comTimeout(
      obterClienteAtual().unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]),
      this.sqlText,
    );
    return { results: linhas as unknown as T[], meta: { last_row_id: 0, changes: linhas.length } };
  }

  async first<T = unknown>(): Promise<T | null> {
    const linhas = await comTimeout(
      obterClienteAtual().unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]),
      this.sqlText,
    );
    return (linhas[0] as T) ?? null;
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    if (ehInsertSemReturning(this.sqlText)) {
      const comRetorno = `${this.sqlText} RETURNING id`;
      const linhas = await comTimeout(
        obterClienteAtual().unsafe(paraPlaceholdersPostgres(comRetorno), this.params as never[]),
        comRetorno,
      );
      const lastRowId = Number((linhas[0] as { id?: number } | undefined)?.id ?? 0);
      return { results: linhas as unknown as T[], meta: { last_row_id: lastRowId, changes: linhas.length } };
    }
    const linhas = await comTimeout(
      obterClienteAtual().unsafe(paraPlaceholdersPostgres(this.sqlText), this.params as never[]),
      this.sqlText,
    );
    return { results: linhas as unknown as T[], meta: { last_row_id: 0, changes: linhas.length } };
  }
}

class PostgresD1Adapter implements D1Database {
  prepare(sqlText: string): D1PreparedStatement {
    return new D1PreparedStatementAdapter(sqlText);
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const resultados: D1Result<T>[] = [];
    for (const statement of statements) {
      resultados.push(await statement.run<T>());
    }
    return resultados;
  }
}

const adapterSingleton = new PostgresD1Adapter();

/**
 * O objeto retornado é estável durante toda a vida da instância serverless (o mesmo `env.DB` que
 * server/vercelHandler.ts captura uma única vez) — a reconexão acontece por dentro dele, nunca
 * trocando a referência que o resto do código guarda.
 */
export function obterBancoPostgres(connectionString: string): D1Database {
  connectionStringAtual = connectionString;
  return adapterSingleton;
}
