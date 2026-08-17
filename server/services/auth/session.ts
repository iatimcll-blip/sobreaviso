export const NOME_COOKIE_SESSAO = 'sobreaviso_sessao';
const DURACAO_SESSAO_HORAS = 12;

function paraBase64Url(buffer: ArrayBuffer): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Token opaco de sessão — é o único valor guardado no cookie do navegador. */
export function gerarTokenSessao(): string {
  return paraBase64Url(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

/** SHA-256 do token — é o único valor persistido no banco (o token cru nunca é gravado). */
export async function hashTokenSessao(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return paraBase64Url(digest);
}

export function calcularExpiracaoSessao(agora: Date = new Date()): string {
  const expira = new Date(agora.getTime() + DURACAO_SESSAO_HORAS * 60 * 60 * 1000);
  return expira.toISOString().replace('T', ' ').slice(0, 19);
}

export function gerarIdSessao(): string {
  return crypto.randomUUID();
}
