/* Preenchedor do formulário "Jurídico – Contratos" (Formcreator, id 60) do GoService.
 * Roda no mundo da página (MAIN) para usar o jQuery/select2/TinyMCE/fileupload do GLPI.
 * Recebe o pedido da ponte, preenche os campos e mostra um aviso no topo.
 * NUNCA clica em Enviar: a conferência e o envio são de quem está logado.
 *
 * Campos do formulário 60 (formcreator_field_<id>):
 *   1350 e-mail do solicitante · 1877 área (lista com busca) · 1352 razão social da outra parte
 *   1353 empresa do grupo (Gocase/Gobeaute) · 1362 empresa Gocase (lista com busca, por CNPJ)
 *   1860 gestor responsável (usuários, múltipla) · 1355 tipo de solicitação (lista com busca)
 *   1356 objeto do contrato · 1364 especifique objeto · 1357 valor · 1363 especifique valor
 *   1359 anexos (tratativas) · 1360 aditivo (Sim/Não) · 1861 observações (TinyMCE) */
(() => {
  if (new URLSearchParams(location.search).get("id") !== "60") return;
  const $ = window.jQuery;
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const esperar = async (cond, ms = 10000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) { const v = cond(); if (v) return v; await dormir(200); }
    return null;
  };
  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const campo = (id) => document.querySelector(`[name="formcreator_field_${id}"], [name="formcreator_field_${id}[]"]`);
  const pendencias = [];

  function texto(id, valor, rotulo) {
    const el = campo(id);
    if (!el) { pendencias.push(rotulo); return; }
    el.value = valor || "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    $(el).trigger("change");
  }
  function fixo(id, casar, rotulo) {
    const el = campo(id);
    const op = el && [...el.options].find((o) => o.value && o.value !== "0" && casar(semAcento(o.text)));
    if (!op) { pendencias.push(rotulo); return false; }
    $(el).val(op.value).trigger("change");
    return true;
  }
  // Lista com busca (select2 com dados via ajax): digita o termo e escolhe a opção que casar.
  async function comBusca(id, termo, casar, rotulo) {
    const el = campo(id);
    if (!el || !$(el).data("select2")) { pendencias.push(rotulo); return false; }
    const antes = JSON.stringify($(el).val());
    $(el).select2("open");
    const busca = await esperar(() => document.querySelector(".select2-container--open .select2-search__field"), 3000);
    if (busca) {
      busca.value = termo;
      busca.dispatchEvent(new Event("input", { bubbles: true }));
      busca.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    }
    const op = await esperar(() => [...document.querySelectorAll(".select2-container--open .select2-results__option")]
      .find((o) => !o.querySelector(".select2-results__option") && o.getAttribute("aria-disabled") !== "true"
        && !o.innerText.includes("\n") && casar(semAcento(o.innerText.replace(/^»\s*/, "")))), 8000);
    if (!op) { $(el).select2("close"); pendencias.push(rotulo); return false; }
    op.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await dormir(300);
    if (JSON.stringify($(el).val()) === antes) { op.click(); await dormir(300); }
    $(el).select2("close");
    if (JSON.stringify($(el).val()) === antes) { pendencias.push(rotulo); return false; }
    return true;
  }
  async function anexar(id, arquivos, rotulo) {
    if (!arquivos || !arquivos.length) return;
    const input = document.querySelector(`#form-group-field-${id} input[type=file]`);
    if (!input || !$(input).data("blueimpFileupload")) { pendencias.push(rotulo); return; }
    const files = [];
    for (const a of arquivos) {
      const blob = await (await fetch(a.dataUrl)).blob();
      files.push(new File([blob], a.name || "arquivo", { type: a.type || blob.type }));
    }
    $(input).fileupload("add", { files });
  }
  function observacoes(textoPuro) {
    const ta = campo(1861);
    const html = String(textoPuro || "").split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`).join("");
    const ed = ta && window.tinymce && window.tinymce.get(ta.id);
    if (ed) { ed.setContent(html); window.tinymce.triggerSave(); }
    else if (ta) { ta.value = textoPuro; $(ta).trigger("change"); }
    else pendencias.push("Observações");
  }
  function aviso(pedido) {
    const box = document.createElement("div");
    box.setAttribute("role", "status");
    box.style.cssText = "position:fixed;top:12px;right:12px;z-index:99999;max-width:420px;background:#0E1F44;color:#fff;border-radius:12px;padding:14px 16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)";
    const ok = pendencias.length === 0;
    box.innerHTML = `<b>Chamado jurídico preenchido — ${pedido.protocolo || ""}</b><br>`
      + (ok ? "Confira os campos e os anexos e clique em <b>Enviar</b>."
        : `Confira e complete: <b>${pendencias.join(", ")}</b>. Depois clique em <b>Enviar</b>.`)
      + `<div style="margin-top:8px;opacity:.75;font-size:12px">Preenchido pela plataforma de Cadastro de Fornecedores. Nada é enviado sem o seu clique.</div>`;
    const fechar = document.createElement("button");
    fechar.textContent = "×";
    fechar.setAttribute("aria-label", "Fechar aviso");
    fechar.style.cssText = "position:absolute;top:6px;right:10px;background:none;border:0;color:#fff;font-size:18px;cursor:pointer";
    fechar.onclick = () => box.remove();
    box.appendChild(fechar);
    document.body.appendChild(box);
  }

  async function preencher(p) {
    await esperar(() => $ && campo(1350) && campo(1877) && $(campo(1877)).data("select2"), 15000);
    texto(1350, p.email, "E-mail do solicitante");
    if (p.area) await comBusca(1877, p.area, (t) => t === semAcento(p.area), "Área do solicitante");
    texto(1352, p.razaoSocial, "Razão social da outra parte");
    if (fixo(1353, (t) => t === semAcento(p.empresaGrupo || "Gocase"), "Empresa do grupo")) await dormir(600);
    if (p.empresaCnpj) await comBusca(1362, p.empresaCnpj, (t) => t.includes(semAcento(p.empresaCnpj)), "Empresa Gocase (filial)");
    else pendencias.push("Empresa Gocase (filial)");
    if (p.gestor) await comBusca(1860, p.gestor, (t) => t === semAcento(p.gestor), "Gestor responsável");
    if (p.tipo) await comBusca(1355, p.tipo, (t) => t.includes(semAcento(p.tipo)), "Tipo de solicitação");
    if (fixo(1356, (t) => t.startsWith(semAcento(p.objeto || "Contratos com Clientes")), "Objeto do contrato")) await dormir(400);
    texto(1364, p.especifiqueObjeto, "Especifique objeto");
    if (p.valorFaixa) { if (fixo(1357, (t) => t === semAcento(p.valorFaixa), "Valor do contrato")) await dormir(400); }
    else pendencias.push("Valor do contrato");
    texto(1363, p.especifiqueValor, "Especifique valor");
    if (!p.especifiqueValor) pendencias.push("Especifique valor");
    fixo(1360, (t) => t === semAcento(p.aditivo || "Não"), "Aditivo contratual");
    observacoes(p.observacoes);
    await anexar(1359, p.arquivos, "Anexos");
    window.scrollTo({ top: 0, behavior: "smooth" });
    aviso(p);
    window.postMessage({ origem: "gcf-preencher", tipo: "concluido", pendencias }, location.origin);
  }

  let recebido = false;
  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data || ev.data.origem !== "gcf-ponte") return;
    if (ev.data.tipo === "ola") window.postMessage({ origem: "gcf-preencher", tipo: "pronto" }, location.origin);
    if (ev.data.tipo === "pedido" && !recebido) { recebido = true; preencher(ev.data.pedido); }
  });
  window.postMessage({ origem: "gcf-preencher", tipo: "pronto" }, location.origin);
})();
