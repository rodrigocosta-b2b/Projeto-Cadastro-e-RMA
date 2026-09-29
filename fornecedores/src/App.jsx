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
  Sun, Moon, Monitor, Eye, LayoutGrid, List, Menu,
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
function FileUpload({ accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf", hint = "Clique ou arraste para adicionar — imagens (JPG, PNG, WEBP), vídeos (MP4, MOV) e PDF", initial = [], onFiles }) {
  const [files, setFiles] = useState(initial);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const update = (next) => { setFiles(next); if (onFiles) onFiles(next); };
  const remove = (i) => update(files.filter((_, idx) => idx !== i));

  const add = async (list) => {
    setLoading(true);
    try {
      // Cada arquivo vai para o banco nativo (env.DB) e volta com URL própria.
      const arr = await Promise.all(Array.from(list).map((file) => db.uploadFile(file)));
      update([...files, ...arr]);
    } catch (e) {
      console.error("FileUpload error:", e);
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
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {files.map((f, i) => {
            const isImg = f.type.startsWith("image"); const isVid = f.type.startsWith("video"); const isPdf = f.type.includes("pdf");
            return (
              <div key={i} className="relative rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                <button onClick={() => remove(i)} className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "rgba(30,30,42,.7)" }}><X size={13} /></button>
                <div className="h-24 flex items-center justify-center bg-gray-50">
                  {isImg ? <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                    : isVid ? <video src={f.url} className="h-full w-full object-cover" muted />
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
// ATENÇÃO: autenticação apenas no front-end, para demonstração/testes.
// Não é segurança real — senhas ficam visíveis no cliente. A segurança de
// verdade (hash de senha, validação no servidor, JWT) vem com o backend.
const DB_KEY = "gocase_forn_users_v1";
const SEED_USERS = [
  { email: "beatriz.nogueira@gocase.com", password: "123456QAZ", name: "Beatriz Nogueira", role: "ADMIN", status: "Ativo" },
  { email: "rodrigo.costa@gocase.com", password: "123456QAZ", name: "Rodrigo Costa", role: "ADMIN", status: "Ativo" },
  { email: "larissa.simoes@gocase.com", password: "123456QAZ", name: "Larissa Simões", role: "ADMIN", status: "Ativo" },
];
const isInterno = (role) => ["ADMIN", "GESTOR", "COLABORADOR"].includes(role);

// Armazenamento genérico (window.storage no Claude, localStorage no site publicado)
const REQ_KEY = "gocase_forn_requests_v1";
const NOTIF_KEY = "gocase_forn_notifs_v1";
const TPL_KEY = "gocase_forn_templates_v1";
const ACERVO_KEY = "gocase_forn_acervo_v1";
// Acervo de documentos que o cliente pode solicitar no cadastro. Gerenciado por
// admins/gestores na aba "Acervo de documentos". Cada item tem nome + link do Drive
// (recomendado) ou um arquivo enviado (guardado no navegador). Ao marcar no cadastro,
// o sistema entrega o documento automaticamente na solicitação do cliente.
const DEFAULT_ACERVO = [
  { id: "doc-cartao-cnpj-bb", nome: "Cartão CNPJ — BB Indústria", descricao: "Comprovante de inscrição no CNPJ (abr/2026).", tipo: "link", url: "" },
  { id: "doc-cartao-cnpj-go", nome: "Cartão CNPJ — Go Comércio", descricao: "Comprovante de inscrição no CNPJ (fev/2026).", tipo: "link", url: "" },
  { id: "doc-contrato-social-bb", nome: "Contrato Social — BB Indústria", descricao: "Contrato social consolidado (14ª alteração).", tipo: "link", url: "" },
  { id: "doc-contrato-social-go", nome: "Contrato Social — Go Comércio", descricao: "Contrato social consolidado (20ª alteração).", tipo: "link", url: "" },
  { id: "doc-inscricao-municipal-bb", nome: "Inscrição Municipal — BB Indústria", descricao: "Inscrição municipal (Itapeva).", tipo: "link", url: "" },
  { id: "doc-inscricao-municipal-go90", nome: "Inscrição Municipal — GO 90", descricao: "Inscrição municipal.", tipo: "link", url: "" },
  { id: "doc-alvara-bb", nome: "Alvará de Funcionamento — BB Indústria", descricao: "Alvará de funcionamento.", tipo: "link", url: "" },
  { id: "doc-alvara-go", nome: "Alvará de Funcionamento — Go Comércio", descricao: "Alvará de funcionamento (venc. 31.12.2026).", tipo: "link", url: "" },
  { id: "doc-cnd-rfb-bb", nome: "CND RFB / Federal — BB Indústria", descricao: "Certidão Negativa de Débitos federais.", tipo: "link", url: "" },
  { id: "doc-cnd-sefaz-bb", nome: "CND SEFAZ / Estadual — BB Indústria", descricao: "Certidão Negativa de Débitos estaduais.", tipo: "link", url: "" },
  { id: "doc-cnd-sefin-bb", nome: "CND SEFIN / Municipal — BB Indústria", descricao: "Certidão Negativa de Débitos municipais.", tipo: "link", url: "" },
  { id: "doc-balanco-contas-bb", nome: "Balanço de Contas — BB Indústria", descricao: "Balanço (1º tri/2025), assinado.", tipo: "link", url: "" },
  { id: "doc-balanco-contas-go", nome: "Balanço de Contas — Go Comércio", descricao: "Demonstrações financeiras 31.12.2025, assinado.", tipo: "link", url: "" },
  { id: "doc-declaracao-faturamento-go", nome: "Declaração de Faturamento — Go Comércio", descricao: "Declaração de faturamento 2025, assinada.", tipo: "link", url: "" },
  { id: "doc-comprovante-bancario-bb", nome: "Comprovante Bancário — BB Indústria", descricao: "Comprovante bancário assinado (dez/2025).", tipo: "link", url: "" },
  { id: "doc-declaracao-bancaria-bb", nome: "Declaração Bancária — BB Indústria", descricao: "Declaração bancária.", tipo: "link", url: "" },
  { id: "doc-declaracao-conta-go", nome: "Declaração de Conta Bancária — Go Comércio", descricao: "Declaração de abertura e manutenção de conta.", tipo: "link", url: "" },
  { id: "doc-minuta-contrato-b2b", nome: "Minuta padrão — Contrato B2B", descricao: "Modelo padrão de contrato B2B.", tipo: "link", url: "" },
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
   notificação, documento do acervo) é persistida individualmente — nada se
   perde ao recarregar a página ou trocar de aba.

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
async function apiJSON(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { "content-type": "application/json", Accept: "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return r;
}
const stripPw = (u) => { if (!u) return u; const { password, ...rest } = u; return rest; };

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

const db = {
  async bootstrap() {
    if ((await dbMode()) === "remote") {
      try {
        const r = await fetch("/api/bootstrap", { headers: { Accept: "application/json" } });
        if (r.ok) return await r.json();
      } catch (e) { }
    }
    return {
      users: (_ls.get(DB_KEY, null) || []).map(stripPw) || null,
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
        if (r.status === 200) return { ok: true, user: (await r.json()).user };
        if (r.status === 403) return { ok: false, reason: "inactive" };
        return { ok: false, reason: "invalid" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    const u = (_ls.get(DB_KEY, []) || []).find(x => (x.email || "").toLowerCase() === (email || "").trim().toLowerCase());
    if (!u || u.password !== password) return { ok: false, reason: "invalid" };
    if (u.status && u.status !== "Ativo") return { ok: false, reason: "inactive" };
    return { ok: true, user: stripPw(u) };
  },
  async signup(user) {
    if ((await dbMode()) === "remote") {
      try {
        const r = await apiJSON("POST", "/api/signup", user);
        if (r.status === 201) return { ok: true, user: (await r.json()).user };
        if (r.status === 409) return { ok: false, reason: "exists" };
        return { ok: false, reason: "error" };
      } catch (e) { return { ok: false, reason: "error" }; }
    }
    const arr = _ls.get(DB_KEY, []) || [];
    if (arr.some(x => (x.email || "").toLowerCase() === (user.email || "").trim().toLowerCase())) return { ok: false, reason: "exists" };
    arr.push(user); _ls.set(DB_KEY, arr);
    return { ok: true, user: stripPw(user) };
  },
  async saveUser(user) {
    if ((await dbMode()) === "remote") {
      try { const r = await apiJSON("POST", "/api/users", user); if (r.ok) return stripPw((await r.json()).user); } catch (e) { }
      return stripPw(user);
    }
    _ls.upsert(DB_KEY, user, "email");
    return stripPw(user);
  },
  async updateUser(email, changes) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("PATCH", `/api/users/${encodeURIComponent(email)}`, changes); } catch (e) { }
      return;
    }
    const arr = (_ls.get(DB_KEY, []) || []).map(x => x.email === email ? { ...x, ...changes } : x);
    _ls.set(DB_KEY, arr);
  },
  async removeUser(email) {
    if ((await dbMode()) === "remote") {
      try { await apiJSON("DELETE", `/api/users/${encodeURIComponent(email)}`); } catch (e) { }
      return;
    }
    _ls.set(DB_KEY, (_ls.get(DB_KEY, []) || []).filter(x => x.email !== email));
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
  // Upload de arquivo → banco nativo. Retorna { id?, name, type, size, url }.
  // No modo remoto a URL é /api/files/:id (same-origin, abre inline). Sem worker,
  // guarda o data: URL inline como fallback.
  async uploadFile(file) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Falha ao ler arquivo"));
      r.readAsDataURL(file);
    });
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
async function viaCnpja(d) {
  const j = await fetchJSON(`https://open.cnpja.com/office/${d}`);
  if (!j) return null;
  const reg = (j.registrations || []).find(x => x.enabled) || (j.registrations || [])[0];
  const ph = (j.phones || [])[0];
  return {
    razaoSocial: j.company?.name || "",
    nomeFantasia: j.alias || j.company?.name || "",
    inscricaoEstadual: reg?.number || "",
    situacao: j.status?.text || "",
    cep: j.address?.zip ? String(j.address.zip).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [j.address?.street, j.address?.number].filter(Boolean).join(", "),
    complemento: j.address?.details || "",
    bairro: j.address?.district || "",
    municipio: j.address?.city || "",
    estado: j.address?.state || "",
    telefone: ph ? `(${ph.area}) ${ph.number}` : "",
    email: (j.emails || [])[0]?.address || "",
  };
}
async function viaCnpjWs(d) {
  const j = await fetchJSON(`https://publica.cnpj.ws/cnpj/${d}`);
  if (!j) return null;
  const est = j.estabelecimento || {};
  const ie = (est.inscricoes_estaduais || []).find(x => x.ativo) || (est.inscricoes_estaduais || [])[0];
  return {
    razaoSocial: j.razao_social || "",
    nomeFantasia: est.nome_fantasia || j.razao_social || "",
    inscricaoEstadual: ie?.inscricao_estadual || "",
    situacao: est.situacao_cadastral || "",
    cep: est.cep ? String(est.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [est.tipo_logradouro, est.logradouro, est.numero].filter(Boolean).join(" "),
    complemento: est.complemento || "",
    bairro: est.bairro || "",
    municipio: est.cidade?.nome || "",
    estado: est.estado?.sigla || "",
    telefone: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : "",
    email: est.email || "",
  };
}
async function viaBrasilAPI(d) {
  const j = await fetchJSON(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
  if (!j) return null;
  return {
    razaoSocial: j.razao_social || "",
    nomeFantasia: j.nome_fantasia || j.razao_social || "",
    inscricaoEstadual: "",
    situacao: j.descricao_situacao_cadastral || "",
    cep: j.cep ? String(j.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : "",
    logradouro: [j.descricao_tipo_de_logradouro, j.logradouro, j.numero].filter(Boolean).join(" "),
    complemento: j.complemento || "",
    bairro: j.bairro || "",
    municipio: j.municipio || "",
    estado: j.uf || "",
    telefone: j.ddd_telefone_1 ? j.ddd_telefone_1.replace(/^(\d{2})(\d+)/, "($1) $2") : "",
    email: j.email || "",
  };
}
async function consultarCNPJ(d) {
  const digits = String(d || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;
  for (const provider of [viaCnpja, viaCnpjWs, viaBrasilAPI]) {
    try {
      const dados = await provider(digits);
      if (dados && (dados.razaoSocial || dados.nomeFantasia)) return dados;
    } catch (e) { /* tenta o próximo provedor */ }
  }
  return null;
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

/* ===================== Login ===================== */
function Login({ users, onLogin, goSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (loading) return;
    setLoading(true);
    const res = await db.login(email, password);
    setLoading(false);
    if (!res.ok) { setErr(res.reason === "inactive" ? "Conta inativa. Procure um administrador." : "E-mail ou senha inválidos."); return; }
    setErr(""); onLogin(res.user);
  };
  return (
    <AuthShell>
      <h1 className="text-xl font-bold" style={{ color: C.text }}>Entrar</h1>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Acesse com seu e-mail de fornecedor ou corporativo.</p>
      <label className="text-xs font-semibold" style={{ color: C.muted }}>E-mail</label>
      <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="seu@email.com"
        className="mt-1 mb-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
      <label className="text-xs font-semibold" style={{ color: C.muted }}>Senha</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
        className="mt-1 mb-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none bg-white" style={{ borderColor: C.line }} />
      {err && <div className="text-xs mb-2 font-semibold" style={{ color: C.coral }}>{err}</div>}
      <a className="text-xs font-semibold self-end mb-5 cursor-pointer" style={{ color: C.coral }}>Esqueci minha senha</a>
      <button onClick={submit} className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: C.coral }}>Entrar</button>
      <div className="text-center text-sm mt-5" style={{ color: C.muted }}>
        É fornecedor ou empresa parceira e ainda não tem conta?{" "}
        <button onClick={goSignup} className="font-bold" style={{ color: C.coral }}>Cadastre-se</button>
      </div>
    </AuthShell>
  );
}

/* ===================== Cadastro de cliente ===================== */
function Signup({ users, onRegister, goLogin }) {
  const [f, setF] = useState({ nome: "", cnpj: "", contato: "", email: "", telefone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const localizar = async () => {
    const d = (f.cnpj || "").replace(/\D/g, "");
    if (d.length !== 14) { setErr("Informe um CNPJ válido (14 dígitos)."); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      setF(s => ({ ...s, nome: j.nome_fantasia || j.razao_social || s.nome, email: s.email || j.email || "", telefone: s.telefone || (j.ddd_telefone_1 ? j.ddd_telefone_1.replace(/^(\d{2})(\d+)/, "($1) $2") : "") }));
    } catch (e) { setErr("Não foi possível localizar o CNPJ. Preencha manualmente."); }
    finally { setLoading(false); }
  };
  const submit = async () => {
    if (!f.nome || !f.email || !f.password) { setErr("Preencha nome, e-mail e senha."); return; }
    if (f.password.length < 6) { setErr("A senha deve ter ao menos 6 caracteres."); return; }
    if (f.password !== f.confirm) { setErr("As senhas não conferem."); return; }
    setErr("");
    const res = await onRegister({ email: f.email.trim(), password: f.password, name: f.nome, role: "CLIENTE", status: "Ativo", cnpj: f.cnpj, telefone: f.telefone, contato: f.contato });
    if (res && !res.ok) setErr(res.reason === "exists" ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta. Tente novamente.");
  };
  return (
    <AuthShell>
      <button onClick={goLogin} className="flex items-center gap-1 text-sm font-semibold mb-4 -mt-2 self-start" style={{ color: C.muted }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold" style={{ color: C.text }}>Criar conta de fornecedor ou empresa parceira</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>Informe o CNPJ para localizar os dados e defina sua senha de acesso.</p>
      <label className="text-xs font-semibold" style={{ color: C.muted }}>CNPJ</label>
      <div className="flex gap-2 mt-1 mb-3">
        <input value={f.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" className="flex-1 rounded-xl border px-3 py-2.5 text-sm bg-white" style={{ borderColor: C.line }} />
        <button onClick={localizar} disabled={loading} className="inline-flex items-center gap-2 rounded-xl px-3 text-sm font-bold text-white" style={{ background: C.coral, opacity: loading ? .7 : 1 }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}Localizar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Razão social / Nome fantasia" value={f.nome} onChange={set("nome")} full />
        <Field label="Nome do contato" value={f.contato} onChange={set("contato")} />
        <Field label="Telefone" value={f.telefone} onChange={set("telefone")} />
        <Field label="E-mail de acesso" value={f.email} onChange={set("email")} full />
        <Field label="Senha" value={f.password} onChange={set("password")} type="password" />
        <Field label="Confirmar senha" value={f.confirm} onChange={set("confirm")} type="password" />
      </div>
      {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.coral }}>{err}</div>}
      <button onClick={submit} className="w-full rounded-xl py-2.5 text-sm font-bold text-white mt-4" style={{ background: C.coral }}>Criar conta e entrar</button>
      <div className="text-center text-sm mt-4" style={{ color: C.muted }}>
        Já tem conta?{" "}<button onClick={goLogin} className="font-bold" style={{ color: C.coral }}>Entrar</button>
      </div>
    </AuthShell>
  );
}

/* ===================== Menus ===================== */
const MENU = {
  externo: [
    { id: "inicio", label: "Início", icon: Home },
    { id: "nova-cad", label: "Solicitação de Cadastro", icon: Building2 },
    { id: "minhas", label: "Minhas Solicitações", icon: FileText },
    { id: "perfil", label: "Perfil", icon: UserIcon },
  ],
  interno: [
    { id: "dash", label: "Dashboard", icon: LayoutDashboard },
    { id: "lista-cad", label: "Cadastros", icon: FileCheck },
    { id: "clientes", label: "Fornecedores", icon: Building2 },
    { id: "acervo", label: "Acervo de documentos", icon: BookOpen, roles: ["ADMIN", "GESTOR"] },
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "config", label: "Configurações", icon: Settings },
  ],
};

/* ===================== Shell ===================== */
function Shell({ portal, switchPortal, view, nav, onLogout, notifOpen, setNotifOpen, user, notifs, badge, onOpenNotifs, themePref, onCycleTheme, requests, children }) {
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
        {staff && (
          <button onClick={() => switchPortal(portal === "externo" ? "interno" : "externo")}
            className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: C.accent, color: C.ink }}>
            Portal {portal === "externo" ? "interno" : "externo"}
          </button>
        )}
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

/* ===================== Detalhe ===================== */
function Detalhe({ r, back, interno, openModal, currentUser, onSendMsg, onReopenRequest }) {
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
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Dados do fornecedor</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Fornecedor", r.parceiro], ["CNPJ", r.cnpj], ["UF", r.uf], ["E-mail", r.email || "—"]].map(([k, v]) =>
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>)}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Anexos enviados pelo cliente</h2>
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
              <p className="text-sm" style={{ color: C.muted }}>Nenhum anexo enviado pelo cliente nesta solicitação.</p>
            )}
          </Card>
          {/* Mensagem do cliente — visível para equipe interna */}
          {(r.mensagemCadastro || (r.tipo === "Cadastro" && r.problema && r.problema !== "Solicitação de cadastro / homologação de parceiro.")) && (
            <Card className="p-5" style={{ borderColor: C.cyan + "50", background: C.cyan + "08" }}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} style={{ color: C.cyan }} />
                <h2 className="font-bold text-sm" style={{ color: C.text }}>Mensagem do cliente</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: C.text }}>
                {r.mensagemCadastro || r.problema}
              </p>
            </Card>
          )}
          {r.docsSolicitados && r.docsSolicitados.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold mb-3" style={{ color: C.text }}>Documentos solicitados pelo cliente à gocase</h2>
              <div className="space-y-2">
                {r.docsSolicitados.map((d, i) => <div key={i} className="flex items-center gap-2 text-sm" style={{ color: C.text }}><FileCheck size={15} style={{ color: C.coral }} /> {d}</div>)}
              </div>
            </Card>
          )}
          {r.docsEnviados && r.docsEnviados.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold mb-1" style={{ color: C.text }}>Documentos enviados pela gocase</h2>
              <p className="text-xs mb-3" style={{ color: C.muted }}>Enviados automaticamente pelo sistema ao registrar a solicitação. Clique para baixar.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {r.docsEnviados.map((d, i) => (
                  <button key={i} onClick={() => abrirDoc(d, null)}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm hover:bg-gray-50 text-left w-full" style={{ borderColor: C.line, color: C.text, opacity: d.url ? 1 : 0.6 }}>
                    <span className="rounded-lg p-1.5" style={{ background: C.coralSoft, color: C.coral }}><FileIcon size={15} /></span>
                    <span className="flex-1 font-medium truncate">{d.nome}</span>
                    {d.url ? <Download size={15} style={{ color: C.coral }} /> : <span className="text-[10px]" style={{ color: C.muted }}>sem link</span>}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {interno && !["CONCLUIDA", "NEGADA"].includes(r.status) && (
            <div className="space-y-3">
              {/* Ações gerais */}
              <div className="flex gap-3 flex-wrap">
                <Btn icon={CheckCircle2} color={C.green}  onClick={() => openModal("aprovar")}>Aprovar</Btn>
                <Btn icon={XCircle}     color={C.danger}   onClick={() => openModal("negar")}>Negar</Btn>
                <Btn icon={AlertTriangle} variant="outline" color={C.yellow} onClick={() => openModal("ajuste")}>Solicitar ajuste</Btn>
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

/* ===================== External screens ===================== */
function ExtInicio({ nav, requests, user }) {
  const nome = user?.name || "fornecedor";
  const mine = requests.filter(r => r.ownerEmail ? r.ownerEmail === user?.email : r.parceiro === nome);
  const count = (s) => mine.filter(r => r.status === s).length;
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Olá, {nome} 👋</h1>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Acompanhe suas solicitações de cadastro e homologação como fornecedor gocase.</p>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Clock} label="Em aberto" value={mine.filter(r => ["NOVA", "EM_ANALISE", "AGUARDANDO"].includes(r.status)).length} color={C.yellow} onClick={() => nav("minhas")} />
        <StatCard icon={RefreshCw} label="Em análise" value={count("EM_ANALISE")} color={C.violet} onClick={() => nav("minhas")} />
        <StatCard icon={CheckCircle2} label="Concluídas" value={count("CONCLUIDA")} color={C.green} onClick={() => nav("minhas")} />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: C.text }}>Solicitações recentes</h2>
          <Btn icon={Plus} onClick={() => nav("nova-cad")}>Nova solicitação</Btn>
        </div>
        <div className="divide-y" style={{ borderColor: C.line }}>
          {mine.length === 0 && <div className="py-6 text-center text-sm" style={{ color: C.muted }}>Você ainda não tem solicitações de cadastro.</div>}
          {mine.map(r => (
            <button key={r.id} onClick={() => nav("detalhe", r.id)} className="w-full flex items-center gap-4 py-3 px-2 hover:bg-gray-50 rounded-lg text-left">
              <div className="font-mono text-sm font-semibold" style={{ color: C.coral }}>{r.id}</div>
              <div className="flex-1 text-sm truncate" style={{ color: C.text }}>{r.problema}</div>
              <div className="text-xs hidden sm:block" style={{ color: C.muted }}>{r.abertura}</div>
              <Pill {...STATUS[r.status]} /><ChevronRight size={16} style={{ color: C.muted }} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ExtNovaCad({ nav, toast, onCreate, acervo }) {
  const docsDisponiveis = acervo || [];
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [consultado, setConsultado] = useState(false);
  const [f, setF] = useState({
    cnpj: "", nomeContato: "", telefone: "", email: "",
    razaoSocial: "", nomeFantasia: "", inscricaoEstadual: "", situacao: "",
    cep: "", logradouro: "", bairro: "", municipio: "", estado: "", complemento: "",
  });
  const [meusDocs, setMeusDocs] = useState([]);
  const [solicitar, setSolicitar] = useState({}); // chaveado por id do documento do acervo
  const [mensagem, setMensagem] = useState("");
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const toggleDoc = (id) => setSolicitar(s => ({ ...s, [id]: !s[id] }));

  const localizar = async () => {
    const d = (f.cnpj || "").replace(/\D/g, "");
    if (d.length !== 14) { setErro("Informe um CNPJ válido (14 dígitos)."); return; }
    setErro(""); setLoading(true);
    const dados = await consultarCNPJ(d);
    setConsultado(true); setLoading(false);
    if (!dados) {
      setErro("Não foi possível consultar o CNPJ agora. No preview do Claude as consultas externas são bloqueadas (funciona no site publicado). Você pode preencher os campos manualmente.");
      toast("Não foi possível localizar este CNPJ. Preencha os campos manualmente.");
      return;
    }
    setErro("");
    setF(s => ({ ...s, ...dados }));
    toast(dados.inscricaoEstadual
      ? "Dados localizados, incluindo a inscrição estadual."
      : "Dados localizados. Inscrição estadual indisponível — preencha se necessário.");
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

  const finalizar = () => {
    const selecionados = docsDisponiveis.filter(d => solicitar[d.id]);
    onCreate({
      tipo: "Cadastro", status: "NOVA", resp: "—",
      parceiro: f.nomeFantasia || f.razaoSocial || "Novo parceiro",
      cnpj: f.cnpj, uf: f.estado || "—", email: f.email, ie: f.inscricaoEstadual,
      produto: "—", modelo: "—", nf: "—", venda: "—",
      problema: mensagem.trim() || "Solicitação de cadastro / homologação de parceiro.",
      mensagemCadastro: mensagem.trim(),
      anexos: meusDocs,
      docsSolicitados: selecionados.map(d => d.nome),
      docsEnviados: selecionados.map(d => ({ nome: d.nome, url: d.url || "", tipo: d.tipo || "link", arquivoType: d.arquivoType || "" })),
    });
    toast(selecionados.length
      ? `Cadastro enviado! ${selecionados.length} documento(s) já enviados automaticamente na sua solicitação.`
      : "Cadastro enviado para análise! Já aparece no portal interno.");
    nav("minhas");
  };

  return (
    <div className="max-w-3xl">
      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>Fornecedor</div>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Solicitação de Cadastro</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>Preencha os dados para iniciar o processo de homologação junto à gocase.</p>
      <Stepper step={step} labels={["Identificação", "Documentos", "Concluído"]} />

      {step === 1 && (
        <>
          <Card className="p-5 mb-4">
            <label className="text-xs font-semibold" style={{ color: C.muted }}>CNPJ</label>
            <div className="flex gap-2 mt-1">
              <input value={f.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" style={{ borderColor: C.line }} />
              <button onClick={localizar} disabled={loading} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ background: C.coral, opacity: loading ? 0.7 : 1 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}{loading ? "Localizando…" : "Localizar dados"}
              </button>
            </div>
            {erro && <div className="text-xs mt-2 font-semibold" style={{ color: C.coral }}>{erro}</div>}
            <p className="text-xs mt-2" style={{ color: C.muted }}>A busca é automática ao digitar os 14 dígitos do CNPJ — os campos abaixo são preenchidos sozinhos a partir da Receita Federal. Você também pode clicar em Localizar, e ajustar qualquer campo depois.</p>
          </Card>

          {consultado && (
            <Card className="p-5 mb-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold" style={{ color: C.cyan }}><FileCheck size={16} /> Dados cadastrais</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Razão social" value={f.razaoSocial} onChange={set("razaoSocial")} />
                <Field label="Nome fantasia" value={f.nomeFantasia} onChange={set("nomeFantasia")} />
                <Field label="Inscrição estadual" value={f.inscricaoEstadual} onChange={set("inscricaoEstadual")} />
                <Field label="Situação cadastral" value={f.situacao} onChange={set("situacao")} />
                <Field label="Nome do contato" value={f.nomeContato} onChange={set("nomeContato")} />
                <Field label="Telefone" value={f.telefone} onChange={set("telefone")} />
                <Field label="E-mail" value={f.email} onChange={set("email")} full />
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
            <Btn onClick={() => { if (!f.cnpj && !f.razaoSocial) { setErro("Informe e localize um CNPJ, ou preencha manualmente."); return; } setStep(2); }}>
              Próximo: Documentos
            </Btn>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-lg p-2" style={{ background: C.coralSoft, color: C.coral }}><Package size={16} /></span>
              <h2 className="font-bold" style={{ color: C.text }}>Documentos</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: C.muted }}>Envie os seus e selecione o que precisa receber da gocase.</p>

            <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: C.text }}><Send size={13} /> Enviar meus documentos</div>
            <FileUpload onFiles={setMeusDocs} />

            <div className="text-xs font-semibold mt-5 mb-2 flex items-center gap-1" style={{ color: C.text }}><Download size={13} /> Solicitar da gocase</div>
            {docsDisponiveis.length === 0 ? (
              <p className="text-sm rounded-xl border px-3 py-3" style={{ borderColor: C.line, color: C.muted }}>Nenhum documento disponível no momento.</p>
            ) : (
              <div className="space-y-2">
                {docsDisponiveis.map(d => {
                  const on = !!solicitar[d.id];
                  return (
                    <button key={d.id} onClick={() => toggleDoc(d.id)} className="w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition"
                      style={{ borderColor: on ? C.coral : C.line, background: on ? C.coralSoft : C.surface }}>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: on ? C.coral : C.surface, border: `1.5px solid ${on ? C.coral : C.line}` }}>
                        {on && <Check size={13} color="#fff" />}
                      </span>
                      <span className="flex-1">
                        <span className="text-sm font-medium block" style={{ color: C.text }}>{d.nome}</span>
                        {d.descricao && <span className="text-xs block" style={{ color: C.muted }}>{d.descricao}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: C.muted }}>Os documentos marcados são enviados automaticamente na sua solicitação assim que você concluir o cadastro.</p>

            {/* Caixa de mensagem */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
              <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: C.text }}>
                <MessageSquare size={13} /> Mensagem para a equipe gocase (opcional)
              </div>
              <p className="text-xs mb-2" style={{ color: C.muted }}>
                Descreva sua solicitação, informe detalhes adicionais, contexto da parceria ou qualquer dúvida para a equipe de cadastro da gocase.
              </p>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                placeholder="Ex.: Somos uma nova loja de acessórios em São Paulo, gostaríamos de entender as condições comerciais para revenda de capinhas gocase. Já trabalhamos com outras marcas no segmento e temos interesse em parceria..."
                rows={4}
                className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none bg-white"
                style={{ borderColor: C.line }}
              />
              <p className="text-xs mt-1" style={{ color: C.muted }}>
                Sua mensagem ficará registrada na solicitação e será lida pela equipe de cadastro.
              </p>
            </div>
          </Card>
          <div className="flex justify-between">
            <Btn variant="outline" color={C.muted} icon={ArrowLeft} onClick={() => setStep(1)}>Voltar</Btn>
            <Btn onClick={() => setStep(3)}>Próximo: Concluir</Btn>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold" style={{ color: C.green }}><CheckCircle2 size={16} /> Revisão final</div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[["Empresa", f.nomeFantasia || f.razaoSocial || "—"], ["CNPJ", f.cnpj || "—"], ["Inscrição estadual", f.inscricaoEstadual || "—"], ["Município/UF", `${f.municipio || "—"}/${f.estado || "—"}`], ["Contato", f.nomeContato || "—"], ["E-mail", f.email || "—"]].map(([k, v]) => (
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>
              ))}
            </div>
            <div className="mt-4 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Meus documentos enviados</div>
              <div className="font-medium" style={{ color: C.text }}>{meusDocs.length ? `${meusDocs.length} arquivo(s)` : "Nenhum"}</div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Mensagem para a equipe</div>
              <div className="font-medium" style={{ color: C.text }}>{mensagem.trim() || <span style={{ color: C.muted, fontStyle: "italic" }}>Nenhuma mensagem</span>}</div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-xs" style={{ color: C.muted }}>Documentos solicitados da gocase</div>
              <div className="font-medium" style={{ color: C.text }}>{docsDisponiveis.filter(d => solicitar[d.id]).map(d => d.nome).join(", ") || "Nenhum"}</div>
            </div>
          </Card>
          <div className="flex justify-between">
            <Btn variant="outline" color={C.muted} icon={ArrowLeft} onClick={() => setStep(2)}>Voltar</Btn>
            <Btn icon={Send} color={C.green} onClick={finalizar}>Concluir e enviar</Btn>
          </div>
        </>
      )}
    </div>
  );
}

function ExtMinhas({ nav, requests, user }) {
  const mine = requests.filter(r => r.ownerEmail ? r.ownerEmail === user?.email : r.parceiro === (user?.name));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>Minhas solicitações</h1>
        <Btn icon={Plus} onClick={() => nav("nova-cad")}>Nova solicitação</Btn>
      </div>
      <Card><DataTable rows={mine} cols={["Número", "Empresa", "CNPJ", "Abertura", "Status", ""]} render={r => (
        <>
          <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
          <td className="px-4 py-3" style={{ color: C.text }}>{r.parceiro}</td>
          <td className="px-4 py-3" style={{ color: C.muted }}>{r.cnpj}</td>
          <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
          <td className="px-4 py-3"><Pill {...STATUS[r.status]} /></td>
          <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
        </>
      )} onRow={r => nav("detalhe", r.id)} /></Card>
    </div>
  );
}

function Perfil({ toast, user }) {
  const initials = (user?.name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4" style={{ color: C.text }}>Perfil</h1>
      <Card className="p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: C.coralSoft, color: C.coral }}>{initials}</div>
          <div><div className="font-bold text-lg" style={{ color: C.text }}>{user?.name}</div><div className="text-sm" style={{ color: C.muted }}>Fornecedor gocase{user?.cnpj ? ` · CNPJ ${user.cnpj}` : ""}</div></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[[Mail, "E-mail", user?.email || "—"], [Phone, "Telefone", user?.telefone || "—"], [UserIcon, "Contato", user?.contato || user?.name || "—"], [Smartphone, "CNPJ", user?.cnpj || "—"]].map(([Icon, k, v]) => (
            <div key={k} className="flex items-start gap-2"><Icon size={16} style={{ color: C.coral }} className="mt-0.5" />
              <div><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div></div>
          ))}
        </div>
        <div className="mt-5 flex gap-2"><Btn onClick={() => toast("Dados atualizados.")}>Salvar alterações</Btn><Btn variant="outline" onClick={() => toast("E-mail de redefinição enviado.")}>Redefinir senha</Btn></div>
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

/* Cartão de solicitação usado na visualização em cards (Kanban) */
function KanbanCard({ r, nav }) {
  return (
    <button onClick={() => nav("detalhe", r.id)}
      className="w-full text-left rounded-xl border bg-white p-3 mb-2.5 hover:shadow-md transition"
      style={{ borderColor: C.line }}>
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

/* Visualização em cards: quadro com uma coluna por status (estilo kanban) */
function KanbanBoard({ rows, nav }) {
  const cols = Object.entries(STATUS);
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {cols.map(([key, s]) => {
        const items = rows.filter(r => r.status === key);
        return (
          <div key={key} className="shrink-0 w-72">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-sm font-bold truncate" style={{ color: C.text }}>{s.label}</span>
              <span className="ml-auto text-xs font-bold rounded-full px-2 py-0.5 shrink-0" style={{ background: C.bg, color: C.muted }}>{items.length}</span>
            </div>
            <div className="rounded-2xl p-2 min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto" style={{ background: C.bg }}>
              {items.length === 0 ? (
                <div className="text-xs text-center py-6" style={{ color: C.muted }}>Sem solicitações</div>
              ) : items.map(r => <KanbanCard key={r.id} r={r} nav={nav} />)}
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

function IntLista({ nav, requests, tipo, titulo }) {
  const [f, setF] = useState("Todos");
  const [viewMode, setViewMode] = useState("board"); // "board" (cards) | "list"
  const base = requests.filter(r => r.tipo === tipo);
  const rows = f === "Todos" ? base : base.filter(r => STATUS[r.status].label === f);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-2xl font-bold" style={{ color: C.text }}>{titulo}</h1>
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
        <KanbanBoard rows={rows} nav={nav} />
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

  const criar = () => {
    if (!form.name || !form.email || !form.password) { setErr("Preencha nome, e-mail e senha."); return; }
    if (form.password.length < 6) { setErr("A senha deve ter ao menos 6 caracteres."); return; }
    if (users.some(u => u.email.toLowerCase() === form.email.trim().toLowerCase())) { setErr("Já existe uma conta com este e-mail."); return; }
    setErr("");
    onAddUser({ email: form.email.trim(), password: form.password, name: form.name, role: form.role, status: "Ativo" });
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
function AcervoDocs({ acervo, onAdd, onRemove, toast }) {
  const docs = acervo || [];
  const [buscaDoc, setBuscaDoc] = useState("");
  const buscaDocN = buscaDoc.trim().toLowerCase();
  const docsFiltrados = buscaDocN
    ? docs.filter(d => [d.nome, d.descricao].filter(Boolean).some(v => String(v).toLowerCase().includes(buscaDocN)))
    : docs;
  const { paged: docsPaginados, more: maisDocs } = usePagedList(docsFiltrados, buscaDocN);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("link");
  const [url, setUrl] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (e.target) e.target.value = "";
    if (!file) return;
    if (file.size > 10000000) { setErr("Arquivo muito grande (máx. ~10 MB). Para arquivos maiores, use um link do Drive."); return; }
    setErr("");
    try {
      const up = await db.uploadFile(file); // grava no banco nativo
      setArquivo({ nome: file.name, url: up.url, type: up.type, size: file.size });
    } catch (err) { setErr("Falha ao enviar o arquivo."); }
  };

  const adicionar = () => {
    if (!nome.trim()) { setErr("Informe o nome do documento."); return; }
    if (tipo === "link" && !url.trim()) { setErr("Cole o link do documento (ex.: link compartilhável do Drive)."); return; }
    if (tipo === "link") {
      try { new URL(url.trim()); } catch { setErr("Cole uma URL completa e válida (começando com https://)."); return; }
    }
    if (tipo === "arquivo" && !arquivo) { setErr("Selecione um arquivo para enviar."); return; }
    onAdd({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome: nome.trim(), descricao: descricao.trim(), tipo,
      url: tipo === "link" ? url.trim() : arquivo.url,
      ...(tipo === "arquivo" ? { arquivoNome: arquivo.nome, arquivoType: arquivo.type || "" } : {}),
    });
    toast(`Documento "${nome.trim()}" adicionado ao acervo.`);
    setNome(""); setDescricao(""); setUrl(""); setArquivo(null); setErr("");
  };

  // Verifica se URL é abrível com segurança
  const urlStatus = (d) => {
    if (!d.url) return "pending";
    if (d.url.startsWith("data:")) return "ok";
    try { const p = new URL(d.url); return (p.protocol === "http:" || p.protocol === "https:") ? "ok" : "invalid"; }
    catch { return "invalid"; }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Acervo de documentos para cadastro</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>
        Documentos que o cliente pode solicitar durante o cadastro. Ao marcar um documento, ele é enviado automaticamente na solicitação. Use links do Drive (compartilháveis) sempre que possível — basta atualizar o link aqui quando o arquivo mudar no Drive.
      </p>

      <Card className="p-5 mb-4">
        <h2 className="font-bold mb-3" style={{ color: C.text }}>Adicionar documento</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do documento" value={nome} onChange={e => setNome(e.target.value)} />
          <Field label="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-4 mb-3">
          {[["link", "Link (Drive)"], ["arquivo", "Enviar arquivo"]].map(([id, l]) => (
            <button key={id} onClick={() => { setTipo(id); setErr(""); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={tipo === id ? { background: C.coral, color: "white" } : { background: C.bg, color: C.muted }}>{l}</button>
          ))}
        </div>
        {tipo === "link" ? (
          <Field label="Link do documento (URL completa, ex.: https://drive.google.com/...)" value={url} onChange={e => setUrl(e.target.value)} full />
        ) : (
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" />
            <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed p-4 text-sm" style={{ borderColor: C.line, color: C.muted }}>
              <Paperclip size={16} className="inline mr-1" style={{ color: C.coral }} /> {arquivo ? `Selecionado: ${arquivo.nome}` : "Clique para selecionar um arquivo (máx. ~2,5 MB)"}
            </button>
            <p className="text-[11px] mt-1" style={{ color: C.muted }}>Arquivos enviados ficam guardados no navegador. Para documentos grandes ou compartilhados entre dispositivos, prefira o link do Drive.</p>
          </div>
        )}
        {err && <div className="text-xs mt-3 font-semibold" style={{ color: C.coral }}>{err}</div>}
        <div className="mt-4"><Btn icon={Plus} onClick={adicionar}>Adicionar ao acervo</Btn></div>
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
              const st = urlStatus(d);
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: C.line }}>
                  <span className="rounded-lg p-2 shrink-0" style={{ background: C.coralSoft, color: C.coral }}><FileIcon size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{d.nome}</div>
                    {d.descricao && <div className="text-xs truncate" style={{ color: C.muted }}>{d.descricao}</div>}
                    <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span style={{ color: C.muted }}>{d.tipo === "arquivo" ? `Arquivo${d.arquivoNome ? ` · ${d.arquivoNome}` : ""}` : "Link"}</span>
                      {st === "ok" && (
                        <button onClick={() => abrirDoc(d, toast)}
                          className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: C.coral }}>
                          <ExternalLink size={11} /> abrir
                        </button>
                      )}
                      {st === "invalid" && (
                        <span className="font-semibold" style={{ color: C.yellow }}>
                          ⚠ link inválido — edite e cole uma URL completa (https://...)
                        </span>
                      )}
                      {st === "pending" && (
                        <span className="font-semibold" style={{ color: C.muted }}>sem link — pendente</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => onRemove(d.id)} title="Excluir" className="shrink-0 rounded-lg p-2 hover:bg-gray-50" style={{ color: C.danger }}><X size={16} /></button>
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
// Sessão do usuário logado, persistida para sobreviver a F5 / reabertura da aba.
const SESSION_KEY = "gocase_forn_session_v1";
const _restoreSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
};

export default function App() {
  const [users, setUsers] = useState(SEED_USERS);
  const [currentUser, setCurrentUser] = useState(() => _restoreSession());
  const [authView, setAuthView] = useState("login"); // login | signup
  const [portal, setPortal] = useState(() => { const u = _restoreSession(); return u && isInterno(u.role) ? "interno" : "externo"; });
  const [view, setView] = useState(() => { const u = _restoreSession(); return u && isInterno(u.role) ? "dash" : "inicio"; });
  const [selId, setSelId] = useState(null);
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [acervo, setAcervo] = useState(DEFAULT_ACERVO);
  const [dataLoaded, setDataLoaded] = useState(false);
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

  // Hidrata TUDO do banco nativo do GoDeploy (env.DB) numa única chamada — ou do
  // localStorage quando não há worker (dev/preview). Na primeira execução (base
  // vazia) semeia contas, templates e acervo padrão diretamente no banco.
  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await db.bootstrap();
      if (!alive) return;

      let us = Array.isArray(data.users) ? data.users : [];
      if (!us.length) {
        await Promise.all(SEED_USERS.map(u => db.saveUser(u)));
        us = SEED_USERS.map(stripPw);
      }
      setUsers(us);

      // Esta plataforma só trata solicitações de Cadastro (trocas/garantias ficam no Service Desk).
      if (Array.isArray(data.requests)) setRequests(data.requests.filter(r => r.tipo === "Cadastro"));
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);

      if (data.templates && typeof data.templates === "object") {
        setTemplates({ ...DEFAULT_TEMPLATES, ...data.templates });
      } else {
        db.saveTemplates(DEFAULT_TEMPLATES);
      }

      if (Array.isArray(data.acervo) && data.acervo.length) {
        setAcervo(data.acervo);
      } else {
        await Promise.all(DEFAULT_ACERVO.map(d => db.saveAcervoDoc(d)));
        setAcervo(DEFAULT_ACERVO);
      }

      setDataLoaded(true);

      // Valida a sessão restaurada do localStorage contra a base atual de
      // usuários: se a conta foi desativada ou removida, desloga; se os
      // dados mudaram (ex: troca de role), atualiza a sessão.
      setCurrentUser(cu => {
        if (!cu) return cu;
        const fresh = us.find(x => x.email === cu.email);
        if (!fresh || (fresh.status && fresh.status !== "Ativo")) {
          try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
          return null;
        }
        if (JSON.stringify(fresh) !== JSON.stringify(cu)) {
          try { localStorage.setItem(SESSION_KEY, JSON.stringify(fresh)); } catch (e) { }
          return fresh;
        }
        return cu;
      });
    })();
    return () => { alive = false; };
  }, []);

  // Persistência por entidade — cada registro é salvo individualmente no env.DB.
  const saveTemplates = (next) => { setTemplates(next); db.saveTemplates(next); };
  const addAcervoDoc = (doc) => { setAcervo(a => [...a, doc]); db.saveAcervoDoc(doc); };
  const removeAcervoDoc = (id) => { setAcervo(a => a.filter(d => d.id !== id)); db.removeAcervoDoc(id); };

  const addUser = (u) => { setUsers(list => [...list.filter(x => x.email !== u.email), stripPw(u)]); db.saveUser(u); };
  const updateUser = (email, changes) => {
    setUsers(list => list.map(x => x.email === email ? { ...x, ...stripPw(changes) } : x));
    db.updateUser(email, changes);
  };
  const removeUser = (email) => { setUsers(list => list.filter(x => x.email !== email)); db.removeUser(email); };

  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2600); };
  const nav = (v, id = null) => { setView(v); if (id) setSelId(id); setNotifOpen(false); };
  const selected = requests.find(r => r.id === selId);

  const onLogin = (u) => {
    setCurrentUser(u);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) { }
    const p = isInterno(u.role) ? "interno" : "externo";
    setPortal(p); setView(p === "externo" ? "inicio" : "dash");
  };
  const onRegister = async (newUser) => {
    const res = await db.signup(newUser);
    if (!res.ok) return res; // Signup mostra o erro na tela
    setUsers(list => [...list.filter(x => x.email !== res.user.email), res.user]);
    onLogin(res.user);
    toast("Conta criada! Bem-vindo(a) ao portal do fornecedor.");
    return res;
  };
  const logout = () => { setCurrentUser(null); setAuthView("login"); setView("inicio"); try { localStorage.removeItem(SESSION_KEY); } catch (e) { } };
  // Troca de portal só liberada para a equipe interna (admin/gestor/colaborador)
  const switchPortal = (p) => {
    if (p === "interno" && !isInterno(currentUser?.role)) { toast("Acesso ao portal interno restrito à equipe gocase."); return; }
    setPortal(p); setView(p === "externo" ? "inicio" : "dash");
  };

  const pushNotif = (n) => {
    const notif = { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), read: false, ...n };
    setNotifications(list => [notif, ...list]);
    db.saveNotification(notif);
  };

  const confirmModal = (status, obs) => {
    const req = requests.find(r => r.id === selId);
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
        ...(isFinal ? { finalizadoTs: now } : {}),
        resp: portal === "interno" && req.resp === "—" ? (currentUser?.name || "Equipe gocase") : req.resp,
        movimentos: [...(req.movimentos || []), mover],
      };
      setRequests(rs => rs.map(r => r.id === selId ? updated : r));
      db.saveRequest(updated);
    }

    setModal(null);
    toast(`Solicitação atualizada para "${STATUS[status]?.label || status}".`);

    if (req) {
      const cor = STATUS[status]?.color || C.muted;
      // Mensagem ao cliente: para setorial, texto específico
      const msgCliente = isSetorial
        ? `Sua solicitação ${req.id} foi encaminhada ao ${SETOR_LABEL[status]} para análise. Em breve você receberá um retorno.`
        : `Sua solicitação ${req.id} foi atualizada para "${STATUS[status]?.label || status}".`;
      pushNotif({ message: msgCliente, requestId: req.id, color: cor, audience: "externo", forUser: req.parceiro, forUserEmail: req.ownerEmail });
      const corpo = renderTemplate(templates[status], { id: req.id, cliente: req.parceiro, status: STATUS[status]?.label || status }) || msgCliente;
      notifyEmail({ to: req.email, clientName: req.parceiro, requestId: req.id, status: STATUS[status]?.label || status, message: corpo });
      // Notificação interna
      const msgInterna = isSetorial
        ? `${req.id} submetida ao ${SETOR_LABEL[status]} por ${currentUser?.name || "Equipe gocase"}.`
        : `${req.id} atualizada para "${STATUS[status]?.label}" por ${currentUser?.name || "Equipe gocase"}.`;
      pushNotif({ message: msgInterna, requestId: req.id, color: cor, audience: "interno" });
    }
  };

  const fmtBR = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const createRequest = (payload) => {
    const prefix = "CAD";
    const nums = requests.filter(r => r.id.startsWith(prefix)).map(r => parseInt(r.id.split("-")[2], 10)).filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const today = new Date();
    const prazoDate = new Date(today); prazoDate.setDate(prazoDate.getDate() + 7);
    const req = {
      id: `${prefix}-${today.getFullYear()}-${String(next).padStart(6, "0")}`,
      abertura: fmtBR(today), aberturaTs: today.getTime(), prazo: fmtBR(prazoDate), sla: "DENTRO", ownerEmail: currentUser?.email || payload.email || "", ...payload,
    };
    setRequests(rs => [req, ...rs]);
    db.saveRequest(req);
    // Notifica a equipe interna sobre o novo envio
    pushNotif({ message: `Nova solicitação de cadastro recebida (${req.id}) de ${req.parceiro}.`, requestId: req.id, color: C.cyan, audience: "interno" });
    // Notifica o fornecedor sobre o status inicial
    const msgCliente = `Sua solicitação ${req.id} foi recebida e está ${STATUS[req.status].label.toLowerCase()}.`;
    pushNotif({ message: msgCliente, requestId: req.id, color: STATUS[req.status].color, audience: "externo", forUser: req.parceiro, forUserEmail: req.ownerEmail });
    // Aviso de documentos enviados automaticamente pelo sistema (cadastro)
    if (Array.isArray(req.docsEnviados) && req.docsEnviados.length) {
      pushNotif({ message: `Documentos enviados na sua solicitação ${req.id}: ${req.docsEnviados.map(d => d.nome).join(", ")}.`, requestId: req.id, color: C.green, audience: "externo", forUser: req.parceiro, forUserEmail: req.ownerEmail });
    }
    // E-mail automático ao cliente (modelo do status, se houver) — efetivo quando o backend estiver configurado
    const corpo = renderTemplate(templates[req.status], { id: req.id, cliente: req.parceiro, status: STATUS[req.status].label }) || msgCliente;
    notifyEmail({ to: req.email, clientName: req.parceiro, requestId: req.id, status: STATUS[req.status].label, message: corpo });
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

  if (!currentUser) return (
    <><Fonts />
      {authView === "login"
        ? <Login users={users} onLogin={onLogin} goSignup={() => setAuthView("signup")} />
        : <Signup users={users} onRegister={onRegister} goLogin={() => setAuthView("login")} />}
    </>
  );

  let screen;
  const sendChatMsg = (reqId, msg) => {
    const req = requests.find(r => r.id === reqId);
    if (req) {
      const updated = { ...req, chat: [...(req.chat || []), msg], ultimaAtualiz: new Date().toLocaleString("pt-BR"), ultimaAtualizTs: msg.ts };
      setRequests(rs => rs.map(r => r.id === reqId ? updated : r));
      db.saveRequest(updated);
      const isFromInternal = isInterno(currentUser?.role);
      pushNotif({ message: `Nova mensagem no chamado ${reqId}: "${(msg.texto || "").slice(0, 60)}…"`, requestId: reqId, color: C.cyan, audience: isFromInternal ? "externo" : "interno", forUser: req.parceiro });
    }
  };
  const reopenRequest = (reqId, triggerMsg) => {
    const req = requests.find(r => r.id === reqId);
    if (req) {
      const updated = { ...req, status: "EM_ANALISE", ultimaAtualiz: new Date().toLocaleString("pt-BR"), ultimaAtualizTs: triggerMsg.ts, movimentos: [...(req.movimentos || []), { status: "EM_ANALISE", actor: "cliente", who: req.parceiro, ts: triggerMsg.ts, text: `Chamado reaberto automaticamente por nova mensagem do cliente.` }] };
      setRequests(rs => rs.map(r => r.id === reqId ? updated : r));
      db.saveRequest(updated);
      pushNotif({ message: `Chamado ${reqId} REABERTO automaticamente por nova mensagem do cliente.`, requestId: reqId, color: C.yellow, audience: "interno" });
      pushNotif({ message: `Seu chamado ${reqId} foi reaberto. Retornaremos em breve.`, requestId: reqId, color: C.cyan, audience: "externo", forUser: req.parceiro });
    }
    toast(`Chamado ${reqId} reaberto automaticamente.`);
  };

  if (view === "detalhe") screen = <Detalhe r={selected} back={() => nav(portal === "externo" ? "minhas" : "lista-cad")} interno={portal === "interno"} openModal={setModal} currentUser={currentUser} onSendMsg={sendChatMsg} onReopenRequest={reopenRequest} />;
  else if (view === "cliente" && portal === "interno") screen = <ClienteDetalhe nome={selId} requests={requests} users={users} nav={nav} />;
  else if (portal === "externo") {
    screen = { inicio: <ExtInicio nav={nav} requests={requests} user={currentUser} />, "nova-cad": <ExtNovaCad nav={nav} toast={toast} onCreate={createRequest} acervo={acervo} />, minhas: <ExtMinhas nav={nav} requests={requests} user={currentUser} />, perfil: <Perfil toast={toast} user={currentUser} /> }[view];
  } else {
    screen = { dash: <IntDash nav={nav} requests={requests} />, "lista-cad": <IntLista nav={nav} requests={requests} tipo="Cadastro" titulo="Solicitações de Cadastro" />, clientes: <Clientes requests={requests} users={users} nav={nav} />, acervo: (["ADMIN", "GESTOR"].includes(currentUser?.role) ? <AcervoDocs acervo={acervo} onAdd={addAcervoDoc} onRemove={removeAcervoDoc} toast={toast} /> : <IntDash nav={nav} requests={requests} />), usuarios: <Usuarios toast={toast} users={users} currentUser={currentUser} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={removeUser} />, relatorios: <Relatorios toast={toast} requests={requests} />, config: <Config toast={toast} templates={templates} onSaveTemplates={saveTemplates} /> }[view];
  }

  const visibleNotifs = notifications.filter(n =>
    portal === "interno" ? n.audience === "interno"
      : (n.audience === "externo" && (n.forUserEmail ? n.forUserEmail === currentUser?.email : (!n.forUser || n.forUser === currentUser?.name)))
  );
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
      <Shell portal={portal} switchPortal={switchPortal} view={view} nav={nav} onLogout={logout} notifOpen={notifOpen} setNotifOpen={setNotifOpen} user={currentUser} notifs={visibleNotifs} badge={badge} onOpenNotifs={openNotifs} themePref={themePref} onCycleTheme={cycleTheme} requests={requests}>
        {screen}
      </Shell>
      {modal && <Modal kind={modal} onConfirm={confirmModal} onClose={() => setModal(null)} />}
      <DocViewer />
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg flex items-center gap-2" style={{ background: C.ink }}>
          <CheckCircle2 size={16} style={{ color: C.green }} /> {toastMsg}
        </div>
      )}
    </>
  );
}
