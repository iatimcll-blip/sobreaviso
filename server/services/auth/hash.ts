const ITERACOES_PBKDF2 = 210_000;
const TAMANHO_SALT_BYTES = 16;
const TAMANHO_CHAVE_BITS = 256;

function paraBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function deBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function derivarChave(senha: string, salt: Uint8Array, iteracoes: number): Promise<ArrayBuffer> {
  const chaveBase = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: iteracoes, hash: 'SHA-256' },
    chaveBase,
    TAMANHO_CHAVE_BITS,
  );
}

/** Gera um hash PBKDF2-SHA256 no formato "pbkdf2:<iterações>:<salt base64>:<chave derivada base64>". */
export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(TAMANHO_SALT_BYTES));
  const chaveDerivada = await derivarChave(senha, salt, ITERACOES_PBKDF2);
  return `pbkdf2:${ITERACOES_PBKDF2}:${paraBase64(salt.buffer as ArrayBuffer)}:${paraBase64(chaveDerivada)}`;
}

function comparacaoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  const partes = hashArmazenado.split(':');
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false;
  const [, iteracoesTexto, saltBase64, chaveBase64] = partes;
  const iteracoes = Number(iteracoesTexto);
  if (!Number.isFinite(iteracoes) || iteracoes <= 0) return false;

  const salt = deBase64(saltBase64);
  const chaveEsperada = deBase64(chaveBase64);
  const chaveCalculada = new Uint8Array(await derivarChave(senha, salt, iteracoes));
  return comparacaoConstante(chaveCalculada, chaveEsperada);
}
