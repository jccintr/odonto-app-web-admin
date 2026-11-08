# OdontoApp — app web da secretária e da administração

React 19 + Vite + Tailwind 4 (JavaScript), no mesmo padrão dos outros painéis web. Fala com a API da pasta `../api`.
Tema **claro e escuro** (botão no topo; começa pelo que o aparelho prefere e lembra a escolha). Funciona em celular, tablet e computador.

## Rodando

```bash
# 1) API de demonstração (PostgreSQL embutido, nada para instalar) — na pasta api
npm install
npm run demo          # imprime a URL e os logins; Ctrl+C encerra e apaga os dados

# 2) App web — nesta pasta
npm install
npm run dev           # http://localhost:5173  (o Vite encaminha /api para http://localhost:3000)
```

Logins da demonstração: `admin@sorriso.test` / `senha-do-admin-123` (administradora) e `secretaria@sorriso.test` / `senha-da-secretaria-1`.

Para usar a API com o **seu** banco (Railway/local), rode a API normalmente (`npm run dev` na pasta `api`) e, aqui, `npm run dev`. Se a API não estiver em `localhost:3000`, defina `VITE_API_PROXY` no `.env`.

## Quem vê o quê

| Tela | Administrador | Secretária |
| --- | --- | --- |
| Painel, Agenda, Pacientes (ficha, anamnese, atendimentos, orçamentos, pagamentos, imagens — consulta), Orçamentos, Financeiro, Avisos (consulta) | sim | sim |
| Procedimentos | edita (vê o custo) | só consulta |
| Odontograma e imagens (marcar, enviar, remover), registrar procedimento realizado, estornar pagamento recebido | sim | não (consulta) |
| Repasse, Relatórios, Equipe, Configurações, configurar avisos | sim | não |

O **dentista** usa o aplicativo no celular/tablet; se entrar aqui, vê um aviso. As regras de verdade ficam na API (a tela só esconde o que a pessoa não pode usar).

## Telas

- **Painel:** atendimentos de hoje, amanhã, pagamentos vencidos, orçamentos em aberto. Para secretária e administração, a **Lista de trabalho**: aprovados sem consulta marcada (botão agenda direto), orçamentos aguardando resposta e inadimplentes com consulta.
- **Agenda:** dia (uma coluna por dentista) e semana; novo agendamento, remarcar, confirmar, faltou, cancelar com motivo (iniciar e marcar como atendido é do dentista, no app, registrando o que foi feito; a secretária vê o bloqueio por inadimplência e o administrador libera); lembrete por e-mail e link de WhatsApp.
- **Pacientes:** busca por nome/CPF/telefone; cadastro com máscaras e validação (CPF, telefone, CEP); ficha com abas (Dados, Anamnese, Odontograma — com a camada **Planejado**: contorno tracejado para o aprovado e pontilhado para o proposto —, Atendimentos, **Prontuário** — só administração, leitura —, Orçamentos, Pagamentos, Imagens); **imprimir ficha com ou sem odontograma**.
- **Orçamentos:** **o web não cria nem altera itens**: quem avalia e lista os procedimentos (dente, faces) é o dentista, no aplicativo, e o **preço é sempre o da tabela da clínica** (a negociação é o desconto da aprovação). A secretária registra a aprovação/recusa do paciente; **rodadas de aprovação** (o paciente aprova alguns itens, com desconto e parcelas próprios; botão de desconto à vista conforme a configuração da clínica; o orçamento fica "Em tratamento" enquanto houver item a realizar); parcelas e recebimentos; enviar por e-mail/WhatsApp; imprimir.
- **Financeiro:** vencidas, a receber, recebidas; receber, cancelar/estornar.
- **Imagens:** envio direto ao Cloudinary (a API assina), até 10 MB, JPG/PNG/WEBP/HEIC.
- **Repasse:** saldos por dentista e pagamento, lançamentos, fechamentos (desfazer), regras por procedimento, configuração.
- **Relatórios:** resumo do mês (caixa, produção, agenda, orçamentos, repasse, por dentista) e evolução de 6 meses.
- **Cadastro (`/cadastro`):** qualquer clínica se cadastra sozinha: escolhe o modelo (Clínica geral, Ortodontia ou vazia), aceita os Termos de Uso e a Política de Privacidade (`/termos`, `/privacidade`) e começa em teste grátis. Captcha Turnstile opcional.
- **Assinatura (`/assinatura`, administrador):** planos e preços, fatura em aberto com **QR Code e Pix "copia e cola"**, botão "Já paguei" (o dono da plataforma confere e confirma) e histórico. Aviso de teste/atraso no topo do painel; com a assinatura **suspensa** só ficam abertas a Assinatura e a Minha conta.
- **Primeiros passos (Painel):** checklist da clínica nova (conferir preços de exemplo, equipe, primeiro paciente, primeira consulta).
- **Minha conta → Meus dados e privacidade (LGPD):** exportar todos os dados em JSON e pedir (ou cancelar) a exclusão da conta.
- **Tela de entrada:** foto do consultório (`public/login-hero.jpg`) em tela cheia no painel lateral e como faixa no topo no celular. Para trocar, substitua o arquivo ou defina `VITE_LOGIN_HERO_URL`.

## Estrutura

```
src/
  api/        client.js (token, renovação automática da sessão) e index.js (uma função por rota da API)
  context/    Auth, Tema, UI (avisos na tela e confirmações)
  components/ ui.jsx (botões, campos, modal…), AppShell, Odontogram (SVG), formulários e janelas
  hooks/      useResource (carregar dados), useDebounced
  lib/        dinheiro, datas (fuso de Brasília), máscaras, dentes, paciente, upload
  pages/      uma por tela (pages/patient e pages/payouts guardam as abas)
tests/
  unit/       funções e componentes isolados (npm test)
  e2e/        o app inteiro contra a API real (npm run test:e2e)
```

## Testes

```bash
npm test            # unitários, com cobertura de 100% da lógica (lib, cliente da API, peças reutilizáveis)
npm run test:e2e    # ponta a ponta: sobe a API de demonstração (../api) e usa o app React inteiro contra ela
```

Os testes de ponta a ponta usam a API **de verdade** com um PostgreSQL embutido: login, cadastro, agenda (inclusive conflito de horário), orçamento→parcelas→recebimento,
odontograma, repasse, relatórios, perfis. Precisam do `npm install` feito na pasta `api`. Se a API estiver em outro lugar: `E2E_API_DIR=../outra-pasta npm run test:e2e`.
Não testam o envio real ao Cloudinary nem e-mails (sem chaves/SMTP no ambiente de teste); a tela mostra uma mensagem clara quando o servidor não tem as chaves.

## Publicação (Vercel)

`vercel.json` já reescreve todas as rotas para `index.html`. Variável `VITE_API_URL` = endereço da API em produção.
Na API, defina `CORS_ORIGINS` com o endereço do app web e `WEB_URL` com ele também (é usado nos links dos e-mails de confirmação e de redefinição de senha: `/verificar-email` e `/redefinir-senha`).
