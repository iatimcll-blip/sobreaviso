/**
 * Adaptador que expõe a mesma superfície usada de R2Bucket (put/get) sobre o Supabase Storage.
 * Mantém as ~7 chamadas a c.env.BUCKET.put/get nas rotas inalteradas.
 */

class SupabaseR2ObjectBody implements R2ObjectBody {
  constructor(private readonly blob: Blob) {}

  get body(): ReadableStream<Uint8Array> | null {
    return this.blob.stream() as ReadableStream<Uint8Array>;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.blob.arrayBuffer();
  }
}

class SupabaseStorageBucketAdapter implements R2Bucket {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly bucket: string,
  ) {}

  private cabecalhos(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      ...extra,
    };
  }

  async put(key: string, value: ArrayBuffer | Uint8Array | ArrayBufferView): Promise<void> {
    const corpo = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : value;
    const resposta = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${key}`, {
      method: 'POST',
      headers: this.cabecalhos({ 'x-upsert': 'true', 'Content-Type': 'application/octet-stream' }),
      body: corpo as BodyInit,
    });
    if (!resposta.ok) {
      throw new Error(`Falha ao gravar objeto no Supabase Storage (${resposta.status}): ${await resposta.text()}`);
    }
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const resposta = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${key}`, {
      headers: this.cabecalhos(),
    });
    if (resposta.ok) return new SupabaseR2ObjectBody(await resposta.blob());

    // O Storage do Supabase responde 400 (não 404) para objeto inexistente, com o status real
    // embutido no corpo JSON ({"statusCode":"404","error":"not_found",...}).
    if (resposta.status === 404) return null;
    const corpo = await resposta.text();
    if (resposta.status === 400) {
      try {
        const json = JSON.parse(corpo) as { statusCode?: string; error?: string };
        if (json.statusCode === '404' || json.error === 'not_found') return null;
      } catch {
        // corpo não é JSON — cai para o erro genérico abaixo
      }
    }
    throw new Error(`Falha ao ler objeto do Supabase Storage (${resposta.status}): ${corpo}`);
  }
}

let singleton: R2Bucket | undefined;

export function obterStorageSupabase(baseUrl: string, serviceRoleKey: string, bucket: string): R2Bucket {
  if (!singleton) {
    singleton = new SupabaseStorageBucketAdapter(baseUrl, serviceRoleKey, bucket);
  }
  return singleton;
}
