import { serve } from '@hono/node-server';
import app from '../server/index';
import { construirEnvRuntime } from '../server/lib/runtimeEnv';

// Rede de segurança para dev local: se um cliente desconectar antes de uma query terminar
// (ex.: timeout do lado do cliente), a promise pode rejeitar depois que ninguém mais está
// aguardando ela, derrubando o processo inteiro. Aqui só logamos e seguimos servindo.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

const env = construirEnvRuntime();
const porta = Number(process.env.PORT ?? 8787);

serve({ fetch: (req) => app.fetch(req, env), port: porta }, (info) => {
  console.log(`Servidor local (Node) pronto em http://localhost:${info.port}`);
});
