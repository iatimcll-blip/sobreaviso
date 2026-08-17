import app from './index';
import { construirEnvRuntime } from './lib/runtimeEnv';

const env = construirEnvRuntime();

export default {
  fetch(request: Request) {
    return app.fetch(request, env);
  },
};
