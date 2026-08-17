import { readFileSync, readdirSync } from 'node:fs';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())`;

  const aplicadas = new Set((await sql`SELECT nome FROM _migrations`).map((r) => r.nome as string));
  const arquivos = readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) {
      console.log(`- ${arquivo} (já aplicada)`);
      continue;
    }
    const texto = readFileSync(`migrations/${arquivo}`, 'utf8');
    console.log(`> aplicando ${arquivo}...`);
    await sql.begin(async (tx) => {
      await tx.unsafe(texto);
      await tx`INSERT INTO _migrations (nome) VALUES (${arquivo})`;
    });
    console.log(`  ok`);
  }

  console.log('Migrations em dia.');
}

main()
  .catch((err) => {
    console.error('FALHA:', err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 1 }));
