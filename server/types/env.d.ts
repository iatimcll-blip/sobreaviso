export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  ENVIRONMENT: 'development' | 'production';
  SESSION_SECRET: string;
}
