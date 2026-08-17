import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

// A Vercel roda um passo de análise via TypeScript sobre arquivos .ts dentro de /api, e a versão
// nativa (Go) do TypeScript 7 usada neste projeto não expõe a mesma API que o builder deles espera
// (falha com "Cannot read properties of undefined (reading 'readFile')"). Pré-compilamos o handler
// pra JS puro e autocontido, então a Vercel nunca precisa tocar em TypeScript dentro de /api.

await mkdir('api', { recursive: true });

await build({
  entryPoints: ['server/vercelHandler.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'api/[...route].js',
  logLevel: 'info',
});
