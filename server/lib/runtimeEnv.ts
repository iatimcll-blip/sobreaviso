import { obterBancoPostgres } from '../db/postgresAdapter';
import { obterStorageSupabase } from './supabaseStorageAdapter';
import type { Env } from '../types/env';

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida.`);
  return valor;
}

/** Constrói o Env (bindings) a partir de process.env — chamado uma vez por instância serverless. */
export function construirEnvRuntime(): Env {
  const databaseUrl = obrigatoria('DATABASE_URL');
  const supabaseUrl = obrigatoria('SUPABASE_URL');
  const supabaseServiceRoleKey = obrigatoria('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'sobreaviso-arquivos';

  return {
    DB: obterBancoPostgres(databaseUrl),
    BUCKET: obterStorageSupabase(supabaseUrl, supabaseServiceRoleKey, bucket),
    ENVIRONMENT: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    SESSION_SECRET: obrigatoria('SESSION_SECRET'),
  };
}
