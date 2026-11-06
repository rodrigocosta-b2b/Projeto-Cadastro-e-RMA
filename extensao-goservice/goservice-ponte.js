/* Ponte no GoService (mundo isolado, tem acesso ao armazenamento da extensão).
 * Entrega o pedido guardado ao preenchedor (goservice-preencher.js, que roda no mundo da
 * página para usar jQuery/select2/TinyMCE do GLPI) e apaga o pedido depois de usado.
 * Só vale para o formulário 60 (Jurídico – Contratos) e pedidos com menos de 30 min. */
(async () => {
  if (new URLSearchParams(location.search).get("id") !== "60") return;
  const { pedidoJuridico: pedido } = await chrome.storage.local.get("pedidoJuridico");
  if (!pedido || Date.now() - (pedido.criadoTs || 0) > 30 * 60 * 1000) return;

  let entregue = false;
  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data) return;
    if (ev.data.origem === "gcf-preencher" && ev.data.tipo === "pronto" && !entregue) {
      entregue = true;
      window.postMessage({ origem: "gcf-ponte", tipo: "pedido", pedido }, location.origin);
    }
    if (ev.data.origem === "gcf-preencher" && ev.data.tipo === "concluido") {
      chrome.storage.local.remove("pedidoJuridico");
    }
  });
  // O preenchedor também pode ter carregado antes desta ponte: pede para ele avisar de novo.
  window.postMessage({ origem: "gcf-ponte", tipo: "ola" }, location.origin);
})();
