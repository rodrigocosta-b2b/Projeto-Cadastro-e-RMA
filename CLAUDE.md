# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (Vite) — usa fallback localStorage (sem worker)
npm run build    # build de produção em dist/
```

Não há testes, linter ou formatador configurados. A UI e os textos são em português (pt-BR).

**Deploy (GoDeploy):** app `gocase-service-desk` (id `4ff9134d`). O cliente **precisa ser pré-buildado** (`npm run build`) — o bundler de cliente do GoDeploy (`client: [...]`) estoura o tempo com este SPA (react + recharts), então **não** publique a partir do `.jsx` cru; suba o `dist/`. O worker (`src/server.js`), por não ter dependências pesadas, compila instantaneamente no GoDeploy.

Fluxo (numa máquina com Node):
```bash
npm install && npm run build     # gera dist/index.html + dist/assets/*
# 1) getUploadToken → { uploadToken, uploadUrl }
# 2) subir dist/ (como index.html + assets/*) e o worker:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "index.html=@dist/index.html" \
  -F "assets/<hash>.js=@dist/assets/<hash>.js" \
  -F "src/server.js=@src/server.js" "$UPLOAD_URL"
# 3) updateApp({ appId: "4ff9134d", uploadId, entrypoint: "src/server.js",
#               assets: ["index.html", "assets/<hash>.js", ...] })
```
Sem `assetConfig.not_found_handling: "single-page-application"` — o app não usa roteamento por URL, e o SPA-fallback sombrearia as rotas `/api/*`. Ver seção **Backend / banco de dados nativo**.

> ⚠️ **Nunca faça deploy a partir de código não-mergeado.** O deploy no GoDeploy só acontece a partir da branch `main` já atualizada (após `git pull`) e com o PR da mudança **mergeado**. Ver seção **Fluxo de trabalho com Git**.

## Fluxo de trabalho com Git (OBRIGATÓRIO)

**Toda mudança de código passa por branch → PR → merge → deploy.** Nunca comite direto na `main`, nunca faça deploy de trabalho não-mergeado. Este fluxo é obrigatório — siga-o sem precisar perguntar.

- **O Claude executa os comandos Git/`gh` diretamente** (via a ferramenta Bash/PowerShell), sem pedir ao usuário para rodá-los. Faça o ciclo completo por conta própria — criar branch, commitar, `push`, abrir o PR (`gh pr create`), dar `pull` antes do merge e mergear (`gh pr merge`) — e só pare para confirmação em ações destrutivas ou irreversíveis (ex.: `push --force`, apagar branch remota, deploy em produção). Não é preciso pedir permissão a cada `git`/`gh` de rotina.
- **Repositório:** [rodrigocosta-b2b/Projeto-Cadastro-e-RMA](https://github.com/rodrigocosta-b2b/Projeto-Cadastro-e-RMA) (remote `origin`, branch padrão `main`).
- **Git já está configurado globalmente:** `user.name`/`user.email` definidos e `credential.helper=manager` (Git Credential Manager) cuida da autenticação no push.
- **`gh` (GitHub CLI) instalado e autenticado globalmente.** Use-o para criar e mergear PRs por linha de comando: `gh pr create --fill --base main`, `gh pr merge --squash --delete-branch`, `gh pr status`. O `gh` também serve de credential helper do Git para HTTPS.

**Passo a passo de cada mudança:**

```bash
# 1) Partir da main atualizada
git checkout main
git pull origin main                    # SEMPRE dê pull antes de começar

# 2) Criar a branch da mudança (prefixos: feat/, fix/, chore/, docs/)
git checkout -b feat/descricao-curta

# 3) Fazer as alterações, commitar
git add -A
git commit -m "mensagem descritiva em pt-BR"

# 4) Publicar a branch e abrir o PR
git push -u origin feat/descricao-curta
gh pr create --fill --base main         # abre o Pull Request pela CLI

# 5) ANTES do merge: SEMPRE dar pull para integrar o que entrou na main
git checkout main
git pull origin main
git checkout feat/descricao-curta
git merge main                          # resolver conflitos aqui, se houver
git push                                # atualiza o PR

# 6) Mergear o PR na main
gh pr merge --squash --delete-branch    # merge + remove a branch já integrada

# 7) SÓ ENTÃO fazer o deploy — a partir da main mergeada e atualizada
git checkout main
git pull origin main
npm install && npm run build            # ver seção Deploy (GoDeploy)
```

**Regras invioláveis:**
1. Nenhum commit direto na `main` — toda mudança nasce numa branch.
2. Toda branch vira um **Pull Request** antes de entrar na `main`.
3. **Sempre `git pull` antes do merge** (passo 5) — a `main` precisa estar integrada na branch antes de mergear.
4. O PR precisa estar **mergeado na `main`** antes de qualquer deploy no GoDeploy.
5. Não versionar `node_modules/`, `dist/` nem segredos (`.env*`) — ver `.gitignore`.

## Visão geral

Service Desk / portal RMA da **gocase**: uma SPA React (Vite) para revendedores abrirem solicitações de **Troca/Garantia** (TG) e **Cadastro** de novos revendedores, e para a equipe interna gerenciá-las. É um app **full-stack no GoDeploy**: a SPA (front-end) conversa com um worker (`src/server.js`) que grava **todo registro no banco de dados nativo do GoDeploy** (SQLite, `env.DB`).

O front-end fica praticamente **todo em um único arquivo: `src/App.jsx`** (~3.000 linhas). `src/main.jsx` só monta o `<App/>`. O backend é o `src/server.js`. Tailwind vem via CDN em `index.html`; ícones de `lucide-react`; gráficos de `recharts`.

O arquivo é organizado em seções demarcadas por comentários `/* ===== ... ===== */` — use-os para navegar (Brand tokens, Mock data, UI atoms, Contas & persistência, Login, Shell, SLA helpers, Detalhe, External screens, Internal screens, Modal, Histórico, Acervo, Root).

## Arquitetura

**Dois portais, um app.** O estado vive no componente `App()` (final do arquivo). `portal` é `"externo"` (revendedor) ou `"interno"` (equipe gocase); `view` é a tela atual. O roteamento é um switch manual no fim de `App()` que mapeia `view` → componente, com `nav(view, id)` trocando de tela. Telas do revendedor têm prefixo `Ext*` (`ExtInicio`, `ExtNovaTG`, `ExtNovaCad`, `ExtMinhas`); telas internas são `IntDash`, `IntLista`, `Clientes`, `Usuarios`, `Relatorios`, `Config`, etc.

**Papéis.** `ADMIN`, `GESTOR`, `COLABORADOR` são internos (`isInterno()`); `CLIENTE` é externo. Só internos podem trocar para o portal interno. A aba "Acervo de documentos" é restrita a `ADMIN`/`GESTOR`.

**Autenticação.** Login e cadastro são validados **no servidor** (`POST /api/login`, `POST /api/signup`); o cliente nunca recebe as senhas de outras contas (a API sempre devolve o usuário sem `password`). As senhas ainda são guardadas em texto puro no banco — é uma demo; hash/JWT ficam para depois. O gateway do GoDeploy já exige login Google (visibilidade `authenticated`) antes de a app carregar; o e-mail autenticado chega ao worker no header `X-Godeploy-User-Email` (disponível para escopo por usuário no futuro).

**Persistência — banco nativo do GoDeploy (`env.DB`, SQLite).** Todo registro é gravado individualmente (uma linha por entidade, sem sobrescrever arrays inteiros) via o módulo `db` do `src/App.jsx`, que fala com a API do worker. O modo é detectado uma vez por sessão (`GET /api/health`): com worker → **remoto** (banco); sem worker (dev/preview) → **local** (`localStorage`, mesmas chaves antigas `gocase_*`). Hidratação inicial numa única chamada `GET /api/bootstrap`; se o banco está vazio, o cliente semeia `SEED_USERS`, `DEFAULT_TEMPLATES` e `DEFAULT_ACERVO`. `SEED`, `CLIENTES`, `USUARIOS`, `HISTORICO` seguem sendo mock só de tela.

**Solicitações (requests)** têm `status` (ver constante `STATUS`), `sla` (`STATUS`/`SLA`), uma timeline de `movimentos`, e um `chat`. Ao mudar de status (`confirmModal`) o app registra o movimento, dispara notificações internas/externas e um e-mail-modelo. Uma nova mensagem do cliente em chamado finalizado **reabre** automaticamente o chamado (`reopenRequest`).

**Notificações** ficam em um único array com `audience: "interno" | "externo"`; a filtragem por destinatário acontece na renderização (`visibleNotifs`).

**Pré-análise por IA (regra simples):** no envio de uma TG (`ExtNovaTG`), o app compara a data de venda ao cliente final com hoje — se passou de **6 meses**, a solicitação já nasce `NEGADA` com `resp: "IA"`; caso contrário entra `EM_ANALISE`.

**Tema:** um objeto de paleta **mutável** `C` é reescrito por `applyPalette()` a partir de `LIGHT`/`DARK`; `resolveTheme` trata `"auto"` (escuro das 18h às 6h). Ao editar cores, altere `LIGHT`/`DARK`, não `C`. Cores de marca (coral, yellow, cyan, violet, green) não mudam entre temas.

## Backend / banco de dados nativo (GoDeploy)

O worker `src/server.js` é o `entrypoint` do app no GoDeploy. O gateway serve os assets estáticos primeiro; o worker trata só as rotas `/api/*`. Todo dado mora no `env.DB` (SQLite nativo, até 10 GB, 2 MB por linha).

**Tabelas** (criadas com `CREATE TABLE IF NOT EXISTS` no primeiro request): `users` (colunas reais: email, password, name, role, status, cnpj, telefone, contato), `requests` (id + colunas indexáveis owner_email/status/tipo/updated_ts + `payload` JSON com o objeto completo), `notifications` (id + audience/for_user_email/read/ts + `payload`), `acervo` (id + `payload`), `kv` (singletons, ex.: `templates`), `files` + `file_chunks` (arquivos em pedaços base64 de ≤700 KB por linha).

**Endpoints:** `GET /api/health`, `GET /api/bootstrap`, `POST /api/login`, `POST /api/signup`, `GET/POST /api/users`, `PATCH /api/users/:email`, `PUT /api/requests/:id`, `POST /api/notifications`, `POST /api/notifications/read`, `PUT /api/templates`, `GET /api/acervo` + `PUT`/`DELETE /api/acervo/:id`, `POST /api/files`, `GET /api/files/:id[?download=1]`.

**Arquivos (imagens, vídeos, PDFs).** `db.uploadFile()` no cliente envia o arquivo para `POST /api/files`; o worker guarda os bytes (base64 em pedaços) e devolve uma URL própria `/api/files/:id`. Anexos passam a carregar só a referência `{ id, name, type, size, url }` — nada de base64 inflando o JSON das solicitações. `GET /api/files/:id` responde com o `Content-Type` certo e `Content-Disposition: inline`, então o **visualizador embutido** (`DocViewer` + `abrirDoc`) abre imagens/vídeos/PDF **dentro da página** (sem nova aba). Links externos (Drive) não são embutíveis (X-Frame-Options) e caem no botão "abrir em nova aba".

**Padrão ao editar dados:** cada mutação atualiza o estado React e persiste a entidade tocada (`db.saveRequest`, `db.saveNotification`, `db.saveUser`/`db.updateUser`, `db.markNotifsRead`, `db.saveAcervoDoc`, `db.saveTemplates`). Não há mais gravação do array inteiro. Ao criar um endpoint/tabela novo, adicione o método correspondente no módulo `db` (com o ramo de fallback `localStorage`) e a rota no `src/server.js`.

## Integrações externas (opt-in)

- **E-mail:** `notifyEmail()` faz POST em `${NOTIFY_API}/api/notify`. `NOTIFY_API` está vazio por padrão (e-mails desativados, só notificação interna) — preencha com a URL do backend para ativar. Chaves de terceiros (SMTP, tokens) devem ir por `setAppSecret` (lidas do worker em `env.*`), **nunca** no código do cliente.
- **Consulta de CNPJ:** no cadastro, tenta em sequência `open.cnpja.com`, `cnpj.ws` e BrasilAPI (fallback), retornando o primeiro que responder; nunca lança erro.

## Convenções

- Ao adicionar uma tela, crie o componente e registre-o no switch de `view` dentro de `App()`; navegue com `nav()`.
- Estilização é utilitária (Tailwind) + `style={{ color: C.x }}` para cores do tema. Componentes-átomo reutilizáveis: `Pill`, `Card`, `StatCard`, `Btn`, `Field`, `FileUpload`.
- Anexos/uploads vão para o banco nativo via `db.uploadFile()` e são referenciados por `/api/files/:id` — não guarde mais base64 dentro do objeto da solicitação. Para abrir um documento use `abrirDoc(refOuUrl)` (abre no `DocViewer` embutido), nunca `window.open`/`<a target="_blank">`.
