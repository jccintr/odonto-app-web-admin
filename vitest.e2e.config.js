import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Ponta a ponta: o app React inteiro (jsdom) falando com a API REAL e um PostgreSQL embutido (api/src/scripts/demo-server.js).
// Pré-requisito: `npm install` na pasta da API. Variável E2E_API_DIR muda onde a API está (padrão: ../api).
export default defineConfig((env) => mergeConfig(viteConfig(env), defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    globalSetup: ['./tests/e2e/globalSetup.js'],
    setupFiles: ['./tests/setup.js', './tests/e2e/setup.js'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
})));
