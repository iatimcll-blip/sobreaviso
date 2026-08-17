export class ApiError extends Error {
  status: number;
  detalhes?: unknown;
  constructor(status: number, message: string, detalhes?: unknown) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const ehFormData = init.body instanceof FormData;
  const resposta = await fetch(`/api${caminho}`, {
    ...init,
    credentials: 'include',
    headers: ehFormData ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });

  const texto = await resposta.text();
  const corpo = texto ? JSON.parse(texto) : null;

  if (!resposta.ok) {
    throw new ApiError(resposta.status, corpo?.erro ?? 'Ocorreu um erro inesperado.', corpo?.detalhes);
  }
  return corpo as T;
}

/** Baixa um arquivo binário (ex.: exportação .xlsx) e dispara o download no navegador. */
async function baixarArquivo(caminho: string): Promise<void> {
  const resposta = await fetch(`/api${caminho}`, { credentials: 'include' });

  if (!resposta.ok) {
    const texto = await resposta.text();
    const corpo = texto ? JSON.parse(texto) : null;
    throw new ApiError(resposta.status, corpo?.erro ?? 'Não foi possível gerar o arquivo.', corpo?.detalhes);
  }

  const disposicao = resposta.headers.get('Content-Disposition') ?? '';
  const nomeArquivo = /filename="?([^";]+)"?/.exec(disposicao)?.[1] ?? 'exportacao.xlsx';

  const blob = await resposta.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>(caminho),
  post: <T>(caminho: string, dado?: unknown) =>
    requisitar<T>(caminho, { method: 'POST', body: dado !== undefined ? JSON.stringify(dado) : undefined }),
  put: <T>(caminho: string, dado: unknown) => requisitar<T>(caminho, { method: 'PUT', body: JSON.stringify(dado) }),
  patch: <T>(caminho: string, dado: unknown) => requisitar<T>(caminho, { method: 'PATCH', body: JSON.stringify(dado) }),
  delete: <T>(caminho: string) => requisitar<T>(caminho, { method: 'DELETE' }),
  postForm: <T>(caminho: string, form: FormData) => requisitar<T>(caminho, { method: 'POST', body: form }),
  baixarArquivo,
};
