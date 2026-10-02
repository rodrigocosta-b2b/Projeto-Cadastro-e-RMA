/* gocase — Cadastro de Fornecedores.
   Plataforma separada do Service Desk (RMA): aqui ficam só os processos de
   solicitação de cadastro/homologação de fornecedores (portal do fornecedor +
   portal interno de análise), com o mesmo layout e estilo do Service Desk.
   Trocas e garantias continuam em https://gocase-service-desk.devgogroup.com/ */
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Plus, FileText, Building2, BookOpen, User as UserIcon,
  Search, Bell, LogOut, ChevronRight, ChevronDown, Clock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Paperclip, LayoutDashboard,
  Users, BarChart3, Settings, Filter, Image as ImageIcon, Sparkles,
  Send, ArrowLeft, ShieldCheck, FileCheck, Download, Phone, Mail,
  MapPin, Smartphone, MessageSquare, TrendingUp, Package, Check,
  Loader2, X, Film, FileText as FileIcon, ExternalLink, Maximize2, Minimize2, Save,
  Sun, Moon, Monitor, Eye, LayoutGrid, List, Menu, Pencil,
} from "lucide-react";
// recharts é carregado sob demanda (import dinâmico, ver useRecharts()) — é a maior
// fatia do bundle e só o Dashboard usa gráficos, então isolá-lo reduz o JS inicial
// baixado por todo mundo (inclusive quem só abre o portal do fornecedor).
let _rechartsPromise = null;
function loadRecharts() {
  if (!_rechartsPromise) _rechartsPromise = import("recharts");
  return _rechartsPromise;
}
function useRecharts() {
  const [mod, setMod] = useState(null);
  useEffect(() => {
    let alive = true;
    loadRecharts().then(m => { if (alive) setMod(m); });
    return () => { alive = false; };
  }, []);
  return mod;
}

/* ===================== Brand tokens — gocase ===================== */
// Paletas de tema. Cores de marca (coral, yellow, cyan, violet, green) não mudam;
// só os neutros (fundo, superfície, texto, linhas) trocam entre claro e escuro.
const LIGHT = {
  coral: "#F8475E", coralDark: "#E23652", coralSoft: "#FEEAED",
  yellow: "#FFC247", ink: "#1E1E2A", bg: "#F7F7FA", line: "#ECECF1",
  text: "#22222E", muted: "#8A8A99", cyan: "#00B8D9", violet: "#6C5CE7",
  green: "#1FBF75", danger: "#F8475E", accent: "#D7E600", surface: "#FFFFFF",
};
// DARK usa a paleta navy + amarelo-lima de referência (marca gogroup). "coral" vira o
// azul-marinho de destaque (era vermelho); "danger" carrega o vermelho semântico que
// antes vinha de coral (Negada, Fora do SLA, excluir), para não perder o sinal de alerta.
const DARK = {
  coral: "#3A6FC4", coralDark: "#0E1F44", coralSoft: "rgba(58,111,196,0.16)",
  yellow: "#FFC247", ink: "#0A1220", bg: "#0A1220", line: "#223154",
  text: "#F2F5FB", muted: "#93A1C2", cyan: "#00B8D9", violet: "#8E7DF5",
  green: "#27C77F", danger: "#F76B62", accent: "#D7E600", surface: "#121D38",
};
// C é mutável: applyPalette troca os valores e os componentes leem os novos no próximo render.
const C = { ...LIGHT };
function applyPalette(mode) { Object.assign(C, mode === "dark" ? DARK : LIGHT); }
// Resolve o tema "auto" pelo horário (escuro das 18h às 6h).
function resolveTheme(pref) {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  const h = new Date().getHours();
  return (h >= 18 || h < 6) ? "dark" : "light";
}
// Aplica o tema salvo já no carregamento, antes do primeiro render (evita flash).
try {
  const _pref = (typeof localStorage !== "undefined" && localStorage.getItem("gocase_theme")) || "dark";
  const _res = resolveTheme(_pref);
  applyPalette(_res);
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", _res);
} catch (e) { }

const STATUS = {
  NOVA:          { label: "Nova",                        color: C.cyan   },
  EM_ANALISE:    { label: "Em Análise",                  color: C.violet },
  AGUARDANDO:    { label: "Aguardando Informações",       color: C.yellow },
  JURIDICO:      { label: "Submetido ao Jurídico",        color: "#7B5EA7" },
  FISCAL:        { label: "Submetido ao Fiscal",          color: "#0077B6" },
  FINANCEIRO:    { label: "Submetido ao Financeiro",      color: "#008B8B" },
  APROVADA:      { label: "Aprovada",                    color: C.green  },
  NEGADA:        { label: "Negada",                      color: C.danger },
  CONCLUIDA:     { label: "Concluída",                   color: "#8A8A99"},
};
const SLA = {
  DENTRO: { label: "Dentro do SLA", color: C.green },
  PROXIMO: { label: "Próximo do venc.", color: C.yellow },
  VENCIDO: { label: "Fora do SLA", color: C.danger },
};

function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24); return `há ${d} d`;
}


/* ===================== UI atoms ===================== */
const Pill = ({ label, color }) => (
  <span style={{ background: color + "1f", color, border: `1px solid ${color}40` }}
    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">{label}</span>
);
const Card = ({ children, className = "", style, onClick }) => (
  <div onClick={onClick} className={`rounded-2xl bg-white border ${className} ${onClick ? "cursor-pointer hover:shadow-md transition" : ""}`}
    style={{ borderColor: C.line, ...style }}>{children}</div>
);
const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
  <Card onClick={onClick} className="p-5 flex items-center gap-4">
    <div className="rounded-xl p-3" style={{ background: color + "1a", color }}><Icon size={22} /></div>
    <div><div className="text-3xl font-bold" style={{ color: C.text }}>{value}</div>
      <div className="text-xs" style={{ color: C.muted }}>{label}</div></div>
  </Card>
);
const Btn = ({ children, onClick, variant = "solid", color = C.coral, icon: Icon }) => {
  const base = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition";
  const style = variant === "solid" ? { background: color, color: "white" }
    : variant === "outline" ? { border: `1px solid ${color}`, color } : { color };
  return <button onClick={onClick} className={base} style={style}>{Icon && <Icon size={16} />}{children}</button>;
};
const Field = ({ label, value, onChange, type = "text", full, options }) => (
  <div className={full ? "sm:col-span-2" : ""}>
    <label className="text-xs font-semibold" style={{ color: C.muted }}>{label}</label>
    {options ? (
      <select value={value} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }} />
    )}
  </div>
);

/* Upload real de arquivos — converte para base64 (data: URL) para persistência
   entre sessões. blob: URLs somem ao fechar a página; data: URLs sobrevivem
   no storage (localStorage / window.storage). Limite recomendado: ~3 MB por arquivo. */
