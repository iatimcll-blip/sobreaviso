import app from '../server/index';
import { construirEnvRuntime } from '../server/lib/runtimeEnv';

const env = construirEnvRuntime();

export default {
  fetch(request: Request) {
    return app.fetch(request, env);
  },
};
