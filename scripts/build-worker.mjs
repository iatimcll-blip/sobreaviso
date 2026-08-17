import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/server/index.js',
  conditions: ['worker', 'browser'],
  logLevel: 'info',
});
