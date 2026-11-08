import { configure } from '@testing-library/react';
import { inject } from 'vitest';

// a API é de verdade (banco incluso): as esperas dos testes são mais generosas que o padrão de 1 s
configure({ asyncUtilTimeout: 5000 });

// O app chama a API por caminho relativo (/api/...). Nos testes, esses caminhos vão para a API de demonstração.
const apiUrl = inject('apiUrl');
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => realFetch(typeof input === 'string' && input.startsWith('/') ? `${apiUrl}${input}` : input, init);
