import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// Testes rápidos (funções, cliente da API, componentes isolados). Os de ponta a ponta ficam em vitest.e2e.config.js.
export default defineConfig((env) => mergeConfig(viteConfig(env), defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      // lógica pura e peças reutilizáveis têm cobertura total; telas e demais componentes são exercitados pelos testes de ponta a ponta (npm run test:e2e)
      include: ['src/lib/**', 'src/api/client.js', 'src/components/{MoneyInput,ToothFacesPicker,Odontogram,BarChart}.jsx', 'src/context/ThemeContext.jsx'],
      reporter: ['text'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})));
