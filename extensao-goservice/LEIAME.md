# Extensão "Chamado Jurídico" (GoService)

Preenche o formulário **Jurídico – Contratos** do GoService
(`goservice.gocase.com.br`, Formcreator, formulário 60) com os dados de uma solicitação da
plataforma de Cadastro de Fornecedores. **A extensão nunca envia o chamado**: quem está logado
confere os campos e clica em **Enviar**.

## Instalar no Chrome (uma vez por computador)

1. Baixe esta pasta (`extensao-goservice/`) do repositório para o computador.
2. No Chrome, abra `chrome://extensions`.
3. Ligue **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e escolha a pasta `extensao-goservice`.
5. Recarregue a aba da plataforma de cadastro (F5).

Para atualizar depois de uma mudança na pasta: em `chrome://extensions`, clique no botão de
recarregar da extensão e dê F5 na plataforma.

## Como usar

1. No portal da equipe, abra o chamado e clique em **Abrir chamado no Jurídico (GoService)**
   (a janela também aparece sozinha ao **Submeter ao Setor Jurídico**).
2. Escolha o tipo (minuta da outra parte ou modelo GoGroup), a filial (CNPJ) e o valor, revise
   as observações e os anexos e clique em **Abrir GoService preenchido**.
3. O GoService abre numa aba nova com tudo preenchido e um aviso no canto. Confira e clique em
   **Enviar**.

Se a sessão do GoService tiver expirado, ele mostra o login: clique em **Entrar com Google**.
Se depois do login ele não voltar ao formulário, abra **Serviços → Jurídico – Contratos**: o
preenchimento acontece ao abrir o formulário (o pedido fica guardado por 30 minutos).

## O que é preenchido

| Campo do formulário | Valor |
|---|---|
| E-mail do solicitante | e-mail de quem está logado na plataforma |
| Área do solicitante | B2B |
| Razão social da outra parte | razão social do cliente |
| Empresa do grupo / empresa Gocase | Gocase / BB Indústria ou Go Comércio na filial escolhida |
| Gestor responsável | igor.morais |
| Tipo de solicitação | escolhido na janela da plataforma |
| Objeto do contrato | Contratos com Clientes (B2B, parcerias, distribuição, revenda) |
| Especifique objeto / valor | da janela da plataforma |
| Valor do contrato | faixa escolhida na janela |
| Anexos | anexos do solicitante marcados na janela |
| Aditivo contratual | Não |
| Observações | resumo da solicitação (editável na janela) |

Campos que não puderem ser preenchidos aparecem no aviso como "Confira e complete".

## Arquivos

- `manifest.json` — permissões: só `goservice.gocase.com.br` e a plataforma de cadastro.
- `plataforma.js` — na plataforma: marca a página como "extensão instalada" e recebe o pedido.
- `fundo.js` — abre o formulário do GoService numa aba nova.
- `goservice-ponte.js` — no GoService: entrega o pedido guardado ao preenchedor.
- `goservice-preencher.js` — preenche os campos (usa jQuery/select2/TinyMCE da própria página).

Se o jurídico mudar o formulário (novos campos, outro id), ajuste os números `formcreator_field_*`
listados no topo de `goservice-preencher.js`.
