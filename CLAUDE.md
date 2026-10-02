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

## Plataforma de Cadastro de Fornecedores (`fornecedores/`)

Os processos de **cadastro/homologação de fornecedor** foram separados do Service Desk numa plataforma própria, com o mesmo layout e estilo: pasta `fornecedores/` (`index.html`, `src/App.jsx`, `src/main.jsx`, `src/server.js`, `vite.config.js`), publicada no GoDeploy como o app de slug **`gocase-cadastro-fornecedores`** (https://gocase-cadastro-fornecedores.devgogroup.com/), com **banco próprio** (outro `env.DB`, contas e solicitações independentes do Service Desk).

- `fornecedores/src/App.jsx` nasceu de `src/App (1).jsx` sem RMA (sem Troca/Garantia, Histórico pós-venda, Manuais e Normas, pré-análise por IA nem relatórios de RMA).
- **Dois acessos no mesmo app (público no GoDeploy):**
  - **Fornecedor — aberto, sem conta:** a página inicial é o formulário de Solicitação de Cadastro; só o **CNPJ** é obrigatório (com validação dos dígitos). Ao digitar os 14 dígitos, `consultarCNPJ()` busca os dados na Receita Federal (CNPJá → CNPJ.ws → BrasilAPI, direto do navegador) e define a **Inscrição Estadual**: número (contribuinte), `ISENTO` (fonte confirma que não há IE ativa) ou "não verificada" (fornecedor preenche ou marca isento). Só o **CNPJ.ws** informa IE (o CNPJá aberto não traz) e ele limita ~3 consultas/min por IP. Há também "Acompanhar solicitação": basta o **protocolo ou o CNPJ** — só o CNPJ lista todas as solicitações da empresa com os documentos liberados; só o protocolo mostra o status sem documentos (o protocolo é sequencial, então os documentos exigem o CNPJ).
  - **Equipe — login e senha validados no servidor:** portal interno (Dashboard, Cadastros, Fornecedores, Acervo, Usuários, Relatórios, Configurações, Minha conta). Sessão em cookie HttpOnly `gcf_session` (12 h; o token também vai em `Authorization: Bearer`). Toda rota fora de `/api/public/*`, `/api/health`, `/api/login` e `/api/logout` devolve 401 sem sessão de equipe — inclusive `/api/files/:id`.
- **Reseller (Datamart `raw.webgex_clientes_gocase`)**: consultado só no detalhe do chamado, pela equipe (`GET /api/reseller-lookup`, traz razão social, IE e contribuinte ICMS). O proxy de dados do GoDeploy só responde com a sessão GoDeploy do visitante, então não funciona para o formulário público.
- **Senhas:** a senha padrão antiga (publicada neste repositório, que é público) é recusada; contas que ainda a usam são trocadas no servidor pela do segredo `SEED_ADMIN_PASSWORD` (`setAppSecret`), que também semeia os admins num banco vazio. Senhas novas: mínimo 8 caracteres. Login tem limite de 8 erros a cada 15 min por e-mail. As contas `SEED_USERS` do cliente só valem no modo local.
- **Acervo de documentos:** cada documento tem arquivo e/ou link do Drive — **os dois são opcionais** (basta o arquivo) — e a opção **Envio automático**. Documentos com envio automático ficam disponíveis para download na tela de confirmação (e em "Acompanhar solicitação") assim que o fornecedor envia o pedido, via `/api/public/entrega/:token/:docId` (token aleatório por solicitação; o servidor relê o acervo a cada acesso, então desligar o envio automático ou excluir o documento revoga o download). Os demais ficam no chamado para a equipe enviar após a análise. Formato do documento: `{ id, nome, descricao, arquivo: {url,name,type}|null, link, envioAutomatico }` (+ `tipo`/`url`/`arquivoNome`/`arquivoType` do formato antigo, ainda aceitos — ver `acervoPartes()` no cliente e no worker).
- **Lista colada:** no passo Documentos, o fornecedor pode colar a lista de documentos que precisa; `casarListaDocumentos()` marca as caixas sozinho (sem acento/pontuação, com sinônimos como CND/certidão negativa, RFB/federal; empates marcam todos). Itens sem correspondência vão no chamado como `docsNaoEncontrados`, junto com o texto original (`listaDocumentos`).
- **Regra de empresa gocase (BB Indústria × Go Comércio):** fornecedor **isento de IE** ou **venda de Gift** (a palavra "gift" na mensagem) → documentos da **Go Comércio**; fornecedor **com IE** → **BB Indústria**. O passo 1 exige a IE (número ou "isento"). Vale para todo documento que existe nas duas empresas — o par é reconhecido pelos campos `empresa`/`documento` do acervo (ver abaixo); o da outra empresa aparece como "não se aplica" e, se vier pela lista colada, é trocado pelo equivalente. Documentos que só existem numa empresa (ex.: CNDs da BB) seguem disponíveis. Na lista colada, empates entre BB e Go ficam só com a empresa da regra. O worker aplica a mesma regra (`empresaDoFornecedor`/`docForaDaRegra` em `server.js`) antes de liberar qualquer envio automático e grava `empresaGocase` e `docsEnviados[].foraDaRegra` no chamado.
- **Pares BB/Go por construção:** no Acervo, cada documento tem **Documento** (sem a empresa) + **Empresa gocase** (BB Indústria, Go Comércio ou nenhuma) e o nome exibido é sempre `Documento — Empresa`; a lista mostra "✓ par" ou "+ criar versão …" e impede duplicar o mesmo documento/empresa. O pareamento usa os campos `empresa`/`documento` (`empresaDe()`/`baseDe()`, no cliente e no worker); itens antigos são lidos do nome. Na primeira requisição o worker padroniza uma vez os documentos antigos (`normalizarAcervo()`, ex.: "CARTÃO CNPJ BB INDUSTRIA" → "CARTÃO CNPJ — BB Indústria", guardando `nomeOriginal`).
- **Envio manual pela equipe:** no chamado, cada documento pedido tem "Enviar ao fornecedor" (usa o arquivo/link atual do acervo) ou "Anexar arquivo e enviar"; grava `docsEnviados[].liberado`, `liberadoTs`, `liberadoPor` e `arquivoEnviado`, cria o `entregaToken` se faltar e registra na linha do tempo. O fornecedor baixa em "Acompanhar solicitação" (com o CNPJ); "Cancelar envio" revoga na hora (a entrega pública usa `cache-control: no-store`). "Copiar aviso para o fornecedor" copia o texto com o link, protocolo e CNPJ. O botão "Solicitar ajuste" saiu do chamado.
- **Quadro de Cadastros (Kanban):** os cards podem ser arrastados entre colunas (`moverStatus()` na raiz). Status que pedem informação (Aprovada, Negada, Aguardando, Concluída, setores) abrem o modal da ação; os demais mudam direto. Toda mudança passa por `confirmModal(status, obs, reqId)`, que registra movimento e notificação.
- `fornecedores/src/server.js` documenta todas as rotas no cabeçalho.
- Build e dev usam as dependências da raiz: `npm run build:fornecedores` (gera `fornecedores/dist/`) e `npm run dev:fornecedores` (modo local, `localStorage`).
- Deploy: mesmo fluxo do Service Desk, subindo `fornecedores/dist/index.html` como `index.html`, `fornecedores/dist/assets/*` como `assets/*` e `fornecedores/src/server.js` como `src/server.js` (entrypoint), no app `e424e2ab` (`gocase-cadastro-fornecedores`, visibilidade **pública**).
- O Service Desk (`4ff9134d`) **ainda não foi alterado**: a versão no ar (v39) tem funções cujo código-fonte não está neste repositório (manuais editáveis, recuperação de senha, busca de CNPJ no Datamart, zona de risco). Remover o Cadastro de lá depende de recuperar esse código. **Atenção:** o Service Desk é público e sua API não exige sessão (e as contas semeadas usam a senha que está neste repositório público) — a mesma proteção aplicada aqui deveria ser levada para lá.

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
