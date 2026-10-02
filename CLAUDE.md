# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm install      # instala dependências
npm run dev      # servidor de desenvolvimento (Vite) — modo local, usa localStorage (sem worker)
npm run build    # build de produção em fornecedores/dist/
```

Não há testes, linter ou formatador configurados. A UI e os textos são em português (pt-BR). (`npm run dev:fornecedores` / `npm run build:fornecedores` são apelidos dos mesmos comandos.)

**Deploy (GoDeploy):** app `gocase-cadastro-fornecedores` (id `e424e2ab`, visibilidade **pública** — a separação de acesso é feita no worker). O cliente **precisa ser pré-buildado** (`npm run build`) — o bundler de cliente do GoDeploy estoura o tempo com este SPA (react + recharts), então suba o `fornecedores/dist/`. O worker (`fornecedores/src/server.js`) compila instantaneamente no GoDeploy.

Fluxo (numa máquina com Node):
```bash
npm install && npm run build     # gera fornecedores/dist/index.html + fornecedores/dist/assets/*
# 1) getUploadToken → { uploadToken, uploadUrl }
# 2) subir o dist e o worker (os caminhos da esquerda são os publicados):
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "index.html=@fornecedores/dist/index.html" \
  -F "assets/<hash>.js=@fornecedores/dist/assets/<hash>.js" \
  -F "src/server.js=@fornecedores/src/server.js" "$UPLOAD_URL"
# 3) updateApp({ appId: "e424e2ab", uploadId, entrypoint: "src/server.js",
#               assets: ["index.html", "assets/<hash>.js", ...] })
```
Sem `assetConfig.not_found_handling: "single-page-application"` — o app não usa roteamento por URL, e o SPA-fallback sombrearia as rotas `/api/*`. Segredo do app: `SEED_ADMIN_PASSWORD` (senha inicial das contas de equipe — ver **Senhas**).

> ⚠️ **Nunca faça deploy a partir de código não-mergeado.** O deploy no GoDeploy só acontece a partir da branch `main` já atualizada (após `git pull`) e com o PR da mudança **mergeado**. Ver seção **Fluxo de trabalho com Git**.

## Plataforma de Cadastro de Fornecedores (`fornecedores/`)

Portal de **cadastro/homologação de fornecedores** da gocase: pasta `fornecedores/` (`index.html`, `src/App.jsx`, `src/main.jsx`, `src/server.js`, `vite.config.js`), publicada em https://gocase-cadastro-fornecedores.devgogroup.com/ com **banco próprio** (`env.DB`, SQLite do GoDeploy). O front-end está quase todo em `fornecedores/src/App.jsx` (seções demarcadas por `/* ===== ... ===== */`); o backend é `fornecedores/src/server.js`. Tailwind via CDN, ícones `lucide-react`, gráficos `recharts` (carregado sob demanda).

> **Histórico:** este repositório nasceu como Service Desk / RMA + Cadastro num só app. Em 10/2026 o Service Desk foi para o repositório [rodrigocosta-b2b/gocase-service-desk](https://github.com/rodrigocosta-b2b/gocase-service-desk) e o app GoDeploy `gocase-service-desk` (`4ff9134d`) passou para a Beatriz Nogueira. Aqui ficou só a plataforma de fornecedores.

- `fornecedores/src/App.jsx` nasceu do `src/App (1).jsx` do Service Desk (hoje no repositório `gocase-service-desk`), sem RMA: sem Troca/Garantia, Histórico pós-venda, Manuais e Normas, pré-análise por IA nem relatórios de RMA.
- **Dois acessos no mesmo app (público no GoDeploy):**
  - **Fornecedor — aberto, sem conta:** a página inicial é o formulário de Solicitação de Cadastro; obrigatórios: **CNPJ** (com validação dos dígitos), **e-mail do solicitante** (`emailSolicitante` — contato e chave de acompanhamento; pode ser diferente do e-mail do CNPJ na Receita, que fica em `dados.email`) e a IE. Ao digitar os 14 dígitos, `consultarCNPJ()` busca os dados na Receita Federal (CNPJá → CNPJ.ws → BrasilAPI, direto do navegador) e define a **Inscrição Estadual**: número (contribuinte), `ISENTO` (fonte confirma que não há IE ativa) ou "não verificada" (fornecedor preenche ou marca isento). Só o **CNPJ.ws** informa IE (o CNPJá aberto não traz) e ele limita ~3 consultas/min por IP. Há também "Acompanhar solicitação": basta **um** entre **e-mail do solicitante, CNPJ e protocolo** (com mais de um, todos precisam bater) — e-mail ou CNPJ listam as solicitações com os documentos liberados; só o protocolo mostra o status sem documentos (o protocolo é sequencial, então os documentos exigem e-mail ou CNPJ).
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


## Arquitetura e convenções

- **Raiz `App()`** (fim de `App.jsx`): sem sessão mostra o acesso público (`PublicShell` → `ExtNovaCad` / `ConsultaStatus` / `Login`); com sessão de equipe mostra o `Shell` do portal interno. `view` é a tela atual e `nav(view, id)` troca de tela — ao criar uma tela, registre-a no mapa de `view` do `App()` e no `MENU.interno`.
- **Persistência:** módulo `db` do `App.jsx` fala com o worker. O modo é detectado uma vez (`GET /api/health`): com worker → remoto; sem worker (dev/preview) → `localStorage` (chaves `gocase_forn_*`). Cada mutação atualiza o estado React e persiste só a entidade tocada (`db.saveRequest`, `db.saveAcervoDoc`, …). Ao criar rota nova, adicione o método no `db` (com o ramo local) e a rota no `server.js` — e decida se é pública (`/api/public/*`) ou de equipe.
- **Arquivos:** `db.uploadFile()` (equipe) e `db.uploadPublicFile()` (formulário) guardam o arquivo no banco e devolvem `{ id, name, type, size, url: "/api/files/:id" }`; não guarde base64 no objeto da solicitação. Para abrir um documento use `abrirDoc(refOuUrl)` (visualizador embutido `DocViewer`), nunca `window.open`.
- **Tema:** paleta mutável `C` reescrita por `applyPalette()` a partir de `LIGHT`/`DARK` (altere essas, não `C`); `resolveTheme` trata `"auto"`.
- **Estilo:** Tailwind utilitário + `style={{ color: C.x }}`. Átomos: `Pill`, `Card`, `StatCard`, `Btn`, `Field`, `FileUpload`.
- **E-mail:** `notifyEmail()` só funciona com `NOTIFY_API` preenchido (vazio por padrão). Chaves de terceiros vão por `setAppSecret`, nunca no cliente.
- **Teste local de ponta a ponta:** sem wrangler; dá para rodar o worker real sobre SQLite com `sql.js` num servidor Node simples que serve `fornecedores/dist/` e encaminha `/api/*` para o `fetch` do `server.js`.
