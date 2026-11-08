// Sobe a API de demonstração (PostgreSQL embutido + dados) e entrega a URL aos testes.
import { spawn } from 'node:child_process';
import path from 'node:path';

export default async function setup({ provide }) {
  const apiDir = path.resolve(process.env.E2E_API_DIR ?? '../api');
  const child = spawn(process.execPath, ['src/scripts/demo-server.js', '--json'], { cwd: apiDir, stdio: ['ignore', 'pipe', 'pipe'] });
  let errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });

  const info = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error(`A API de demonstração não subiu em 90 s.\n${errors}`)), 90_000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const line = buffer.split('\n').find((l) => l.startsWith('{'));
      if (line) { clearTimeout(timer); resolve(JSON.parse(line)); }
    });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`A API de demonstração encerrou (código ${code}). Rodou "npm install" na pasta da API?\n${errors}`)); });
  });

  provide('apiUrl', info.url);
  provide('demo', info.demo);
  return async () => {
    child.removeAllListeners('exit');
    child.kill('SIGTERM');
    await new Promise((resolve) => { child.on('exit', resolve); setTimeout(resolve, 8000); });
  };
}
