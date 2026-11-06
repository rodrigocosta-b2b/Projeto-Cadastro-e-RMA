/* Service worker: abre o formulário Jurídico – Contratos do GoService numa aba nova.
 * Se a sessão do GoService tiver expirado, o próprio site mostra o login (Entrar com Google);
 * depois do login o GLPI volta ao formulário e o preenchimento acontece. */
const FORM_JURIDICO = "https://goservice.gocase.com.br/marketplace/formcreator/front/formdisplay.php?id=60";

chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
  if (!msg || msg.tipo !== "abrir-goservice") return false;
  chrome.tabs.create({ url: FORM_JURIDICO, active: true })
    .then(() => responder({ ok: true }))
    .catch((e) => responder({ ok: false, erro: String((e && e.message) || e) }));
  return true; // resposta assíncrona
});
