// Cria o usuário administrador inicial no banco D1 local (wrangler dev --local).
// Uso: node scripts/seed-dev.mjs [username] [senha] [nomeCompleto]
import { spawnSync } from 'node:child_process';

const ITERACOES_PBKDF2 = 210_000;

function paraBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function gerarHashSenha(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const chaveBase = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const chaveDerivada = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERACOES_PBKDF2, hash: 'SHA-256' },
    chaveBase,
    256,
  );
  return `pbkdf2:${ITERACOES_PBKDF2}:${paraBase64(salt.buffer)}:${paraBase64(chaveDerivada)}`;
}

const username = process.argv[2] ?? 'admin';
const senha = process.argv[3] ?? 'TrocarEsta$enha123';
const nomeCompleto = process.argv[4] ?? 'Administrador';

const hash = await gerarHashSenha(senha);
const sql = `INSERT OR IGNORE INTO users (username, password_hash, role, nome_completo, ativo) VALUES ('${username}', '${hash}', 'admin', '${nomeCompleto.replace(/'/g, "''")}', 1);`;

const sqlEscapado = sql.replace(/"/g, '\\"');
const comando = `npx wrangler d1 execute sobreaviso-db --local --command "${sqlEscapado}"`;
const resultado = spawnSync(comando, { stdio: 'inherit', shell: true });

if (resultado.status !== 0) {
  console.error('Falha ao inserir usuário administrador. Confira se as migrations locais já foram aplicadas (npm run db:migrate:local).');
  process.exit(resultado.status ?? 1);
}

console.log(`\nUsuário admin criado (ou já existente): "${username}" / senha: "${senha}"\nTroque essa senha assim que possível.`);
