declare global {
  interface D1Result<T = unknown> {
    results: T[];
    meta: { last_row_id: number; changes: number };
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    all<T = unknown>(): Promise<D1Result<T>>;
    first<T = unknown>(): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  }

  interface R2ObjectBody {
    readonly body: ReadableStream<Uint8Array> | null;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  interface R2Bucket {
    put(key: string, value: ArrayBuffer | Uint8Array | ArrayBufferView): Promise<void>;
    get(key: string): Promise<R2ObjectBody | null>;
  }
}

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ENVIRONMENT: 'development' | 'production';
  SESSION_SECRET: string;
}