function FileUpload({ accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf", hint = "Clique ou arraste para adicionar — imagens (JPG, PNG, WEBP), vídeos (MP4, MOV) e PDF", initial = [], onFiles, upload = (file) => db.uploadFile(file) }) {
  const [files, setFiles] = useState(initial);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const update = (next) => { setFiles(next); if (onFiles) onFiles(next); };
  const remove = (i) => update(files.filter((_, idx) => idx !== i));

  const add = async (list) => {
    setLoading(true); setErr("");
    try {
      // Cada arquivo vai para o banco nativo (env.DB) e volta com URL própria.
      const arr = await Promise.all(Array.from(list).map((file) => upload(file)));
      update([...files, ...arr]);
    } catch (e) {
      setErr(e && e.message ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); };
  const kb = (b) => b ? (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB") : "";

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden"
        onChange={e => { add(e.target.files); e.target.value = ""; }} />
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed p-6 text-center text-sm cursor-pointer transition"
        style={{ borderColor: drag ? C.coral : C.line, background: drag ? C.coralSoft : "transparent", color: C.muted }}>
        {loading
          ? <><Loader2 className="mx-auto mb-2 animate-spin" size={20} style={{ color: C.coral }} />Convertendo arquivo…</>
          : <><Paperclip className="mx-auto mb-2" size={20} style={{ color: C.coral }} />
              {hint}</>
        }
      </div>
      {err && <div className="text-xs mt-2 font-semibold" style={{ color: C.danger }}>{err}</div>}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {files.map((f, i) => {
            const isImg = f.type.startsWith("image"); const isVid = f.type.startsWith("video"); const isPdf = f.type.includes("pdf");
            return (
              <div key={i} className="relative rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                <button onClick={() => remove(i)} className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(30,30,42,.7)" }}><X size={13} /></button>
                <div className="h-24 flex items-center justify-center bg-gray-50">
                  {isImg ? <img src={f.preview || f.url} alt={f.name} className="h-full w-full object-cover" />
                    : isVid ? <video src={f.preview || f.url} className="h-full w-full object-cover" muted />
                      : <div style={{ color: C.coral }} className="flex flex-col items-center">{isPdf ? <FileIcon size={26} /> : <Paperclip size={26} />}</div>}
                </div>
                <div className="p-2">
                  <div className="text-xs font-medium truncate" style={{ color: C.text }}>{f.name}</div>
                  <div className="text-[10px] flex items-center gap-1" style={{ color: C.muted }}>{isVid && <Film size={10} />}{kb(f.size)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== Contas & persistência ===================== */
// Contas da equipe interna. No site publicado, login e senha são validados no
// servidor (src/server.js) e as senhas nunca chegam ao navegador. As contas abaixo
// só existem no modo local (npm run dev / preview sem worker) — o servidor recusa
// esta senha de desenvolvimento.
const DB_KEY = "gocase_forn_users_v1";
const SESSION_KEY = "gocase_forn_session_v1"; // sessão do modo local
const SEED_USERS = [
  { email: "beatriz.nogueira@gocase.com", password: "dev-local-only", name: "Beatriz Nogueira", role: "ADMIN", status: "Ativo" },
  { email: "rodrigo.costa@gocase.com", password: "dev-local-only", name: "Rodrigo Costa", role: "ADMIN", status: "Ativo" },
  { email: "larissa.simoes@gocase.com", password: "dev-local-only", name: "Larissa Simões", role: "ADMIN", status: "Ativo" },
];
const isInterno = (role) => ["ADMIN", "GESTOR", "COLABORADOR"].includes(role);

// Armazenamento genérico (window.storage no Claude, localStorage no site publicado)
const REQ_KEY = "gocase_forn_requests_v1";
const NOTIF_KEY = "gocase_forn_notifs_v1";
const TPL_KEY = "gocase_forn_templates_v1";
const ACERVO_KEY = "gocase_forn_acervo_v1";
// Acervo de documentos que o fornecedor pode pedir no cadastro. Gerenciado por
// admins/gestores na aba "Acervo de documentos". Cada item tem `documento` (nome sem a
// empresa), `empresa` ("bb" | "go" | "" = vale para as duas) e o nome exibido
// "Documento — Empresa" — é assim que os pares BB/Go se formam para a regra de empresa.
// Arquivo e link do Drive são opcionais; `envioAutomatico` libera o download na hora.
// (nome montado aqui sem depender de EMPRESA_NOME, que é declarado mais abaixo no arquivo)
const acervoItem = (id, documento, empresa, descricao) => ({ id, documento, empresa, nome: empresa ? `${documento} — ${{ bb: "BB Indústria", go: "Go Comércio" }[empresa]}` : documento, descricao, tipo: "link", url: "" });
const DEFAULT_ACERVO = [
  acervoItem("doc-cartao-cnpj-bb", "Cartão CNPJ", "bb", "Comprovante de inscrição no CNPJ (abr/2026)."),
  acervoItem("doc-cartao-cnpj-go", "Cartão CNPJ", "go", "Comprovante de inscrição no CNPJ (fev/2026)."),
  acervoItem("doc-contrato-social-bb", "Contrato Social", "bb", "Contrato social consolidado (14ª alteração)."),
  acervoItem("doc-contrato-social-go", "Contrato Social", "go", "Contrato social consolidado (20ª alteração)."),
  acervoItem("doc-inscricao-municipal-bb", "Inscrição Municipal", "bb", "Inscrição municipal (Itapeva)."),
  acervoItem("doc-inscricao-municipal-go90", "Inscrição Municipal", "go", "Inscrição municipal (GO 90)."),
  acervoItem("doc-alvara-bb", "Alvará de Funcionamento", "bb", "Alvará de funcionamento."),
  acervoItem("doc-alvara-go", "Alvará de Funcionamento", "go", "Alvará de funcionamento (venc. 31.12.2026)."),
  acervoItem("doc-cnd-rfb-bb", "CND RFB / Federal", "bb", "Certidão Negativa de Débitos federais."),
  acervoItem("doc-cnd-sefaz-bb", "CND SEFAZ / Estadual", "bb", "Certidão Negativa de Débitos estaduais."),
  acervoItem("doc-cnd-sefin-bb", "CND SEFIN / Municipal", "bb", "Certidão Negativa de Débitos municipais."),
  acervoItem("doc-balanco-contas-bb", "Balanço de Contas", "bb", "Balanço (1º tri/2025), assinado."),
  acervoItem("doc-balanco-contas-go", "Balanço de Contas", "go", "Demonstrações financeiras 31.12.2025, assinado."),
  acervoItem("doc-declaracao-faturamento-go", "Declaração de Faturamento", "go", "Declaração de faturamento 2025, assinada."),
  acervoItem("doc-comprovante-bancario-bb", "Comprovante Bancário", "bb", "Comprovante bancário assinado (dez/2025)."),
  acervoItem("doc-declaracao-bancaria-bb", "Declaração Bancária", "bb", "Declaração bancária."),
  acervoItem("doc-declaracao-conta-go", "Declaração Bancária", "go", "Declaração de abertura e manutenção de conta."),
  acervoItem("doc-minuta-contrato-b2b", "Minuta padrão — Contrato B2B", "", "Modelo padrão de contrato B2B."),
];
// Modelos de resposta rápida (e-mail automático ao cliente). Placeholders: {id} {cliente} {status}
const DEFAULT_TEMPLATES = {
  EM_ANALISE: "Olá {cliente}, recebemos sua solicitação {id} e ela está EM ANÁLISE pela nossa equipe. Em breve retornaremos com uma definição.",
  AGUARDANDO: "Olá {cliente}, para dar andamento à sua solicitação {id} precisamos de informações ou documentos complementares. Por favor, responda este contato com os dados solicitados.",
  APROVADA: "Olá {cliente}, boa notícia! Sua solicitação {id} foi APROVADA. Em seguida você receberá os próximos passos para conclusão.",
  NEGADA: "Olá {cliente}, após análise, sua solicitação {id} foi NEGADA. Se tiver dúvidas sobre o motivo, responda este contato que nossa equipe de cadastro irá ajudar.",
  CONCLUIDA: "Olá {cliente}, sua solicitação {id} foi CONCLUÍDA. Obrigado por contar com a gocase!",
};
function renderTemplate(tpl, { id, cliente, status }) {
  return (tpl || "").replace(/\{id\}/g, id || "").replace(/\{cliente\}/g, cliente || "cliente").replace(/\{status\}/g, status || "");
}
/* ===================== Banco de dados nativo (GoDeploy) =====================
   Todo registro do sistema é gravado no banco SQLite do GoDeploy (env.DB),
   através do worker src/server.js. Cada entidade (conta, solicitação,
   notificação, documento do acervo) é persistida individualmente.

   Acesso: rotas /api/public/* são abertas (formulário de cadastro e consulta de
   status); o resto exige a sessão da equipe (cookie HttpOnly emitido no login —
   o token também vai no header Authorization como reserva).

   Em desenvolvimento (npm run dev) ou no preview, quando o worker não existe,
   a camada cai automaticamente para o localStorage do navegador. O modo é
   detectado uma vez por sessão via GET /api/health. */
let _dbMode = null; // "remote" | "local"
async function dbMode() {
  if (_dbMode) return _dbMode;
  try {
    const r = await fetch("/api/health", { headers: { Accept: "application/json" } });
    const j = r.ok ? await r.json().catch(() => null) : null;
    _dbMode = j && j.ok ? "remote" : "local";
  } catch (e) { _dbMode = "local"; }
  return _dbMode;
}
const TOKEN_KEY = "gocase_forn_token_v1";
let _token = (() => { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } })();
function setToken(t) {
  _token = t || "";
  try { if (_token) sessionStorage.setItem(TOKEN_KEY, _token); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) { }
}
async function apiJSON(method, path, body) {
  const r = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json", Accept: "application/json", ...(_token ? { Authorization: `Bearer ${_token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return r;
}
const stripPw = (u) => { if (!u) return u; const { password, ...rest } = u; return rest; };
const readAsDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(new Error("Falha ao ler arquivo"));
  r.readAsDataURL(file);
});
const PUBLIC_FILE_MAX = 10 * 1024 * 1024; // igual ao limite do worker

// ---- fallback local (dev/preview) ----
const _ls = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  upsert(k, item, idKey = "id") {
    const arr = _ls.get(k, []) || [];
    const i = arr.findIndex(x => x[idKey] === item[idKey]);
    if (i >= 0) arr[i] = item; else arr.unshift(item);
    _ls.set(k, arr); return arr;
  },
};
const _lsUsers = () => {
  const arr = _ls.get(DB_KEY, null);
  if (Array.isArray(arr) && arr.length) return arr;
  _ls.set(DB_KEY, SEED_USERS); return SEED_USERS;
};
const fmtDataBR = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

// Modo local: documentos liberados (envio automático ou pela equipe), lidos do acervo
// atual — mesma regra de itensEntrega() no servidor.
const _entregaLocal = (req) => {
  const atual = new Map((_ls.get(ACERVO_KEY, null) || DEFAULT_ACERVO).map(d => [d.id, d]));
  return (req.docsEnviados || []).map(e => {
    const doc = atual.get(e.docId);
    let arquivo = null, link = "";
    if (e.liberado) {
      if (e.arquivoEnviado?.url) arquivo = e.arquivoEnviado;
      else if (doc) ({ arquivo, link } = acervoPartes(doc));
    } else if (e.automatico && doc?.envioAutomatico) ({ arquivo, link } = acervoPartes(doc));
    if (!arquivo && !link) return null;
    const nome = e.nome || doc?.nome || "Documento";
    return { id: e.docId, nome, link, arquivo: arquivo ? { url: arquivo.url, name: arquivo.name || nome, type: arquivo.type || "" } : null };
  }).filter(Boolean);
};

const db = {
  // Sessão atual da equipe (null = visitante do formulário público).
  async me() {
    if ((await dbMode()) === "remote") {
      try { const r = await apiJSON("GET", "/api/me"); if (r.ok) return (await r.json()).user; } catch (e) { }
      setToken("");
      return null;
    }
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (e) { return null; }
  },
  async bootstrap() {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("GET", "/api/bootstrap");
        if (r.ok) return await r.json();
      } catch (e) { }
      return null;
    }
    return {
      users: _lsUsers().map(stripPw),
      requests: _ls.get(REQ_KEY, null),
      notifications: _ls.get(NOTIF_KEY, null),
      templates: _ls.get(TPL_KEY, null),
      acervo: _ls.get(ACERVO_KEY, null),
    };
  },
  async login(email, password) {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("POST", "/api/login", { email, password });
        if (r.status === 200) { const j = await r.json(); setToken(j.token); return { ok: true, user: j.user }; }
        if (r.status === 403) return { ok: false, reason: "inactive" };
        if (r.status === 429) return { ok: false, reason: "throttled" };
        return { ok: false, reason: "invalid" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    const u = _lsUsers().find(x => (x.email || "").toLowerCase() === (email || "").trim().toLowerCase());
    if (!u || u.password !== password || !isInterno(u.role)) return { ok: false, reason: "invalid" };
    if (u.status && u.status !== "Ativo") return { ok: false, reason: "inactive" };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(stripPw(u))); } catch (e) { }
    return { ok: true, user: stripPw(u) };
  },
  async logout() {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("POST", "/api/logout"); } catch (e) { }
    }
    setToken("");
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
  },
  async changePassword(email, current, next) {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("POST", "/api/me/password", { current, next });
        if (r.ok) return { ok: true };
        const j = await r.json().catch(() => ({}));
        return { ok: false, reason: j.error || "error" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    const arr = _lsUsers();
    const u = arr.find(x => x.email === email);
    if (!u || u.password !== current) return { ok: false, reason: "invalid_current" };
    _ls.set(DB_KEY, arr.map(x => x.email === email ? { ...x, password: next } : x));
    return { ok: true };
  },
  async saveUser(user) {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("POST", "/api/users", user);
        if (r.ok) return { ok: true, user: stripPw((await r.json()).user) };
        const j = await r.json().catch(() => ({}));
        return { ok: false, reason: j.error || "error" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    _ls.upsert(DB_KEY, user, "email");
    return { ok: true, user: stripPw(user) };
  },
  async updateUser(email, changes) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("PATCH", `/api/users/${encodeURIComponent(email)}`, changes); } catch (e) { }
      return;
    }
    const arr = _lsUsers().map(x => x.email === email ? { ...x, ...changes } : x);
    _ls.set(DB_KEY, arr);
  },
  async removeUser(email) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("DELETE", `/api/users/${encodeURIComponent(email)}`); } catch (e) { }
      return;
    }
    _ls.set(DB_KEY, _lsUsers().filter(x => x.email !== email));
  },
  async saveRequest(req) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("PUT", `/api/requests/${encodeURIComponent(req.id)}`, req); } catch (e) { }
      return;
    }
    _ls.upsert(REQ_KEY, req, "id");
  },
  async saveNotification(n) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("POST", "/api/notifications", n); } catch (e) { }
      return;
    }
    _ls.upsert(NOTIF_KEY, n, "id");
  },
  async markNotifsRead(ids) {
    if (!ids || !ids.length) return;
    if ((await dbMode()) === "remote") {
      try { await apiJSON("POST", "/api/notifications/read", { ids }); } catch (e) { }
      return;
    }
    const set = new Set(ids);
    _ls.set(NOTIF_KEY, (_ls.get(NOTIF_KEY, []) || []).map(n => set.has(n.id) ? { ...n, read: true } : n));
  },
  async saveTemplates(t) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("PUT", "/api/templates", t); } catch (e) { }
      return;
    }
    _ls.set(TPL_KEY, t);
  },
  async saveAcervoDoc(doc) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("PUT", `/api/acervo/${encodeURIComponent(doc.id)}`, doc); } catch (e) { }
      return;
    }
    _ls.upsert(ACERVO_KEY, doc, "id");
  },
  async removeAcervoDoc(id) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("DELETE", `/api/acervo/${encodeURIComponent(id)}`); } catch (e) { }
      return;
    }
    _ls.set(ACERVO_KEY, (_ls.get(ACERVO_KEY, []) || []).filter(d => d.id !== id));
  },
  // Upload de arquivo pela equipe → banco nativo. Retorna { id?, name, type, size, url }.
  // No modo remoto a URL é /api/files/:id (same-origin, abre inline). Sem worker,
  // guarda o data: URL inline como fallback.
  async uploadFile(file) {
    const dataUrl = await readAsDataURL(file);
    if ((await dbMode()) === "remote") {
      try {
        const comma = dataUrl.indexOf(",");
        const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const r = await apiJSON("POST", "/api/files", { name: file.name, type: file.type || "", size: file.size, data: b64 });
        if (r.ok) { const j = await r.json(); return { id: j.id, name: file.name, type: file.type || "", size: file.size, url: j.url }; }
      } catch (e) { }
    }
    return { name: file.name, type: file.type || "", size: file.size, url: dataUrl };
  },

  /* ---- rotas públicas (formulário de cadastro, sem login) ---- */
  // Anexo enviado pelo fornecedor. Lança erro com mensagem amigável se não der certo.
  // `preview` é uma URL local só para a miniatura (o visitante não lê /api/files).
  async uploadPublicFile(file) {
    if (file.size > PUBLIC_FILE_MAX) throw new Error(`"${file.name}" passa de 10 MB.`);
    const dataUrl = await readAsDataURL(file);
    const preview = (file.type || "").match(/^(image|video)\//) ? URL.createObjectURL(file) : "";
    if ((await dbMode()) === "remote") {
      const comma = dataUrl.indexOf(",");
      const r = await apiJSON("POST", "/api/public/files", { name: file.name, type: file.type || "", size: file.size, data: dataUrl.slice(comma + 1) })
        .catch(() => null);
      if (r && r.ok) { const j = await r.json(); return { id: j.id, name: file.name, type: file.type || "", size: file.size, url: j.url, preview }; }
      if (r && r.status === 415) throw new Error(`"${file.name}": formato não aceito. Use JPG, PNG, WEBP, MP4, MOV ou PDF.`);
      if (r && r.status === 413) throw new Error(`"${file.name}" passa de 10 MB.`);
      throw new Error(`Não foi possível enviar "${file.name}". Tente novamente.`);
    }
    return { name: file.name, type: file.type || "", size: file.size, url: dataUrl, preview };
  },
  // Documentos do acervo que o fornecedor pode pedir (só nome e descrição).
  async publicAcervo() {
    if ((await dbMode()) === "remote") {
      try { const r = await apiJSON("GET", "/api/public/acervo"); if (r.ok) return (await r.json()).acervo || []; } catch (e) { }
      return [];
    }
    return (_ls.get(ACERVO_KEY, null) || DEFAULT_ACERVO).map(d => ({ id: d.id, nome: d.nome, descricao: d.descricao || "" }));
  },
  // Envia a solicitação de cadastro. O servidor gera o protocolo (CAD-AAAA-NNNNNN).
  async submitCadastro(payload) {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("POST", "/api/public/cadastro", payload);
        const j = await r.json().catch(() => ({}));
        if (r.status === 201) return { ok: true, ...j };
        return { ok: false, reason: j.error || "error" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    const reqs = _ls.get(REQ_KEY, []) || [];
    const now = new Date();
    const year = now.getFullYear();
    const nums = reqs.filter(r => r.id.startsWith(`CAD-${year}-`)).map(r => parseInt(r.id.split("-")[2], 10)).filter(n => !isNaN(n));
    const id = `CAD-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(6, "0")}`;
    const d = payload.dados || {};
    const acervoAll = _ls.get(ACERVO_KEY, null) || DEFAULT_ACERVO;
    const docs = acervoAll.filter(doc => (payload.docsSolicitados || []).includes(doc.id));
    const req = {
      id, tipo: "Cadastro", status: "NOVA", resp: "—", sla: "DENTRO", origem: "publico",
      abertura: fmtDataBR(now), aberturaTs: now.getTime(), prazo: fmtDataBR(new Date(now.getTime() + 7 * 86400000)),
      ultimaAtualiz: now.toLocaleString("pt-BR"), ultimaAtualizTs: now.getTime(),
      parceiro: d.nomeFantasia || d.razaoSocial || `CNPJ ${payload.cnpj}`, cnpj: payload.cnpj, uf: d.estado || "—",
      email: payload.emailSolicitante || d.email || "", emailSolicitante: (payload.emailSolicitante || "").toLowerCase(), ie: d.inscricaoEstadual || "", ownerEmail: (payload.emailSolicitante || "").toLowerCase(), dados: d,
      produto: "—", modelo: "—", nf: "—", venda: "—",
      problema: payload.mensagem || "Solicitação de cadastro / homologação de parceiro.", mensagemCadastro: payload.mensagem || "",
      anexos: (payload.anexos || []).map(({ preview, ...a }) => a),
      docsSolicitados: docs.map(doc => doc.nome),
      docsEnviados: docs.map(doc => { const p = acervoPartes(doc); return { docId: doc.id, nome: doc.nome, url: p.arquivo ? p.arquivo.url : p.link, link: p.link, tipo: p.arquivo ? "arquivo" : "link", arquivoType: p.arquivo ? p.arquivo.type || "" : "", automatico: !!doc.envioAutomatico && !!(p.arquivo || p.link) && !foraDaRegra(doc, acervoAll, empresaDoFornecedor(d.inscricaoEstadual, payload.mensagem).empresa) }; }),
      empresaGocase: empresaDoFornecedor(d.inscricaoEstadual, payload.mensagem).empresa || "",
      listaDocumentos: payload.listaDocumentos || "", docsNaoEncontrados: payload.docsNaoEncontrados || [],
    };
    _ls.upsert(REQ_KEY, req, "id");
    _ls.upsert(NOTIF_KEY, { id: `n-${Date.now()}`, ts: Date.now(), read: false, audience: "interno", requestId: id, color: C.cyan, message: `Nova solicitação de cadastro recebida (${id}) de ${req.parceiro}.` }, "id");
    return { ok: true, id, abertura: req.abertura, prazo: req.prazo, entregues: _entregaLocal(req) };
  },
  // Acompanhamento: basta UM entre e-mail do solicitante, CNPJ e protocolo (mesma regra
  // do servidor). Devolve { resultados: [...] } ou null; só com o protocolo não vêm documentos.
  async publicStatus(id, cnpj, email) {
    if ((await dbMode()) === "remote") {
      try {
        const qs = `id=${encodeURIComponent(id || "")}&cnpj=${encodeURIComponent(cnpj || "")}&email=${encodeURIComponent(email || "")}`;
        const r = await apiJSON("GET", `/api/public/status?${qs}`);
        if (r.ok) return await r.json();
      } catch (e) { }
      return null;
    }
    const d = String(cnpj || "").replace(/\D/g, ""), p = String(id || "").trim().toUpperCase(), m = String(email || "").trim().toLowerCase();
    const achados = (_ls.get(REQ_KEY, []) || []).filter(x => (!p || x.id === p) && (!d || String(x.cnpj || "").replace(/\D/g, "") === d) && (!m || (x.emailSolicitante || x.ownerEmail || "").toLowerCase() === m));
    if (!achados.length) return null;
    return { resultados: achados.map(r => ({ id: r.id, status: r.status, abertura: r.abertura, prazo: r.prazo, ultimaAtualiz: r.ultimaAtualiz || r.abertura, ...(d || m ? { entregues: _entregaLocal(r) } : { documentosComCnpj: true }) })) };
  },
  // Base de clientes gocase (Datamart / Reseller) — só para a equipe logada.
  async resellerLookup(cnpj) {
    if ((await dbMode()) === "remote") {
      try { const r = await apiJSON("GET", `/api/reseller-lookup?cnpj=${encodeURIComponent(cnpj)}`); if (r.ok) return await r.json(); } catch (e) { }
      return { found: false, error: "lookup_error" };
    }
    return { found: false, error: "local" };
  },
};

// Envio de e-mail das atualizações. Aponte NOTIFY_API para o backend publicado
// (rota /api/notify). Enquanto estiver vazio, o app só usa a notificação interna.
// Ex.: const NOTIFY_API = "https://gocase-service-desk.devgogroup.com";
const NOTIFY_API = "";
async function notifyEmail(payload) {
  if (!NOTIFY_API || !payload?.to) return; // backend não configurado ou sem e-mail do cliente
  try {
    await fetch(`${NOTIFY_API}/api/notify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  } catch (e) { /* silencioso: não bloqueia a experiência do usuário */ }
}

// Consulta de CNPJ resiliente: tenta vários provedores (cada um isolado) e
// devolve o primeiro que responder. Nunca lança erro — retorna null se todos falharem.
// open.cnpja.com e cnpj.ws trazem inscrição estadual; BrasilAPI é o fallback estável.
async function fetchJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } finally { clearTimeout(t); }
}
// inscricaoEstadual: número (contribuinte) | "" (a fonte confirma que não há IE ativa) | null (fonte não informa).
async function viaCnpja(d) {
  const j = await fetchJSON(`https://open.cnpja.com/office/${d}`);
  if (!j) return null;
  const regs = Array.isArray(j.registrations) ? j.registrations : null;
  const reg = regs ? regs.find(x => x.enabled) : null;
  const ph = (j.phones || [])[0];
  return {
    razaoSocial: j.company?.name || "",
    nomeFantasia: j.alias || j.company?.name || "",
    inscricaoEstadual: regs ? (reg?.number || "") : null,
    situacao: j.status?.text || "",
    cep: j.address?.zip ? String(j.address.zip).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [j.address?.street, j.address?.number].filter(Boolean).join(", "),
    complemento: j.address?.details || "",
    bairro: j.address?.district || "",
    municipio: j.address?.city || "",
    estado: j.address?.state || "",
    telefone: ph ? `(${ph.area}) ${ph.number}` : "",
    email: (j.emails || [])[0]?.address || "",
    fonte: "Receita Federal (CNPJá)",
  };
}
async function viaCnpjWs(d) {
  const j = await fetchJSON(`https://publica.cnpj.ws/cnpj/${d}`);
  if (!j) return null;
  const est = j.estabelecimento || {};
  const ies = Array.isArray(est.inscricoes_estaduais) ? est.inscricoes_estaduais : null;
  const ie = ies ? ies.find(x => x.ativo) : null;
  return {
    razaoSocial: j.razao_social || "",
    nomeFantasia: est.nome_fantasia || j.razao_social || "",
    inscricaoEstadual: ies ? (ie?.inscricao_estadual || "") : null,
    situacao: est.situacao_cadastral || "",
    cep: est.cep ? String(est.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [est.tipo_logradouro, est.logradouro, est.numero].filter(Boolean).join(" "),
    complemento: est.complemento || "",
    bairro: est.bairro || "",
    municipio: est.cidade?.nome || "",
    estado: est.estado?.sigla || "",
    telefone: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : "",
    email: est.email || "",
    fonte: "Receita Federal (CNPJ.ws)",
  };
}
async function viaBrasilAPI(d) {
  const j = await fetchJSON(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
  if (!j) return null;
  return {
    razaoSocial: j.razao_social || "",
    nomeFantasia: j.nome_fantasia || j.razao_social || "",
    inscricaoEstadual: null, // BrasilAPI não traz inscrição estadual
    situacao: j.descricao_situacao_cadastral || "",
    cep: j.cep ? String(j.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [j.descricao_tipo_de_logradouro, j.logradouro, j.numero].filter(Boolean).join(" "),
    complemento: j.complemento || "",
    bairro: j.bairro || "",
    municipio: j.municipio || "",
    estado: j.uf || "",
    telefone: j.ddd_telefone_1 ? j.ddd_telefone_1.replace(/^(\d{2})(\d+)/, "($1) $2") : "",
    email: j.email || "",
    fonte: "Receita Federal (BrasilAPI)",
  };
}
// Consulta o CNPJ nos provedores públicos da Receita e define a situação da IE:
// ieStatus "contribuinte" (com o número), "isento" (inscricaoEstadual = "ISENTO")
// ou "desconhecido" (nenhuma fonte informou — o fornecedor preenche).
async function consultarCNPJ(d) {
  const digits = String(d || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;
  const providers = [viaCnpja, viaCnpjWs, viaBrasilAPI];
  let dados = null;
  for (let i = 0; i < providers.length; i++) {
    let r = null;
    try { r = await providers[i](digits); } catch (e) { /* tenta o próximo provedor */ }
    if (!r || !(r.razaoSocial || r.nomeFantasia)) continue;
    if (!dados) dados = r;
    if (r.inscricaoEstadual !== null) {
      dados = { ...dados, inscricaoEstadual: r.inscricaoEstadual, fonte: dados.fonte === r.fonte ? dados.fonte : `${dados.fonte} · IE via ${r.fonte.replace(/^Receita Federal /, "")}` };
      break;
    }
  }
  if (!dados) return null;
  const ie = dados.inscricaoEstadual;
  return {
    ...dados,
    inscricaoEstadual: ie ? ie : ie === "" ? "ISENTO" : "",
    ieStatus: ie ? "contribuinte" : ie === "" ? "isento" : "desconhecido",
  };
}
// CNPJ válido (dígitos verificadores) — mesma regra do servidor.
function cnpjValido(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => {
    let soma = 0, peso = n - 7;
    for (let i = 0; i < n; i++) { soma += Number(d[i]) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim()); // igual ao worker
const fmtCnpjInput = (v) => {
  const d = String(v || "").replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

/* Lista de documentos colada pelo fornecedor → documentos do acervo.
   Cada linha (ou item separado por ; , •) é comparada com nome + descrição de cada
   documento, sem acentos/pontuação e com alguns sinônimos (CND = certidão negativa,
   RFB = federal…). Marca o(s) documento(s) de maior pontuação (empates entram
   todos, ex.: "Cartão CNPJ" marca o da BB e o da Go). */
const DOC_STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "para", "com", "na", "no", "ou", "por", "um", "uma", "copia", "via"]);
const DOC_SIN = {
  cnd: ["certidao", "negativa", "debitos"], certidao: ["cnd"], negativa: ["cnd"], debitos: ["cnd"],
  rfb: ["federal", "receita"], federal: ["rfb"], receita: ["rfb", "federal"],
  sefaz: ["estadual"], estadual: ["sefaz"], sefin: ["municipal"], municipal: ["sefin"],
  balanco: ["demonstracoes", "financeiras", "balancete"], balancete: ["balanco"], demonstracoes: ["balanco"], financeiras: ["balanco"],
  cartao: ["comprovante", "inscricao"], comprovante: ["cartao"], estatuto: ["contrato", "social"], minuta: ["contrato"],
  banco: ["bancaria", "bancario"], bancaria: ["bancario", "banco"], bancario: ["bancaria", "banco"],
};
const docNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const docTokens = (s) => docNorm(s).split(" ").filter(t => t && !DOC_STOP.has(t));
function casarListaDocumentos(texto, docs, empresa = null) {
  const itens = String(texto || "")
    .split(/\r?\n|;|,|•|•|\t/)
    .map(l => l.replace(/^\s*(\d+\s*[.)\-–:]|[-*–>·]|\[\s*x?\s*\])\s*/i, "").trim())
    .filter(l => docTokens(l).length);
  const alvo = docs.map(d => ({ d, set: new Set(docTokens(`${d.nome} ${d.descricao || ""}`)) }));
  const ids = new Set(); const naoEncontrados = [];
  for (const item of itens) {
    const toks = docTokens(item);
    let melhor = 0, melhores = [];
    for (const { d, set } of alvo) {
      const hits = toks.filter(t => set.has(t) || (DOC_SIN[t] || []).some(x => set.has(x))).length;
      const score = hits / toks.length;
      if (score > melhor) { melhor = score; melhores = [d]; } else if (score === melhor && score > 0) melhores.push(d);
    }
    // Empate entre BB e Go (ex.: "Declaração bancária"): fica só a empresa da regra.
    if (empresa && melhores.some(d => empresaDe(d) === empresa)) melhores = melhores.filter(d => !empresaDe(d) || empresaDe(d) === empresa);
    if (melhor >= 0.6) melhores.forEach(d => ids.add(d.id)); else naoEncontrados.push(item);
  }
  return { ids, naoEncontrados, total: itens.length };
}

/* Regra de empresa gocase (BB Indústria × Go Comércio) — igual no worker.
   Fornecedor isento de IE ou venda de Gift (citada na mensagem) → Go Comércio;
   com Inscrição Estadual → BB Indústria. Vale para todo documento que existe nas
   duas empresas (mesmo nome sem o nome da empresa); os que só existem para uma
   empresa continuam disponíveis. */
const EMPRESA_TOK = { bb: "bb", industria: "bb", go: "go", comercio: "go" };
const EMPRESA_NOME = { bb: "BB Indústria", go: "Go Comércio" };
function docEmpresa(nome) { for (const t of docTokens(nome)) if (EMPRESA_TOK[t]) return EMPRESA_TOK[t]; return null; }
const docBase = (nome) => docTokens(nome).filter(t => !EMPRESA_TOK[t] && !/^\d+$/.test(t)).join(" ");
// Empresa e documento (nome sem a empresa) de um item do acervo: campos `empresa`
// ("bb" | "go" | "" = nenhuma) e `documento`; itens antigos são lidos do nome.
const empresaDe = (d) => (d.empresa === "bb" || d.empresa === "go" ? d.empresa : d.empresa === "" ? null : docEmpresa(d.nome));
const baseDe = (d) => docBase(d.documento || d.nome);
const nomeComEmpresa = (documento, empresa) => (empresa ? `${documento} — ${EMPRESA_NOME[empresa]}` : documento);
function nomeSemEmpresa(nome) {
  let s = String(nome || "").replace(/\b(bb|ind[uú]stria|go|com[eé]rcio)\b/giu, " ").replace(/\s+/g, " ").trim();
  let antes;
  do { antes = s; s = s.replace(/^[\s—–\-\/|:·,()]+|[\s—–\-\/|:·,()]+$/g, "").replace(/[\s—–\-\/|]+\d+$/g, "").trim(); } while (s !== antes);
  return s || String(nome || "").trim();
}
const ehGift = (mensagem) => /\bgifts?\b/.test(docNorm(mensagem));
function empresaDoFornecedor(ie, mensagem) {
  if (ehGift(mensagem)) return { empresa: "go", motivo: "venda de Gift" };
  const v = String(ie || "").trim().toUpperCase();
  if (v === "ISENTO") return { empresa: "go", motivo: "empresa isenta de Inscrição Estadual" };
  if (v) return { empresa: "bb", motivo: "empresa com Inscrição Estadual" };
  return { empresa: null, motivo: "" };
}
// Documento de outra empresa que tem equivalente na empresa da regra → não se aplica.
function contrapartes(doc, docs, empresa) {
  const b = baseDe(doc);
  return docs.filter(o => o.id !== doc.id && empresaDe(o) === empresa && baseDe(o) === b);
}
function foraDaRegra(doc, docs, empresa) {
  const e = empresaDe(doc);
  return !!(empresa && e && e !== empresa && contrapartes(doc, docs, empresa).length);
}
// Troca cada documento fora da regra pelo equivalente da empresa certa.
function aplicarRegraEmpresa(ids, docs, empresa) {
  const out = new Set();
  for (const id of ids) {
    const d = docs.find(x => x.id === id);
    if (!d) continue;
    if (foraDaRegra(d, docs, empresa)) contrapartes(d, docs, empresa).forEach(o => out.add(o.id));
    else out.add(id);
  }
  return out;
}

// Indicador de etapas (wizard)
function Stepper({ step, labels }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {labels.map((l, i) => {
        const n = i + 1, done = n < step, active = n === step;
        return (
          <React.Fragment key={l}>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: done ? C.green : active ? C.coral : "#cfd3da" }}>{done ? <Check size={14} /> : n}</span>
              <span className="text-xs font-semibold hidden sm:block" style={{ color: active ? C.text : C.muted }}>{l}</span>
            </div>
            {n < labels.length && <div className="flex-1 h-px" style={{ background: C.line }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const AuthShell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center p-6" style={{ background: `linear-gradient(150deg, ${C.coral}, ${C.coralDark})` }}>
    <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-white">
      <div className="hidden md:flex flex-col justify-between p-10 text-white" style={{ background: `linear-gradient(160deg, ${C.coral}, ${C.coralDark})` }}>
        <div className="text-3xl font-extrabold lowercase tracking-tight">gocase</div>
        <div>
          <div className="text-2xl font-bold leading-snug">Cadastro de Fornecedores</div>
          <p className="mt-3 text-sm opacity-90 leading-relaxed">Solicitação de cadastro e homologação de fornecedores gocase, com acompanhamento de ponta a ponta.</p>
        </div>
        <div className="text-xs opacity-70">© 2026 gocase</div>
      </div>
      <div className="p-10 flex flex-col justify-center">{children}</div>
    </div>
  </div>
);

/* ===================== Login (equipe interna) ===================== */
function Login({ onLogin, goBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (loading) return;
    setLoading(true);
    const res = await db.login(email, password);
    setLoading(false);
    if (!res.ok) {
      setErr(res.reason === "inactive" ? "Conta inativa. Procure um administrador."
        : res.reason === "throttled" ? "Muitas tentativas. Aguarde 15 minutos e tente de novo."
        : res.reason === "error" ? "Não foi possível conectar. Tente novamente."
        : "E-mail ou senha inválidos.");
      return;
    }
    setErr(""); onLogin(res.user);
  };
  return (
    <AuthShell>
      <button onClick={goBack} className="flex items-center gap-1 text-sm font-semibold mb-4 -mt-2 self-start" style={{ color: C.muted }}>
        <ArrowLeft size={16} /> Voltar ao formulário de cadastro
      </button>
      <h1 className="text-xl font-bold" style={{ color: C.text }}>Portal interno</h1>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Acesso restrito à equipe gocase — dados, dashboard e relatórios.</p>
      <label className="text-xs font-semibold" style={{ color: C.muted }}>E-mail</label>
      <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="seu@gocase.com"
        className="mt-1 mb-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
      <label className="text-xs font-semibold" style={{ color: C.muted }}>Senha</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
        className="mt-1 mb-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
      {err && <div className="text-xs mb-2 font-semibold" style={{ color: C.coral }}>{err}</div>}
      <p className="text-xs mb-5" style={{ color: C.muted }}>Esqueceu a senha? Peça a um gestor para redefinir.</p>
      <button onClick={submit} disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-bold text-white inline-flex items-center justify-center gap-2" style={{ background: C.coral, opacity: loading ? .7 : 1 }}>
        {loading && <Loader2 size={15} className="animate-spin" />}Entrar
      </button>
    </AuthShell>
  );
}

/* ===================== Acesso público (fornecedor, sem login) ===================== */
// Mesmo cabeçalho do portal interno, sem menu lateral: formulário de cadastro,
// consulta de status e o botão de acesso da equipe.
function PublicShell({ view, setView, themePref, onCycleTheme, children }) {
  const tabs = [["form", "Solicitar cadastro", Building2], ["status", "Acompanhar solicitação", Search]];
  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <header className="h-16 flex items-center px-4 gap-4 text-white sticky top-0 z-30" style={{ background: C.coral }}>
        <div onClick={() => setView("form")} className="flex items-center gap-2 cursor-pointer shrink-0">
          <span className="text-xl font-extrabold lowercase tracking-tight">gocase</span>
          <span className="text-xs opacity-80 hidden sm:inline whitespace-nowrap">Cadastro de Fornecedores</span>
        </div>
        <nav className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition"
              style={view === id ? { background: "rgba(255,255,255,.2)" } : { opacity: .85 }}>
              <Icon size={14} /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <button onClick={onCycleTheme}
          title={themePref === "light" ? "Tema: Claro (clique para Escuro)" : themePref === "dark" ? "Tema: Escuro (clique para Automático)" : "Tema: Automático (clique para Claro)"}
          className="opacity-90 hover:opacity-100 shrink-0">
          {themePref === "light" ? <Sun size={19} /> : themePref === "dark" ? <Moon size={19} /> : <Monitor size={19} />}
        </button>
        <button onClick={() => setView("login")} className="rounded-lg px-3 py-1.5 text-xs font-bold shrink-0 inline-flex items-center gap-1.5" style={{ background: C.accent, color: C.ink }}>
          <ShieldCheck size={14} /><span className="hidden sm:inline">Acesso da equipe</span>
        </button>
      </header>
      <main className="p-4 sm:p-6 w-full max-w-3xl mx-auto">{children}</main>
    </div>
  );
}

// Consulta pública do andamento: basta UM entre e-mail do solicitante, CNPJ e protocolo
// (com mais de um, todos precisam bater). E-mail ou CNPJ trazem todas as solicitações e
// os documentos liberados; só o protocolo mostra o status (não mostra outros dados).
function ConsultaStatus() {
  const [id, setId] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const consultar = async () => {
    const temId = !!id.trim(), temCnpj = !!cnpj.replace(/\D/g, ""), temEmail = !!email.trim();
    if (!temId && !temCnpj && !temEmail) { setErr("Informe o seu e-mail, o CNPJ da empresa ou o protocolo."); return; }
    if (temCnpj && !cnpjValido(cnpj)) { setErr("CNPJ inválido — confira os dígitos."); return; }
    if (temEmail && !emailValido(email)) { setErr("E-mail inválido — confira o endereço."); return; }
    setErr(""); setLoading(true);
    const r = await db.publicStatus(id.trim(), temCnpj ? cnpj : "", temEmail ? email.trim() : "");
    setLoading(false);
    if (!r || !r.resultados?.length) {
      setRes(null);
      const usados = [temEmail && "e-mail", temCnpj && "CNPJ", temId && "protocolo"].filter(Boolean);
      setErr(`Não encontramos solicitações com ${usados.length > 1 ? `esses dados (${usados.join(" + ")})` : `esse ${usados[0]}`}.`);
      return;
    }
    setRes(r.resultados);
  };
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>Fornecedor</div>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Acompanhar solicitação</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>Basta preencher <b style={{ color: C.text }}>um</b> dos campos. Com o seu e-mail ou o CNPJ você vê todas as suas solicitações e os documentos liberados.</p>
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Seu e-mail (solicitante)" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          <Field label="CNPJ da empresa" value={cnpj} onChange={e => setCnpj(fmtCnpjInput(e.target.value))} />
          <Field label="Protocolo" value={id} onChange={e => setId(e.target.value.toUpperCase())} />
        </div>
        {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.danger }}>{err}</div>}
        <div className="mt-4"><Btn icon={loading ? Loader2 : Search} onClick={consultar}>{loading ? "Consultando…" : "Consultar"}</Btn></div>
      </Card>
      {res && res.length > 1 && <p className="text-xs mb-2" style={{ color: C.muted }}>{res.length} solicitações encontradas.</p>}
      {res && res.map(item => {
        const st = STATUS[item.status] || STATUS.NOVA;
        return (
          <div key={item.id} className="mb-4">
            <Card className="p-5">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="font-mono text-lg font-bold" style={{ color: C.text }}>{item.id}</span>
                <Pill label={st.label} color={st.color} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                {[["Aberta em", item.abertura], ["Prazo de análise", item.prazo], ["Última atualização", item.ultimaAtualiz]].map(([k, v]) => (
                  <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v || "—"}</div></div>
                ))}
              </div>
              {item.documentosComCnpj && <p className="text-xs mt-3" style={{ color: C.muted }}>Para ver os documentos liberados pela gocase, informe também o seu e-mail ou o CNPJ da empresa.</p>}
            </Card>
            {item.entregues && <DocsLiberados entregues={item.entregues} />}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== Menus ===================== */
// Só o portal interno tem menu — o fornecedor usa o acesso público (PublicShell).
const MENU = {
  interno: [
    { id: "dash", label: "Dashboard", icon: LayoutDashboard },
    { id: "lista-cad", label: "Cadastros", icon: FileCheck },
    { id: "clientes", label: "Fornecedores", icon: Building2 },
    { id: "acervo", label: "Acervo de documentos", icon: BookOpen, roles: ["ADMIN", "GESTOR"] },
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "config", label: "Configurações", icon: Settings },
    { id: "conta", label: "Minha conta", icon: UserIcon },
  ],
};

/* ===================== Shell ===================== */
function Shell({ portal, view, nav, onLogout, notifOpen, setNotifOpen, user, notifs, badge, onOpenNotifs, themePref, onCycleTheme, requests, children }) {
  const initials = (user?.name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const staff = ["ADMIN", "GESTOR", "COLABORADOR"].includes(user?.role);
  const [fs, setFs] = useState(false);
  const [q, setQ] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchBoxRef = useRef(null);
  useEffect(() => { setMobileNavOpen(false); }, [view]);

  // Busca global: interno vê todas as solicitações; fornecedor só vê as suas.
  const searchable = useMemo(() => {
    const all = requests || [];
    return portal === "externo"
      ? all.filter(r => (r.ownerEmail ? r.ownerEmail === user?.email : r.parceiro === user?.name))
      : all;
  }, [requests, portal, user]);

  const qNorm = q.trim().toLowerCase();
  const qResults = useMemo(() => {
    if (qNorm.length < 2) return [];
    return searchable
      .filter(r =>
        r.id?.toLowerCase().includes(qNorm) ||
        r.cnpj?.toLowerCase().includes(qNorm) ||
        r.parceiro?.toLowerCase().includes(qNorm)
      )
      .slice(0, 8);
  }, [searchable, qNorm]);

  useEffect(() => {
    const onDocClick = (e) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setQOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goToResult = (r) => { setQ(""); setQOpen(false); nav("detalhe", r.id); };
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggleFs = () => {
    try {
      if (!document.fullscreenElement) (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)?.call(document.documentElement);
      else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    } catch (e) { }
  };
  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      <header className="h-16 flex items-center px-4 gap-4 text-white sticky top-0 z-30" style={{ background: C.coral }}>
        <button onClick={() => setMobileNavOpen(v => !v)} className="md:hidden opacity-90 hover:opacity-100 shrink-0" title="Abrir menu" aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <div onClick={() => nav(portal === "externo" ? "inicio" : "dash")} className="flex items-center gap-2 w-auto md:w-60 cursor-pointer shrink-0">
          <span className="text-xl font-extrabold lowercase tracking-tight">gocase</span>
          <span className="text-xs opacity-80 hidden sm:inline whitespace-nowrap">Cadastro de Fornecedores</span>
        </div>
        <div className="flex-1 max-w-xl relative" ref={searchBoxRef}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
          <input placeholder="Busca global — nº da solicitação, CNPJ, fornecedor…"
            value={q}
            onChange={e => { setQ(e.target.value); setQOpen(true); }}
            onFocus={() => q.trim().length >= 2 && setQOpen(true)}
            onKeyDown={e => { if (e.key === "Enter" && qResults[0]) goToResult(qResults[0]); if (e.key === "Escape") setQOpen(false); }}
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-white/60 outline-none" style={{ background: "rgba(255,255,255,.16)" }} />
          {qOpen && qNorm.length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white border shadow-xl p-2 z-40 max-h-96 overflow-auto" style={{ borderColor: C.line }}>
              {qResults.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center" style={{ color: C.muted }}>Nenhum resultado para "{q.trim()}".</div>
              ) : qResults.map(r => (
                <button key={r.id} onClick={() => goToResult(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left">
                  <span className="rounded-lg p-1.5 shrink-0" style={{ background: C.coralSoft, color: C.coral }}><FileText size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.id} · {r.parceiro}</div>
                    <div className="text-xs truncate" style={{ color: C.muted }}>{r.cnpj} — {STATUS[r.status]?.label || r.status}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onCycleTheme}
          title={themePref === "light" ? "Tema: Claro (clique para Escuro)" : themePref === "dark" ? "Tema: Escuro (clique para Automático)" : "Tema: Automático (clique para Claro)"}
          className="opacity-90 hover:opacity-100">
          {themePref === "light" ? <Sun size={19} /> : themePref === "dark" ? <Moon size={19} /> : <Monitor size={19} />}
        </button>
        <button onClick={toggleFs} title={fs ? "Sair da tela cheia" : "Tela cheia"} className="opacity-90 hover:opacity-100">
          {fs ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
        <div className="relative">
          <button onClick={() => { const willOpen = !notifOpen; setNotifOpen(willOpen); if (willOpen && onOpenNotifs) onOpenNotifs(); }} className="relative block">
            <Bell size={20} />
            {badge > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: C.accent, color: C.ink }}>{badge}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border shadow-xl p-2 z-40 max-h-96 overflow-auto" style={{ borderColor: C.line }}>
              <div className="px-3 py-2 text-sm font-bold" style={{ color: C.text }}>Notificações</div>
              {(!notifs || notifs.length === 0) && <div className="px-3 py-4 text-sm text-center" style={{ color: C.muted }}>Sem notificações por enquanto.</div>}
              {notifs && notifs.map((n) => (
                <button key={n.id} onClick={() => { setNotifOpen(false); if (n.requestId) nav("detalhe", n.requestId); }}
                  className="w-full flex gap-3 items-start px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left" style={{ background: n.read ? "transparent" : C.coralSoft }}>
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.color }} />
                  <div><div className="text-sm font-medium" style={{ color: C.text }}>{n.message}</div>
                    <div className="text-xs" style={{ color: C.muted }}>{n.requestId ? n.requestId + " · " : ""}{relTime(n.ts)}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: C.accent, color: C.ink }}>{initials}</div>
          <button onClick={onLogout} className="opacity-90 hover:opacity-100"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex">
        {mobileNavOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileNavOpen(false)} />
        )}
        <aside className={`w-60 shrink-0 border-r p-3 self-start z-50
            fixed left-0 top-0 bottom-0 overflow-y-auto transition-transform duration-200
            ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 md:sticky md:top-16 md:bottom-auto md:min-h-[calc(100vh-4rem)]`}
          style={{ borderColor: C.line, background: C.surface }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
            {portal === "externo" ? "Portal do Fornecedor" : "Portal Interno"}
          </div>
          {MENU[portal].filter(it => !it.roles || it.roles.includes(user?.role)).map(it => {
            const active = view === it.id;
            return (
              <button key={it.id} onClick={() => { nav(it.id); setMobileNavOpen(false); }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium mb-1 transition"
                style={active ? { background: C.coralSoft, color: C.coral } : { color: C.text }}>
                <it.icon size={18} style={{ color: active ? C.coral : C.muted }} />{it.label}
                {active && <ChevronRight size={15} className="ml-auto" />}
              </button>
            );
          })}
        </aside>
        <main className="flex-1 p-6 w-full min-w-0" onClick={() => notifOpen && setNotifOpen(false)}>{children}</main>
      </div>
    </div>
  );
}

/* ===================== SLA / time helpers ===================== */
function parseBR(s) {
  if (!s || typeof s !== "string") return null;
  const [d, m, y] = s.split("/");
  if (!d || !m || !y) return null;
  const ts = new Date(+y, +m - 1, +d).getTime();
  return isNaN(ts) ? null : ts;
}
function fmtDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  if (h < 24) return `${h}h ${totalMin % 60}min`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
function calcSLAMetrics(r) {
  const now = Date.now();
  const aberturaTs = r.aberturaTs || parseBR(r.abertura);
  const prazoTs = r.prazoTs || parseBR(r.prazo);
  const ultimaAtualizTs = r.ultimaAtualizTs || aberturaTs;
  const finalizadoTs = ["CONCLUIDA", "NEGADA"].includes(r.status) ? (r.finalizadoTs || prazoTs || now) : null;
  const tempoAberto = finalizadoTs ? finalizadoTs - aberturaTs : now - aberturaTs;
  const tempoAtendimento = finalizadoTs ? finalizadoTs - aberturaTs : null;
  const slaTotal = prazoTs && aberturaTs ? prazoTs - aberturaTs : 7 * 24 * 3600000;
  const slaRestante = prazoTs ? prazoTs - now : null;
  const slaPct = slaTotal > 0 ? Math.min(100, Math.round((tempoAberto / slaTotal) * 100)) : 0;
  let slaStatus = r.sla || "DENTRO";
  if (prazoTs) {
    if (now > prazoTs) slaStatus = "VENCIDO";
    else if (prazoTs - now < 24 * 3600000) slaStatus = "PROXIMO";
    else slaStatus = "DENTRO";
  }
  return { aberturaTs, prazoTs, ultimaAtualizTs, finalizadoTs, tempoAberto, tempoAtendimento, slaRestante, slaPct, slaStatus, slaTotal };
}

// Opener do visualizador embutido — injetado pelo <DocViewer/> (SPA de instância única).
let _openDocViewer = null;

// Descobre a natureza do documento (imagem, vídeo, PDF ou outro) pelo MIME/nome/URL.
function inferKind(ref) {
  const type = (ref.type || "").toLowerCase();
  const s = `${ref.name || ""} ${ref.url || ""}`.toLowerCase();
  if (type.startsWith("image") || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/.test(s)) return "image";
  if (type.startsWith("video") || /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(s)) return "video";
  if (type.includes("pdf") || /\.pdf(\?|#|$)/.test(s) || (ref.url || "").startsWith("data:application/pdf")) return "pdf";
  return "other";
}

// Abre um documento SEM sair da página (visualização embutida). Aceita uma URL
// (string) ou um objeto { url, name/nome, type/arquivoType }. Só recorre a uma
// nova aba se o visualizador ainda não estiver montado.
function abrirDoc(ref, toast) {
  const o = typeof ref === "string" ? { url: ref } : (ref || {});
  const url = o.url;
  if (!url) { if (toast) toast("Documento sem link cadastrado."); return; }
  const valido = url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/") ||
    (() => { try { const p = new URL(url); return p.protocol === "http:" || p.protocol === "https:"; } catch { return false; } })();
  if (!valido) { if (toast) toast("Este documento tem um caminho inválido. Edite-o e informe uma URL completa começando com https://."); return; }
  const doc = { url, name: o.name || o.nome || "Documento", type: o.type || o.arquivoType || "" };
  if (_openDocViewer) { _openDocViewer(doc); return; }
  try { window.open(url, "_blank", "noopener,noreferrer"); } catch (e) { }
}

// Visualizador de documentos embutido — abre imagens, vídeos e PDFs dentro da
// própria página, com botão de baixar. Fica montado uma vez no App.
function DocViewer() {
  const [doc, setDoc] = useState(null);
  useEffect(() => { _openDocViewer = setDoc; return () => { _openDocViewer = null; }; }, []);
  if (!doc) return null;
  const kind = inferKind(doc);
  const isExternal = /^https?:/i.test(doc.url) && !doc.url.startsWith("/api/");
  const dlUrl = doc.url.startsWith("/api/files/") ? `${doc.url}?download=1` : doc.url;
  const close = () => setDoc(null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(15,15,22,.7)" }} onClick={close}>
      <div className="w-full max-w-5xl rounded-2xl bg-white overflow-hidden flex flex-col" style={{ border: `1px solid ${C.line}`, maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: C.line }}>
          <FileIcon size={16} style={{ color: C.coral }} />
          <h2 className="font-bold text-sm truncate mr-auto" style={{ color: C.text }}>{doc.name}</h2>
          <a href={dlUrl} download={doc.name} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold border hover:bg-gray-50" style={{ borderColor: C.line, color: C.text }}><Download size={14} /> Baixar</a>
          <button onClick={close} className="rounded-xl px-3 py-2 text-sm font-bold border hover:bg-gray-50" style={{ borderColor: C.line, color: C.muted }}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50" style={{ minHeight: "50vh" }}>
          {kind === "image" ? <img src={doc.url} alt={doc.name} className="max-w-full max-h-[80vh] object-contain" />
            : kind === "video" ? <video src={doc.url} controls className="max-w-full max-h-[80vh]" />
              : kind === "pdf" ? <iframe title={doc.name} src={doc.url} className="w-full" style={{ border: 0, height: "80vh", background: "#fff" }} />
                : isExternal ? (
                  <div className="text-center p-8">
                    <ExternalLink size={40} style={{ color: C.coral }} className="mx-auto mb-3" />
                    <p className="text-sm mb-4" style={{ color: C.muted }}>Este documento está hospedado externamente e pode não permitir visualização embutida.</p>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: C.coral }}><ExternalLink size={15} /> Abrir em nova aba</a>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <FileIcon size={40} style={{ color: C.coral }} className="mx-auto mb-3" />
                    <p className="text-sm mb-4" style={{ color: C.muted }}>Pré-visualização não disponível para este tipo de arquivo.</p>
                    <a href={dlUrl} download={doc.name} className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: C.coral }}><Download size={15} /> Baixar arquivo</a>
                  </div>
                )}
        </div>
      </div>
    </div>
  );
}

/* ===================== Timeline builder ===================== */
function buildTimeline(r) {
  if (Array.isArray(r.timeline) && r.timeline.length > 0) return r.timeline;
  const aberturaTs = r.aberturaTs || parseBR(r.abertura) || Date.now();
  const fmtTs = (ts) => {
    if (!ts) return r.abertura || "—";
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };
  const ev = [{ status: "NOVA", actor: "cliente", who: r.parceiro, ts: aberturaTs, when: fmtTs(aberturaTs), text: "Solicitação aberta no portal." }];
  if (r.resp && r.resp !== "—" && r.resp !== "IA") {
    const atribTs = r.atribTs || (aberturaTs + 2 * 3600000);
    ev.push({ status: "EM_ANALISE", actor: "user", who: r.resp, ts: atribTs, when: fmtTs(atribTs), text: `Solicitação atribuída a ${r.resp}. Analisando informações e anexos.` });
  }
  if (Array.isArray(r.movimentos)) {
    r.movimentos.forEach(mv => ev.push({ status: mv.status, actor: mv.actor || "user", who: mv.who, ts: mv.ts, when: fmtTs(mv.ts), text: mv.text }));
  } else {
    if (r.status === "AGUARDANDO") { const ts = r.aguardandoTs || (aberturaTs + 3 * 3600000); ev.push({ status: "AGUARDANDO", actor: "user", who: r.resp, ts, when: fmtTs(ts), text: "Aguardando informações ou documentos complementares." }); }
    if (r.status === "APROVADA" || r.status === "CONCLUIDA") { const ts = r.aprovadoTs || r.ultimaAtualizTs || parseBR(r.prazo) || (aberturaTs + 4 * 3600000); ev.push({ status: "APROVADA", actor: "user", who: r.resp, ts, when: fmtTs(ts), text: r.msgAprovacao || "Solicitação aprovada." }); }
    if (r.status === "NEGADA" && r.resp !== "IA") { const ts = r.negadoTs || r.ultimaAtualizTs || parseBR(r.prazo) || (aberturaTs + 4 * 3600000); ev.push({ status: "NEGADA", actor: "user", who: r.resp, ts, when: fmtTs(ts), text: r.msgNegativa || "Solicitação negada." }); }
    if (r.status === "CONCLUIDA") { const ts = r.concluidoTs || r.finalizadoTs || (aberturaTs + 5 * 3600000); ev.push({ status: "CONCLUIDA", actor: "user", who: r.resp, ts, when: fmtTs(ts), text: "Processo concluído e fornecedor comunicado." }); }
  }
  if (Array.isArray(r.chat) && r.chat.length > 0) {
    r.chat.forEach(msg => ev.push({ status: r.status, actor: msg.role === "cliente" ? "cliente" : "user", who: msg.autor, ts: msg.ts, when: fmtTs(msg.ts), text: `💬 ${msg.texto}`, isChat: true }));
  }
  return ev.sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

/* ===================== SLA Panel ===================== */
function SLAPanel({ r }) {
  const m = calcSLAMetrics(r);
  const slaInfo = SLA[m.slaStatus] || SLA.DENTRO;
  const isOpen = !["CONCLUIDA", "NEGADA"].includes(r.status);
  const rows = [
    ["Aberta em", r.abertura || "—"],
    ["Prazo SLA", r.prazo || "—"],
    ["Última atualização", r.ultimaAtualiz || r.abertura || "—"],
    ["Tempo em aberto", fmtDuration(m.tempoAberto)],
    ["Tempo de atendimento", m.tempoAtendimento ? fmtDuration(m.tempoAtendimento) : (isOpen ? "Em andamento" : "—")],
  ];
  return (
    <Card className="p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={16} style={{ color: C.coral }} />
        <h2 className="font-bold text-sm" style={{ color: C.text }}>Indicadores de SLA</h2>
        <div className="ml-auto"><Pill {...slaInfo} /></div>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: C.muted }}>
          <span>Uso do prazo</span>
          <span style={{ color: m.slaPct >= 100 ? C.coral : m.slaPct >= 80 ? C.yellow : C.green, fontWeight: 700 }}>{m.slaPct}%</span>
        </div>
        <div className="rounded-full h-2.5 overflow-hidden" style={{ background: C.line }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, m.slaPct)}%`, background: m.slaPct >= 100 ? C.coral : m.slaPct >= 80 ? C.yellow : C.green }} />
        </div>
        {isOpen && m.slaRestante != null && (
          <div className="text-xs mt-1" style={{ color: m.slaRestante < 0 ? C.coral : C.muted }}>
            {m.slaRestante < 0 ? `Vencido há ${fmtDuration(Math.abs(m.slaRestante))}` : `Restam ${fmtDuration(m.slaRestante)}`}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span style={{ color: C.muted }}>{label}</span>
            <span className="font-semibold" style={{ color: C.text }}>{val}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ===================== Chat persistente ===================== */
function ChatPanel({ r, currentUser, onSendMsg, onReopenRequest }) {
  const [texto, setTexto] = useState("");
  const [arquivos, setArquivos] = useState([]);
  const endRef = useRef(null);
  const msgs = Array.isArray(r.chat) ? r.chat : [];
  const isClosed = ["CONCLUIDA", "NEGADA"].includes(r.status);
  const isInternal = isInterno(currentUser?.role);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  const enviar = () => {
    const t = texto.trim();
    if (!t && arquivos.length === 0) return;
    const msg = { id: `msg-${Date.now()}`, ts: Date.now(), role: isInternal ? "equipe" : "cliente", autor: currentUser?.name || "Usuário", texto: t, arquivos: arquivos.map(f => ({ name: f.name, url: f.url, type: f.type })) };
    onSendMsg(r.id, msg);
    setTexto(""); setArquivos([]);
    if (isClosed && !isInternal) onReopenRequest(r.id, msg);
  };
  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } };
  const fmtMsgTime = (ts) => { const d = new Date(ts); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
  return (
    <Card className="flex flex-col" style={{ minHeight: 340 }}>
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: C.line }}>
        <MessageSquare size={16} style={{ color: C.coral }} />
        <h2 className="font-bold text-sm" style={{ color: C.text }}>Chat do chamado</h2>
        {isClosed && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.coralSoft, color: C.coral }}>Encerrado — envie uma mensagem para reabrir</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 320 }}>
        {msgs.length === 0 && <div className="text-center text-sm py-8" style={{ color: C.muted }}>Nenhuma mensagem ainda. Use o chat para comunicação direta sobre este chamado.</div>}
        {msgs.map((msg) => {
          const isMine = msg.autor === currentUser?.name;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div className="text-[10px] mb-1" style={{ color: C.muted, textAlign: isMine ? "right" : "left" }}>{msg.autor} · {fmtMsgTime(msg.ts)}</div>
                <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: isMine ? C.coral : C.bg, color: isMine ? "white" : C.text, border: isMine ? "none" : `1px solid ${C.line}`, borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
                  {msg.texto && <p>{msg.texto}</p>}
                  {msg.arquivos?.length > 0 && <div className="mt-2 space-y-1">{msg.arquivos.map((f, i) => <button key={i} onClick={() => abrirDoc(f, null)} className="flex items-center gap-1 text-xs underline opacity-90"><Paperclip size={11} />{f.name}</button>)}</div>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t p-3" style={{ borderColor: C.line }}>
        {arquivos.length > 0 && <div className="flex gap-2 mb-2 flex-wrap">{arquivos.map((f, i) => <div key={i} className="flex items-center gap-1 text-xs rounded-lg px-2 py-1" style={{ background: C.coralSoft, color: C.coral }}><Paperclip size={11} />{f.name}<button onClick={() => setArquivos(a => a.filter((_, j) => j !== i))}><X size={11} /></button></div>)}</div>}
        <div className="flex gap-2 items-end">
          <textarea value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={handleKey} placeholder={isClosed && !isInternal ? "Envie uma mensagem para reabrir o chamado…" : "Escreva uma mensagem… (Enter para enviar)"} rows={2} className="flex-1 rounded-xl border px-3 py-2 text-sm resize-none bg-white" style={{ borderColor: C.line }} />
          <label className="cursor-pointer rounded-xl p-2.5 hover:bg-gray-50" title="Anexar arquivo">
            <input type="file" className="hidden" multiple onChange={async e => {
              const newFiles = await Promise.all(Array.from(e.target.files || []).map(f => db.uploadFile(f)));
              setArquivos(a => [...a, ...newFiles]);
              e.target.value = "";
            }} />
            <Paperclip size={18} style={{ color: C.muted }} />
          </label>
          <button onClick={enviar} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white flex items-center gap-1.5" style={{ background: C.coral }}><Send size={15} />Enviar</button>
        </div>
      </div>
    </Card>
  );
}

/* Consulta o CNPJ na base de clientes gocase (Reseller / Datamart). Depende da
   sessão da plataforma GoDeploy de quem está logado — sem ela aparece como indisponível. */
function ResellerCard({ cnpj }) {
  const [res, setRes] = useState(null);
  useEffect(() => {
    let alive = true;
    setRes(null);
    db.resellerLookup(cnpj).then(r => { if (alive) setRes(r || { found: false, error: "lookup_error" }); });
    return () => { alive = false; };
  }, [cnpj]);
  const indisponivel = res && !res.found && res.error;
  return (
    <Card className="p-4 flex items-start gap-3">
      <span className="rounded-lg p-2 shrink-0" style={{ background: C.coralSoft, color: C.coral }}><Users size={16} /></span>
      <div className="text-sm min-w-0">
        <div className="font-bold" style={{ color: C.text }}>Base de clientes gocase (Reseller)</div>
        {!res ? <div className="flex items-center gap-2" style={{ color: C.muted }}><Loader2 size={13} className="animate-spin" /> Consultando…</div>
          : res.found ? <>
              <div style={{ color: C.text }}>CNPJ já está na base: <b>{res.nomeFantasia || res.razaoSocial}</b>{res.razaoSocial && res.nomeFantasia !== res.razaoSocial ? ` (${res.razaoSocial})` : ""}.</div>
              <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                IE no Reseller: <b style={{ color: C.text }}>{res.inscricaoEstadual || "não informada"}</b>
                {res.contribuinteIcms ? <> · Contribuinte ICMS: <b style={{ color: C.text }}>{res.contribuinteIcms}</b></> : null}
              </div>
            </>
          : indisponivel ? <div style={{ color: C.muted }}>Consulta indisponível agora{res.error === "not_authenticated" ? " — entre na plataforma GoDeploy neste navegador para habilitar" : ""}.</div>
          : <div style={{ color: C.muted }}>CNPJ não encontrado na base de clientes.</div>}
      </div>
    </Card>
  );
}

/* Documento pedido pelo fornecedor, no chamado. A equipe envia com um clique (usa o
   arquivo/link atual do acervo) ou anexa um arquivo na hora; o fornecedor baixa em
   "Acompanhar solicitação" (protocolo + CNPJ). O envio pode ser cancelado. */
function DocEnvioItem({ d, acervo, interno, onLiberar, onCancelar }) {
  const fileRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const doc = (acervo || []).find(x => x.id === d.docId);
  const partes = doc ? acervoPartes(doc) : { arquivo: null, link: "" };
  const conteudo = d.arquivoEnviado || partes.arquivo || (linkValido(partes.link) ? partes.link : null);
  const abrir = () => {
    if (d.arquivoEnviado) abrirDoc({ ...d.arquivoEnviado, nome: d.arquivoEnviado.name || d.nome });
    else if (partes.arquivo) abrirDoc({ ...partes.arquivo, nome: partes.arquivo.name || d.nome });
    else if (linkValido(partes.link)) abrirDoc(partes.link);
    else if (d.url) abrirDoc(d);
  };
  const anexar = async (e) => {
    const file = e.target.files?.[0]; if (e.target) e.target.value = "";
    if (!file) return;
    setEnviando(true);
    try { const up = await db.uploadFile(file); await onLiberar(d.docId, { url: up.url, name: file.name, type: up.type || file.type || "" }); }
    finally { setEnviando(false); }
  };
  const quando = d.liberadoTs ? new Date(d.liberadoTs).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const status = d.automatico ? { t: "Enviado automaticamente", c: C.green }
    : d.liberado ? { t: `Enviado pela equipe${quando ? ` em ${quando}` : ""}${d.liberadoPor ? ` · ${d.liberadoPor}` : ""}`, c: C.green }
    : d.foraDaRegra ? { t: "Outra empresa gocase — não se aplica", c: C.muted }
    : { t: conteudo ? "Pendente de envio" : "Sem arquivo no acervo — anexe para enviar", c: C.yellow };
  return (
    <div className="rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: C.line, color: C.text }}>
      <div className="flex items-center gap-2">
        <button onClick={abrir} disabled={!conteudo && !d.url} className="rounded-lg p-1.5 shrink-0" title="Abrir" style={{ background: C.coralSoft, color: C.coral, opacity: conteudo || d.url ? 1 : .5 }}><FileIcon size={15} /></button>
        <span className="flex-1 min-w-0">
          <button onClick={abrir} disabled={!conteudo && !d.url} className="font-medium truncate block text-left max-w-full hover:underline disabled:no-underline">{d.nome}</button>
          <span className="text-[10px] font-semibold" style={{ color: status.c }}>{status.t}</span>
        </span>
      </div>
      {interno && !d.automatico && (
        <div className="flex gap-3 flex-wrap mt-2 pl-9 text-xs font-semibold">
          <input ref={fileRef} type="file" className="hidden" onChange={anexar} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" />
          {d.liberado ? (
            <button onClick={() => onCancelar(d.docId)} style={{ color: C.danger }}>Cancelar envio</button>
          ) : (
            <>
              {conteudo && <button onClick={() => onLiberar(d.docId, null)} className="inline-flex items-center gap-1" style={{ color: C.green }}><Send size={12} /> Enviar ao fornecedor</button>}
              <button onClick={() => !enviando && fileRef.current?.click()} className="inline-flex items-center gap-1" style={{ color: C.coral }}>
                {enviando ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />} {conteudo ? "Anexar outro arquivo e enviar" : "Anexar arquivo e enviar"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ===================== Detalhe ===================== */
function Detalhe({ r, back, interno, openModal, currentUser, onSendMsg, onReopenRequest, acervo, onLiberarDoc, onCancelarEnvio, toast }) {
  if (!r) return null;
  const tl = buildTimeline(r);
  return (
    <div>
      <button onClick={back} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.muted }}><ArrowLeft size={15} /> Voltar</button>
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-2xl font-bold font-mono" style={{ color: C.text }}>{r.id}</h1>
        <Pill {...STATUS[r.status]} /><Pill {...SLA[calcSLAMetrics(r).slaStatus]} />
      </div>
      <p className="text-sm mb-4" style={{ color: C.muted }}>{r.tipo} · Aberta em {r.abertura} · Prazo SLA {r.prazo} · Responsável {r.resp}</p>
      <SLAPanel r={r} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="font-bold" style={{ color: C.text }}>Dados do fornecedor</h2>
              {r.dados?.fonte && <span className="text-[11px]" style={{ color: C.muted }}>Fonte: {r.dados.fonte}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(() => {
                const d = r.dados || {};
                const ie = (d.inscricaoEstadual || r.ie || "").trim();
                const endereco = [d.logradouro, d.complemento, d.bairro, [d.municipio, d.estado].filter(Boolean).join("/"), d.cep].filter(Boolean).join(" · ");
                return [
                  ["Razão social", d.razaoSocial || r.parceiro], ["Nome fantasia", d.nomeFantasia || "—"],
                  ["CNPJ", r.cnpj], ["Inscrição estadual", ie ? (ie.toUpperCase() === "ISENTO" ? "Isento" : ie) : "Não informada"],
                  ["Situação cadastral", d.situacao || "—"], ["UF", r.uf],
                  ["Contato", d.nomeContato || "—"], ["Telefone", d.telefone || "—"],
                  ...(r.empresaGocase ? [["Documentos da empresa", EMPRESA_NOME[r.empresaGocase] || r.empresaGocase]] : []),
                  ["E-mail do solicitante", r.emailSolicitante || r.email || "—"], ["E-mail da empresa (Receita)", d.email || "—"],
                  ["Endereço", endereco || "—"],
                ];
              })().map(([k, v]) =>
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium break-words" style={{ color: C.text }}>{v}</div></div>)}
            </div>
          </Card>
          {interno && <ResellerCard cnpj={r.cnpj} />}
          <Card className="p-5">
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Anexos enviados pelo fornecedor</h2>
            {(r.anexos && r.anexos.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {r.anexos.map((a, i) => {
                  const isImg = (a.type || "").startsWith("image"); const isVid = (a.type || "").startsWith("video"); const isPdf = (a.type || "").includes("pdf");
                  return (
                    <button key={i} onClick={() => abrirDoc(a, null)} className="block rounded-xl border overflow-hidden text-left w-full hover:shadow-md transition" style={{ borderColor: C.line }}>
                      <div className="h-24 flex items-center justify-center bg-gray-50">
                        {isImg ? <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                          : isVid ? <video src={a.url} className="h-full w-full object-cover" muted />
                            : <div style={{ color: C.coral }}>{isPdf ? <FileIcon size={26} /> : <Paperclip size={26} />}</div>}
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium truncate" style={{ color: C.text }}>{a.name}</div>
                        <div className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: C.coral }}>
                          {isVid && <Film size={10} />}<ExternalLink size={10} />Abrir / baixar
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: C.muted }}>Nenhum anexo enviado pelo fornecedor nesta solicitação.</p>
            )}
          </Card>
          {/* Mensagem do fornecedor — visível para equipe interna */}
          {(r.mensagemCadastro || (r.tipo === "Cadastro" && r.problema && r.problema !== "Solicitação de cadastro / homologação de parceiro.")) && (
            <Card className="p-5" style={{ borderColor: C.cyan + "50", background: C.cyan + "08" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} style={{ color: C.cyan }} />
                <h2 className="font-bold text-sm" style={{ color: C.text }}>Mensagem do fornecedor</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: C.text }}>
                {r.mensagemCadastro || r.problema}
              </p>
            </Card>
          )}
          {((r.docsEnviados && r.docsEnviados.length > 0) || (r.docsSolicitados && r.docsSolicitados.length > 0) || (r.docsNaoEncontrados && r.docsNaoEncontrados.length > 0)) && (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                <h2 className="font-bold" style={{ color: C.text }}>Documentos que o fornecedor pediu à gocase</h2>
                {interno && (r.docsEnviados || []).some(d => d.liberado || d.automatico) && (
                  <button onClick={() => {
                    const txt = `Olá! Os documentos da gocase da sua solicitação ${r.id} estão disponíveis para download em ${window.location.origin} → "Acompanhar solicitação" (protocolo ${r.id} e CNPJ ${r.cnpj}).`;
                    try { navigator.clipboard.writeText(txt).then(() => toast && toast("Aviso copiado — cole no e-mail ou WhatsApp do fornecedor."), () => toast && toast(txt)); } catch (e) { toast && toast(txt); }
                  }} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: C.coral }}><Mail size={13} /> Copiar aviso para o fornecedor</button>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: C.muted }}>Os de <b>envio automático</b> já foram liberados ao enviar a solicitação. Os demais: clique em <b>Enviar ao fornecedor</b> — ele baixa em "Acompanhar solicitação" (protocolo + CNPJ).</p>
              {r.docsEnviados && r.docsEnviados.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-2">
                  {r.docsEnviados.map((d, i) => (
                    <DocEnvioItem key={d.docId || i} d={d} acervo={acervo} interno={interno}
                      onLiberar={(docId, arquivo) => onLiberarDoc(r.id, docId, arquivo)} onCancelar={(docId) => onCancelarEnvio(r.id, docId)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(r.docsSolicitados || []).map((d, i) => <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.text }}><FileCheck size={15} style={{ color: C.coral }} /> {d}</div>)}
                </div>
              )}
              {r.docsNaoEncontrados && r.docsNaoEncontrados.length > 0 && (
                <div className="mt-3 rounded-xl border px-3 py-2.5 text-xs" style={{ borderColor: C.yellow + "66", background: C.yellow + "12", color: C.text }}>
                  <div className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={13} style={{ color: C.yellow }} /> Itens da lista do fornecedor que não estão no acervo</div>
                  {r.docsNaoEncontrados.join(" · ")}
                </div>
              )}
              {r.listaDocumentos && (
                <details className="mt-3 text-xs" style={{ color: C.muted }}>
                  <summary className="cursor-pointer font-semibold">Lista colada pelo fornecedor</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans" style={{ color: C.text }}>{r.listaDocumentos}</pre>
                </details>
              )}
            </Card>
          )}
          {interno && !["CONCLUIDA", "NEGADA"].includes(r.status) && (
            <div className="space-y-3">
              {/* Ações gerais */}
              <div className="flex gap-3 flex-wrap">
                <Btn icon={CheckCircle2} color={C.green}  onClick={() => openModal("aprovar")}>Aprovar</Btn>
                <Btn icon={XCircle}     color={C.danger}   onClick={() => openModal("negar")}>Negar</Btn>
                {r.status === "APROVADA" && <Btn icon={Check} color={C.violet} onClick={() => openModal("concluir")}>Concluir</Btn>}
              </div>
              {/* Submissão setorial — apenas para solicitações de Cadastro */}
              {r.tipo === "Cadastro" && (
                <div>
                  <div className="text-xs font-semibold mb-2" style={{ color: C.muted }}>Submeter para análise setorial:</div>
                  <div className="flex gap-2 flex-wrap">
                    <Btn icon={ShieldCheck} variant="outline" color="#7B5EA7" onClick={() => openModal("juridico")}>Setor Jurídico</Btn>
                    <Btn icon={FileCheck}   variant="outline" color="#0077B6" onClick={() => openModal("fiscal")}>Setor Fiscal</Btn>
                    <Btn icon={TrendingUp}  variant="outline" color="#008B8B" onClick={() => openModal("financeiro")}>Setor Financeiro</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
          <ChatPanel r={r} currentUser={currentUser} onSendMsg={onSendMsg} onReopenRequest={onReopenRequest} />
        </div>
        <Card className="p-5 self-start">
          <h2 className="font-bold mb-4" style={{ color: C.text }}>Linha do tempo</h2>
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px" style={{ background: C.line }} />
            {tl.map((t, i) => {
              const dot = t.isChat ? C.cyan : t.actor === "ia" ? C.violet : t.actor === "cliente" ? C.cyan : C.coral;
              const stDef = STATUS[t.status] || STATUS.NOVA;
              return (
                <div key={i} className="relative mb-5">
                  <span className="absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: dot }} />
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.isChat ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: C.cyan }}><MessageSquare size={12} />Chat</span> : <Pill label={stDef.label} color={stDef.color} />}
                    {t.actor === "ia" && <Sparkles size={13} style={{ color: C.violet }} />}
                  </div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>{t.who} · {t.when}</div>
                  <p className="text-sm mt-0.5" style={{ color: C.text }}>{t.text}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===================== External screens (acesso público) ===================== */
// Documentos do acervo liberados ao fornecedor (envio automático) + os que a equipe
// ainda vai enviar. Arquivos abrem no visualizador embutido; links do Drive também.
function DocsLiberados({ entregues = [], pendentes = [] }) {
  if (!entregues.length && !pendentes.length) return null;
  return (
    <Card className="p-5 mt-4">
      {entregues.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Download size={16} style={{ color: C.green }} />
            <h2 className="font-bold" style={{ color: C.text }}>Documentos da gocase liberados para você</h2>
          </div>
          <div className="space-y-2">
            {entregues.map(d => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 flex-wrap" style={{ borderColor: C.line }}>
                <span className="rounded-lg p-1.5 shrink-0" style={{ background: C.coralSoft, color: C.coral }}><FileIcon size={15} /></span>
                <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: C.text }}>{d.nome}</span>
                {d.arquivo && <Btn icon={Eye} variant="outline" onClick={() => abrirDoc({ ...d.arquivo, nome: d.arquivo.name || d.nome })}>Abrir / baixar</Btn>}
                {d.link && <Btn icon={ExternalLink} variant="outline" onClick={() => abrirDoc(d.link)}>Link do Drive</Btn>}
              </div>
            ))}
          </div>
        </>
      )}
      {pendentes.length > 0 && (
        <p className={`text-xs ${entregues.length ? "mt-4" : ""}`} style={{ color: C.muted }}>
          A equipe gocase envia depois da análise: <b style={{ color: C.text }}>{pendentes.join(", ")}</b>.
        </p>
      )}
    </Card>
  );
}

// Solicitação de cadastro aberta a qualquer pessoa: só o CNPJ é obrigatório. Ao
// digitar os 14 dígitos, os dados são buscados na Receita Federal, inclusive se a
// empresa tem Inscrição Estadual ativa ou é isenta.
function ExtNovaCad({ toast, acervo, goStatus }) {
  const docsDisponiveis = useMemo(() => acervo || [], [acervo]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(""); // validação do passo
  const [erroCnpj, setErroCnpj] = useState(""); // resultado da consulta do CNPJ (não apaga o erro do passo)
  const [consultado, setConsultado] = useState(false);
  const [ieStatus, setIeStatus] = useState(""); // contribuinte | isento | desconhecido
  const [fonte, setFonte] = useState("");
  const ieConsultadaRef = useRef(""); // IE que veio da consulta (restaurada ao desmarcar "isento")
  const [protocolo, setProtocolo] = useState(null);
  const vazio = {
    cnpj: "", emailSolicitante: "", nomeContato: "", telefone: "", email: "",
    razaoSocial: "", nomeFantasia: "", inscricaoEstadual: "", situacao: "",
    cep: "", logradouro: "", bairro: "", municipio: "", estado: "", complemento: "",
  };
  const [f, setF] = useState(vazio);
  const [meusDocs, setMeusDocs] = useState([]);
  const [uploadKey, setUploadKey] = useState(0);
  // Marcação manual (chaveada por id do documento do acervo) — prevalece sobre a lista colada.
  const [solicitar, setSolicitar] = useState({});
  const [lista, setLista] = useState(""); // lista de documentos colada pelo fornecedor
  const [casamento, setCasamento] = useState({ ids: new Set(), naoEncontrados: [], total: 0 });
  const [mensagem, setMensagem] = useState("");
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  // Empresa gocase cujos documentos o fornecedor recebe (BB × Go) — ver empresaDoFornecedor().
  const regra = empresaDoFornecedor(f.inscricaoEstadual, mensagem);
  const docsDaLista = aplicarRegraEmpresa(casamento.ids, docsDisponiveis, regra.empresa);
  const finalIds = (() => {
    const desejados = new Set([...casamento.ids, ...Object.keys(solicitar).filter(id => solicitar[id])]);
    const out = aplicarRegraEmpresa(desejados, docsDisponiveis, regra.empresa);
    Object.keys(solicitar).forEach(id => { if (solicitar[id] === false) out.delete(id); });
    return out;
  })();
  const marcado = (id) => finalIds.has(id);
  const toggleDoc = (id) => setSolicitar(s => ({ ...s, [id]: !marcado(id) }));
  const selecionados = docsDisponiveis.filter(d => marcado(d.id));
  // Ao colar/editar a lista, marca sozinho as caixas correspondentes (sem clicar uma a uma).
  useEffect(() => {
    const t = setTimeout(() => setCasamento(casarListaDocumentos(lista, docsDisponiveis, regra.empresa)), 300);
    return () => clearTimeout(t);
  }, [lista, docsDisponiveis, regra.empresa]);
  const isento = f.inscricaoEstadual.trim().toUpperCase() === "ISENTO";
  const cnpjOk = cnpjValido(f.cnpj);

  const localizar = async () => {
    const d = (f.cnpj || "").replace(/\D/g, "");
    if (!cnpjValido(d)) { setErroCnpj("Informe um CNPJ válido (14 dígitos)."); return; }
    setErroCnpj(""); setLoading(true);
    const dados = await consultarCNPJ(d);
    setConsultado(true); setLoading(false);
    setErro(e => (e.startsWith("Aguarde a consulta") ? "" : e));
    if (!dados) {
      setIeStatus("desconhecido"); setFonte("");
      setErroCnpj("Não foi possível consultar o CNPJ agora. Você pode preencher os dados manualmente ou tentar de novo.");
      return;
    }
    setErroCnpj("");
    const { ieStatus: st, fonte: fnt, ...campos } = dados;
    setF(s => ({ ...s, ...campos, cnpj: s.cnpj }));
    setIeStatus(st); setFonte(fnt || "");
    ieConsultadaRef.current = st === "contribuinte" ? campos.inscricaoEstadual : "";
    toast(st === "contribuinte" ? "Dados localizados, incluindo a inscrição estadual."
      : st === "isento" ? "Dados localizados. Nenhuma inscrição estadual ativa: marcado como Isento."
      : "Dados localizados. Não foi possível verificar a inscrição estadual — preencha ou marque Isento.");
  };

  // Busca automática: assim que o CNPJ tem 14 dígitos, consulta sozinho (com debounce),
  // sem precisar clicar no botão. O ref evita repetir a busca do mesmo CNPJ.
  const autoRef = useRef("");
  useEffect(() => {
    const digits = (f.cnpj || "").replace(/\D/g, "");
    if (digits.length === 14 && autoRef.current !== digits && !loading) {
      autoRef.current = digits;
      const t = setTimeout(() => { localizar(); }, 500);
      return () => clearTimeout(t);
    }
    if (digits.length < 14) autoRef.current = "";
  }, [f.cnpj]);

  const avancar = () => {
    if (!cnpjOk) { setErro("Informe um CNPJ válido para continuar."); return; }
    if (!emailValido(f.emailSolicitante)) { setErro("Informe o seu e-mail (solicitante) para contato e acompanhamento."); return; }
    if (!consultado) { setErro("Aguarde a consulta do CNPJ terminar."); if (!loading) localizar(); return; }
    // A IE define de qual empresa gocase (BB ou Go) são os documentos enviados.
    if (!f.inscricaoEstadual.trim()) { setErro("Informe a Inscrição Estadual ou marque \"Empresa isenta de IE\" para continuar."); return; }
    setErro(""); setStep(2);
  };

  const finalizar = async () => {
    if (enviando) return;
    setEnviando(true);
    const { cnpj, emailSolicitante, ...dados } = f;
    const res = await db.submitCadastro({
      cnpj, emailSolicitante: emailSolicitante.trim(),
      dados: { ...dados, fonte },
      mensagem: mensagem.trim(),
      anexos: meusDocs.map(({ preview, ...a }) => a),
      docsSolicitados: selecionados.map(d => d.id),
      listaDocumentos: lista.trim(),
      docsNaoEncontrados: lista.trim() ? casamento.naoEncontrados : [],
    });
    setEnviando(false);
    if (!res.ok) {
      toast(res.reason === "invalid_cnpj" ? "CNPJ inválido. Confira o número." : res.reason === "invalid_email" ? "E-mail do solicitante inválido. Confira no passo 1." : "Não foi possível enviar agora. Tente novamente em instantes.");
      return;
    }
    setProtocolo({ id: res.id, abertura: res.abertura, prazo: res.prazo, cnpj, email: emailSolicitante.trim(), entregues: res.entregues || [], pendentes: selecionados.filter(d => !(res.entregues || []).some(e => e.id === d.id)).map(d => d.nome) });
  };

  const novaSolicitacao = () => {
    setF(vazio); setMeusDocs([]); setUploadKey(k => k + 1); setSolicitar({}); setLista(""); setMensagem("");
    setConsultado(false); setIeStatus(""); setFonte(""); setErro(""); setErroCnpj(""); setProtocolo(null); setStep(1);
    ieConsultadaRef.current = "";
    autoRef.current = "";
  };

  if (protocolo) return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>Fornecedor</div>
      <h1 className="text-2xl font-bold mb-5" style={{ color: C.text }}>Solicitação enviada!</h1>
      <Stepper step={4} labels={["Identificação", "Documentos", "Revisão"]} />
      <Card className="p-6 text-center" style={{ borderColor: C.green + "55" }}>
        <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: C.green }} />
        <div className="text-sm mb-1" style={{ color: C.muted }}>Seu protocolo</div>
        <div className="font-mono text-2xl font-bold mb-3" style={{ color: C.text }}>{protocolo.id}</div>
        <p className="text-sm max-w-md mx-auto" style={{ color: C.muted }}>
          A equipe de cadastro da gocase vai analisar sua solicitação até <b style={{ color: C.text }}>{protocolo.prazo}</b>.
          Guarde o protocolo: com ele, com o CNPJ ({protocolo.cnpj}) ou com o seu e-mail ({protocolo.email}) você acompanha o andamento.
        </p>
        <div className="flex gap-2 justify-center mt-5 flex-wrap">
          <Btn icon={Search} onClick={goStatus}>Acompanhar solicitação</Btn>
          <Btn variant="outline" icon={Plus} onClick={novaSolicitacao}>Nova solicitação</Btn>
        </div>
      </Card>
      <DocsLiberados entregues={protocolo.entregues} pendentes={protocolo.pendentes} />
    </div>
  );

  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>Fornecedor</div>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Solicitação de Cadastro</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>Informe o CNPJ da empresa para iniciar o processo de homologação junto à gocase. Não é preciso criar conta.</p>
      <Stepper step={step} labels={["Identificação", "Documentos", "Revisão"]} />

      {step === 1 && (
        <>
          <Card className="p-5 mb-4">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>CNPJ <span style={{ color: C.danger }}>*</span></label>
            <div className="flex gap-2 mt-1">
              <input value={f.cnpj} onChange={e => setF(s => ({ ...s, cnpj: fmtCnpjInput(e.target.value) }))} inputMode="numeric" placeholder="00.000.000/0000-00" className="flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }} />
              <button onClick={localizar} disabled={loading} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shrink-0" style={{ background: C.coral, opacity: loading ? 0.7 : 1 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}<span className="hidden sm:inline">{loading ? "Localizando…" : "Localizar dados"}</span>
              </button>
            </div>
            {f.cnpj.replace(/\D/g, "").length === 14 && !cnpjOk && <div className="text-xs mt-2 font-semibold" style={{ color: C.danger }}>CNPJ inválido — confira os dígitos.</div>}
            {erroCnpj && <div className="text-xs mt-2 font-semibold" style={{ color: C.danger }}>{erroCnpj}</div>}
            {erro && <div className="text-xs mt-2 font-semibold" style={{ color: C.danger }}>{erro}</div>}
            <p className="text-xs mt-2" style={{ color: C.muted }}>A busca é automática ao digitar os 14 dígitos: os dados vêm da Receita Federal, inclusive a Inscrição Estadual (ou se a empresa é isenta). Você pode ajustar qualquer campo depois.</p>
            <div className="mt-4">
              <label className="text-xs font-semibold" style={{ color: C.muted }}>Seu e-mail (solicitante) <span style={{ color: C.danger }}>*</span></label>
              <input type="email" value={f.emailSolicitante} onChange={set("emailSolicitante")} placeholder="voce@empresa.com.br" autoComplete="email"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: f.emailSolicitante && !emailValido(f.emailSolicitante) ? C.danger : C.line }} />
              <p className="text-xs mt-1" style={{ color: C.muted }}>É por ele que a equipe gocase fala com você — pode ser diferente do e-mail cadastrado no CNPJ. Também serve para acompanhar a solicitação.</p>
            </div>
          </Card>

          {consultado && (
            <Card className="p-5 mb-4">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.cyan }}><FileCheck size={16} /> Dados cadastrais</div>
                {fonte && <span className="text-[11px]" style={{ color: C.muted }}>Fonte: {fonte}</span>}
              </div>
              <div className="rounded-xl border px-3 py-2.5 mb-4 flex items-center gap-2 flex-wrap text-sm" style={{ borderColor: C.line }}>
                <span className="font-semibold" style={{ color: C.text }}>Inscrição Estadual:</span>
                {isento
                  ? <Pill label="Isento" color={C.violet} />
                  : f.inscricaoEstadual.trim()
                    ? <Pill label={`Contribuinte · IE ${f.inscricaoEstadual}`} color={C.green} />
                    : <Pill label="Não verificada" color={C.yellow} />}
                <label className="ml-auto flex items-center gap-2 text-xs cursor-pointer" style={{ color: C.muted }}>
                  <input type="checkbox" checked={isento} className="w-4 h-4" style={{ accentColor: C.coral }}
                    onChange={e => setF(s => ({ ...s, inscricaoEstadual: e.target.checked ? "ISENTO" : ieConsultadaRef.current }))} />
                  Empresa isenta de IE
                </label>
              </div>
              {ieStatus === "desconhecido" && !f.inscricaoEstadual.trim() && (
                <p className="text-xs mb-3 -mt-2" style={{ color: C.muted }}>Não foi possível confirmar a IE na consulta. Informe o número ou marque "Empresa isenta de IE".</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Razão social" value={f.razaoSocial} onChange={set("razaoSocial")} />
                <Field label="Nome fantasia" value={f.nomeFantasia} onChange={set("nomeFantasia")} />
                <Field label="Inscrição estadual" value={f.inscricaoEstadual} onChange={set("inscricaoEstadual")} />
                <Field label="Situação cadastral" value={f.situacao} onChange={set("situacao")} />
                <Field label="Nome do contato" value={f.nomeContato} onChange={set("nomeContato")} />
                <Field label="Telefone" value={f.telefone} onChange={set("telefone")} />
                <Field label="E-mail da empresa (cadastro na Receita)" value={f.email} onChange={set("email")} full />
                <Field label="CEP" value={f.cep} onChange={set("cep")} />
                <Field label="Logradouro" value={f.logradouro} onChange={set("logradouro")} />
                <Field label="Bairro" value={f.bairro} onChange={set("bairro")} />
                <Field label="Município" value={f.municipio} onChange={set("municipio")} />
                <Field label="Estado (UF)" value={f.estado} onChange={set("estado")} />
                <Field label="Complemento" value={f.complemento} onChange={set("complemento")} full />
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Btn onClick={avancar}>Próximo: Documentos</Btn>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-lg p-2" style={{ background: C.coralSoft, color: C.coral }}><Package size={16} /></span>
              <h2 className="font-bold" style={{ color: C.text }}>Documentos (opcional)</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: C.muted }}>Envie os documentos da sua empresa e indique o que precisa receber da gocase.</p>

            <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: C.text }}><Send size={13} /> Enviar meus documentos</div>
            <FileUpload key={uploadKey} initial={meusDocs} onFiles={setMeusDocs} upload={(file) => db.uploadPublicFile(file)}
              hint="Clique ou arraste para adicionar — imagens (JPG, PNG, WEBP), vídeos (MP4, MOV) e PDF, até 10 MB cada" />

            <div className="text-xs font-semibold mt-5 mb-2 flex items-center gap-1" style={{ color: C.text }}><Download size={13} /> Solicitar da gocase</div>
            {docsDisponiveis.length === 0 ? (
              <p className="text-sm rounded-xl border px-3 py-3" style={{ borderColor: C.line, color: C.muted }}>Nenhum documento disponível no momento.</p>
            ) : (
              <>
                {regra.empresa && (
                  <div className="rounded-xl border px-3 py-2.5 mb-3 text-xs flex items-start gap-2" style={{ borderColor: C.cyan + "55", background: C.cyan + "10", color: C.text }}>
                    <Building2 size={14} className="mt-0.5 shrink-0" style={{ color: C.cyan }} />
                    <span>
                      Você vai receber os documentos da <b>{EMPRESA_NOME[regra.empresa]}</b> ({regra.motivo}).
                      {regra.empresa === "bb" && <> Se for <b>venda de Gift</b>, informe na mensagem abaixo.</>}
                    </span>
                  </div>
                )}
                <label className="text-xs font-semibold" style={{ color: C.muted }}>Tem uma lista pronta? Cole aqui e marcamos os documentos para você</label>
                <textarea value={lista} onChange={e => setLista(e.target.value)} rows={3} maxLength={4000}
                  placeholder={"Ex.:\nCartão CNPJ\nContrato Social\nCND Federal, CND Estadual e CND Municipal"}
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm resize-y bg-white" style={{ borderColor: C.line }} />
                {lista.trim() && (
                  <div className="mt-1.5 mb-3 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-semibold" style={{ color: docsDaLista.size ? C.green : C.muted }}>
                      <CheckCircle2 size={13} /> {docsDaLista.size ? `${docsDaLista.size} documento(s) marcado(s) a partir da lista — confira abaixo.` : "Nenhum documento do acervo reconhecido na lista."}
                    </div>
                    {casamento.naoEncontrados.length > 0 && (
                      <div style={{ color: C.muted }}>
                        Não encontrados no acervo (a equipe vai verificar): <b style={{ color: C.text }}>{casamento.naoEncontrados.join(" · ")}</b>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2 mt-2">
                  {docsDisponiveis.map(d => {
                    const on = marcado(d.id);
                    const fora = foraDaRegra(d, docsDisponiveis, regra.empresa);
                    if (fora) return (
                      <div key={d.id} className="w-full flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left opacity-60" style={{ borderColor: C.line }}
                        title={`Não se aplica: você recebe os documentos da ${EMPRESA_NOME[regra.empresa]}.`}>
                        <span className="w-5 h-5 rounded-md shrink-0" style={{ border: `1.5px solid ${C.line}` }} />
                        <span className="flex-1 min-w-0">
                          <span className="text-sm block line-through" style={{ color: C.muted }}>{d.nome}</span>
                          <span className="text-[11px] block" style={{ color: C.muted }}>Não se aplica ao seu cadastro ({EMPRESA_NOME[regra.empresa]})</span>
                        </span>
                      </div>
                    );
                    return (
                      <button key={d.id} onClick={() => toggleDoc(d.id)} className="w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition"
                        style={{ borderColor: on ? C.coral : C.line, background: on ? C.coralSoft : C.surface }}>
                        <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: on ? C.coral : C.surface, border: `1.5px solid ${on ? C.coral : C.line}` }}>
                          {on && <Check size={13} color="#fff" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="text-sm font-medium block" style={{ color: C.text }}>{d.nome}</span>
                          {d.descricao && <span className="text-xs block" style={{ color: C.muted }}>{d.descricao}</span>}
                        </span>
                        {d.envioAutomatico && <span className="shrink-0"><Pill label="Envio imediato" color={C.green} /></span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <p className="text-xs mt-2" style={{ color: C.muted }}>Documentos com <b style={{ color: C.text }}>envio imediato</b> ficam disponíveis para download assim que você enviar a solicitação. Os demais a equipe gocase envia pelo e-mail informado, depois da análise inicial.</p>

            {/* Caixa de mensagem */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: C.text }}>
                <MessageSquare size={13} /> Mensagem para a equipe gocase (opcional)
              </div>
              <p className="text-xs mb-2" style={{ color: C.muted }}>
                Descreva sua solicitação, informe detalhes adicionais, contexto da parceria ou qualquer dúvida para a equipe de cadastro da gocase. <b style={{ color: C.text }}>Se for venda de Gift, informe aqui</b> — isso define os documentos que você recebe.
              </p>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Ex.: Somos fornecedores de embalagens e gostaríamos de nos cadastrar para participar das próximas cotações da gocase..."
                rows={4}
                maxLength={4000}
                className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none bg-white"
                style={{ borderColor: C.line }}
              />
            </div>
          </Card>
          <div className="flex justify-between">
            <Btn variant="outline" color={C.muted} icon={ArrowLeft} onClick={() => setStep(1)}>Voltar</Btn>
            <Btn onClick={() => setStep(3)}>Próximo: Revisão</Btn>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold" style={{ color: C.green }}><CheckCircle2 size={16} /> Revisão final</div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[["Empresa", f.nomeFantasia || f.razaoSocial || "—"], ["CNPJ", f.cnpj || "—"], ["E-mail do solicitante", f.emailSolicitante || "—"], ["Inscrição estadual", isento ? "Isento" : (f.inscricaoEstadual || "Não informada")], ["Município/UF", `${f.municipio || "—"}/${f.estado || "—"}`], ["Contato", f.nomeContato || "—"], ["E-mail", f.email || "—"]].map(([k, v]) => (
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>
              ))}
            </div>
            <div className="mt-4 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Meus documentos enviados</div>
              <div className="font-medium" style={{ color: C.text }}>{meusDocs.length ? `${meusDocs.length} arquivo(s)` : "Nenhum"}</div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Mensagem para a equipe</div>
              <div className="font-medium whitespace-pre-wrap" style={{ color: C.text }}>{mensagem.trim() || <span style={{ color: C.muted, fontStyle: "italic" }}>Nenhuma mensagem</span>}</div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Documentos solicitados da gocase</div>
              <div className="font-medium" style={{ color: C.text }}>{selecionados.map(d => d.nome).join(", ") || "Nenhum"}</div>
            </div>
          </Card>
          <div className="flex justify-between">
            <Btn variant="outline" color={C.muted} icon={ArrowLeft} onClick={() => setStep(2)}>Voltar</Btn>
            <Btn icon={enviando ? Loader2 : Send} color={C.green} onClick={finalizar}>{enviando ? "Enviando…" : "Concluir e enviar"}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* Minha conta (equipe interna): troca da própria senha. */
function MinhaConta({ toast, user }) {
  const initials = (user?.name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const setP = (k) => (e) => setPw(s => ({ ...s, [k]: e.target.value }));
  const salvar = async () => {
    if (pw.next.length < 8) { setErr("A nova senha deve ter ao menos 8 caracteres."); return; }
    if (pw.next !== pw.confirm) { setErr("As senhas não conferem."); return; }
    setErr(""); setSaving(true);
    const res = await db.changePassword(user?.email, pw.current, pw.next);
    setSaving(false);
    if (!res.ok) { setErr(res.reason === "invalid_current" ? "Senha atual incorreta." : res.reason === "weak_password" ? "Escolha uma senha mais forte." : "Não foi possível alterar a senha."); return; }
    setPw({ current: "", next: "", confirm: "" });
    toast("Senha alterada.");
  };
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4" style={{ color: C.text }}>Minha conta</h1>
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: C.coralSoft, color: C.coral }}>{initials}</div>
          <div>
            <div className="font-bold text-lg" style={{ color: C.text }}>{user?.name}</div>
            <div className="text-sm" style={{ color: C.muted }}>{user?.email} · {ROLE_LABEL[user?.role] || user?.role}</div>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold mb-3" style={{ color: C.text }}>Alterar senha</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Senha atual" value={pw.current} onChange={setP("current")} type="password" full />
          <Field label="Nova senha (mín. 8 caracteres)" value={pw.next} onChange={setP("next")} type="password" />
          <Field label="Confirmar nova senha" value={pw.confirm} onChange={setP("confirm")} type="password" />
        </div>
        {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.danger }}>{err}</div>}
        <div className="mt-4"><Btn icon={saving ? Loader2 : Save} onClick={salvar}>{saving ? "Salvando…" : "Salvar nova senha"}</Btn></div>
      </Card>
    </div>
  );
}

/* ===================== Internal screens ===================== */
const PERIODOS = [
  { label: "Últimos 7 dias",  dias: 7 },
  { label: "Últimos 30 dias", dias: 30 },
  { label: "Últimos 3 meses", dias: 90 },
  { label: "Últimos 6 meses", dias: 180 },
  { label: "Último ano",      dias: 365 },
  { label: "Todo período",    dias: null },
];
function calcMetrics(reqs) {
  const total = reqs.length;
  const abertos    = reqs.filter(r => !["CONCLUIDA","NEGADA"].includes(r.status)).length;
  const finalizados= reqs.filter(r =>  ["CONCLUIDA","NEGADA"].includes(r.status)).length;
  const aprovados  = reqs.filter(r => r.status === "APROVADA" || r.status === "CONCLUIDA").length;
  const negados    = reqs.filter(r => r.status === "NEGADA").length;
  const dentroPrazo= reqs.filter(r => r.sla === "DENTRO" || r.sla === "PROXIMO").length;
  const foraPrazo  = reqs.filter(r => r.sla === "VENCIDO").length;
  const taxaSLA    = total > 0 ? Math.round((dentroPrazo / total) * 100) : 0;
  const taxaAprov  = (aprovados + negados) > 0 ? Math.round((aprovados / (aprovados + negados)) * 100) : 0;
  const temposAtend= reqs.filter(r => r.finalizadoTs && r.aberturaTs).map(r => r.finalizadoTs - r.aberturaTs);
  const tMedioAtend= temposAtend.length > 0 ? temposAtend.reduce((a,b)=>a+b,0)/temposAtend.length : null;
  const temposResp = reqs.filter(r => r.atribTs && r.aberturaTs).map(r => r.atribTs - r.aberturaTs);
  const tMedioResp = temposResp.length > 0 ? temposResp.reduce((a,b)=>a+b,0)/temposResp.length : null;
  const byMes = {};
  reqs.forEach(r => {
    const p = (r.abertura||"").split("/");
    if (p.length===3) { const k=`${p[1]}/${p[2].slice(-2)}`; byMes[k]=(byMes[k]||0)+1; }
  });
  const mesDados = Object.entries(byMes).sort().slice(-6).map(([m,v])=>({m,v}));
  const apMes = {};
  reqs.forEach(r => {
    const p=(r.abertura||"").split("/");
    if (p.length===3){const k=`${p[1]}/${p[2].slice(-2)}`;if(!apMes[k])apMes[k]={m:k,ap:0,ng:0};if(["APROVADA","CONCLUIDA"].includes(r.status))apMes[k].ap++;if(r.status==="NEGADA")apMes[k].ng++;}
  });
  const apMesDados = Object.values(apMes).sort((a,b)=>a.m.localeCompare(b.m)).slice(-4);
  const byResp = {};
  reqs.forEach(r=>{const k=!r.resp||r.resp==="—"?"Não atribuído":r.resp==="IA"?"IA":r.resp;byResp[k]=(byResp[k]||0)+1;});
  return { total, abertos, finalizados, aprovados, negados, dentroPrazo, foraPrazo, taxaSLA, taxaAprov, tMedioAtend, tMedioResp, mesDados, apMesDados, byResp };
}

function IntDash({ nav, requests }) {
  const RC = useRecharts(); // recharts carregado sob demanda — ver useRecharts()
  const [tab,    setTab]    = useState("oper");
  const [period, setPeriod] = useState(180);
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);

  const reqTipo = "Cadastro";
  const destino = "lista-cad";
  const now = Date.now();

  const base = useMemo(() => requests.filter(r => {
    if (r.tipo !== reqTipo) return false;
    if (!period) return true;
    const ts = r.aberturaTs || parseBR(r.abertura);
    return ts && (now - ts) <= period * 86400000;
  }), [requests, reqTipo, period]);

  const count    = (s) => base.filter(r => r.status === s).length;
  const aprov    = count("APROVADA") + count("CONCLUIDA");
  const neg      = count("NEGADA");
  const taxaAprov= (aprov + neg) > 0 ? Math.round((aprov/(aprov+neg))*100) : 0;
  const slaOk    = base.filter(r => r.sla==="DENTRO"||r.sla==="PROXIMO").length;
  const cumprSla = base.length > 0 ? Math.round((slaOk/base.length)*100) : 0;
  const foraSla  = base.filter(r => r.sla==="VENCIDO").length;

  const m = calcMetrics(base);

  const dist = [
    { name: "Nova",       v: count("NOVA"),       fill: C.cyan   },
    { name: "Em análise", v: count("EM_ANALISE"), fill: C.violet },
    { name: "Aguardando", v: count("AGUARDANDO"), fill: C.yellow },
    { name: "Aprovada",   v: aprov,               fill: C.green  },
    { name: "Negada",     v: neg,                 fill: C.coral  },
    { name: "Concluída",  v: count("CONCLUIDA"),  fill: "#8A8A99"},
  ];

  const semanas = useMemo(() => {
    const weeks = {};
    base.forEach(r => {
      const ts = r.aberturaTs || parseBR(r.abertura);
      if (!ts) return;
      const d = new Date(ts);
      const day = d.getDay()===0 ? 6 : d.getDay()-1;
      const monday = new Date(ts - day*86400000);
      const key = `${String(monday.getDate()).padStart(2,"0")}/${String(monday.getMonth()+1).padStart(2,"0")}`;
      weeks[key] = (weeks[key]||0) + 1;
    });
    return Object.entries(weeks).sort().slice(-6).map(([sem,v])=>({sem,v}));
  }, [base]);

  const periodoLabel = PERIODOS.find(p => p.dias===period)?.label || "Todo período";

  const slaDonut = [
    { name: "Dentro do SLA", value: m.dentroPrazo,                                    fill: C.green  },
    { name: "Próximo",        value: base.filter(r=>r.sla==="PROXIMO").length,          fill: C.yellow },
    { name: "Fora",           value: m.foraPrazo,                                       fill: C.coral  },
  ].filter(d => d.value > 0);
  const slaTotal = slaDonut.reduce((a,b)=>a+b.value,0)||1;

  const respEntries = Object.entries(m.byResp).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxResp = Math.max(...respEntries.map(e=>e[1]),1);

  if (!RC) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="animate-spin" size={20} style={{ color: C.coral }} />
        <span className="text-sm" style={{ color: C.muted }}>Carregando indicadores…</span>
      </div>
    );
  }
  const { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, LineChart, Line, PieChart, Pie } = RC;

  return (
    <div>
      {/* ── Cabeçalho: título + todos os controles em linha ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>Dashboard</h1>
          <p className="text-sm" style={{ color: C.muted }}>Indicadores dos cadastros de fornecedores em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="relative">
            <button onClick={()=>setShowPeriodDrop(v=>!v)}
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor:C.line, background:C.surface, color:C.text }}>
              {periodoLabel} <ChevronDown size={14} style={{color:C.muted}}/>
            </button>
            {showPeriodDrop && (
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white border shadow-lg z-20 py-1 text-sm" style={{borderColor:C.line}}>
                {PERIODOS.map(p=>(
                  <button key={String(p.dias)} onClick={()=>{setPeriod(p.dias);setShowPeriodDrop(false);}}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    style={{color: period===p.dias ? C.coral : C.text, fontWeight: period===p.dias ? 700 : 400}}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Operacional / Gerencial */}
          <div className="flex gap-1 rounded-xl p-1 border" style={{ borderColor:C.line, background:C.surface }}>
            {[["oper","Operacional"],["admin","Gerencial"]].map(([id,l])=>(
              <button key={id} onClick={()=>setTab(id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                style={tab===id ? {background:C.coral,color:"white"} : {color:C.muted}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ABA OPERACIONAL ── */}
      {tab==="oper" && (
        <>
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <StatCard icon={FileText}      label="Total no período"  value={base.length}  color={C.coral}   onClick={()=>nav(destino)}/>
            <StatCard icon={Clock}         label="Em aberto"         value={base.filter(r=>!["CONCLUIDA","NEGADA"].includes(r.status)).length} color={C.violet} onClick={()=>nav(destino)}/>
            <StatCard icon={CheckCircle2}  label="Finalizados"       value={base.filter(r=>["CONCLUIDA","NEGADA"].includes(r.status)).length}  color={C.green}  onClick={()=>nav(destino)}/>
            <StatCard icon={AlertTriangle} label="Fora do SLA"       value={foraSla}      color={C.danger}   onClick={()=>nav(destino)}/>
          </div>
          <div className="grid sm:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Plus}          label="Novas"             value={count("NOVA")}        color={C.cyan}   onClick={()=>nav(destino)}/>
            <StatCard icon={AlertTriangle} label="Aguardando"        value={count("AGUARDANDO")}  color={C.yellow} onClick={()=>nav(destino)}/>
            <StatCard icon={TrendingUp}    label="Taxa aprovação"    value={`${taxaAprov}%`}      color={C.green} />
            <StatCard icon={ShieldCheck}   label="Cumprim. SLA"      value={`${cumprSla}%`}       color={C.cyan}  />
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <h2 className="font-bold mb-4" style={{color:C.text}}>Distribuição por status</h2>
              {base.length===0
                ? <div className="h-60 flex items-center justify-center text-sm" style={{color:C.muted}}>Sem dados no período.</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dist} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false} interval={0}/>
                      <YAxis allowDecimals={false} tick={{fontSize:12,fill:C.muted}} axisLine={false} tickLine={false}/><Tooltip/>
                      <Bar dataKey="v" radius={[6,6,0,0]}>{dist.map((d,i)=><Cell key={i} fill={d.fill}/>)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </Card>
            <Card className="p-5">
              <h2 className="font-bold mb-4" style={{color:C.text}}>Tendência semanal</h2>
              {semanas.length===0
                ? <div className="h-60 flex items-center justify-center text-sm" style={{color:C.muted}}>Sem dados no período.</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={semanas}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                      <XAxis dataKey="sem" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false} tick={{fontSize:12,fill:C.muted}} axisLine={false} tickLine={false}/><Tooltip/>
                      <Line dataKey="v" stroke={C.coral} strokeWidth={3} dot={{fill:C.coral,r:4}} name="Solicitações"/>
                    </LineChart>
                  </ResponsiveContainer>
              }
            </Card>
          </div>
        </>
      )}

      {/* ── ABA GERENCIAL ── */}
      {tab==="admin" && (
        <>
          {/* Linha 1: cards horizontais compactos de tempo médio */}
          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            {[
              {icon:Clock,      color:C.coral,  label:"Tempo médio de atendimento", val: m.tMedioAtend ? fmtDuration(m.tMedioAtend) : "—"},
              {icon:MessageSquare,color:C.violet,label:"Tempo médio 1ª resposta",    val: m.tMedioResp  ? fmtDuration(m.tMedioResp)  : "—"},
              {icon:TrendingUp, color:C.cyan,   label:"Tempo médio de resolução",   val: m.tMedioAtend ? fmtDuration(m.tMedioAtend) : "—"},
              {icon:ShieldCheck,color:C.green,  label:"Cumprimento de SLA",         val: `${m.taxaSLA} %`},
            ].map(({icon:Icon,color,label,val})=>(
              <Card key={label} className="p-4">
                <div className="flex items-center gap-2 mb-2"><Icon size={15} style={{color}}/><span className="text-xs font-semibold" style={{color:C.muted}}>{label}</span></div>
                <div className="text-2xl font-bold" style={{color:C.text}}>{val}</div>
              </Card>
            ))}
          </div>
          {/* Linha 2: 4 contadores clicáveis */}
          <div className="grid sm:grid-cols-4 gap-4 mb-5">
            <StatCard icon={FileText}      label="Total no período"     value={base.length}   color={C.coral}  onClick={()=>nav(destino)}/>
            <StatCard icon={Clock}         label="Chamados abertos"     value={m.abertos}     color={C.yellow} onClick={()=>nav(destino)}/>
            <StatCard icon={CheckCircle2}  label="Chamados finalizados" value={m.finalizados} color={C.green}  onClick={()=>nav(destino)}/>
            <StatCard icon={AlertTriangle} label="Fora do SLA"          value={m.foraPrazo}   color={C.danger}  onClick={()=>nav(destino)}/>
          </div>
          {/* Grid 2×2 */}
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Volume por responsável — barras horizontais */}
            <Card className="p-5">
              <h2 className="font-bold mb-4" style={{color:C.text}}>Volume por responsável</h2>
              {respEntries.length===0
                ? <div className="py-8 text-center text-sm" style={{color:C.muted}}>Sem dados.</div>
                : <div className="space-y-3">
                    {respEntries.map(([resp,cnt])=>{
                      const pct=Math.round((cnt/maxResp)*100);
                      return (
                        <div key={resp}>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{color:C.text}}>{resp}</span>
                            <span style={{color:C.muted}}>{cnt} ({pct}%)</span>
                          </div>
                          <div className="rounded-full h-2.5 overflow-hidden" style={{background:C.line}}>
                            <div className="h-full rounded-full" style={{width:`${pct}%`,background:C.coral}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </Card>
            {/* Donut SLA */}
            <Card className="p-5 flex flex-col">
              <h2 className="font-bold mb-2" style={{color:C.text}}>Cumprimento de SLA</h2>
              {slaDonut.length===0
                ? <div className="flex-1 flex items-center justify-center text-sm" style={{color:C.muted}}>Sem dados.</div>
                : <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={slaDonut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={88} paddingAngle={3} startAngle={90} endAngle={-270}>
                          {slaDonut.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                        </Pie>
                        <Tooltip formatter={(v)=>[`${v} (${Math.round(v/slaTotal*100)}%)`,""]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-5 mt-2">
                      {[{label:"Dentro do SLA",color:C.green},{label:"Próximo",color:C.yellow},{label:"Fora",color:C.coral}].map(({label,color})=>(
                        <div key={label} className="flex items-center gap-1.5 text-xs" style={{color:C.muted}}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>{label}
                        </div>
                      ))}
                    </div>
                  </>
              }
            </Card>
            {/* Aprovações vs negativas */}
            <Card className="p-5">
              <h2 className="font-bold mb-4" style={{color:C.text}}>Aprovações vs negativas</h2>
              {m.apMesDados.length>0
                ? <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={m.apMesDados}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                      <XAxis dataKey="m" tick={{fontSize:12,fill:C.muted}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:12,fill:C.muted}} axisLine={false} tickLine={false}/><Tooltip/>
                      <Line dataKey="ap" stroke={C.green} strokeWidth={3} dot={{fill:C.green,r:4}}  name="Aprovadas"/>
                      <Line dataKey="ng" stroke={C.coral} strokeWidth={3} dot={{fill:C.coral,r:4}} name="Negadas"/>
                    </LineChart>
                  </ResponsiveContainer>
                : <div className="py-8 text-center text-sm" style={{color:C.muted}}>Dados insuficientes.</div>
              }
            </Card>
            {/* Tendência semanal */}
            <Card className="p-5">
              <h2 className="font-bold mb-4" style={{color:C.text}}>Tendência semanal</h2>
              {semanas.length===0
                ? <div className="py-8 text-center text-sm" style={{color:C.muted}}>Sem dados.</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={semanas}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false}/>
                      <XAxis dataKey="sem" tick={{fontSize:11,fill:C.muted}} axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false} tick={{fontSize:12,fill:C.muted}} axisLine={false} tickLine={false}/><Tooltip/>
                      <Line dataKey="v" stroke={C.coral} strokeWidth={3} dot={{fill:C.coral,r:4}} name="Solicitações"/>
                    </LineChart>
                  </ResponsiveContainer>
              }
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function DataTable({ rows, cols, render, onRow }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left" style={{ color: C.muted }}>
        {cols.map(h => <th key={h} className="px-4 py-3 text-xs font-semibold border-b" style={{ borderColor: C.line }}>{h}</th>)}
      </tr></thead>
      <tbody>{rows.map(r => (
        <tr key={r.id} onClick={() => onRow(r)} className="border-b hover:bg-gray-50 cursor-pointer" style={{ borderColor: C.line }}>{render(r)}</tr>
      ))}</tbody>
    </table>
  );
}

/* Paginação simples ("carregar mais") para listas grandes — usada em Clientes,
   Histórico, Acervo de documentos e Usuários. Reseta ao mudar `resetKey`. */
const PAGE_SIZE = 20;
function usePagedList(items, resetKey) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => { setVisible(PAGE_SIZE); }, [resetKey]);
  return { paged: items.slice(0, visible), visible, more: () => setVisible(v => v + PAGE_SIZE) };
}
function LoadMore({ shown, total, onMore }) {
  if (shown >= total) return null;
  return (
    <div className="flex items-center justify-center py-3">
      <button onClick={onMore} className="text-sm font-semibold rounded-xl border px-4 py-2 transition hover:shadow-sm" style={{ borderColor: C.line, color: C.coral, background: C.surface }}>
        Carregar mais ({total - shown} restantes)
      </button>
    </div>
  );
}

/* Cartão de solicitação usado na visualização em cards (Kanban). Pode ser arrastado
   para outra coluna para mudar o status. */
function KanbanCard({ r, nav, arrastavel }) {
  return (
    <button onClick={() => nav("detalhe", r.id)}
      draggable={arrastavel}
      onDragStart={e => { e.dataTransfer.setData("text/plain", r.id); e.dataTransfer.effectAllowed = "move"; }}
      className="w-full text-left rounded-xl border bg-white p-3 mb-2.5 hover:shadow-md transition"
      style={{ borderColor: C.line, cursor: arrastavel ? "grab" : "pointer" }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-xs font-bold" style={{ color: C.coral }}>{r.id}</span>
        <Pill {...SLA[r.sla]} />
      </div>
      <div className="text-sm font-semibold mb-1 truncate" style={{ color: C.text }}>{r.parceiro}</div>
      <div className="text-xs mb-2 line-clamp-2" style={{ color: C.muted }}>{r.problema}</div>
      <div className="flex items-center justify-between text-[11px]" style={{ color: C.muted }}>
        <span className="flex items-center gap-1"><Clock size={11} />{r.abertura}</span>
        <span className="font-medium truncate max-w-[45%]">{r.resp}</span>
      </div>
    </button>
  );
}

/* Visualização em cards: quadro com uma coluna por status (estilo kanban). Com
   `onMover`, os cards podem ser arrastados entre colunas. */
function KanbanBoard({ rows, nav, onMover }) {
  const cols = Object.entries(STATUS);
  const [alvo, setAlvo] = useState(null); // coluna sob o card arrastado
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cols.map(([key, s]) => {
        const items = rows.filter(r => r.status === key);
        const destacado = alvo === key;
        return (
          <div key={key} className="shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-sm font-bold truncate" style={{ color: C.text }}>{s.label}</span>
              <span className="ml-auto text-xs font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: C.bg, color: C.muted }}>{items.length}</span>
            </div>
            <div className="rounded-2xl p-2 min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto transition"
              style={{ background: destacado ? s.color + "22" : C.bg, outline: destacado ? `2px dashed ${s.color}` : "none" }}
              onDragOver={onMover ? (e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (alvo !== key) setAlvo(key); }) : undefined}
              onDragLeave={onMover ? (e => { if (!e.currentTarget.contains(e.relatedTarget)) setAlvo(a => (a === key ? null : a)); }) : undefined}
              onDrop={onMover ? (e => { e.preventDefault(); setAlvo(null); const id = e.dataTransfer.getData("text/plain"); if (id) onMover(id, key); }) : undefined}>
              {items.length === 0 ? (
                <div className="text-xs text-center py-6" style={{ color: C.muted }}>{destacado ? "Solte aqui" : "Sem solicitações"}</div>
              ) : items.map(r => <KanbanCard key={r.id} r={r} nav={nav} arrastavel={!!onMover} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Alternador compacto de visualização — só ícone (Cards | Lista) */
function ViewToggle({ viewMode, setViewMode }) {
  const opts = [
    { id: "board", label: "Visualização em cards", icon: LayoutGrid },
    { id: "list", label: "Visualização em lista", icon: List },
  ];
  return (
    <div className="flex gap-0.5 rounded-lg p-1 border shrink-0" style={{ borderColor: C.line, background: C.surface }}>
      {opts.map(o => {
        const active = viewMode === o.id;
        return (
          <button key={o.id} onClick={() => setViewMode(o.id)} title={o.label} aria-label={o.label} aria-pressed={active}
            className="w-8 h-8 rounded-md flex items-center justify-center transition"
            style={active ? { background: C.coralSoft, color: C.coral } : { color: C.muted }}>
            <o.icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

function IntLista({ nav, requests, tipo, titulo, onMoverStatus }) {
  const [f, setF] = useState("Todos");
  const [viewMode, setViewMode] = useState("board"); // "board" (cards) | "list"
  const base = requests.filter(r => r.tipo === tipo);
  const rows = f === "Todos" ? base : base.filter(r => STATUS[r.status].label === f);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div><h1 className="text-2xl font-bold" style={{ color: C.text }}>{titulo}</h1>{onMoverStatus && viewMode === "board" && <p className="text-xs" style={{ color: C.muted }}>Arraste os cards entre as colunas para mudar o status.</p>}</div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      <Card className="p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Filter size={15} style={{ color: C.muted }} />
        {["Todos", ...Object.values(STATUS).map(s => s.label)].map(l => (
          <button key={l} onClick={() => setF(l)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={f === l ? { background: C.coral, color: "white" } : { background: C.bg, color: C.muted }}>{l}</button>
        ))}
      </Card>
      {viewMode === "board" ? (
        <KanbanBoard rows={rows} nav={nav} onMover={onMoverStatus} />
      ) : (
        <Card><DataTable rows={rows} cols={["Número", "Fornecedor", "UF", "Status", "SLA", "Responsável", ""]} onRow={r => nav("detalhe", r.id)} render={r => (
          <>
            <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
            <td className="px-4 py-3" style={{ color: C.text }}>{r.parceiro}</td>
            <td className="px-4 py-3" style={{ color: C.muted }}>{r.uf}</td>
            <td className="px-4 py-3"><Pill {...STATUS[r.status]} /></td>
            <td className="px-4 py-3"><Pill {...SLA[r.sla]} /></td>
            <td className="px-4 py-3" style={{ color: C.muted }}>{r.resp}</td>
            <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
          </>
        )} /></Card>
      )}
    </div>
  );
}

function Clientes({ requests, users, nav }) {
  // Empresas a partir dos clientes cadastrados + parceiros presentes em solicitações
  const map = {};
  (users || []).filter(u => u.role === "CLIENTE").forEach(u => {
    map[u.name] = { nome: u.name, cnpj: u.cnpj || "—", contato: u.contato || "—", uf: "—" };
  });
  (requests || []).forEach(r => {
    if (!map[r.parceiro]) map[r.parceiro] = { nome: r.parceiro, cnpj: r.cnpj || "—", contato: "—", uf: r.uf || "—" };
    else {
      if (map[r.parceiro].cnpj === "—" && r.cnpj) map[r.parceiro].cnpj = r.cnpj;
      if (map[r.parceiro].uf === "—" && r.uf) map[r.parceiro].uf = r.uf;
    }
  });
  const list = Object.values(map).map((c, i) => ({ ...c, id: i, count: requests.filter(r => r.parceiro === c.nome).length }));
  const [q, setQ] = useState("");
  const qn = q.trim().toLowerCase();
  const filtered = qn
    ? list.filter(c => [c.nome, c.cnpj, c.uf, c.contato].filter(Boolean).some(v => String(v).toLowerCase().includes(qn)))
    : list;
  const { paged, more } = usePagedList(filtered, qn);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>Fornecedores</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>Clique em uma empresa para ver todas as solicitações feitas por ela.</p>
      {list.length > 0 && (
        <Card className="p-3 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por fornecedor, CNPJ, UF ou contato…"
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
          </div>
        </Card>
      )}
      <Card>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: C.muted }}>
            {list.length === 0 ? "Nenhuma empresa cadastrada ou com solicitações ainda." : `Nenhum resultado para "${q.trim()}".`}
          </div>
        ) : (
          <DataTable rows={paged} cols={["Fornecedor", "CNPJ", "UF", "Contato", "Solicitações", ""]} onRow={c => nav("cliente", c.nome)} render={c => (
            <>
              <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>{c.nome}</td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{c.cnpj}</td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{c.uf}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{c.contato}</td>
              <td className="px-4 py-3"><Pill label={`${c.count} ${c.count === 1 ? "solicitação" : "solicitações"}`} color={C.coral} /></td>
              <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
            </>
          )} />
        )}
        <LoadMore shown={paged.length} total={filtered.length} onMore={more} />
      </Card>
    </div>
  );
}

function ClienteDetalhe({ nome, requests, users, nav }) {
  const reqs = requests.filter(r => r.parceiro === nome);
  const u = (users || []).find(x => x.name === nome);
  const cnpj = u?.cnpj || reqs.find(r => r.cnpj)?.cnpj || "—";
  const c = (s) => reqs.filter(r => r.status === s).length;
  return (
    <div>
      <button onClick={() => nav("clientes")} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.muted }}><ArrowLeft size={15} /> Voltar</button>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>{nome}</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>CNPJ {cnpj} · {reqs.length} {reqs.length === 1 ? "solicitação" : "solicitações"} no total</p>

      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <StatCard icon={FileText} label="Total" value={reqs.length} color={C.coral} />
        <StatCard icon={Clock} label="Em análise" value={c("EM_ANALISE")} color={C.violet} />
        <StatCard icon={CheckCircle2} label="Aprovadas" value={c("APROVADA")} color={C.green} />
        <StatCard icon={XCircle} label="Negadas" value={c("NEGADA")} color={C.danger} />
      </div>

      <Card>
        {reqs.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: C.muted }}>Esta empresa ainda não fez solicitações.</div>
        ) : (
          <DataTable rows={reqs} cols={["Número", "UF", "Status", "SLA", "Abertura", ""]} onRow={r => nav("detalhe", r.id)} render={r => (
            <>
              <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.uf}</td>
              <td className="px-4 py-3"><Pill {...STATUS[r.status]} /></td>
              <td className="px-4 py-3"><Pill {...SLA[r.sla]} /></td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
              <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
            </>
          )} />
        )}
      </Card>
    </div>
  );
}

const ROLE_LABEL = { ADMIN: "Administrador", GESTOR: "Gestor", COLABORADOR: "Colaborador", CLIENTE: "Cliente" };
const ROLE_COLOR = { ADMIN: "#F8475E", GESTOR: "#6C5CE7", COLABORADOR: "#00B8D9", CLIENTE: "#1FBF75" };

function Usuarios({ toast, users, currentUser, onAddUser, onUpdateUser, onDeleteUser }) {
  const isAdmin = currentUser?.role === "ADMIN";
  const isGestor = currentUser?.role === "GESTOR";
  const canManage = isAdmin || isGestor; // usado só pra decidir se a coluna Ações aparece
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "COLABORADOR", password: "" });
  const [err, setErr] = useState("");
  const setF = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const filtered = users.filter(u => {
    const matchRole = roleFilter === "Todos" || u.role === roleFilter;
    const q = query.trim().toLowerCase();
    const matchQ = !q || [u.name, u.email, u.cnpj].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    return matchRole && matchQ;
  });
  const { paged: pagedUsers, more: moreUsers } = usePagedList(filtered, `${query}|${roleFilter}`);

  const criar = async () => {
    if (!form.name || !form.email || !form.password) { setErr("Preencha nome, e-mail e senha."); return; }
    if (form.password.length < 8) { setErr("A senha deve ter ao menos 8 caracteres."); return; }
    if (users.some(u => u.email.toLowerCase() === form.email.trim().toLowerCase())) { setErr("Já existe uma conta com este e-mail."); return; }
    setErr("");
    const res = await onAddUser({ email: form.email.trim(), password: form.password, name: form.name, role: form.role, status: "Ativo" });
    if (res && !res.ok) { setErr(res.reason === "exists" ? "Já existe uma conta com este e-mail." : res.reason === "weak_password" ? "Escolha uma senha mais forte." : "Não foi possível criar a conta."); return; }
    toast(`Conta de ${ROLE_LABEL[form.role].toLowerCase()} criada para ${form.name}.`);
    setForm({ name: "", email: "", role: "COLABORADOR", password: "" });
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>Usuários</h1>
        {isAdmin && <Btn icon={Plus} onClick={() => { setShowForm(s => !s); setErr(""); }}>Novo colaborador</Btn>}
      </div>

      {/* Busca + filtro por perfil */}
      <Card className="p-3 mb-4">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por nome, empresa, CNPJ ou e-mail…"
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} style={{ color: C.muted }} />
          {["Todos", "ADMIN", "GESTOR", "COLABORADOR", "CLIENTE"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={roleFilter === r ? { background: C.coral, color: "white" } : { background: C.bg, color: C.muted }}>
              {r === "Todos" ? "Todos" : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Card>

      {/* Formulário de novo colaborador (admin) */}
      {isAdmin && showForm && (
        <Card className="p-5 mb-4">
          <h2 className="font-bold mb-3" style={{ color: C.text }}>Novo colaborador / conta interna</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome" value={form.name} onChange={setF("name")} />
            <Field label="E-mail" value={form.email} onChange={setF("email")} />
            <Field label="Perfil" value={form.role} onChange={setF("role")} options={["COLABORADOR", "GESTOR", "ADMIN"]} />
            <Field label="Senha inicial" value={form.password} onChange={setF("password")} type="password" />
          </div>
          {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.coral }}>{err}</div>}
          <div className="flex gap-2 mt-4">
            <Btn icon={Check} onClick={criar}>Criar conta</Btn>
            <Btn variant="outline" color={C.muted} onClick={() => { setShowForm(false); setErr(""); }}>Cancelar</Btn>
          </div>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="text-left" style={{ color: C.muted }}>
            {["Nome", "E-mail", "CNPJ", "Perfil", "Status", canManage ? "Ações" : ""].map(h =>
              <th key={h} className="px-4 py-3 text-xs font-semibold border-b" style={{ borderColor: C.line }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {pagedUsers.map((u, i) => (
              <tr key={i} className="border-b" style={{ borderColor: C.line }}>
                <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>{u.name}</td>
                <td className="px-4 py-3" style={{ color: C.muted }}>{u.email}</td>
                <td className="px-4 py-3" style={{ color: C.muted }}>{u.cnpj || "—"}</td>
                <td className="px-4 py-3">
                  {isGestor ? (
                    <select value={u.role} onChange={e => { onUpdateUser(u.email, { role: e.target.value }); toast(`Perfil de ${u.name} alterado para ${ROLE_LABEL[e.target.value]}.`); }}
                      className="rounded-lg border px-2 py-1 text-xs font-semibold bg-white" style={{ borderColor: C.line, color: ROLE_COLOR[u.role] }}>
                      {["ADMIN", "GESTOR", "COLABORADOR", "CLIENTE"].map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  ) : <Pill label={ROLE_LABEL[u.role] || u.role} color={ROLE_COLOR[u.role] || C.muted} />}
                </td>
                <td className="px-4 py-3"><Pill label={u.status} color={u.status === "Ativo" ? C.green : "#8A8A99"} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button onClick={() => { const ns = u.status === "Ativo" ? "Inativo" : "Ativo"; onUpdateUser(u.email, { status: ns }); toast(`${u.name} agora está ${ns}.`); }}
                        className="text-xs font-semibold" style={{ color: u.status === "Ativo" ? C.coral : C.green }}>
                        {u.status === "Ativo" ? "Inativar" : "Ativar"}
                      </button>
                    )}
                    {canManage && u.email !== currentUser?.email && (
                      <button onClick={() => {
                        const nova = window.prompt(`Nova senha para ${u.name} (mínimo 8 caracteres):`);
                        if (nova == null) return;
                        if (nova.length < 8) { toast("A senha deve ter ao menos 8 caracteres."); return; }
                        onUpdateUser(u.email, { password: nova });
                        toast(`Senha de ${u.name} redefinida.`);
                      }} className="text-xs font-semibold" style={{ color: C.violet }}>
                        Redefinir senha
                      </button>
                    )}
                    {isGestor && (
                      <button onClick={() => {
                        if (u.email === currentUser?.email) { toast("Você não pode excluir a própria conta."); return; }
                        if (!window.confirm(`Excluir a conta de ${u.name} (${u.email})? Esta ação não pode ser desfeita.`)) return;
                        onDeleteUser(u.email);
                        toast(`Conta de ${u.name} excluída.`);
                      }} className="text-xs font-semibold" style={{ color: C.danger }}>
                        Excluir
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: C.muted }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
        <LoadMore shown={pagedUsers.length} total={filtered.length} onMore={moreUsers} />
      </Card>
      {!isAdmin && !isGestor && <p className="text-xs mt-3" style={{ color: C.muted }}>Apenas administradores podem criar contas; apenas gestores podem alterar perfis ou excluir contas.</p>}
    </div>
  );
}

// Gera o HTML de um relatório (com identidade gocase) a partir dos dados do dashboard
function relatorioHTML(tipo, requests) {
  const fmt = new Date().toLocaleString("pt-BR");
  const coral = C.coral;
  const statusList = [["NOVA", "Nova"], ["EM_ANALISE", "Em Análise"], ["AGUARDANDO", "Aguardando Inf."], ["APROVADA", "Aprovada"], ["NEGADA", "Negada"], ["CONCLUIDA", "Concluída"]];
  const cStatus = (s) => requests.filter(r => r.status === s).length;
  const cSla = (s) => requests.filter(r => r.sla === s).length;
  const total = requests.length || 1;

  const bar = (val, max, color = coral) => {
    const pct = max ? Math.round((val / max) * 100) : 0;
    return `<div style="background:#eef0f4;border-radius:6px;height:12px;overflow:hidden"><div style="width:${pct}%;height:12px;background:${color};border-radius:6px"></div></div>`;
  };
  const tableRows = (rows) => rows.map(([label, val, max, color]) => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #eee">${label}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${val}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #eee;width:45%">${bar(typeof val === "string" ? parseFloat(val) : val, max, color)}</td>
    </tr>`).join("");

  let title = "", body = "";

  if (tipo === "periodo") {
    title = "Solicitações por período";
    const maxStatus = Math.max(...statusList.map(([k]) => cStatus(k)), 1);
    const mesDados = calcMetrics(requests).mesDados;
    const maxMes = Math.max(...mesDados.map(m => m.v), 1);
    body = `
      <p style="color:#6b7686">Total de solicitações registradas: <b style="color:#22222e">${requests.length}</b></p>
      <h3>Distribuição por status</h3>
      <table>${tableRows(statusList.map(([k, l]) => [l, cStatus(k), maxStatus, ROLE_COLOR.GESTOR]))}</table>
      <h3>Volume por mês</h3>
      <table>${tableRows(mesDados.map(m => [m.m, m.v, maxMes, coral]))}</table>`;
  } else if (tipo === "performance") {
    title = "Performance por colaborador";
    const byResp = {};
    requests.forEach(r => { const k = r.resp === "—" ? "Não atribuído" : r.resp === "IA" ? "IA (automático)" : r.resp; byResp[k] = (byResp[k] || 0) + 1; });
    const rows = Object.entries(byResp).sort((a, b) => b[1] - a[1]);
    const maxV = Math.max(...rows.map(r => r[1]), 1);
    body = `
      <p style="color:#6b7686">Tempo médio de atendimento: <b style="color:#22222e">${(() => { const t = calcMetrics(requests).tMedioAtend; return t ? fmtDuration(t) : "—"; })()}</b></p>
      <h3>Volume tratado por responsável</h3>
      <table>${tableRows(rows.map(([k, v]) => [k, v, maxV, "#00B8D9"]))}</table>`;
  } else if (tipo === "sla") {
    title = "Cumprimento de SLA";
    const dentro = cSla("DENTRO"), prox = cSla("PROXIMO"), fora = cSla("VENCIDO");
    const cumpr = Math.round(((dentro + prox) / total) * 100);
    body = `
      <p style="color:#6b7686">Cumprimento geral de SLA: <b style="color:#1FBF75">${cumpr}%</b></p>
      <table>${tableRows([
        ["Dentro do prazo", dentro, total, "#1FBF75"],
        ["Próximo do vencimento", prox, total, "#FFC247"],
        ["Fora do prazo", fora, total, "#F8475E"],
      ])}</table>`;
  } else {
    title = "Análise setorial";
    const setores = [["JURIDICO", "Setor Jurídico", "#7B5EA7"], ["FISCAL", "Setor Fiscal", "#0077B6"], ["FINANCEIRO", "Setor Financeiro", "#008B8B"]];
    const passou = (s) => requests.filter(r => r.status === s || (r.movimentos || []).some(m => m.status === s)).length;
    const maxV = Math.max(...setores.map(([k]) => passou(k)), 1);
    body = `
      <p style="color:#6b7686">Cadastros encaminhados a cada setor (atualmente ou em algum momento do processo).</p>
      <table>${tableRows(setores.map(([k, l, color]) => [l, passou(k), maxV, color]))}</table>
      <h3>Aguardando parecer agora</h3>
      <table>${tableRows(setores.map(([k, l, color]) => [l, cStatus(k), maxV, color]))}</table>`;
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title} — gocase</title>
    <style>
      *{font-family:Arial,Helvetica,sans-serif;box-sizing:border-box}
      body{margin:0;color:#22222e}
      .head{background:${coral};color:#fff;padding:22px 32px}
      .head .b{font-size:22px;font-weight:bold}
      .head .s{font-size:13px;opacity:.85}
      .wrap{padding:28px 32px}
      h1{font-size:20px;margin:0 0 4px}
      .meta{color:#8a8a99;font-size:12px;margin-bottom:20px}
      h3{font-size:14px;margin:22px 0 8px;color:#22222e}
      table{width:100%;border-collapse:collapse;font-size:13px}
      .foot{padding:16px 32px;color:#8a8a99;font-size:11px;border-top:1px solid #eee}
      @media print{.noprint{display:none}}
    </style></head>
    <body>
      <div class="head"><div class="b">gocase <span class="s">Cadastro de Fornecedores</span></div></div>
      <div class="wrap">
        <h1>${title}</h1>
        <div class="meta">Relatório gerado em ${fmt} · gocase Cadastro de Fornecedores</div>
        ${body}
        <button class="noprint" onclick="window.print()" style="margin-top:24px;background:${coral};color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:bold;cursor:pointer">Salvar como PDF / Imprimir</button>
      </div>
      <div class="foot">© ${new Date().getFullYear()} gocase · documento gerado automaticamente pela plataforma de Cadastro de Fornecedores.</div>
    </body></html>`;
}

// Download genérico de arquivo (HTML, CSV, etc.) via Blob — funciona no site publicado.
function baixarArquivo(nome, conteudo, mime = "text/plain;charset=utf-8") {
  try {
    const blob = new Blob([conteudo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) { return false; }
}

function ReportViewer({ report, onClose, toast }) {
  const iframeRef = useRef(null);
  const novaAba = () => {
    try {
      const blob = new Blob([report.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener");
      if (!w) { toast("Pop-up bloqueado — use Baixar HTML."); return false; }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (e) { return false; }
  };
  const imprimir = () => {
    try {
      const w = iframeRef.current?.contentWindow;
      if (!w) throw new Error("iframe");
      w.focus(); w.print();
    } catch (e) {
      if (!novaAba()) toast("Impressão bloqueada aqui — baixe o HTML e imprima/salve em PDF.");
    }
  };
  const baixar = () => {
    const ok = baixarArquivo(`${(report.title || "relatorio").replace(/[^\w]+/g, "_")}.html`, report.html, "text/html;charset=utf-8");
    toast(ok ? "Relatório baixado (abra e use Imprimir → Salvar como PDF)." : "Download bloqueado neste ambiente — funciona no site publicado.");
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,30,42,.55)" }} onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-white overflow-hidden flex flex-col" style={{ border: `1px solid ${C.line}`, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-3 border-b flex-wrap" style={{ borderColor: C.line }}>
          <h2 className="font-bold mr-auto" style={{ color: C.text }}>{report.title}</h2>
          <Btn icon={FileIcon} onClick={imprimir}>Imprimir / Salvar PDF</Btn>
          <Btn icon={Download} variant="outline" onClick={baixar}>Baixar HTML</Btn>
          <Btn icon={ExternalLink} variant="outline" color={C.muted} onClick={() => { if (!novaAba()) toast("Abertura bloqueada — use Baixar HTML."); }}>Nova aba</Btn>
          <button onClick={onClose} className="rounded-xl px-3 py-2.5 text-sm font-bold border" style={{ borderColor: C.line, color: C.muted }}>Fechar</button>
        </div>
        <iframe ref={iframeRef} title={report.title} srcDoc={report.html} className="w-full flex-1" style={{ border: 0, minHeight: "60vh", background: "white" }} />
      </div>
    </div>
  );
}

function Relatorios({ toast, requests }) {
  const reps = [
    { tipo: "periodo", t: "Solicitações por período", d: "Volume e status no período." },
    { tipo: "performance", t: "Performance por colaborador", d: "Tempo médio e volume tratado por analista." },
    { tipo: "sla", t: "Cumprimento de SLA", d: "Dentro, próximo e fora do prazo." },
    { tipo: "setorial", t: "Análise setorial", d: "Cadastros encaminhados aos setores Jurídico, Fiscal e Financeiro." },
  ];
  const [report, setReport] = useState(null);
  const gerar = (tipo, t) => {
    try { setReport({ html: relatorioHTML(tipo, requests), title: t }); }
    catch (e) { toast("Não foi possível gerar este relatório."); }
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>Relatórios</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>Clique em um relatório para visualizá-lo aqui e então imprimir, salvar como PDF ou baixar.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {reps.map(r => (
          <Card key={r.tipo} className="p-5 flex items-center justify-between" onClick={() => gerar(r.tipo, r.t)}>
            <div><div className="font-bold" style={{ color: C.text }}>{r.t}</div><p className="text-sm" style={{ color: C.muted }}>{r.d}</p></div>
            <Btn icon={BarChart3} variant="outline" onClick={(e) => { e && e.stopPropagation && e.stopPropagation(); gerar(r.tipo, r.t); }}>Gerar</Btn>
          </Card>
        ))}
      </div>
      {report && <ReportViewer report={report} onClose={() => setReport(null)} toast={toast} />}
    </div>
  );
}

function Config({ toast, templates, onSaveTemplates }) {
  const labels = { EM_ANALISE: "Em análise", AGUARDANDO: "Aguardando informações", APROVADA: "Aprovada", NEGADA: "Negada", CONCLUIDA: "Concluída" };
  const [tpl, setTpl] = useState({ ...DEFAULT_TEMPLATES, ...(templates || {}) });
  const setOne = (k) => (e) => setTpl(s => ({ ...s, [k]: e.target.value }));
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4" style={{ color: C.text }}>Configurações</h1>
      <Card className="p-5 mb-4">
        <h2 className="font-bold mb-3" style={{ color: C.text }}>Regras de negócio</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><label className="text-xs font-semibold" style={{ color: C.muted }}>SLA padrão (dias)</label><input defaultValue="7" className="mt-1 w-full rounded-xl border px-3 py-2 bg-white" style={{ borderColor: C.line }} /></div>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-lg p-2" style={{ background: C.coralSoft, color: C.coral }}><Mail size={16} /></span>
          <h2 className="font-bold" style={{ color: C.text }}>Modelos de resposta rápida (e-mail automático)</h2>
        </div>
        <p className="text-sm mb-4" style={{ color: C.muted }}>Estas mensagens são enviadas automaticamente ao e-mail do cliente a cada atualização da solicitação, conforme o status. Use os marcadores <b style={{ color: C.text }}>{"{id}"}</b>, <b style={{ color: C.text }}>{"{cliente}"}</b> e <b style={{ color: C.text }}>{"{status}"}</b>.</p>
        <div className="space-y-4">
          {Object.keys(labels).map(k => (
            <div key={k}>
              <label className="text-xs font-semibold flex items-center gap-2" style={{ color: C.muted }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS[k].color }} /> {labels[k]}
              </label>
              <textarea rows={2} value={tpl[k]} onChange={setOne(k)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }} />
            </div>
          ))}
        </div>
        <div className="mt-4"><Btn icon={Save} onClick={() => { onSaveTemplates(tpl); toast("Modelos de resposta rápida salvos."); }}>Salvar modelos</Btn></div>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-bold mb-3" style={{ color: C.text }}>Notificações</h2>
        {["Solicitação criada", "Solicitação aprovada", "Solicitação negada", "SLA próximo do vencimento", "SLA vencido"].map(n => (
          <label key={n} className="flex items-center justify-between py-2 text-sm" style={{ color: C.text }}>
            {n}<input type="checkbox" defaultChecked className="w-4 h-4" style={{ accentColor: C.coral }} /></label>
        ))}
      </Card>
      <Btn onClick={() => toast("Configurações salvas.")}>Salvar configurações</Btn>
    </div>
  );
}

/* ===================== Modal ===================== */
function Modal({ kind, onConfirm, onClose }) {
  const [obs, setObs] = React.useState("");
  const map = {
    aprovar:     { title: "Aprovar solicitação",               color: C.green,    fields: ["Código do fornecedor no ERP (opcional)", "Observações internas"], cta: "Confirmar aprovação",         status: "APROVADA"    },
    negar:       { title: "Negar solicitação",                 color: C.danger,    fields: ["Motivo da negativa"],                                                          cta: "Confirmar negativa",           status: "NEGADA"      },
    ajuste:      { title: "Solicitar ajuste",                  color: C.yellow,   fields: ["O que precisa ser corrigido / enviado"],                                       cta: "Enviar solicitação de ajuste", status: "AGUARDANDO"  },
    concluir:    { title: "Concluir solicitação",              color: C.violet,   fields: ["Observações finais"],                                                           cta: "Concluir",                     status: "CONCLUIDA"   },
    juridico:    { title: "Submeter ao Setor Jurídico",        color: "#7B5EA7",  fields: ["Motivo / observação (opcional)"],                                              cta: "Confirmar submissão",          status: "JURIDICO"    },
    fiscal:      { title: "Submeter ao Setor Fiscal",          color: "#0077B6",  fields: ["Motivo / observação (opcional)"],                                              cta: "Confirmar submissão",          status: "FISCAL"      },
    financeiro:  { title: "Submeter ao Setor Financeiro",      color: "#008B8B",  fields: ["Motivo / observação (opcional)"],                                              cta: "Confirmar submissão",          status: "FINANCEIRO"  },
  };
  const m = map[kind];
  if (!m) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,30,42,.55)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6" style={{ border: `1px solid ${C.line}` }} onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1" style={{ color: m.color }}>{m.title}</h2>
        {["juridico","fiscal","financeiro"].includes(kind) && (
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            O cliente será notificado que a documentação foi encaminhada para análise do setor selecionado.
          </p>
        )}
        {m.fields.map(f => (
          <div key={f} className="mb-3">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>{f}</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }}
              onChange={e => setObs(e.target.value)} />
          </div>
        ))}
        <div className="flex gap-2 mt-5">
          <button onClick={() => onConfirm(m.status, obs)} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: m.color }}>{m.cta}</button>
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold border" style={{ borderColor: C.line, color: C.muted }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}


/* ===================== Acervo de documentos (admin/gestor) ===================== */
/* Documento do acervo → { link, arquivo }. O link do Drive é só uma opção: o arquivo
   enviado já basta. Aceita também o formato antigo (tipo "link"/"arquivo" + url). */
function acervoPartes(d) {
  const arquivo = d.arquivo && d.arquivo.url ? d.arquivo
    : d.tipo === "arquivo" && d.url ? { url: d.url, name: d.arquivoNome || "", type: d.arquivoType || "" } : null;
  const link = d.link !== undefined ? String(d.link || "") : d.tipo !== "arquivo" ? String(d.url || "") : "";
  return { arquivo, link };
}
const linkValido = (u) => { try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; } catch (e) { return false; } };

function AcervoDocs({ acervo, onAdd, onUpdate, onRemove, toast }) {
  const docs = acervo || [];
  const [buscaDoc, setBuscaDoc] = useState("");
  const buscaDocN = buscaDoc.trim().toLowerCase();
  const docsFiltrados = buscaDocN
    ? docs.filter(d => [d.nome, d.descricao].filter(Boolean).some(v => String(v).toLowerCase().includes(buscaDocN)))
    : docs;
  const { paged: docsPaginados, more: maisDocs } = usePagedList(docsFiltrados, buscaDocN);
  const vazio = { nome: "", empresa: "", descricao: "", link: "", arquivo: null, envioAutomatico: false }; // nome = documento sem a empresa
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const formRef = useRef(null);
  const setCampo = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));
  const temConteudo = !!(form.arquivo || (form.link.trim() && linkValido(form.link.trim())));

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (e.target) e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setErr("Arquivo muito grande (máx. 10 MB). Para arquivos maiores, use um link do Drive."); return; }
    setErr(""); setEnviando(true);
    try {
      const up = await db.uploadFile(file); // grava no banco nativo
      setForm(s => ({ ...s, arquivo: { url: up.url, name: file.name, type: up.type || file.type || "", size: file.size } }));
    } catch (er) { setErr("Falha ao enviar o arquivo."); }
    finally { setEnviando(false); }
  };

  const limpar = () => { setForm(vazio); setEditId(null); setErr(""); };

  const salvar = () => {
    const documento = form.nome.trim(), link = form.link.trim(), empresa = form.empresa || "";
    const nome = nomeComEmpresa(documento, empresa);
    if (!documento) { setErr("Informe o nome do documento."); return; }
    if (!editId && docs.some(d => (empresaDe(d) || "") === empresa && baseDe(d) === docBase(documento))) { setErr(`Já existe "${nome}" no acervo — edite o existente.`); return; }
    if (link && !linkValido(link)) { setErr("O link é opcional, mas se informado precisa ser uma URL completa (https://…)."); return; }
    if (form.envioAutomatico && !form.arquivo && !link) { setErr("Para envio automático, anexe o arquivo ou informe o link."); return; }
    const doc = {
      ...(editId ? docs.find(d => d.id === editId) : {}),
      id: editId || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome, documento, empresa, descricao: form.descricao.trim(), link, arquivo: form.arquivo, envioAutomatico: !!form.envioAutomatico,
      // campos do formato antigo, mantidos para compatibilidade (url = arquivo ou link)
      tipo: form.arquivo ? "arquivo" : "link", url: form.arquivo ? form.arquivo.url : link,
      arquivoNome: form.arquivo ? form.arquivo.name : "", arquivoType: form.arquivo ? form.arquivo.type || "" : "",
    };
    if (editId) { onUpdate(doc); toast(`Documento "${nome}" atualizado.`); }
    else { onAdd(doc); toast(`Documento "${nome}" adicionado ao acervo.`); }
    limpar();
  };

  const editar = (d) => {
    const p = acervoPartes(d);
    const emp = empresaDe(d) || "";
    setForm({ nome: d.documento || (emp ? nomeSemEmpresa(d.nome) : d.nome || ""), empresa: emp, descricao: d.descricao || "", link: p.link, arquivo: p.arquivo, envioAutomatico: !!d.envioAutomatico });
    setEditId(d.id); setErr("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const alternarAuto = (d) => {
    const p = acervoPartes(d);
    if (!d.envioAutomatico && !p.arquivo && !linkValido(p.link)) { toast("Anexe o arquivo ou um link antes de ativar o envio automático."); return; }
    onUpdate({ ...d, envioAutomatico: !d.envioAutomatico });
    toast(!d.envioAutomatico ? `"${d.nome}" agora é enviado automaticamente.` : `"${d.nome}" passa a ser enviado pela equipe.`);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Acervo de documentos para cadastro</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>
        Documentos que o fornecedor pode pedir no cadastro. Basta o arquivo — o link do Drive é opcional. Informe a <b style={{ color: C.text }}>empresa</b> (BB Indústria ou Go Comércio): o fornecedor recebe só a versão da empresa que se aplica a ele (isento de IE ou Gift → Go; com IE → BB). Os marcados com <b style={{ color: C.text }}>envio automático</b> ficam disponíveis para download assim que o fornecedor envia a solicitação; os demais a equipe envia depois da análise.
      </p>

      <div ref={formRef} />
      <Card className="p-5 mb-4" style={editId ? { borderColor: C.coral } : undefined}>
        <h2 className="font-bold mb-3" style={{ color: C.text }}>{editId ? "Editar documento" : "Adicionar documento"}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Documento (sem o nome da empresa, ex.: Cartão CNPJ)" value={form.nome} onChange={setCampo("nome")} />
          <div>
            <label className="text-xs font-semibold" style={{ color: C.muted }}>Empresa gocase</label>
            <select value={form.empresa} onChange={setCampo("empresa")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }}>
              <option value="bb">BB Indústria</option>
              <option value="go">Go Comércio</option>
              <option value="">Nenhuma (vale para as duas)</option>
            </select>
          </div>
          <Field label="Descrição (opcional)" value={form.descricao} onChange={setCampo("descricao")} full />
        </div>
        {form.nome.trim() && (
          <p className="text-[11px] mt-2" style={{ color: C.muted }}>
            Nome no acervo: <b style={{ color: C.text }}>{nomeComEmpresa(form.nome.trim(), form.empresa)}</b>
            {form.empresa && " — forma par com o mesmo documento da outra empresa."}
          </p>
        )}

        <div className="mt-4">
          <div className="text-xs font-semibold mb-1" style={{ color: C.muted }}>Arquivo</div>
          <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" />
          {form.arquivo ? (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: C.line }}>
              <FileIcon size={15} style={{ color: C.coral }} />
              <span className="flex-1 truncate" style={{ color: C.text }}>{form.arquivo.name || "arquivo"}</span>
              <button onClick={() => abrirDoc({ ...form.arquivo, nome: form.arquivo.name }, toast)} className="text-xs font-semibold" style={{ color: C.coral }}>abrir</button>
              <button onClick={() => fileRef.current?.click()} className="text-xs font-semibold" style={{ color: C.muted }}>trocar</button>
              <button onClick={() => setForm(s => ({ ...s, arquivo: null }))} className="text-xs font-semibold" style={{ color: C.danger }}>remover</button>
            </div>
          ) : (
            <button onClick={() => !enviando && fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed p-4 text-sm" style={{ borderColor: C.line, color: C.muted }}>
              {enviando ? <Loader2 size={16} className="inline mr-1 animate-spin" style={{ color: C.coral }} /> : <Paperclip size={16} className="inline mr-1" style={{ color: C.coral }} />}
              {enviando ? "Enviando arquivo…" : "Clique para selecionar um arquivo (PDF, imagem, Word ou Excel — até 10 MB)"}
            </button>
          )}
        </div>

        <div className="mt-4">
          <Field label="Link do Drive (opcional)" value={form.link} onChange={setCampo("link")} full />
          <p className="text-[11px] mt-1" style={{ color: C.muted }}>Se houver link, o fornecedor recebe o link e o arquivo. Útil quando o arquivo muda com frequência no Drive.</p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm cursor-pointer" style={{ color: C.text }}>
          <input type="checkbox" checked={form.envioAutomatico} onChange={e => setForm(s => ({ ...s, envioAutomatico: e.target.checked }))}
            className="w-4 h-4 mt-0.5" style={{ accentColor: C.coral }} />
          <span>
            <b>Envio automático</b>
            <span className="block text-xs" style={{ color: C.muted }}>Liberar para download assim que o fornecedor pedir, sem análise. Use só para documentos que podem ser compartilhados com qualquer solicitante (ex.: Cartão CNPJ, Alvará).</span>
          </span>
        </label>
        {form.envioAutomatico && !temConteudo && <div className="text-xs mt-2 font-semibold" style={{ color: C.yellow }}>Anexe o arquivo ou informe o link para o envio automático funcionar.</div>}

        {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.danger }}>{err}</div>}
        <div className="mt-4 flex gap-2">
          <Btn icon={editId ? Save : Plus} onClick={salvar}>{editId ? "Salvar alterações" : "Adicionar ao acervo"}</Btn>
          {editId && <Btn variant="outline" color={C.muted} onClick={limpar}>Cancelar</Btn>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3" style={{ color: C.text }}>Documentos no acervo ({docs.length})</h2>
        {docs.length > 4 && (
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input value={buscaDoc} onChange={e => setBuscaDoc(e.target.value)} placeholder="Buscar documento pelo nome ou descrição…"
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
          </div>
        )}
        {docs.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>Nenhum documento no acervo ainda. Adicione acima.</p>
        ) : docsFiltrados.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>Nenhum documento encontrado para "{buscaDoc.trim()}".</p>
        ) : (
          <div className="space-y-2">
            {docsPaginados.map(d => {
              const p = acervoPartes(d);
              const linkOk = p.link && linkValido(p.link);
              const vazioDoc = !p.arquivo && !linkOk;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: editId === d.id ? C.coral : C.line }}>
                  <span className="rounded-lg p-2 shrink-0" style={{ background: C.coralSoft, color: C.coral }}><FileIcon size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{d.nome}</div>
                    {d.descricao && <div className="text-xs truncate" style={{ color: C.muted }}>{d.descricao}</div>}
                    <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                      {p.arquivo && (
                        <button onClick={() => abrirDoc({ ...p.arquivo, nome: p.arquivo.name || d.nome }, toast)} className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: C.coral }}>
                          <Paperclip size={11} /> {p.arquivo.name || "arquivo"}
                        </button>
                      )}
                      {linkOk && (
                        <button onClick={() => abrirDoc(p.link, toast)} className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: C.coral }}>
                          <ExternalLink size={11} /> link do Drive
                        </button>
                      )}
                      {p.link && !linkOk && <span className="font-semibold" style={{ color: C.yellow }}>⚠ link inválido (opcional) — edite ou remova</span>}
                      {vazioDoc && <span className="font-semibold" style={{ color: C.muted }}>sem arquivo — a equipe envia manualmente</span>}
                      {(() => {
                        const emp = empresaDe(d), outra = emp === "bb" ? "go" : emp === "go" ? "bb" : null;
                        if (!outra) return null;
                        const temPar = docs.some(o => o.id !== d.id && empresaDe(o) === outra && baseDe(o) === baseDe(d));
                        return temPar
                          ? <span className="font-semibold" style={{ color: C.green }}>✓ par {EMPRESA_NOME[outra]}</span>
                          : <button onClick={() => { setForm({ ...vazio, nome: d.documento || nomeSemEmpresa(d.nome), empresa: outra, descricao: "" }); setEditId(null); setErr(""); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}
                              className="font-semibold hover:underline" style={{ color: C.yellow }}>+ criar versão {EMPRESA_NOME[outra]}</button>;
                      })()}
                    </div>
                  </div>
                  <button onClick={() => alternarAuto(d)} title={d.envioAutomatico ? "Envio automático ativo (clique para desativar)" : "Envio pela equipe (clique para ativar o envio automático)"}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
                    style={d.envioAutomatico ? { background: C.green + "22", color: C.green, border: `1px solid ${C.green}55` } : { background: C.bg, color: C.muted, border: `1px solid ${C.line}` }}>
                    {d.envioAutomatico ? "Envio automático" : "Envio pela equipe"}
                  </button>
                  <button onClick={() => editar(d)} title="Editar" className="shrink-0 rounded-lg p-2 hover:bg-gray-50" style={{ color: C.muted }}><Pencil size={16} /></button>
                  <button onClick={() => { if (window.confirm(`Excluir "${d.nome}" do acervo?`)) { onRemove(d.id); if (editId === d.id) limpar(); } }} title="Excluir" className="shrink-0 rounded-lg p-2 hover:bg-gray-50" style={{ color: C.danger }}><X size={16} /></button>
                </div>
              );
            })}
          </div>
        )}
        <LoadMore shown={docsPaginados.length} total={docsFiltrados.length} onMore={maisDocs} />
      </Card>
    </div>
  );
}

/* ===================== Root ===================== */
/* Dois acessos no mesmo app:
   - Público (sem login): formulário de solicitação de cadastro + consulta de status.
   - Equipe (login e senha validados no servidor): portal interno com dados,
     dashboard e relatórios. A sessão é um cookie HttpOnly emitido pelo worker. */
export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [publicView, setPublicView] = useState("form"); // form | status | login
  const portal = "interno";
  const [view, setView] = useState("dash");
  const [selId, setSelId] = useState(null);
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [acervo, setAcervo] = useState(DEFAULT_ACERVO);
  const [publicAcervo, setPublicAcervo] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  // Tema: "light" | "dark" | "auto" (auto = escuro das 18h às 6h). Preferência persistida.
  const [themePref, setThemePref] = useState(() => { try { return localStorage.getItem("gocase_theme") || "dark"; } catch (e) { return "dark"; } });
  const [, forceTick] = useState(0);
  const resolvedTheme = resolveTheme(themePref);
  applyPalette(resolvedTheme); // aplica antes do render dos filhos
  useEffect(() => { try { document.documentElement.setAttribute("data-theme", resolvedTheme); } catch (e) { } }, [resolvedTheme]);
  useEffect(() => {
    if (themePref !== "auto") return;
    const t = setInterval(() => forceTick(n => n + 1), 5 * 60 * 1000); // reavalia o horário no modo automático
    return () => clearInterval(t);
  }, [themePref]);
  const cycleTheme = () => {
    const next = themePref === "light" ? "dark" : themePref === "dark" ? "auto" : "light";
    setThemePref(next);
    try { localStorage.setItem("gocase_theme", next); } catch (e) { }
  };

  // Hidrata o portal interno (só depois do login — o servidor exige sessão da equipe).
  // Na primeira execução (base vazia) semeia templates e acervo padrão.
  const loadInternalData = async () => {
    const data = await db.bootstrap();
    if (!data) return false;
    setUsers(Array.isArray(data.users) ? data.users : []);
    if (Array.isArray(data.requests)) setRequests(data.requests.filter(r => r.tipo === "Cadastro"));
    if (Array.isArray(data.notifications)) setNotifications(data.notifications);
    if (data.templates && typeof data.templates === "object") setTemplates({ ...DEFAULT_TEMPLATES, ...data.templates });
    else db.saveTemplates(DEFAULT_TEMPLATES);
    if (Array.isArray(data.acervo) && data.acervo.length) setAcervo(data.acervo);
    else { await Promise.all(DEFAULT_ACERVO.map(d => db.saveAcervoDoc(d))); setAcervo(DEFAULT_ACERVO); }
    return true;
  };

  // Ao abrir: descobre se já há sessão válida da equipe; senão mostra o formulário público.
  useEffect(() => {
    let alive = true;
    (async () => {
      db.publicAcervo().then(a => { if (alive) setPublicAcervo(a); });
      const u = await db.me();
      if (!alive) return;
      if (u) { setCurrentUser(u); await loadInternalData(); }
      if (alive) setAuthChecked(true);
    })();
    return () => { alive = false; };
  }, []);

  // Persistência por entidade — cada registro é salvo individualmente no env.DB.
  const saveTemplates = (next) => { setTemplates(next); db.saveTemplates(next); };
  const addAcervoDoc = (doc) => { setAcervo(a => [...a, doc]); db.saveAcervoDoc(doc); };
  const updateAcervoDoc = (doc) => { setAcervo(a => a.map(d => d.id === doc.id ? doc : d)); db.saveAcervoDoc(doc); };
  const removeAcervoDoc = (id) => { setAcervo(a => a.filter(d => d.id !== id)); db.removeAcervoDoc(id); };

  const addUser = async (u) => {
    const res = await db.saveUser(u);
    if (res.ok) setUsers(list => [...list.filter(x => x.email !== u.email), res.user]);
    return res;
  };
  const updateUser = (email, changes) => {
    setUsers(list => list.map(x => x.email === email ? { ...x, ...stripPw(changes) } : x));
    db.updateUser(email, changes);
  };
  const removeUser = (email) => { setUsers(list => list.filter(x => x.email !== email)); db.removeUser(email); };

  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2600); };
  const nav = (v, id = null) => { setView(v); if (id) setSelId(id); setNotifOpen(false); };
  const selected = requests.find(r => r.id === selId);

  const onLogin = async (u) => {
    setCurrentUser(u);
    setView("dash");
    await loadInternalData();
  };
  const logout = async () => {
    await db.logout();
    setCurrentUser(null); setPublicView("form"); setView("dash");
    setRequests([]); setNotifications([]); setUsers([]);
  };

  const pushNotif = (n) => {
    const notif = { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), read: false, ...n };
    setNotifications(list => [notif, ...list]);
    db.saveNotification(notif);
  };

  // Muda o status de uma solicitação (modal de ação ou arrastando o card no quadro).
  const confirmModal = (status, obs, reqId = selId) => {
    const req = requests.find(r => r.id === reqId);
    const now = Date.now();
    const nowStr = new Date(now).toLocaleString("pt-BR");
    const isFinal = ["CONCLUIDA", "NEGADA"].includes(status);
    const SETOR_LABEL = { JURIDICO: "Setor Jurídico", FISCAL: "Setor Fiscal", FINANCEIRO: "Setor Financeiro" };
    const isSetorial = status in SETOR_LABEL;

    // Texto do movimento na timeline
    const moveText = isSetorial
      ? `Documentação submetida ao ${SETOR_LABEL[status]} para análise.${obs ? ` Observação: ${obs}` : ""}`
      : status === "APROVADA"   ? "Cadastro aprovado pela equipe gocase."
      : status === "NEGADA"     ? `Solicitação negada.${obs ? ` Motivo: ${obs}` : ""}`
      : status === "AGUARDANDO" ? `Aguardando informações ou documentos do fornecedor.${obs ? ` Detalhe: ${obs}` : ""}`
      : status === "CONCLUIDA"  ? "Processo concluído e fornecedor comunicado."
      : `Status atualizado para ${STATUS[status]?.label || status}.`;

    const mover = { status, actor: "user", who: currentUser?.name || "Equipe gocase", ts: now, text: moveText };

    if (req) {
      const updated = {
        ...req,
        status,
        ultimaAtualiz: nowStr,
        ultimaAtualizTs: now,
        finalizadoTs: isFinal ? now : undefined,
        resp: req.resp === "—" ? (currentUser?.name || "Equipe gocase") : req.resp,
        movimentos: [...(req.movimentos || []), mover],
      };
      setRequests(rs => rs.map(r => r.id === reqId ? updated : r));
      db.saveRequest(updated);
    }

    setModal(null);
    toast(`Solicitação atualizada para "${STATUS[status]?.label || status}".`);

    if (req) {
      const cor = STATUS[status]?.color || C.muted;
      const msgCliente = isSetorial
        ? `Sua solicitação ${req.id} foi encaminhada ao ${SETOR_LABEL[status]} para análise. Em breve você receberá um retorno.`
        : `Sua solicitação ${req.id} foi atualizada para "${STATUS[status]?.label || status}".`;
      // E-mail ao fornecedor (efetivo quando NOTIFY_API estiver configurado)
      const corpo = renderTemplate(templates[status], { id: req.id, cliente: req.parceiro, status: STATUS[status]?.label || status }) || msgCliente;
      notifyEmail({ to: req.email, clientName: req.parceiro, requestId: req.id, status: STATUS[status]?.label || status, message: corpo });
      const msgInterna = isSetorial
        ? `${req.id} submetida ao ${SETOR_LABEL[status]} por ${currentUser?.name || "Equipe gocase"}.`
        : `${req.id} atualizada para "${STATUS[status]?.label}" por ${currentUser?.name || "Equipe gocase"}.`;
      pushNotif({ message: msgInterna, requestId: req.id, color: cor, audience: "interno" });
    }
  };

  // Envio manual de um documento do acervo ao fornecedor (ou de um arquivo anexado no chamado).
  // O fornecedor baixa em "Acompanhar solicitação"; o token de entrega é criado no 1º envio.
  const novoTokenEntrega = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
  const atualizarDocEnviado = (reqId, docId, mudar, texto) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;
    const now = Date.now();
    const docsEnviados = (req.docsEnviados || []).map(d => d.docId === docId ? mudar(d) : d);
    const item = docsEnviados.find(d => d.docId === docId);
    const updated = {
      ...req, docsEnviados, entregaToken: req.entregaToken || novoTokenEntrega(),
      ultimaAtualiz: new Date(now).toLocaleString("pt-BR"), ultimaAtualizTs: now,
      movimentos: [...(req.movimentos || []), { status: req.status, actor: "user", who: currentUser?.name || "Equipe gocase", ts: now, text: texto(item) }],
    };
    setRequests(rs => rs.map(r => r.id === reqId ? updated : r));
    db.saveRequest(updated);
    return item;
  };
  const liberarDoc = async (reqId, docId, arquivo) => {
    const item = atualizarDocEnviado(reqId, docId,
      d => ({ ...d, liberado: true, liberadoTs: Date.now(), liberadoPor: currentUser?.name || "Equipe gocase", ...(arquivo ? { arquivoEnviado: arquivo } : {}) }),
      d => `Documento "${d.nome}" enviado ao fornecedor${arquivo ? ` (arquivo ${arquivo.name})` : ""}.`);
    if (item) toast(`"${item.nome}" liberado — o fornecedor baixa em Acompanhar solicitação.`);
  };
  const cancelarEnvio = (reqId, docId) => {
    const item = atualizarDocEnviado(reqId, docId,
      ({ liberado, liberadoTs, liberadoPor, arquivoEnviado, ...d }) => d,
      d => `Envio do documento "${d.nome}" cancelado.`);
    if (item) toast(`Envio de "${item.nome}" cancelado.`);
  };

  // Arrastar um card para outra coluna do quadro: status que pedem informação abrem o
  // modal da ação correspondente; os demais mudam direto.
  const MODAL_DO_STATUS = { APROVADA: "aprovar", NEGADA: "negar", AGUARDANDO: "ajuste", CONCLUIDA: "concluir", JURIDICO: "juridico", FISCAL: "fiscal", FINANCEIRO: "financeiro" };
  const moverStatus = (reqId, status) => {
    const req = requests.find(r => r.id === reqId);
    if (!req || req.status === status) return;
    setSelId(reqId);
    if (MODAL_DO_STATUS[status]) setModal(MODAL_DO_STATUS[status]);
    else confirmModal(status, "", reqId);
  };

  const Fonts = () => <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    *{font-family:Poppins,system-ui,sans-serif}
    html{transition:background-color .2s ease}
    [data-theme="dark"] body{background:#0A1220}
    [data-theme="dark"] .bg-white{background-color:#121D38 !important}
    [data-theme="dark"] .bg-gray-50{background-color:#1B2947 !important}
    [data-theme="dark"] .hover\\:bg-gray-50:hover{background-color:#22304D !important}
    [data-theme="dark"] .bg-gray-100{background-color:#1B2947 !important}
    [data-theme="dark"] input,[data-theme="dark"] textarea,[data-theme="dark"] select{color:#F2F5FB}
    [data-theme="dark"] input::placeholder,[data-theme="dark"] textarea::placeholder{color:#93A1C2}
    [data-theme="dark"] select option{color:#1E1E29;background:#fff}
  `}</style>;

  const Toast = () => toastMsg && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg flex items-center gap-2" style={{ background: C.ink }}>
      <CheckCircle2 size={16} style={{ color: C.green }} /> {toastMsg}
    </div>
  );

  if (!authChecked) return (
    <><Fonts />
      <div className="min-h-screen flex items-center justify-center gap-2" style={{ background: C.bg }}>
        <Loader2 className="animate-spin" size={20} style={{ color: C.coral }} />
        <span className="text-sm" style={{ color: C.muted }}>Carregando…</span>
      </div>
    </>
  );

  // Acesso aberto: qualquer pessoa solicita cadastro (só o CNPJ é obrigatório).
  if (!currentUser) return (
    <><Fonts />
      {publicView === "login"
        ? <Login onLogin={onLogin} goBack={() => setPublicView("form")} />
        : (
          <PublicShell view={publicView} setView={setPublicView} themePref={themePref} onCycleTheme={cycleTheme}>
            {publicView === "status"
              ? <ConsultaStatus />
              : <ExtNovaCad toast={toast} acervo={publicAcervo} goStatus={() => setPublicView("status")} />}
          </PublicShell>
        )}
      <DocViewer />
      <Toast />
    </>
  );

  let screen;
  const sendChatMsg = (reqId, msg) => {
    const req = requests.find(r => r.id === reqId);
    if (req) {
      const updated = { ...req, chat: [...(req.chat || []), msg], ultimaAtualiz: new Date().toLocaleString("pt-BR"), ultimaAtualizTs: msg.ts };
      setRequests(rs => rs.map(r => r.id === reqId ? updated : r));
      db.saveRequest(updated);
      pushNotif({ message: `Nova anotação no chamado ${reqId}: "${(msg.texto || "").slice(0, 60)}…"`, requestId: reqId, color: C.cyan, audience: "interno" });
    }
  };
  const reopenRequest = () => { };

  if (view === "detalhe") screen = <Detalhe r={selected} back={() => nav("lista-cad")} interno openModal={setModal} currentUser={currentUser} onSendMsg={sendChatMsg} onReopenRequest={reopenRequest} acervo={acervo} onLiberarDoc={liberarDoc} onCancelarEnvio={cancelarEnvio} toast={toast} />;
  else if (view === "cliente") screen = <ClienteDetalhe nome={selId} requests={requests} users={users} nav={nav} />;
  else {
    screen = { dash: <IntDash nav={nav} requests={requests} />, "lista-cad": <IntLista nav={nav} requests={requests} tipo="Cadastro" titulo="Solicitações de Cadastro" onMoverStatus={moverStatus} />, clientes: <Clientes requests={requests} users={users} nav={nav} />, acervo: (["ADMIN", "GESTOR"].includes(currentUser?.role) ? <AcervoDocs acervo={acervo} onAdd={addAcervoDoc} onUpdate={updateAcervoDoc} onRemove={removeAcervoDoc} toast={toast} /> : <IntDash nav={nav} requests={requests} />), usuarios: <Usuarios toast={toast} users={users} currentUser={currentUser} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={removeUser} />, relatorios: <Relatorios toast={toast} requests={requests} />, config: <Config toast={toast} templates={templates} onSaveTemplates={saveTemplates} />, conta: <MinhaConta toast={toast} user={currentUser} /> }[view];
  }

  const visibleNotifs = notifications.filter(n => n.audience === "interno");
  const badge = visibleNotifs.filter(n => !n.read).length;
  const openNotifs = () => {
    const ids = visibleNotifs.filter(n => !n.read).map(n => n.id);
    if (!ids.length) return;
    const set = new Set(ids);
    setNotifications(list => list.map(n => set.has(n.id) ? { ...n, read: true } : n));
    db.markNotifsRead(ids);
  };

  return (
    <>
      <Fonts />
      <Shell portal={portal} view={view} nav={nav} onLogout={logout} notifOpen={notifOpen} setNotifOpen={setNotifOpen} user={currentUser} notifs={visibleNotifs} badge={badge} onOpenNotifs={openNotifs} themePref={themePref} onCycleTheme={cycleTheme} requests={requests}>
        {screen}
      </Shell>
      {modal && <Modal kind={modal} onConfirm={confirmModal} onClose={() => setModal(null)} />}
      <DocViewer />
      <Toast />
    </>
  );
}
