import type { Env } from '../types/env';

export function isDev(env: Env): boolean {
  return env.ENVIRONMENT !== 'production';
}
