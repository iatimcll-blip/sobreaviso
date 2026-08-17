// Cria o usuário administrador inicial no banco Postgres (Supabase) de desenvolvimento.
// Uso: tsx scripts/seed-dev.ts [username] [senha] [nomeCompleto]
import postgres from 'postgres';

const ITERACOES_PBKDF2 = 210_000;

function paraBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

async function gerarHashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const chaveBase = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const chaveDerivada = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERACOES_PBKDF2, hash: 'SHA-256' },
    chaveBase,
    256,
  );
  return `pbkdf2:${ITERACOES_PBKDF2}:${paraBase64(salt.buffer as ArrayBuffer)}:${paraBase64(chaveDerivada)}`;
}

const username = process.argv[2] ?? 'admin';
const senha = process.argv[3] ?? 'TrocarEsta$enha123';
const nomeCompleto = process.argv[4] ?? 'Administrador';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function main() {
  const hash = await gerarHashSenha(senha);
  await sql`
    INSERT INTO users (username, password_hash, role, nome_completo, ativo)
    VALUES (${username}, ${hash}, 'admin', ${nomeCompleto}, 1)
    ON CONFLICT (username) DO NOTHING
  `;
  console.log(`\nUsuário admin criado (ou já existente): "${username}" / senha: "${senha}"\nTroque essa senha assim que possível.`);
}

main()
  .catch((err) => {
    console.error('Falha ao inserir usuário administrador:', err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 1 }));
