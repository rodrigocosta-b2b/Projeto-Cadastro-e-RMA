/* Lado da plataforma de Cadastro de Fornecedores.
 * - Avisa a página que a extensão está instalada (atributo data-gcf-goservice no <html>).
 * - Recebe da página o pedido de chamado jurídico (window.postMessage, com os anexos já
 *   baixados como Blob), guarda no armazenamento da extensão e pede ao fundo.js para abrir
 *   o formulário do GoService. Responde à página com o resultado. */
(() => {
  const VERSAO = chrome.runtime.getManifest().version;
  document.documentElement.setAttribute("data-gcf-goservice", VERSAO);

  const paraDataUrl = (blob) => new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => erro(r.error);
    r.readAsDataURL(blob);
  });
  const responder = (id, dados) => window.postMessage({ origem: "gcf-ext", tipo: "juridico-goservice-resposta", id, ...dados }, location.origin);

  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || ev.origin !== location.origin) return;
    const m = ev.data;
    if (!m || m.origem !== "gcf" || m.tipo !== "juridico-goservice" || !m.pedido) return;
    try {
      const arquivos = [];
      for (const a of m.pedido.arquivos || []) {
        if (a && a.blob instanceof Blob) arquivos.push({ name: a.name, type: a.type || a.blob.type, dataUrl: await paraDataUrl(a.blob) });
      }
      const pedido = { ...m.pedido, arquivos, criadoTs: Date.now() };
      await chrome.storage.local.set({ pedidoJuridico: pedido });
      const r = await chrome.runtime.sendMessage({ tipo: "abrir-goservice" });
      responder(m.id, { ok: !!(r && r.ok), erro: r && r.erro });
    } catch (e) {
      responder(m.id, { ok: false, erro: String((e && e.message) || e) });
    }
  });
})();
