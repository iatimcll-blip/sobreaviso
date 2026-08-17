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
  // CommonJS, não ESM: a lib xlsx faz require() dinâmico de módulos nativos do Node (ex.:
  // "stream") em tempo de execução, o que só funciona com o require nativo do CJS — o shim que o
  // esbuild gera para bundles ESM não cobre require dinâmico de built-ins.
  format: 'cjs',
  target: 'node22',
  // api/package.json força "type":"commonjs" pra esse diretório, então ".js" aqui já roda como
  // CJS mesmo com o resto do projeto sendo ESM. Nome fixo (sem colchetes): roteamento dinâmico por
  // nome de arquivo ("[...param]") é convenção do Next.js, não um recurso genérico de Vercel
  // Functions para projetos "outro framework" — o vercel.json redireciona /api/* pra cá via rewrite.
  outfile: 'api/index.js',
  logLevel: 'info',
});
