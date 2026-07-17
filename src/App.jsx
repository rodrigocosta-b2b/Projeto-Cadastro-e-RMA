import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Plus, FileText, Building2, BookOpen, User as UserIcon,
  Search, Bell, LogOut, ChevronRight, ChevronDown, Clock, RefreshCw,
  CheckCircle2, XCircle, AlertTriangle, Paperclip, LayoutDashboard,
  Users, BarChart3, Settings, Filter, Image as ImageIcon, Sparkles,
  Send, ArrowLeft, ShieldCheck, FileCheck, Download, Phone, Mail,
  MapPin, Smartphone, MessageSquare, TrendingUp, Package, Check,
  Loader2, X, Film, FileText as FileIcon, ExternalLink, Maximize2, Minimize2, Save,
  Sun, Moon, Monitor, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, LineChart, Line,
} from "recharts";

/* ===================== Brand tokens — gocase ===================== */
// Paletas de tema. Cores de marca (coral, yellow, cyan, violet, green) não mudam;
// só os neutros (fundo, superfície, texto, linhas) trocam entre claro e escuro.
const LIGHT = {
  coral: "#F8475E", coralDark: "#E23652", coralSoft: "#FEEAED",
  yellow: "#FFC247", ink: "#1E1E2A", bg: "#F7F7FA", line: "#ECECF1",
  text: "#22222E", muted: "#8A8A99", cyan: "#00B8D9", violet: "#6C5CE7",
  green: "#1FBF75",
};
const DARK = {
  coral: "#F8475E", coralDark: "#E23652", coralSoft: "#3A2128",
  yellow: "#FFC247", ink: "#0F0F16", bg: "#14141B", line: "#2C2C3A",
  text: "#ECECF1", muted: "#9A9AA8", cyan: "#00B8D9", violet: "#8E7DF5",
  green: "#27C77F",
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
  const _pref = (typeof localStorage !== "undefined" && localStorage.getItem("gocase_theme")) || "auto";
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
  NEGADA:        { label: "Negada",                      color: C.coral  },
  CONCLUIDA:     { label: "Concluída",                   color: "#8A8A99"},
};
const SLA = {
  DENTRO: { label: "Dentro do SLA", color: C.green },
  PROXIMO: { label: "Próximo do venc.", color: C.yellow },
  VENCIDO: { label: "Fora do SLA", color: C.coral },
};
// Selos de status do Histórico (planilha do pós-venda). Inclui os status da
// plataforma + dois selos próprios do arquivo: Descontinuado e Informação não localizada.
const HSTATUS = {
  ...STATUS,
  DESCONTINUADO: { label: "Descontinuado", color: "#B26A00" },
  SEM_INFO: { label: "Informação não localizada", color: "#8A8A99" },
};

/* ===================== Mock data ===================== */
const SEED = [
  { id: "TG-2026-000123", tipo: "Troca/Garantia", parceiro: "Mundo dos Acessórios", uf: "SP", status: "EM_ANALISE", sla: "DENTRO", resp: "Marina Alves", abertura: "12/06/2026", prazo: "19/06/2026", cnpj: "12.345.678/0001-90", produto: "Capa Anti-Impacto Pro", modelo: "iPhone 15 Pro", nf: "045231", venda: "10/04/2026", problema: "Capa anti-impacto com trinca na quina após 1 mês de uso normal." },
  { id: "TG-2026-000122", tipo: "Troca/Garantia", parceiro: "TechCell Store", uf: "RS", status: "AGUARDANDO", sla: "PROXIMO", resp: "Carlos Nunes", abertura: "10/06/2026", prazo: "17/06/2026", cnpj: "98.765.432/0001-10", produto: "Película de Vidro 3D", modelo: "Galaxy S24", nf: "081002", venda: "20/05/2026", problema: "Película descolando nas bordas poucos dias após a aplicação." },
  { id: "TG-2026-000121", tipo: "Troca/Garantia", parceiro: "Capas & Cia", uf: "MG", status: "NEGADA", sla: "DENTRO", resp: "IA", abertura: "09/06/2026", prazo: "16/06/2026", cnpj: "11.222.333/0001-44", produto: "Carregador Turbo 30W", modelo: "Universal", nf: "077510", venda: "01/11/2025", problema: "Carregador parou de funcionar." },
  { id: "TG-2026-000120", tipo: "Troca/Garantia", parceiro: "Smart Acessórios", uf: "PA", status: "APROVADA", sla: "DENTRO", resp: "Marina Alves", abertura: "06/06/2026", prazo: "13/06/2026", cnpj: "44.555.666/0001-77", produto: "Fone Bluetooth GoBuds", modelo: "GoBuds 2", nf: "060912", venda: "15/05/2026", problema: "Lado direito do fone sem áudio. Defeito de fabricação confirmado." },
  { id: "CAD-2026-000045", tipo: "Cadastro", parceiro: "Loja do Celular Express", uf: "PR", status: "NOVA", sla: "VENCIDO", resp: "—", abertura: "07/06/2026", prazo: "14/06/2026", cnpj: "22.333.444/0001-55", produto: "—", modelo: "—", nf: "—", venda: "—", problema: "Solicitação de cadastro de novo revendedor." },
  { id: "TG-2026-000119", tipo: "Troca/Garantia", parceiro: "Mundo dos Acessórios", uf: "SP", status: "CONCLUIDA", sla: "DENTRO", resp: "Carlos Nunes", abertura: "02/06/2026", prazo: "09/06/2026", cnpj: "12.345.678/0001-90", produto: "Carregador por Indução", modelo: "Universal", nf: "058221", venda: "28/05/2026", problema: "Carregador por indução parou de carregar." },
];

const CLIENTES = [
  { nome: "Mundo dos Acessórios", cnpj: "12.345.678/0001-90", uf: "SP", cidade: "São Paulo", contato: "Ana Prado", solicitacoes: 8 },
  { nome: "TechCell Store", cnpj: "98.765.432/0001-10", uf: "RS", cidade: "Porto Alegre", contato: "Bruno Lima", solicitacoes: 5 },
  { nome: "Capas & Cia", cnpj: "11.222.333/0001-44", uf: "MG", cidade: "Belo Horizonte", contato: "Carla Dias", solicitacoes: 3 },
  { nome: "Smart Acessórios", cnpj: "44.555.666/0001-77", uf: "PA", cidade: "Belém", contato: "Diego Sá", solicitacoes: 6 },
  { nome: "Loja do Celular Express", cnpj: "22.333.444/0001-55", uf: "PR", cidade: "Curitiba", contato: "Eva Rocha", solicitacoes: 1 },
];

const USUARIOS = [
  { nome: "Patrícia Gomes", email: "patricia@gocase.com.br", perfil: "Gestor", status: "Ativo" },
  { nome: "Marina Alves", email: "marina@gocase.com.br", perfil: "Colaborador", status: "Ativo" },
  { nome: "Carlos Nunes", email: "carlos@gocase.com.br", perfil: "Colaborador", status: "Ativo" },
  { nome: "Rafael Souza", email: "rafael@gocase.com.br", perfil: "Administrador", status: "Ativo" },
  { nome: "Júlia Martins", email: "julia@gocase.com.br", perfil: "Colaborador", status: "Inativo" },
];

// Notificações iniciais (semente). Eventos reais são adicionados em tempo de execução.
const H = 3600000;
const INITIAL_NOTIFS = [
  { id: "seed-1", message: "Solicitação TG-2026-000123 está em análise.", requestId: "TG-2026-000123", color: C.violet, ts: Date.now() - 2 * H, audience: "externo", forUser: "Mundo dos Acessórios", read: false },
  { id: "seed-2", message: "Solicitação TG-2026-000119 foi concluída.", requestId: "TG-2026-000119", color: "#8A8A99", ts: Date.now() - 26 * H, audience: "externo", forUser: "Mundo dos Acessórios", read: false },
  { id: "seed-3", message: "Nova solicitação de cadastro recebida (CAD-2026-000045).", requestId: "CAD-2026-000045", color: C.cyan, ts: Date.now() - 5 * H, audience: "interno", read: false },
  { id: "seed-4", message: "SLA próximo do vencimento em TG-2026-000122.", requestId: "TG-2026-000122", color: C.yellow, ts: Date.now() - 5 * H, audience: "interno", read: false },
];
function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24); return `há ${d} d`;
}

const POR_MES = [{ m: "Jan", v: 42 }, { m: "Fev", v: 51 }, { m: "Mar", v: 48 }, { m: "Abr", v: 63 }, { m: "Mai", v: 70 }, { m: "Jun", v: 58 }];
const MOTIVOS = [
  { name: "Fora do prazo", value: 38, color: C.coral },
  { name: "Sem defeito", value: 22, color: C.yellow },
  { name: "Mau uso", value: 19, color: C.violet },
  { name: "Doc. incompleta", value: 12, color: C.cyan },
];
const APROV_MES = [{ m: "Mar", ap: 30, ng: 18 }, { m: "Abr", ap: 41, ng: 22 }, { m: "Mai", ap: 48, ng: 22 }, { m: "Jun", ap: 39, ng: 19 }];

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
      <input type={type} value={value} onChange={onChange} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }} />
    )}
  </div>
);

/* Upload real de arquivos — converte para base64 (data: URL) para persistência
   entre sessões. blob: URLs somem ao fechar a página; data: URLs sobrevivem
   no storage (localStorage / window.storage). Limite recomendado: ~3 MB por arquivo. */
function FileUpload({ accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime,application/pdf", initial = [], onFiles }) {
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
              Clique ou arraste para adicionar — imagens (JPG, PNG, WEBP), vídeos (MP4, MOV) e PDF</>
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
const DB_KEY = "gocase_users_v1";
const SEED_USERS = [
  { email: "beatriz.nogueira@gocase.com", password: "123456QAZ", name: "Beatriz Nogueira", role: "ADMIN", status: "Ativo" },
  { email: "rodrigo.costa@gocase.com", password: "123456QAZ", name: "Rodrigo Costa", role: "ADMIN", status: "Ativo" },
  { email: "larissa.simoes@gocase.com", password: "123456QAZ", name: "Larissa Simões", role: "ADMIN", status: "Ativo" },
  { email: "contato@mundoacessorios.com.br", password: "123456QAZ", name: "Mundo dos Acessórios", role: "CLIENTE", status: "Ativo", cnpj: "12.345.678/0001-90", telefone: "(11) 4002-8922" },
];
const isInterno = (role) => ["ADMIN", "GESTOR", "COLABORADOR"].includes(role);

// Armazenamento genérico (window.storage no Claude, localStorage no site publicado)
const REQ_KEY = "gocase_requests_v1";
const NOTIF_KEY = "gocase_notifs_v1";
const TPL_KEY = "gocase_templates_v1";
const ACERVO_KEY = "gocase_acervo_v1";
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
  NEGADA: "Olá {cliente}, após análise, sua solicitação {id} foi NEGADA. Se tiver dúvidas sobre o motivo, responda este contato que nosso pós-venda irá ajudar.",
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
          <div className="text-2xl font-bold leading-snug">Service Desk</div>
          <p className="mt-3 text-sm opacity-90 leading-relaxed">Cadastros, trocas e garantias dos revendedores gocase em um só lugar.</p>
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
      <p className="text-sm mb-6" style={{ color: C.muted }}>Acesse com seu e-mail de revendedor ou corporativo.</p>
      <label className="text-xs font-semibold" style={{ color: C.muted }}>E-mail</label>
      <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="seu@email.com"
        className="mt-1 mb-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} />
      <label className="text-xs font-semibold" style={{ color: C.muted }}>Senha</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••"
        className="mt-1 mb-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={{ borderColor: C.line }} />
      {err && <div className="text-xs mb-2 font-semibold" style={{ color: C.coral }}>{err}</div>}
      <a className="text-xs font-semibold self-end mb-5 cursor-pointer" style={{ color: C.coral }}>Esqueci minha senha</a>
      <button onClick={submit} className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: C.coral }}>Entrar</button>
      <div className="text-center text-sm mt-5" style={{ color: C.muted }}>
        É revendedor ou empresa parceira e ainda não tem conta?{" "}
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
      <h1 className="text-xl font-bold" style={{ color: C.text }}>Criar conta de revendedor ou empresa parceira</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>Informe o CNPJ para localizar os dados e defina sua senha de acesso.</p>
      <label className="text-xs font-semibold" style={{ color: C.muted }}>CNPJ</label>
      <div className="flex gap-2 mt-1 mb-3">
        <input value={f.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" className="flex-1 rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: C.line }} />
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
    { id: "nova-tg", label: "Nova Troca/Garantia", icon: Plus },
    { id: "nova-cad", label: "Solicitação de Cadastro", icon: Building2 },
    { id: "minhas", label: "Minhas Solicitações", icon: FileText },
    { id: "manual", label: "Manuais e Normas", icon: BookOpen },
    { id: "perfil", label: "Perfil", icon: UserIcon },
  ],
  interno: [
    { id: "dash", label: "Dashboard", icon: LayoutDashboard },
    { id: "lista-tg", label: "Trocas e Garantias", icon: RefreshCw },
    { id: "lista-cad", label: "Cadastros", icon: FileCheck },
    { id: "clientes", label: "Clientes", icon: Building2 },
    { id: "acervo", label: "Acervo de documentos", icon: BookOpen, roles: ["ADMIN", "GESTOR"] },
    { id: "historico", label: "Histórico (pós-venda)", icon: Clock },
    { id: "usuarios", label: "Usuários", icon: Users },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "config", label: "Configurações", icon: Settings },
  ],
};

/* ===================== Shell ===================== */
function Shell({ portal, switchPortal, view, nav, onLogout, notifOpen, setNotifOpen, user, notifs, badge, onOpenNotifs, themePref, onCycleTheme, children }) {
  const initials = (user?.name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const staff = ["ADMIN", "GESTOR", "COLABORADOR"].includes(user?.role);
  const [fs, setFs] = useState(false);
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
        <div onClick={() => nav(portal === "externo" ? "inicio" : "dash")} className="flex items-center gap-2 w-60 cursor-pointer">
          <span className="text-xl font-extrabold lowercase tracking-tight">gocase</span>
          <span className="text-xs opacity-80">Service Desk</span>
        </div>
        <div className="flex-1 max-w-xl relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70" />
          <input placeholder="Busca global — nº da solicitação, CNPJ, revendedor…"
            className="w-full rounded-xl py-2 pl-9 pr-3 text-sm text-white placeholder-white/60 outline-none" style={{ background: "rgba(255,255,255,.16)" }} />
        </div>
        {staff && (
          <button onClick={() => switchPortal(portal === "externo" ? "interno" : "externo")}
            className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: "white", color: C.coral }}>
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
            {badge > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "white", color: C.coral }}>{badge}</span>}
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
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "white", color: C.coral }}>{initials}</div>
          <button onClick={onLogout} className="opacity-90 hover:opacity-100"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex">
        <aside className="w-60 shrink-0 bg-white border-r min-h-[calc(100vh-4rem)] p-3 sticky top-16 self-start" style={{ borderColor: C.line }}>
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.muted }}>
            {portal === "externo" ? "Portal do Revendedor" : "Portal Interno"}
          </div>
          {MENU[portal].filter(it => !it.roles || it.roles.includes(user?.role)).map(it => {
            const active = view === it.id;
            return (
              <button key={it.id} onClick={() => nav(it.id)}
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
  if (r.tipo === "Troca/Garantia") {
    if (r.status === "NEGADA" && r.resp === "IA")
      ev.push({ status: "NEGADA", actor: "ia", who: "Análise por IA", ts: aberturaTs, when: fmtTs(aberturaTs), text: `Venda em ${r.venda} e abertura em ${r.abertura}: intervalo superior a 6 meses. RMA negado automaticamente pela IA.` });
    else
      ev.push({ status: "EM_ANALISE", actor: "ia", who: "Análise por IA", ts: aberturaTs, when: fmtTs(aberturaTs), text: `Venda em ${r.venda} e abertura em ${r.abertura}: dentro do prazo de garantia. RMA válido, encaminhado ao pós-venda.` });
  }
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
    if (r.status === "CONCLUIDA") { const ts = r.concluidoTs || r.finalizadoTs || (aberturaTs + 5 * 3600000); ev.push({ status: "CONCLUIDA", actor: "user", who: r.resp, ts, when: fmtTs(ts), text: "Processo concluído e revendedor comunicado." }); }
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
          const isMine = isInternal ? msg.role === "equipe" : msg.role === "cliente";
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <div className="text-[10px] mb-1" style={{ color: C.muted, textAlign: isMine ? "right" : "left" }}>{msg.autor} · {fmtMsgTime(msg.ts)}</div>
                <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: isMine ? C.coral : C.bg, color: isMine ? "white" : C.text, borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
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
          <textarea value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={handleKey} placeholder={isClosed && !isInternal ? "Envie uma mensagem para reabrir o chamado…" : "Escreva uma mensagem… (Enter para enviar)"} rows={2} className="flex-1 rounded-xl border px-3 py-2 text-sm resize-none" style={{ borderColor: C.line }} />
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
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Dados do revendedor</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Revendedor", r.parceiro], ["CNPJ", r.cnpj], ["UF", r.uf], ["Origem", "Reseller"]].map(([k, v]) =>
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>)}
            </div>
          </Card>
          {r.tipo === "Troca/Garantia" && (
            <Card className="p-5">
              <h2 className="font-bold mb-3" style={{ color: C.text }}>Dados da venda e produto</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Produto", r.produto], ["Modelo do aparelho", r.modelo], ["Nota fiscal", r.nf], ["Data da venda", r.venda]].map(([k, v]) =>
                  <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>)}
              </div>
              <div className="mt-3"><div className="text-xs" style={{ color: C.muted }}>Problema relatado</div><p className="text-sm" style={{ color: C.text }}>{r.problema}</p></div>
            </Card>
          )}
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
                <Btn icon={XCircle}     color={C.coral}   onClick={() => openModal("negar")}>Negar</Btn>
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
  const nome = user?.name || "revendedor";
  const mine = requests.filter(r => r.ownerEmail ? r.ownerEmail === user?.email : r.parceiro === nome);
  const count = (s) => mine.filter(r => r.status === s).length;
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Olá, {nome} 👋</h1>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Acompanhe suas solicitações de troca, garantia e cadastro de produtos gocase.</p>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Clock} label="Em aberto" value={mine.filter(r => ["NOVA", "EM_ANALISE", "AGUARDANDO"].includes(r.status)).length} color={C.yellow} onClick={() => nav("minhas")} />
        <StatCard icon={RefreshCw} label="Em análise" value={count("EM_ANALISE")} color={C.violet} onClick={() => nav("minhas")} />
        <StatCard icon={CheckCircle2} label="Concluídas" value={count("CONCLUIDA")} color={C.green} onClick={() => nav("minhas")} />
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: C.text }}>Solicitações recentes</h2>
          <Btn icon={Plus} onClick={() => nav("nova-tg")}>Nova solicitação</Btn>
        </div>
        <div className="divide-y" style={{ borderColor: C.line }}>
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

function ExtNovaTG({ nav, toast, onCreate, user }) {
  const [venda, setVenda] = useState("2026-04-12");
  const [anexos, setAnexos] = useState([]);
  const [r, setR] = useState({
    razaoSocial: user?.name || "", nomeFantasia: user?.name || "",
    cnpj: user?.cnpj || "", email: user?.email || "",
    telefone: user?.telefone || "", endereco: "",
  });
  const [v, setV] = useState({ produto: "Capa Anti-Impacto Pro", modelo: "iPhone 15 Pro", nf: "045231", problema: "Capa anti-impacto com trinca na quina após 1 mês de uso normal." });
  const setR_ = (k) => (e) => setR(s => ({ ...s, [k]: e.target.value }));
  const setV_ = (k) => (e) => setV(s => ({ ...s, [k]: e.target.value }));
  const localizarReseller = () => {
    setR({ razaoSocial: user?.name || "", nomeFantasia: user?.name || "", cnpj: user?.cnpj || "", email: user?.email || "", telefone: user?.telefone || "", endereco: r.endereco });
    toast("Dados do revendedor atualizados pelo Reseller. Você pode ajustá-los.");
  };
  // IA: compara a DATA DE VENDA AO CLIENTE FINAL com a DATA DE ABERTURA (hoje) — válido se ≤ 6 meses
  const ok = useMemo(() => {
    if (!venda) return false;
    const limite = new Date(venda); limite.setMonth(limite.getMonth() + 6);
    return new Date() <= limite;
  }, [venda]);
  const enviar = () => {
    if (!venda) { toast("Informe a data de venda ao cliente final."); return; }
    onCreate({
      tipo: "Troca/Garantia",
      status: ok ? "EM_ANALISE" : "NEGADA",
      resp: ok ? "—" : "IA",
      parceiro: r.nomeFantasia || r.razaoSocial,
      cnpj: r.cnpj, uf: (r.endereco.match(/\b([A-Z]{2})\b/) || [])[1] || "SP",
      email: r.email,
      produto: v.produto, modelo: v.modelo, nf: v.nf,
      venda: venda.split("-").reverse().join("/"),
      problema: v.problema,
      anexos,
    });
    toast(ok ? "RMA enviado! A IA validou (dentro de 6 meses) — em análise." : "RMA enviado e negado pela IA (fora do prazo de 6 meses).");
    nav("minhas");
  };
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>Nova solicitação de troca e garantia</h1>
      <p className="text-sm mb-6" style={{ color: C.muted }}>Os dados do revendedor vêm do Reseller e podem ser ajustados antes do envio.</p>
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.coral }}><ShieldCheck size={16} /> Dados do revendedor (Reseller)</div>
          <Btn icon={RefreshCw} variant="outline" onClick={localizarReseller}>Atualizar do Reseller</Btn>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Razão social" value={r.razaoSocial} onChange={setR_("razaoSocial")} />
          <Field label="Nome fantasia" value={r.nomeFantasia} onChange={setR_("nomeFantasia")} />
          <Field label="CNPJ" value={r.cnpj} onChange={setR_("cnpj")} />
          <Field label="E-mail" value={r.email} onChange={setR_("email")} />
          <Field label="Telefone" value={r.telefone} onChange={setR_("telefone")} />
          <Field label="Endereço de entrega" value={r.endereco} onChange={setR_("endereco")} full />
        </div>
      </Card>
      <Card className="p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Produto gocase" value={v.produto} onChange={setV_("produto")} options={["Capa Anti-Impacto Pro", "Película de Vidro 3D", "Carregador Turbo 30W", "Fone Bluetooth GoBuds", "Carregador por Indução"]} />
          <Field label="Modelo do aparelho" value={v.modelo} onChange={setV_("modelo")} />
          <div><label className="text-xs font-semibold" style={{ color: C.muted }}>Data de venda ao cliente final</label>
            <input type="date" value={venda} onChange={e => setVenda(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }} /></div>
          <Field label="Número da nota fiscal" value={v.nf} onChange={setV_("nf")} />
        </div>
        <label className="text-xs font-semibold mt-4 block" style={{ color: C.muted }}>Descrição do problema</label>
        <textarea rows={3} value={v.problema} onChange={setV_("problema")} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }} />
        <label className="text-xs font-semibold mt-4 block" style={{ color: C.muted }}>Anexos (foto do produto, NF, vídeo, PDF)</label>
        <div className="mt-1"><FileUpload onFiles={setAnexos} /></div>
      </Card>
      <Card className="p-5 mb-4" style={{ borderColor: (ok ? C.green : C.coral) + "40", background: (ok ? C.green : C.coral) + "0d" }}>
        <div className="flex items-start gap-3"><Sparkles size={18} style={{ color: ok ? C.green : C.coral }} className="mt-0.5" />
          <div className="text-sm"><div className="font-semibold" style={{ color: C.text }}>Pré-análise automática (IA)</div>
            <p style={{ color: C.muted }}>A IA compara a data de venda ao cliente final com a data de abertura da solicitação (hoje). {ok ? "Está dentro do prazo de garantia de 6 meses — o RMA será considerado válido e entra em análise pelo pós-venda." : "Passaram-se mais de 6 meses desde a venda ao cliente final — o RMA será negado automaticamente ao ser enviado."}</p></div></div>
      </Card>
      <Btn icon={Send} onClick={enviar}>Enviar solicitação</Btn>
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
              <input value={f.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" className="flex-1 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }} />
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
                      style={{ borderColor: on ? C.coral : C.line, background: on ? C.coralSoft : "white" }}>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: on ? C.coral : "white", border: `1.5px solid ${on ? C.coral : "#cfd3da"}` }}>
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
                className="w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
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
        <Btn icon={Plus} onClick={() => nav("nova-tg")}>Nova solicitação</Btn>
      </div>
      <Card><DataTable rows={mine} cols={["Número", "Tipo", "Produto", "Abertura", "Status", ""]} render={r => (
        <>
          <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
          <td className="px-4 py-3" style={{ color: C.text }}>{r.tipo}</td>
          <td className="px-4 py-3" style={{ color: C.text }}>{r.produto}</td>
          <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
          <td className="px-4 py-3"><Pill {...STATUS[r.status]} /></td>
          <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
        </>
      )} onRow={r => nav("detalhe", r.id)} /></Card>
    </div>
  );
}

const NORMAS_URL = "https://gocase.goconnect360.com.br/hc/gocase/pt_BR/categories/troca-e-devolues";

function NormasTrocas({ back }) {
  const Sec = ({ icon: Icon, color, title, children }) => (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-lg p-2" style={{ background: color + "1a", color }}><Icon size={16} /></span>
        <h2 className="font-bold" style={{ color: C.text }}>{title}</h2>
      </div>
      <div className="text-sm space-y-1.5" style={{ color: C.muted }}>{children}</div>
    </Card>
  );
  const Li = ({ children }) => (
    <div className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" style={{ color: C.green }} />{children}</div>
  );
  return (
    <div className="max-w-3xl">
      <button onClick={back} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.muted }}><ArrowLeft size={15} /> Voltar</button>
      <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>Normas de Trocas e Garantias</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>Regras de elegibilidade, prazos e como solicitar trocas e garantias de produtos gocase.</p>

      <Card className="p-4 mb-4 flex items-start gap-3" style={{ borderColor: C.yellow + "55", background: C.yellow + "12" }}>
        <AlertTriangle size={18} style={{ color: C.yellow }} className="mt-0.5" />
        <div className="text-sm" style={{ color: C.text }}>
          Resumo alinhado às regras do sistema e ao Código de Defesa do Consumidor. Confirme os prazos e condições específicos no texto oficial da gocase.
          <a href={NORMAS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold ml-1" style={{ color: C.coral }}>ver política oficial <ExternalLink size={13} /></a>
        </div>
      </Card>

      <div className="space-y-4">
        <Sec icon={ShieldCheck} color={C.coral} title="Garantia de produtos gocase — 6 meses">
          <Li>Os produtos gocase têm garantia de <b>6 meses</b> contra defeitos de fabricação, contados a partir da data da nota fiscal.</Li>
          <Li>Solicitações dentro desse prazo são validadas automaticamente pela análise inicial e seguem para o pós-venda; fora do prazo, são negadas automaticamente.</Li>
        </Sec>

        <Sec icon={RefreshCw} color={C.cyan} title="Direito de arrependimento (compra online)">
          <Li>Em compras feitas pela internet, o consumidor pode desistir em até <b>7 dias corridos</b> a contar do recebimento (art. 49 do CDC).</Li>
          <Li>O produto deve estar sem uso e na embalagem original, e o valor é reembolsado integralmente.</Li>
        </Sec>

        <Sec icon={FileIcon} color={C.violet} title="Garantia legal">
          <Li>Produtos duráveis têm garantia legal de <b>90 dias</b> para vícios aparentes ou ocultos, conforme o CDC.</Li>
          <Li>A garantia gocase de 6 meses complementa a garantia legal.</Li>
        </Sec>

        <Sec icon={Check} color={C.green} title="Condições para troca ou garantia">
          <Li>Apresentar o número e a data da <b>nota fiscal</b> da venda ao consumidor.</Li>
          <Li>Enviar <b>foto do produto</b> e <b>foto da nota fiscal</b>; vídeos e PDFs são opcionais.</Li>
          <Li>O produto deve ser identificável como gocase e estar dentro do prazo de garantia.</Li>
        </Sec>

        <Sec icon={Send} color={C.coral} title="Como solicitar">
          <Li>Acesse <b>Nova Troca/Garantia</b> no portal e selecione o produto e o modelo do aparelho.</Li>
          <Li>Informe a data da nota fiscal, descreva o problema e anexe os arquivos.</Li>
          <Li>A análise inicial valida o prazo; em seguida o pós-venda aprova, nega ou solicita ajustes, e você acompanha tudo pela linha do tempo da solicitação.</Li>
        </Sec>

        <Sec icon={X} color={C.muted} title="Situações geralmente não cobertas">
          <Li>Danos por mau uso, quedas, contato com líquidos ou desgaste natural.</Li>
          <Li>Produtos sem comprovação de compra (nota fiscal) ou fora do prazo de garantia.</Li>
        </Sec>
      </div>
    </div>
  );
}

function Manual() {
  const [aba, setAba] = useState(null);
  if (aba === "normas") return <NormasTrocas back={() => setAba(null)} />;
  const docs = [
    { t: "Manual de Trocas e Garantias", d: "Critérios, prazos e passo a passo para abrir uma solicitação.", icon: BookOpen, action: "pdf" },
    { t: "Normas de Trocas e Garantias", d: "Regras de elegibilidade, prazo de 6 meses e documentação exigida.", icon: FileText, action: "normas" },
    { t: "Guia de Produtos gocase", d: "Categorias, modelos compatíveis e cuidados de uso.", icon: Package, action: "pdf" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: C.text }}>Manuais e Normas</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        {docs.map(doc => (
          <Card key={doc.t} className="p-5" onClick={doc.action === "normas" ? () => setAba("normas") : undefined}>
            <div className="rounded-xl p-3 w-fit mb-3" style={{ background: C.coralSoft, color: C.coral }}><doc.icon size={22} /></div>
            <div className="font-bold mb-1" style={{ color: C.text }}>{doc.t}</div>
            <p className="text-sm mb-3" style={{ color: C.muted }}>{doc.d}</p>
            {doc.action === "normas"
              ? <button onClick={() => setAba("normas")} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: C.coral }}>Abrir normas <ChevronRight size={14} /></button>
              : <button className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: C.coral }}><Download size={14} /> Baixar PDF</button>}
          </Card>
        ))}
      </div>
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
          <div><div className="font-bold text-lg" style={{ color: C.text }}>{user?.name}</div><div className="text-sm" style={{ color: C.muted }}>Revendedor gocase{user?.cnpj ? ` · CNPJ ${user.cnpj}` : ""}</div></div>
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
const MOTIVOS_NEGATIVA = [
  { name: "Fora do prazo",    value: 38, color: C.coral  },
  { name: "Sem defeito",      value: 22, color: C.yellow },
  { name: "Mau uso",          value: 19, color: C.violet },
  { name: "Doc. incompleta",  value: 12, color: C.cyan   },
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
  const [tab,    setTab]    = useState("oper");
  const [tipo,   setTipo]   = useState("rma");
  const [period, setPeriod] = useState(180);
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);

  const reqTipo = tipo === "rma" ? "Troca/Garantia" : "Cadastro";
  const destino = tipo === "rma" ? "lista-tg" : "lista-cad";
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

  return (
    <div>
      {/* ── Cabeçalho: título + todos os controles em linha ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>Dashboard</h1>
          <p className="text-sm" style={{ color: C.muted }}>Indicadores operacionais e gerenciais em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* RMA / Cadastros */}
          <div className="flex gap-1 rounded-xl p-1 border" style={{ borderColor: C.line, background: "white" }}>
            {[["rma","RMA"],["cadastro","Cadastros"]].map(([id,l])=>(
              <button key={id} onClick={()=>setTipo(id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold transition"
                style={tipo===id ? {background:C.coral,color:"white"} : {color:C.muted}}>{l}</button>
            ))}
          </div>
          {/* Período */}
          <div className="relative">
            <button onClick={()=>setShowPeriodDrop(v=>!v)}
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor:C.line, background:"white", color:C.text }}>
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
          <div className="flex gap-1 rounded-xl p-1 border" style={{ borderColor:C.line, background:"white" }}>
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
            <StatCard icon={AlertTriangle} label="Fora do SLA"       value={foraSla}      color={C.coral}   onClick={()=>nav(destino)}/>
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
            <StatCard icon={AlertTriangle} label="Fora do SLA"          value={m.foraPrazo}   color={C.coral}  onClick={()=>nav(destino)}/>
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

function IntLista({ nav, requests, tipo, titulo }) {
  const [f, setF] = useState("Todos");
  const base = requests.filter(r => r.tipo === tipo);
  const rows = f === "Todos" ? base : base.filter(r => STATUS[r.status].label === f);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4" style={{ color: C.text }}>{titulo}</h1>
      <Card className="p-3 mb-4 flex items-center gap-2 flex-wrap">
        <Filter size={15} style={{ color: C.muted }} />
        {["Todos", ...Object.values(STATUS).map(s => s.label)].map(l => (
          <button key={l} onClick={() => setF(l)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={f === l ? { background: C.coral, color: "white" } : { background: C.bg, color: C.muted }}>{l}</button>
        ))}
      </Card>
      <Card><DataTable rows={rows} cols={["Número", "Revendedor", "UF", "Status", "SLA", "Responsável", ""]} onRow={r => nav("detalhe", r.id)} render={r => (
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
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: C.text }}>Clientes / Revendedores</h1>
      <p className="text-sm mb-4" style={{ color: C.muted }}>Clique em uma empresa para ver todas as solicitações feitas por ela.</p>
      <Card>
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: C.muted }}>Nenhuma empresa cadastrada ou com solicitações ainda.</div>
        ) : (
          <DataTable rows={list} cols={["Revendedor", "CNPJ", "UF", "Contato", "Solicitações", ""]} onRow={c => nav("cliente", c.nome)} render={c => (
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
      </Card>
    </div>
  );
}

function ClienteDetalhe({ nome, requests, users, nav, historico }) {
  const reqs = requests.filter(r => r.parceiro === nome);
  const u = (users || []).find(x => x.name === nome);
  const cnpj = u?.cnpj || reqs.find(r => r.cnpj)?.cnpj || "—";
  const c = (s) => reqs.filter(r => r.status === s).length;
  const hist = (historico || []).filter(h => cnpj !== "—" && h.cnpj === cnpj);
  return (
    <div>
      <button onClick={() => nav("clientes")} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.muted }}><ArrowLeft size={15} /> Voltar</button>
      <h1 className="text-2xl font-bold" style={{ color: C.text }}>{nome}</h1>
      <p className="text-sm mb-5" style={{ color: C.muted }}>CNPJ {cnpj} · {reqs.length} {reqs.length === 1 ? "solicitação" : "solicitações"} no total</p>

      <div className="grid sm:grid-cols-4 gap-4 mb-5">
        <StatCard icon={FileText} label="Total" value={reqs.length} color={C.coral} />
        <StatCard icon={Clock} label="Em análise" value={c("EM_ANALISE")} color={C.violet} />
        <StatCard icon={CheckCircle2} label="Aprovadas" value={c("APROVADA")} color={C.green} />
        <StatCard icon={XCircle} label="Negadas" value={c("NEGADA")} color={C.coral} />
      </div>

      <Card>
        {reqs.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: C.muted }}>Esta empresa ainda não fez solicitações.</div>
        ) : (
          <DataTable rows={reqs} cols={["Número", "Tipo", "Produto", "Status", "SLA", "Abertura", ""]} onRow={r => nav("detalhe", r.id)} render={r => (
            <>
              <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{r.tipo}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{r.produto}</td>
              <td className="px-4 py-3"><Pill {...STATUS[r.status]} /></td>
              <td className="px-4 py-3"><Pill {...SLA[r.sla]} /></td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
              <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
            </>
          )} />
        )}
      </Card>

      {hist.length > 0 && (
        <Card className="mt-5">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Clock size={16} style={{ color: C.muted }} />
            <h2 className="font-bold" style={{ color: C.text }}>Histórico do pós-venda (importado)</h2>
            <span className="text-xs" style={{ color: C.muted }}>· {hist.length} registro(s) de 2025+</span>
          </div>
          <DataTable rows={hist} cols={["Número", "Produto", "Modelo / estampa", "Status", "Abertura", ""]} onRow={r => nav("hist-detalhe", r.id)} render={r => (
            <>
              <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{r.produto}</td>
              <td className="px-4 py-3 truncate max-w-[16rem]" style={{ color: C.muted }}>{r.modelo}</td>
              <td className="px-4 py-3"><Pill {...HSTATUS[r.status]} /></td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
              <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
            </>
          )} />
        </Card>
      )}
    </div>
  );
}

const ROLE_LABEL = { ADMIN: "Administrador", GESTOR: "Gestor", COLABORADOR: "Colaborador", CLIENTE: "Cliente" };
const ROLE_COLOR = { ADMIN: "#F8475E", GESTOR: "#6C5CE7", COLABORADOR: "#00B8D9", CLIENTE: "#1FBF75" };

function Usuarios({ toast, users, currentUser, onAddUser, onUpdateUser }) {
  const isAdmin = currentUser?.role === "ADMIN";
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
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none" style={{ borderColor: C.line }} />
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
            {["Nome", "E-mail", "CNPJ", "Perfil", "Status", isAdmin ? "Ações" : ""].map(h =>
              <th key={h} className="px-4 py-3 text-xs font-semibold border-b" style={{ borderColor: C.line }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={i} className="border-b" style={{ borderColor: C.line }}>
                <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>{u.name}</td>
                <td className="px-4 py-3" style={{ color: C.muted }}>{u.email}</td>
                <td className="px-4 py-3" style={{ color: C.muted }}>{u.cnpj || "—"}</td>
                <td className="px-4 py-3">
                  {isAdmin ? (
                    <select value={u.role} onChange={e => { onUpdateUser(u.email, { role: e.target.value }); toast(`Perfil de ${u.name} alterado para ${ROLE_LABEL[e.target.value]}.`); }}
                      className="rounded-lg border px-2 py-1 text-xs font-semibold bg-white" style={{ borderColor: C.line, color: ROLE_COLOR[u.role] }}>
                      {["ADMIN", "GESTOR", "COLABORADOR", "CLIENTE"].map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  ) : <Pill label={ROLE_LABEL[u.role] || u.role} color={ROLE_COLOR[u.role] || C.muted} />}
                </td>
                <td className="px-4 py-3"><Pill label={u.status} color={u.status === "Ativo" ? C.green : "#8A8A99"} /></td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <button onClick={() => { const ns = u.status === "Ativo" ? "Inativo" : "Ativo"; onUpdateUser(u.email, { status: ns }); toast(`${u.name} agora está ${ns}.`); }}
                      className="text-xs font-semibold" style={{ color: u.status === "Ativo" ? C.coral : C.green }}>
                      {u.status === "Ativo" ? "Inativar" : "Ativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm" style={{ color: C.muted }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {!isAdmin && <p className="text-xs mt-3" style={{ color: C.muted }}>Apenas administradores podem criar contas e alterar permissões.</p>}
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
    const maxMes = Math.max(...POR_MES.map(m => m.v), 1);
    body = `
      <p style="color:#6b7686">Total de solicitações registradas: <b style="color:#22222e">${requests.length}</b></p>
      <h3>Distribuição por status</h3>
      <table>${tableRows(statusList.map(([k, l]) => [l, cStatus(k), maxStatus, ROLE_COLOR.GESTOR]))}</table>
      <h3>Volume por mês</h3>
      <table>${tableRows(POR_MES.map(m => [m.m, m.v, maxMes, coral]))}</table>`;
  } else if (tipo === "performance") {
    title = "Performance por colaborador";
    const byResp = {};
    requests.forEach(r => { const k = r.resp === "—" ? "Não atribuído" : r.resp === "IA" ? "IA (automático)" : r.resp; byResp[k] = (byResp[k] || 0) + 1; });
    const rows = Object.entries(byResp).sort((a, b) => b[1] - a[1]);
    const maxV = Math.max(...rows.map(r => r[1]), 1);
    body = `
      <p style="color:#6b7686">Tempo médio de atendimento (dashboard executivo): <b style="color:#22222e">2,4 dias</b></p>
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
  } else if (tipo === "historico") {
    title = "Histórico de Trocas e Garantias (pós-venda · 2025+)";
    const H = (typeof HISTORICO !== "undefined" ? HISTORICO : []);
    const order = ["APROVADA", "EM_ANALISE", "AGUARDANDO", "NEGADA", "CONCLUIDA", "DESCONTINUADO", "SEM_INFO"];
    const cH = (s) => H.filter(r => r.status === s).length;
    const maxS = Math.max(...order.map(cH), 1);
    const byAno = {}; H.forEach(r => { const a = (r.abertura || "").split("/")[2] || "—"; byAno[a] = (byAno[a] || 0) + 1; });
    const anos = Object.entries(byAno).sort();
    const maxA = Math.max(...anos.map(x => x[1]), 1);
    const byLoja = {}; H.forEach(r => { byLoja[r.parceiro] = (byLoja[r.parceiro] || 0) + 1; });
    const lojas = Object.entries(byLoja).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxL = Math.max(...lojas.map(x => x[1]), 1);
    const byProd = {}; H.forEach(r => { const p = r.produto || "—"; byProd[p] = (byProd[p] || 0) + 1; });
    const prods = Object.entries(byProd).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxP = Math.max(...prods.map(x => x[1]), 1);
    body = `
      <p style="color:#6b7686">Total de registros importados (2025 em diante): <b style="color:#22222e">${H.length}</b></p>
      <h3>Distribuição por status</h3>
      <table>${tableRows(order.map(k => [HSTATUS[k].label, cH(k), maxS, HSTATUS[k].color]))}</table>
      <h3>Volume por ano</h3>
      <table>${tableRows(anos.map(([a, v]) => [a, v, maxA, coral]))}</table>
      <h3>Top 10 revendedores</h3>
      <table>${tableRows(lojas.map(([l, v]) => [l, v, maxL, "#6C5CE7"]))}</table>
      <h3>Por tipo de produto</h3>
      <table>${tableRows(prods.map(([p, v]) => [p, v, maxP, "#00B8D9"]))}</table>`;
  } else {
    title = "Motivos de negativa";
    const maxV = Math.max(...MOTIVOS.map(m => m.value), 1);
    body = `
      <p style="color:#6b7686">Distribuição percentual das recusas.</p>
      <table>${tableRows(MOTIVOS.map(m => [m.name, m.value + "%", maxV, m.color]))}</table>`;
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
      <div class="head"><div class="b">gocase <span class="s">Service Desk</span></div></div>
      <div class="wrap">
        <h1>${title}</h1>
        <div class="meta">Relatório gerado em ${fmt} · gocase Service Desk</div>
        ${body}
        <button class="noprint" onclick="window.print()" style="margin-top:24px;background:${coral};color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:bold;cursor:pointer">Salvar como PDF / Imprimir</button>
      </div>
      <div class="foot">© ${new Date().getFullYear()} gocase · documento gerado automaticamente pelo Service Desk.</div>
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
    { tipo: "motivos", t: "Motivos de negativa", d: "Distribuição das recusas por motivo." },
    { tipo: "historico", t: "Histórico de Trocas e Garantias", d: "Status, ano, revendedores e produtos dos registros de 2025+ (pós-venda)." },
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
          <div><label className="text-xs font-semibold" style={{ color: C.muted }}>Prazo de garantia (meses)</label><input defaultValue="6" className="mt-1 w-full rounded-xl border px-3 py-2" style={{ borderColor: C.line }} /></div>
          <div><label className="text-xs font-semibold" style={{ color: C.muted }}>SLA padrão (dias)</label><input defaultValue="7" className="mt-1 w-full rounded-xl border px-3 py-2" style={{ borderColor: C.line }} /></div>
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
              <textarea rows={2} value={tpl[k]} onChange={setOne(k)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }} />
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
    aprovar:     { title: "Aprovar solicitação",               color: C.green,    fields: ["Número do novo pedido", "Data prevista de entrega", "Observações internas"], cta: "Confirmar aprovação",         status: "APROVADA"    },
    negar:       { title: "Negar solicitação",                 color: C.coral,    fields: ["Motivo da negativa"],                                                          cta: "Confirmar negativa",           status: "NEGADA"      },
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
            <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }}
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

const HISTORICO = [{"id":"HIST-2025-000001","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"zugostore","cnpj":"46.385.069/0001-81","uf":"MT","resp":"—","abertura":"16/01/2025","venda":"—","produto":"CASE","modelo":"Capa iphone 14 pro max","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Kellykeisla4@gmail.com","telefone":"Joicy vendedora 66984702607","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1OaWxWaJz8bPJy4NA_rPyYNYKbkSaN3f5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1rffLzewyxRYbU9BqqITO8Fn1FCK3r1uc"}]},{"id":"HIST-2025-000002","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"Santa Ana","cnpj":"58.254.497/0001-54","uf":"PB","resp":"—","abertura":"27/01/2025","venda":"20/01/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Amassada","email":"isannycr@gmail.com","telefone":"83998546565","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1u85ZfhdjijQENlb19L0LSWSdqToNne9A"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1nUlhy4I0zrYU6mCYdm8iJpQ_UhI3Xytw"}]},{"id":"HIST-2025-000003","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"02/08/2025","venda":"24/03/2025","produto":"CASE","modelo":"JARDIM ENCANTADO DO POOL - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Produto fora da validade para troca","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TeLXQWnS04vr8I-D2zBRL9jve3y0a2AE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=199Zhj3pCSNkVlNrMZWRsyUPenLFhdpca"}]},{"id":"HIST-2025-000004","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"03/08/2025","venda":"26/04/2025","produto":"CASE","modelo":"GRADIENTE PESONALISADA - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Não tem no estoque","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1o5NHeNl17l0mwRySytxCflYjhFLNow2K"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1oBzWdoEhUQfz8tWIcTeLqm2o4LsgVKTI"}]},{"id":"HIST-2025-000005","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"04/08/2025","venda":"03/02/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Não foi enviado o cupom fiscal","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15UCuw_IIP8eEibl4_ge9LXgyW4iCjjDo"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-4WnUgBiA4BZN00Y-HCXzPl6RxdgROhJ"}]},{"id":"HIST-2025-000006","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"05/08/2025","venda":"06/02/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 14 PLUS","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido duplicado","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1mgNxa7T9LgLUxRwggS8j3MmK4hQgI1b0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1zO-BkWPGBkFOrDB4JXWsm194xiHCMQk9"}]},{"id":"HIST-2025-000007","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/08/2025","venda":"22/05/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido duplicado","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1z4zMurEZbogkkWIbDbm2WBZukH0EKs8i"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vh9Fj0PHK6_oDtlsEzykc3OV7BLg-j0e"}]},{"id":"HIST-2025-000008","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/08/2025","venda":"25/02/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido duplicado","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=18NQOUXf65J16_Hdw1WO3EpkkzSMhUPTy"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1VdXeKdG7N5bPH4A4kt1XqMXp-w9Juulp"}]},{"id":"HIST-2025-000009","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"08/08/2025","venda":"15/05/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 12","nf":"—","novoPedido":"","problema":"Amarelamento — Não tem no estoque","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13pK-piBYMNFlwT6vDrkDLG4otrKQmIUa"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vzp-ikJlmtZCB7gR5RrTa4tx5r8_L4ZD"}]},{"id":"HIST-2025-000010","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"POWER CASE LTDA","cnpj":"48.894.605/0001-08","uf":"—","resp":"Beatriz N","abertura":"09/08/2025","venda":"14/03/2025","produto":"CASE","modelo":"clear white - iphone 16 pro max","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"upcase.jardimnorte@gmail.com","telefone":"BIANCA(PROPRIETARIA) - (32) 99154-3385","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EaL6sf4b01bWM2D3iY4zyzyowd-ExWyR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10XOckW6BbEsrDwTREyTeK2vxTq4Ctozp"}]},{"id":"HIST-2025-000011","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"10/08/2025","venda":"12/03/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 16","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1E9PzbIVhCySJzPpsRLTSIsEjF1PGyjh6"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1H8jn2uPtgU5SVqBAU2GB2afMyT--Z_-f"}]},{"id":"HIST-2025-000012","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"Gigante da Colina","cnpj":"47.161.060/0001-50","uf":"RJ","resp":"Beatriz N","abertura":"11/08/2025","venda":"02/05/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido ainda não foi criado pois a empresa possui boletos em aberto","email":"compras@lojasgigantedacolina.com.br","telefone":"Bruna (Compradora) - (21) 989420967","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1IStlCeiGt0J8UoSCAqngjiZo5ToqG8HK"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1mXftFjPTIJOtLQOk5QAMo28VDenKcYa7"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1c0RAOLpB1_R6XXp-J575vorVvFTEkOKS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=16H8uE3bHcL-pWvBIN2GGDzttdXU0JAnF"}]},{"id":"HIST-2025-000013","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/08/2025","venda":"20/03/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 13 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DdDD3Rs7ua_Y4DA4M_uI6NApKRicjANf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1P4qRCGI6m3zFoPuKHMsbQZuATzz8LU4q"}]},{"id":"HIST-2025-000014","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/08/2025","venda":"19/03/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1cJLiyswnuG0VltPHO-mxnDZMcbwjqTCj"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1K08LVpIvltYx82zHLpOd-p3p0yUM4ITZ"}]},{"id":"HIST-2025-000015","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Privilege Case","cnpj":"28.511.321/0001-70","uf":"PE","resp":"Beatriz N","abertura":"13/08/2025","venda":"07/07/2025","produto":"CASE","modelo":"Clear logo white - 13promax / Flores divertidas-13promax / Fátima flores rosas - iPhone 14/ Clear logo white - 15promax","nf":"—","novoPedido":"","problema":"Descascamento — Case constra amarelamento","email":"peterson_252@msn.con","telefone":"8199448-9267","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZgKNfWhn0RFXsm7mKHQ8Hs6lY2sVmpVV"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1tHFtbxoRvBChNleAkr8ZAZtn_2aH0oM-"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=12Zo33ztUqIZW7fMHQrUG10r58kR0386R"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1hpVjziwxi1kSaiGbX19UNfrFNj3Dc6L7"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1hFB3ITKfF2sVGFuzlzQnycUAsxyOeSPK"}]},{"id":"HIST-2025-000016","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"POWER CASE JN LTDA","cnpj":"48.894.605/0001-08","uf":"MG","resp":"Beatriz N","abertura":"13/08/2025","venda":"16/04/2025","produto":"CASE","modelo":"Stitch Big Name - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Case constra amarelamento","email":"upcase.jardimnorte@gmail.com","telefone":"AMANDA(VENDEDORA) - (32) 99826-1111","qtd":"1","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Pn1aRVZA3Noljq27qFl1hK9X5tKZCCiC"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-9XeM0IeyobQDFZXimZvRoegCAr65bLu"}]},{"id":"HIST-2025-000017","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Épou Eletrônicos","cnpj":"12.600.347/0001-54","uf":"RJ","resp":"Beatriz N","abertura":"13/08/2025","venda":"07/07/2025","produto":"CASE","modelo":"Carpas Vermelhas - PocoX5","nf":"—","novoPedido":"","problema":"Amarelamento — Case consta descascamento","email":"lojaepou.sf@gmail.com","telefone":"Jefferson(Supervisor) - (22) 9 8831-4044","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vNVS3ic6NIHTrnyeBIf7yKdj3MsTkzAN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LqRh0RReiE9SbCjDbduehZ9Ajsmer7uN"}]},{"id":"HIST-2025-000018","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/08/2025","venda":"22/03/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1dwr0w_Ya1PTjwFscEAv_gq96h-tMxpFk"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ETSLSifE3ufsmVNl8pUv9AAQuzuahVZQ"}]},{"id":"HIST-2025-000019","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"14/08/2025","venda":"22/03/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTA - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Nota fiscal incorreta","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11CICTB5L2Vcra5ClK04LAijNNbH_veXf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vAS634P-BA-yxI1JaqrqC0Yjzz05YjCz"}]},{"id":"HIST-2025-000020","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"15/08/2025","venda":"03/04/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 12 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Py2jvgGgUtmZEkYo0CVJkrtrmYkTa2VD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1u5URg2lncn51AlMD9vs6D_mx5fsSsyk3"}]},{"id":"HIST-2025-000021","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/08/2025","venda":"22/05/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 7 PLUS","nf":"—","novoPedido":"","problema":"Amarelamento — Não tem no estoque","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1FUzbmuxe1PJOj4DV4YvwHRr52JofmWAD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1diKfCE5VfS9LREkmJJ35iECHAj729j6Z"}]},{"id":"HIST-2025-000022","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"17/08/2025","venda":"05/04/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 13 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1I2FQDh1rkMIlvZexrtOh15KXTS_26d62"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=16n4HI-WjVIOmgI650Ss5aSjjSPNEXNr8"}]},{"id":"HIST-2025-000023","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"power case ltda","cnpj":"48.894.605/0001-08","uf":"—","resp":"Beatriz N","abertura":"18/08/2025","venda":"23/06/2025","produto":"CASE","modelo":"clear white - iphone 16 pro max","nf":"—","novoPedido":"","problema":"Amarelamento — Não tem no estoque","email":"upcase.jardimnorte@gmail.com","telefone":"32991543385 - Bianca(GERENTE)","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1yGclpZHObQaf3ZqX6SxV-a8iu7lRZi8S"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1V1aQpXqhoGSgHgSIE5TKhVmZkFmyGnFI"}]},{"id":"HIST-2025-000024","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"ULTRACELL","cnpj":"26.922.718/0001-29","uf":"PA","resp":"Beatriz N","abertura":"19/08/2025","venda":"07/07/2025","produto":"CASE","modelo":"YESHUA- IP 13","nf":"—","novoPedido":"","problema":"Descascamento — Case consta descascamento","email":"silvamelojosemaria@gmail.com","telefone":"ADRIAN ( VENDEDOR) 91985858952","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UX6o-jLT5zPU3LvKkvWeg2vR2c4h017m"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1X2CLOGrATEd0W5OTLsYiBjPzeyOXnAZ9"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1F3Frp8pQWMhsNS6h0EeUzyW5rOOdr3L6"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-VaC6KLhQu7_YTc4_Cof_Nxa8kDzO_I1"}]},{"id":"HIST-2025-000025","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"19/08/2025","venda":"25/04/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 14 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto não está apto para troca pois não consta amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tpAtTVAured2UWD30H4p2ovDYjoPkpcM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1O9xsKjHvk_WTKcRIzE8AVGyCNI7kKrYq"}]},{"id":"HIST-2025-000026","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"20/08/2025","venda":"06/02/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 16 PRO","nf":"—","novoPedido":"","problema":"Amarelamento — Produto fora da validade para troca","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15H6WSl5v9pet-FKXbtPcfNQz6KvlsyNv"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1yGigCG8aKOx8Sz9feJuQgUZrumA1n8Zo"}]},{"id":"HIST-2025-000027","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icase gv","cnpj":"39.332.188/0001-00","uf":"MG","resp":"Beatriz N","abertura":"21/08/2025","venda":"07/07/2025","produto":"CASE","modelo":"Folhagem aquarelada - 14 Plus / Jardim das Cores - 14 / Clear White - 16 pro max / inicial animal onça - 15 pro max / varal de coracoes - 12 pro max / Clear White - 12 / jardim das cores - 15 pro","nf":"—","novoPedido":"","problema":"Amarelamento","email":"carolinatemponi@hotmail.com","telefone":"Carolina (33)998526426","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tcx2jOcwF9L7QTDngrUULKFKPwIA5yap"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1svH6S4PqF7-hXUSVwpyRQAtQdg7TfXWD"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1MxBlupWdFwm7zpD5iwHhmjWUwwZfaF6Z"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1BNV92F0YNMG49sWEEuemVhWP9EJxGGH-"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1wsAplKo469o5NBoRpMUgEW1v8P5srNZC"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1t8VqcF1tRBsJmCVg9xRe3znHF_QuDA2e"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1fhT-B5iraojCLLXWd2NfCW1M0Gh5rFTB"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1hVMNa0BqR6qEHhkKBIPoK1wve1YnBx-k"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LJ66E7YiDkZi7YnZahvYrCAH4nJgLzhS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1wcoihweUin4BF5Bpzpb6OH4FEUQd6-p9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1utuo7XfWFOlryNz06imW3M6g-RXvDYoU"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=19WJSUXK43PMRAIGAiVOJKZHDPIk3PDt9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vnOtMH_a6nUgMz9egXYbGl90IvhU4qGu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1CQqbt5aVaSU5CgITrKy2zscxQBu75X2F"}]},{"id":"HIST-2025-000028","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/08/2025","venda":"26/03/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 16 PRO","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido duplicado","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1yIUzMSD3CQrgn0_ZeiXE3n9jbmKidBRE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1bDqt4bSYVtGG7ZyU003sf_SSnTTeZPxI"}]},{"id":"HIST-2025-000029","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/08/2025","venda":"12/04/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 14 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1NBVoJR0Fu1exz7tx9bLIvV7Bw4eAWw7a"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1AZuBFr7Nn40VxVLFe7jpP4Ll7MTZq9f2"}]},{"id":"HIST-2025-000030","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"23/08/2025","venda":"05/05/2025","produto":"CASE","modelo":"CORAÇÃO LINE ART - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Foto não bate com a descrição","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Kaau6ULIMJIRTQFnS8OJf5GqeKOMo53X"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1v5m3tjPMtoeC3aoMQ0jbDbpO_MP4x5Os"}]},{"id":"HIST-2025-000031","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"24/08/2025","venda":"25/01/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16 PRO","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido com tempo de troca atigindo","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1nzU2nMILbdj-6efEWORWwT6S9s_xPcJM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1COl4Hi2c_3wMSqPo2-r1S7wWIcYv1kCH"}]},{"id":"HIST-2025-000032","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/08/2025","venda":"21/02/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido com tempo de troca atigindo","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1KfO4EfOc9d-zuLooh_u0A7r0whvnfcru"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1JPoUTEfKuzh5TOY4pDRygCgy34YqXYm4"}]},{"id":"HIST-2025-000033","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"26/08/2025","venda":"16/01/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 14 PRO","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido com tempo de troca atigindo","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1qi58tQRiLemb5XPtHnvVGIYot7suz3IX"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=108Hr_ANBcrjKuVvw6MFH6Wv90T3V6nI9"}]},{"id":"HIST-2025-000034","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"27/08/2025","venda":"16/03/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16","nf":"—","novoPedido":"","problema":"Amarelamento — Produto não está apto para troca pois não consta amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZNyGKvoYAG0AESkXBKqfz0_1dtMTHd6V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1A1KbsKXIaH4OYHwxnVRXRO3XgwAdfwdR"}]},{"id":"HIST-2025-000035","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Cruzeiro Import","cnpj":"27.399.579/0001-63","uf":"—","resp":"Beatriz N","abertura":"28/08/2025","venda":"16/04/2025","produto":"CASE","modelo":"Gocase margarina iPhone 16 Pro -Gocase flores azuis 16 Pro","nf":"—","novoPedido":"","problema":"Amarelamento — Case constra amarelamento","email":"elcssilva@hotmail.com","telefone":"Alana Barboza (68) 999327238","qtd":"2","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1z9ca8Y7uHYu2zHjAgrjW99cs8VH-Yy2t"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1GDK--Aab0De3fYEGGupLf1hHHn1bB5WU"}]},{"id":"HIST-2025-000036","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/08/2025","venda":"29/04/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1BldetvOJgtEjYoTPbDNv43Qqf1KX5tWL"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1k7WQoUDhJCTMBCU9DLwjOhwI3M4SyhNu"}]},{"id":"HIST-2025-000037","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"29/08/2025","venda":"04/02/2025","produto":"CASE","modelo":"HAPPY GROOVY - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido com tempo de troca atigindo","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vprf1DKwI8trcw1O2hK6NP6fNetGj17j"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12s-uOqAUrTQJ6KpOiK25zXykZtjtUHP-"}]},{"id":"HIST-2025-000038","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"30/08/2025","venda":"05/04/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Não foi enviado a foto da nota fiscal","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1i8iznaRfYUNiIivqxyhGNA9nN9dEySaC"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LePhWKAvJ256JZME1Fe2QYffdv5dfz8w"}]},{"id":"HIST-2025-000039","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"31/08/2025","venda":"18/04/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 12 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Não foi enviado a foto da nota fiscal","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15KABSkILzEzWwqi_4lj6q7X7BACSy83h"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1SnWEiygb0VpHZXNOC6Bfod6mLUNX76Ra"}]},{"id":"HIST-2025-000040","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"01/09/2025","venda":"21/06/2025","produto":"CASE","modelo":"CORAÇÃO LINE ART - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1hNkm30E1H4llqTts4syWQPBEy-lwQtm5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1HjcEiGL5tUkniusXtrDx6jGJfCUEOe1H"}]},{"id":"HIST-2025-000041","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Connect cell","cnpj":"30.644.874/0001-42","uf":"—","resp":"Beatriz N","abertura":"01/09/2025","venda":"01/08/2025","produto":"CASE","modelo":"Case ursinho pooh primavera iPhone 14","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dayanacsilva@hotmail.com.br","telefone":"48984239967 Dayana gerente","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1nnJENAf6aAOziLog3VW8KGz5f9ZIBSWV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1efUuG3kezYx-aUHSKzCn-OWIUrT2d587"}]},{"id":"HIST-2025-000042","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"02/09/2025","venda":"05/06/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento — Produto necessário para a troca por amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1t4fIaIK8ciL3ZEH3IfYSwhyOTGQF3rQ6"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1JLuvEXnWGW1160vN4iBR5EtZzq0YM6IX"}]},{"id":"HIST-2025-000043","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Leão 1918 Volt ( loja do FEC)","cnpj":"40.159.753/0030-01","uf":"CE","resp":"Beatriz N","abertura":"03/09/2025","venda":"01/06/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Enferrujando — Entrar em contato para identificar o CNPJ completo e endereço","email":"nero.magno11@gmail.com","telefone":"11997002431","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1hbjAAI7ZUk5SRf8Zv1evSj_0MU7jhuJg"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=18W_7WNC4LeOrRGP8tb5P5qu4BQdYc-_8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12r0-_VKniJ9WVY4N59PNWNHshakQs4Mo"}]},{"id":"HIST-2025-000044","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Zé das Capas","cnpj":"52.790.260/0001-01","uf":"MG","resp":"Beatriz N","abertura":"03/09/2025","venda":"10/06/2025","produto":"CASE","modelo":"Antiimpactoslimair - iPhone 15 Pro Max (DSN-STITCH-75)","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Zedascapas.atendimento@gmail.com","telefone":"Luria (dona e vendedora) - (31)9897-966435","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1uBhXVj1IrNi296_gqrfYgGvRqxTEnCxY"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1FB99ky-x_tOXj17nUOsluYbmCuVNpnBk"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1hPFe2R23jN3aTAjOzx-eCqdliEgY0mMv"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1f_Ub5BQeBjGo8TykBJ8UVjV_zJ1nQP8H"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1bEHpNEtJ7pharcc15eohpd0-Q0yaHd0l"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1dVg92hEUCrMLOVr1Jp-EyDGtGSpKhFFd"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1vadCW1ov6GzLo_-46wL04JgBFrU5zlgd"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1RN1gqMnrgfhS30N7cbN6G9mLvI-wZuQd"}]},{"id":"HIST-2025-000045","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Ze das Capas","cnpj":"52.790.260/0001-01","uf":"MG","resp":"Beatriz N","abertura":"03/09/2025","venda":"—","produto":"CASE","modelo":"Antiimpactoslimaiir - iPhone 16 Pro Max (coracoesflutuantes)","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito), Produto veio arranhado","email":"Zedascapas.atendimento@gmail.com","telefone":"Luria (31)98796-6435","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1fFUADxqoA7u347hw8JWd_0uq1iqdPFAY"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1QejWyIFi74ns8r5a9-kD_FKwls8qXdbV"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1-ArkkqUgKpeStIGOkUUt8OK5weJDZNEZ"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1tLE2IRbOAMXPyTpQeTMAk69pJwhg4FGg"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1sR6aTwB2MSS9ehR17zFcRiqTi8dgOyrp"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1L8tJ7veJ51knpCLh3vwaRbQa6vbzm8hv"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1b_z0PcD4OK1Mo46T_mXHPJDf3xzByBjh"}]},{"id":"HIST-2025-000046","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Aprovado Criar Pedido","parceiro":"Felipe imports","cnpj":"56.978.023/0001-20","uf":"PA","resp":"Beatriz N","abertura":"03/09/2025","venda":"—","produto":"CASE","modelo":"Varal de corações iPhone 13","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento — Não tem no estoque","email":"Dados para envio de garantia Gocase:  Cnpj empresa: 56.978.023/0001-20                      Felipe imports   E-mail do portal: fariasfelipe366@gmail.com","telefone":"Andressa(vendedora) - (94)991131295","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1OHbChnx4bj62B5xZRl2OLfSwY0UnlDoj"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1scLBvydSbccVZ3rPtktas0kDTyRsMios"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1_q4Nm4M_sYO7UryeVrIXIBtoqLFwTTYs"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1arVRyEWY_cZuimEfbsA-FWBjQLCJloxY"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=153YTXD58HN_Uf9VJ66d8pOYlMy-lClPg"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=17uWQs8MNxuFcWocLLRO3UMjAah1RDMpn"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1Q4RHU0sqy9ns-X-VmCZ3OS3H4meanQUQ"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1ReUqfQtimc2batjgEhwLhYy26YRB3mv-"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Tdx8uqmsgSiSm7W2Zq4ghjeyEroi6077"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1G8sM7WREdgmgfQ9e0YEaBMRMBnXu8gBc"}]},{"id":"HIST-2025-000047","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Felipe Imports Canaa","cnpj":"55.191.587/0001-55","uf":"PA","resp":"Beatriz N","abertura":"04/09/2025","venda":"23/05/2025","produto":"CASE","modelo":"iPhone 13/14 Frase com flor","nf":"—","novoPedido":"","problema":"Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"Fariasfelipe366@gmail.com","telefone":"Welida(vendedora) -(94) 9 9304-5051","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1yUsvELIUP7UDvJZuOoQKnYyOBIRWlktz"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1e7QOo9s9c3EAQy31AVzHN65hZM4-S8Pl"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=171Zyj26vanQ72DIMZkfFmNND5bGGCVzS"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1yev9W8bnmS6tIZrOcBpTxwDLPwIUxIq5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1O59K1QuNlSxWESQCHlFc8vBGxWjbaDQS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1aIsH79PbZB57pT5MaliBV9u1mNw75T3x"}]},{"id":"HIST-2025-000048","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Utracell","cnpj":"26.922.718/0001-29","uf":"PA","resp":"Beatriz N","abertura":"04/09/2025","venda":"18/06/2025","produto":"CASE","modelo":"COLEÇAO NOVA- IP 13","nf":"—","novoPedido":"","problema":"Amarelamento — capa consta amarelamento","email":"silvamelojosemaria@gmail.com","telefone":"ADRIAN(VENDEDOR) 91 985858952","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1otRjpPketzT4nupXBNd5r0E3e6HaWyoK"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1MINRAetEmqCw9uzzCe1_pIC99ChZcPyZ"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1fEjLXa51ti_8WZeebiVGI2czzUsbvk-2"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1XmIjkgJMmj0U_qSz7Gq1wl1suvO0ddj1"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15jnvWUpjhHLdLdbxBhaZ8qUaIAMdNIAe"}]},{"id":"HIST-2025-000049","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"kaza mix digital","cnpj":"11.941.636/0001-54","uf":"PA","resp":"Beatriz N","abertura":"04/09/2025","venda":"17/03/2025","produto":"CASE","modelo":"—","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido fora da data de validade para troca","email":"kazamix02@gmail.com","telefone":"","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1jWuL6QwtSBZnmQCaXiNKjTpFXwU-In9o"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_eZ4SPn1tHdVJGmpR28WbXm5kaHDUvvE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1I9xunZQGhSp_IyJmc4MZUB5-vz1_L-Gy"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fdpKNjrVz6RONQNd87oiELBNPxw7Nk09"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=148GMVRBA_vCTVYgKa6tFS2sZU0KB6ESD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1DjYyl8GuXkaHVzn_xZXZoXcM29Cj3sCM"}]},{"id":"HIST-2025-000050","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Felipe imports","cnpj":"56.978.023/0001-20","uf":"PA","resp":"Beatriz N","abertura":"05/09/2025","venda":"20/03/2025","produto":"CASE","modelo":"-  mickey- iPhone 13/14","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"fariasfelipe366@gmail.com","telefone":"Andressa ( vendedora) 94 992905770","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=18xxwHWsl_SPrQqGXEoE3MAIzkDmKaaFf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_vtdXlWmThQj-rsVNSOjQJ3Od0r4Y9cY"}]},{"id":"HIST-2025-000051","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"Senhor Phone LTDA","cnpj":"54.225.174/0001-81","uf":"MA","resp":"Beatriz N","abertura":"05/09/2025","venda":"18/07/2025","produto":"CASE","modelo":"Clear Transparente - iPhone 14 Pro Max","nf":"—","novoPedido":"","problema":"Amarelamento — Pedido fora da data de validade para troca","email":"senhorphoneitz@gmail.com","telefone":"Moisés(Vendedor) - (99)98183-1886","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1jWuL6QwtSBZnmQCaXiNKjTpFXwU-In9o"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1DhWHX3qqub8U6k0DdyHbe0x-LxL1HnGd"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1lWOHz06IDyjjNXEURU5WxR0Yv-tqqIfd"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1YVEaDpcdFyQB1naLRIQLorVzH8cBkpDG"}]},{"id":"HIST-2025-000052","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Beatriz N","abertura":"07/09/2025","venda":"13/08/2025","produto":"Têxtil (mochila","modelo":"Bolsa Tote Daily Clear Off White","nf":"—","novoPedido":"","problema":"Manchas","email":"contato@btggames.com.br","telefone":"11 917760811","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1JmtznNHjry8YHjG4dxojvGUqEb7-K2Gl"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1sDsLlG4ElWpGaHrAbe-_Uwxm0KxU-Bip"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13RHAp2iIIb8LBktt_r0EYlA26NgKnDu9"}]},{"id":"HIST-2025-000053","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"VIP CELL PGTU","cnpj":"33.415.970/0001-07","uf":"GO","resp":"Beatriz N","abertura":"08/09/2025","venda":"—","produto":"CASE","modelo":"Clear White -  Clear Logo White iPhone 16 Pro Max","nf":"—","novoPedido":"","problema":"Amarelamento","email":"vipcellporangatu@gmail.com","telefone":"Leonardo Proprietário 62 982345760","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1v9B4GCH183C4ErVfdGNZ-Aps7GnRXk9l"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1OZdp6pHaRlckDikFZgOuN1kY8MuiT5Sl"}]},{"id":"HIST-2025-000054","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Felipe Imports Canaã","cnpj":"55.191.587/0001-55","uf":"PA","resp":"Beatriz N","abertura":"10/09/2025","venda":"11/04/2025","produto":"CASE","modelo":"Coraçãos preto iPhone 16 pro","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"Felipeimportspbs@gmail.com","telefone":"Welida Juliana (vendedora) 94993045051","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1kZCc2qha8-8jv8iJtpLxFS7_xxnDMMgv"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1rRscPKifEuDcf0gfO1vX9xugY3FBBvTX"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1xWZEQNVH6XeiN8ek0a9jcfien45QCVnA"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=107k-A3huj30KTghphQ4IqRuclREiulBt"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1mfN-GuHvIyhF5WYGKFUzTxsLAoT_WWmO"}]},{"id":"HIST-2025-000055","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"IT CASE","cnpj":"43.147.231/0001-35","uf":"—","resp":"Beatriz N","abertura":"10/09/2025","venda":"10/05/2025","produto":"CASE","modelo":"CAPA 1 - CORAÇÕES S23 ULTRA ; CAPA 2 - PRETA S23 ULTRA","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Itcaseananindeua@gmail.com","telefone":"ANA PAULA ( vendedora lider) 91993002351","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1pQsG9DgHo8x4EpPDhTnjDugsUJcVZvD0"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=18_I-12H3_riY1NAqVc76kywroxwyH_6X"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1X6am8TML1M0n64yHcG8ADLTlDkRSzVwd"}]},{"id":"HIST-2025-000056","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Chaveicell","cnpj":"56.795.067/0001-14","uf":"PA","resp":"Beatriz N","abertura":"12/09/2025","venda":"11/09/2026","produto":"CASE","modelo":"Clear white holográfica 15 pro Max , magsafe 14 pro Max","nf":"—","novoPedido":"","problema":"Descascamento","email":"maicondyllan@gmail.com","telefone":"Larissa 85 99914-0154","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=151tftk7tiZmbzKgJuIQvT3gVUJvZ6amG"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Kj-4mE6deB_Sm7nXfUfef-fmLSvg_Guu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1VRLeyiE0M5hEqCc8bVcasD-9zi846zEJ"}]},{"id":"HIST-2025-000057","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Molib.Store","cnpj":"40.829.059/0001-01","uf":"RJ","resp":"Beatriz N","abertura":"15/09/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"São produtos rejeitados por nosso controle de qualidade antes do envio a nossos clientes. Acumulamos produtos defeituosos de remessas diferentes para solicitarmos a troca menos vezes.","nf":"—","novoPedido":"RESELLERS28094","problema":"São 10 itens com defeitos variados. Em cada foto marcamos os defeitos e escrevemos de que se trata para facilitar a identificação.","email":"molib@molib.store","telefone":"21979717777","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZvNBmlZUINms2pBAyfhSio2pJZdwd2_m"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1e1H7AUdYontb6_m5Gi3y4oWlHvuprhms"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1dA5eeV99o6kZtmRWgmGBtBxuD3BI5mJJ"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1Cx-54PZMNSs7kClGYAVrNtmBFXsBmyB7"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1dWRTGXagfc3gkRxXHKnqbnoV3xWVcSNj"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1--xvmE0yOxncApBE3VGZMfDjIxsjUjcD"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1DvTlIzsvWyd7lkSzSJLlYmovD7QqCYs0"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1JsasgQH3NVc-Gh6LxGz1wSVLdfbBP1tU"},{"name":"Foto do item 9","type":"","url":"https://drive.google.com/open?id=1BY2j9ajtUmbZwBNHR83X-ixhXxDhNekk"},{"name":"Foto do item 10","type":"","url":"https://drive.google.com/open?id=1aEo6BQwSNm-ceC5Gw0a1VKeiE2XPWL_8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1t_ILlm4ChEx7O5CM5t2YG9P6H89FAyF7"}]},{"id":"HIST-2025-000058","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Molib.Store","cnpj":"40.829.059/0001-01","uf":"RJ","resp":"Beatriz N","abertura":"15/09/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Como na plataforma de revenda não é possível escolher o número, como o mesmo mesmo exato modelo, na compra anterior, tinha vindo com o número 10, mesmo assim, antes da compra para revenda,  por recaução, fizemos uma consulta sobre qual número viria na estampa do modelo do copo do Vasco. Com base na resposta, fizemos nossa solicitação. Ocorre que veio com o número 11 e não com o número 10. A grande diferença aí é que o copo fora personalizado a nosso pedido com o nome do ídolo do clube, publicamente conhecido por ser detentor da camisa 10 e não 11. Ou seja, não dá para ficar com as 10 unidades que compramos do produto, pois nenhum fã do Vasco comprará com o número errado vinculado ao ídolo.","email":"molib@molib.store","telefone":"21 979717777","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13u-pgm3UVOqYMG0xmV-vNrUotF2MAEQr"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1LqlKI71o0n8qc1Cwe19Pi6OhkQYZbVrF"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=19Umu1bXuVozD4hIQ9jB3Adu8MWyDnnAM"}]},{"id":"HIST-2025-000059","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"FELIPE IMPORTS","cnpj":"56.978.023/0001-20","uf":"PA","resp":"Beatriz N","abertura":"16/09/2025","venda":"27/05/2025","produto":"CASE","modelo":"Clear Case - 14 Pro Max.    Clear Case - 15 Pro Max","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"fariasfelipe366@gmail.com","telefone":"Enzo (Vendedor) - (11) 98104-5396","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ceHq_nuq1h28dPG0oaMRlwgPs7smBK11"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1ax5sQOJN5vZODy-iMVgeNf5txwBGglus"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14NYL9u5tS25ZjfjppCPsMsI-IIG8ljaS"}]},{"id":"HIST-2025-000060","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/09/2025","venda":"16/09/2025","produto":"CASE","modelo":"INFINITE BLACK - IPHONE 16 PRO","nf":"—","novoPedido":"","problema":"MANCHAS","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1A8VvNK0agHf5nzwUPDxSDTnw6QMP9TwK"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14_ARgd13pOpHcJiHt63EFF0GGCKmhAif"}]},{"id":"HIST-2025-000061","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/09/2025","venda":"16/09/2025","produto":"CASE","modelo":"INFINITE BLACK - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"RISCADA","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LPAA6H0lE0YxUCXeWr4-1Jb_7iB0sh-w"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10xVXHKRw4AxMmSKRU04J8UNtLXizRyPQ"}]},{"id":"HIST-2025-000062","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Multimports","cnpj":"14.827.617/0001-90","uf":"CE","resp":"Beatriz N","abertura":"19/09/2025","venda":"08/05/2025","produto":"CASE","modelo":"Case Slinair iPhone 16 pro Max - clear logo white","nf":"—","novoPedido":"","problema":"Amarelamento — Capa consta amarelamento","email":"li.via.alves@hotmail.com","telefone":"Luana - 85987732980","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ReLhUVFm-YqXeDR-AMxw9oVOAehQSHh_"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1AbNQUwQ720Z6zln97dS57S2LxgnJx2gy"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=18NlPXhd38SaU5R7AWvxnry6R2PZdcYeL"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1Xw31eQNnYZBKgKSfGc4YztXR3meuAh3v"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ZjuxTUSxpWOnMrjXyQxhLHIAJRMVnlxB"}]},{"id":"HIST-2025-000063","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"22/09/2025","venda":"25/06/2025","produto":"CASE","modelo":"Aristocats Marie- iPhone 14","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dario1998antunes@icloud.com","telefone":"Leticia(vendedora) (55) 93 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PBTkGliloIHbsY6sy4G4gPW2WUefIEDu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1GN4mlKOir2DNwGDFbU8i0pZAdfmaLpzw"}]},{"id":"HIST-2025-000064","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.571.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"22/09/2025","venda":"02/07/2025","produto":"CASE","modelo":"Corações minimalistas- iPhone 16","nf":"—","novoPedido":"","problema":"Amarelamento, Relaxou","email":"dario1998antunes@icloud.com","telefone":"Letícia (vendedora) (55) 93 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LlCsz5fg1ciH4gc4fu09d50HJcgZp5MW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1sL79RQKXhKT3YYZsafdZJHdrqIx2dvbu"}]},{"id":"HIST-2025-000065","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Gigante da Colina","cnpj":"57.251.343/0001-46","uf":"MA","resp":"Beatriz N","abertura":"22/09/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"- Garaffa Termica 950ml - Caravela","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito)","email":"gigantecolinaslz@gmail.com","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1VoetwfbwwhBAA68OQ59RkYYY81qpDyT0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1JJJLUhS6RZTmRmLpdfOpb3c4z3S_43gu"}]},{"id":"HIST-2025-000066","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0001-23","uf":"PA","resp":"Beatriz N","abertura":"22/09/2025","venda":"23/07/2025","produto":"CASE","modelo":"Antiimpactoslimair-Iphone 16-Ursinho Pooh-Borboletas com aquarela","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dario1998antunes@icloud.com","telefone":"Lidia - (93) 99151-5996","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LIRzSHPkuKmUwWH3IebsZsTsqlvxhhoI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1kkdfvLnmND6uIKV5qxKd1pYG1onN8z7Y"}]},{"id":"HIST-2025-000067","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0001-23","uf":"PA","resp":"Beatriz N","abertura":"23/09/2025","venda":"08/05/2025","produto":"CASE","modelo":"Case Clear Logo White - Iphone 15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dario1998antunes@icloud.com","telefone":"Lidia - (93) 99151-5996","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=18k84ZjHW3b1BY4dxLeTD2KwtQVzKNYx9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1SS0Zu3DykHHnOaVjD4l_DUr4g22bkJ0F"}]},{"id":"HIST-2025-000068","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0001-23","uf":"PA","resp":"Beatriz N","abertura":"23/09/2025","venda":"10/06/2025","produto":"CASE","modelo":"- Marie Garden - Iphone 14","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dario1998antunes@icloud.com","telefone":"Lidia - (93) 99151-5996","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ybGVmpG49oQcpcQrdByCiIk3OTuIORZH"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1YYNUOXXvqT6eMmIoOCzkPzt66a189gys"}]},{"id":"HIST-2025-000069","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Felipe Imports","cnpj":"56.978.023/0001-20","uf":"PA","resp":"Beatriz N","abertura":"25/09/2025","venda":"17/06/2025","produto":"CASE","modelo":"Leão e cruz - iPhone 15","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"fariasfelipe366@gmail.com","telefone":"Enzo (Vendedor) - (11) 98104-5396","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1xAqzkn-9eIa9orgpymKJd14_BCQcn9lC"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1RTc_lqZunCz3rEHhg2YuwNkaxRuq8FJf"}]},{"id":"HIST-2025-000070","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"29/09/2025","venda":"—","produto":"CASE","modelo":"Capinha iPhone 15 detalhe de folhas, capinha iPhone 15 transparente","nf":"—","novoPedido":"","problema":"Amarelamento","email":"wsvimports@gmail.com","telefone":"94984119898","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13SEUQphxcLfKuDEUhx0-sa4kT-Coh6Nv"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1HRE96LQZnnvfgBzgQmTQG8o3Q7U1tAfS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=140QrPKq-td7-FGnqpbcLWIkTQHJUuHfI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1aDGwjJO5S015oMNnI_WP66W0zqOqf2lQ"}]},{"id":"HIST-2025-000071","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Felipe imports canaã","cnpj":"55.191.587/0001-55","uf":"PA","resp":"Beatriz N","abertura":"01/10/2025","venda":"—","produto":"CASE","modelo":"Stitch","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"Felipeimportspbs@gmail.com","telefone":"Welida Juliana( vendedora) 94 993045051","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1YY0aZVLpt9_gAfxFa91qMadWjpM98jN8"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1cWxZLLpjjm-9zHs8XItZMcXmL2zkKHAh"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1VKhZ4dmuZJnkyUauSLGtnxeonpycO20c"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1ptrIoYHXAASXtd8fAouj90d2RkG9tuTz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1WptgVHU0aQ6_8QSjYJaZ0nUCPaoWoOiT"}]},{"id":"HIST-2025-000072","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Felipe imports canaã","cnpj":"55.191.587/0001-55","uf":"PA","resp":"Beatriz N","abertura":"01/10/2025","venda":"12/05/2025","produto":"CASE","modelo":"Abençoada demais para reclamar","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"Felipeimportspbs@gmail.com","telefone":"Welida Juliana  vendedora - (9499304-5051)","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Px2ysTun53deKUB2JlJYJdfh9kMbdiSJ"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1_iOJNazq8EhAjVzHfFJbXQHyscvAToSC"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=19_Mk9HEJPbxBX-eGW-KEOLdWnmMfEmKA"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MD1FPcSG9E_h3MXZhnERFARG-tiGSRQd"}]},{"id":"HIST-2025-000073","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Felipe imports canaã","cnpj":"55.191.587/0001-55","uf":"PA","resp":"Beatriz N","abertura":"01/10/2025","venda":"—","produto":"CASE","modelo":"Coração- iphone 16","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"Felipeimportspbs@gmail.com","telefone":"Welida Juliana (vendedora) - 94 99304-5051","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GFhz9vXg3fFlJGDGEQ8NOdxUjzif9f1Y"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=19U9L2GTD9xxL2y5m6EARQp4NkHlI57Sm"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1smdcT-klVW0JyAmmSGAWGWPeEgV7uXmq"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1WRS2Tq1e1ZDIoaC-wRhW_FDNk6lx1BUU"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tvNhwIfiP-6BXr-NTI8TTyP1P-1x6uOO"}]},{"id":"HIST-2025-000074","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"MAGALHAES IMPORTS","cnpj":"09.210.045/0001-65","uf":"PA","resp":"Beatriz N","abertura":"02/10/2025","venda":"30/07/2025","produto":"CASE","modelo":"CAPINHA ANTIIMPACTOSLIMAIR PARA IPhone 13 - Mapa Mundi Lines Manuscrita (white)","nf":"—","novoPedido":"","problema":"Amarelamento — Capinha estava de fato amarelada.","email":"magalhaescelulares@gmail.com","telefone":"(94)991266387","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10Q3vUnDwMkEd9YnutrIKYt4tTXhQGbpt"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Mhsnxu4WqfvZjeRD094BhBJ_y0GAIdpK"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1sf76GkdN9KWdqZZeIS7ihb59j3eu1ln2"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1_gYEO7O8fB8lmcVWhDtd95AMs6k2aIxd"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1I_r_A7O3QLYt38NYPcvjUFjOPqGJE1Tb"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=184d1nssptoi0sKhdyBSaL1PxZvdGeEQY"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1XjFRe55YHmdolf1LhxH__bv2GFay2wQ7"}]},{"id":"HIST-2025-000075","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"RN Comercial","cnpj":"34.063.953/0001-10","uf":"ES","resp":"Beatriz N","abertura":"13/10/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito) — Garrafa estava com problema aparente","email":"adm@rncomercial.com.br","telefone":"Larissa - 85 9914-0154","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1L17cKiihThotvuza42d_InHO4zdeNdaW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1B2PMqwKIUefjCTV1oYKR0A62BuLs9g8y"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1goqnp1R-_Fi2JYlwuco09stn87LjPS3N"}]},{"id":"HIST-2025-000076","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Lojas Lari","cnpj":"50.302.117/0001-06","uf":"SP","resp":"Beatriz N","abertura":"14/10/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"360urbanbranca-garrafaurban500 / garrafa fresh vermelho 650ml","nf":"—","novoPedido":"","problema":"Produto veio errado — Garrafa foi entregue em um modelo diferente","email":"financeirolojaslari@gmail.com","telefone":"11952902059","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Vnobt136tJ0lfrVWptgX3M8gbDVXjmFA"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1QuTLYusx5blxtL3W3iFxa0K9lVudaTVp"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1K5C_kXGgcgp_sQ9kUFsFuyAZqKIlvJ4E"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1Efnog6F4DS-uc2gQaXB8mnoDkvuXAwXr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Hk2kS_RwNfErs3acDjUj7EIHZ27ejKxF"}]},{"id":"HIST-2025-000077","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Cruzeiro Import","cnpj":"27.399.579/0001-63","uf":"—","resp":"Beatriz N","abertura":"15/10/2025","venda":"03/06/2025","produto":"CASE","modelo":"Iphone 16 Pro- Estampa de Estrelas/ Iphone 16 Pro- Estampa de avião","nf":"—","novoPedido":"","problema":"Amarelamento — Capinha estava de fato amarelada.","email":"brazlaila249@gmail.com","telefone":"68999760616","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1wZNIxXcTGo-b5rcREwigoneft5SJ5m1c"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Ur0L0rk88z6iHMxGDh1o6NQ4XRGJVZSZ"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1-_TXUPgttHf0tvlLp7Lx_i7HkvMQEMOq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10fX6WDViymQ3QiZJU9ScI1EwF4vjdjHD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ekoafgOe20S-xFa7ZCnrmWbDEROXqeQo"}]},{"id":"HIST-2025-000078","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"TC IMPORTS","cnpj":"38.561.732/0001-23","uf":"PA","resp":"Beatriz N","abertura":"15/10/2025","venda":"05/06/2025","produto":"CASE","modelo":"Clear Logo White - Iphone 13","nf":"—","novoPedido":"","problema":"Amarelamento — Capinha estava de fato amarelada.","email":"dario1998antunes@icloud.com","telefone":"LIDIA - (93) 99151-5996","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PXnJlHI-XELeWqB19pr6CeiPv5iJ8cwp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1u7zn9Ehq46yFarwgu6ZkhRL4YzZECVsY"}]},{"id":"HIST-2025-000079","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"16/10/2025","venda":"27/06/2025","produto":"CASE","modelo":"Clear white- iPhone 16 pro Max","nf":"—","novoPedido":"","problema":"Amarelamento — Capinha estava de fato amarelada.","email":"dario1998antunes@icloud.com","telefone":"Letícia (vendedora) - 93981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Zg5DUBKZ7TRQhOnLW4AyH2gIkexx_2Qh"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1og30-x9CRut8HGeCjGMna7K77uqJ3zGA"}]},{"id":"HIST-2025-000080","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Felipe Imports","cnpj":"56.978.023/0001-20","uf":"PA","resp":"Beatriz N","abertura":"16/10/2025","venda":"05/05/2025","produto":"CASE","modelo":"Capitão América - 15 Pro","nf":"—","novoPedido":"","problema":"Amarelamento — Não é possível realizar a troca, pois o cliente encontra-se inadimplente.","email":"fariasfelipe366@gmail.com","telefone":"Enzo (Vendedor) - (11) 98104-5396","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tMt7o3Dl1ta3DBg1_mSnbf9QSuzorFTb"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Fy0_6WnosxQJ77aID6IDkbGfpOEOhvbU"}]},{"id":"HIST-2025-000081","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Kltech","cnpj":"39.773.400/0001-75","uf":"GO","resp":"Beatriz N","abertura":"16/10/2025","venda":"10/09/2025","produto":"CASE","modelo":"Mapa mundi mão escrita","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento — Capinha estava de fato amarelada.","email":"garantiaskltech@gmail.com","telefone":"61995821610","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1NraVHApDK0tnmhEs7RYG-EpHTETVL9O2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1HUXSV-_rNsELyefEo0mBedFKNCqAt_Gy"}]},{"id":"HIST-2025-000082","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Tec conceito","cnpj":"41.318.812/0001-67","uf":"—","resp":"Beatriz N","abertura":"16/10/2025","venda":"09/06/2025","produto":"CASE","modelo":"Slim pink | AM CHOSEN","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Tecconceitooficial@gmail.com","telefone":"88993457770","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1L4FvWIq2mdMq0_hZtT_l1c5mS4UN9KjG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LauaTeQulh7J4YuXAB3-H5gqLRa__5nv"}]},{"id":"HIST-2025-000083","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"ULTRACELL","cnpj":"26.922.718/0001-29","uf":"PA","resp":"Beatriz N","abertura":"17/10/2025","venda":"18/01/2025","produto":"Térmicos (Garrafas","modelo":"COPO LIFE- ELEMENTOS FITNESS","nf":"—","novoPedido":"","problema":"Descascamento","email":"silvamelojosemaria@gmail.com","telefone":"ADRIAN (VENDEDOR)-91 985858952","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1bupMlihwfCu7Dm-YcS9XLq88AIf6LpyH"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1IUyFABUVkWkFLVKISE_oOFwKOooaq349"}]},{"id":"HIST-2025-000084","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"14/06/2025","produto":"CASE","modelo":"FLORES CORAL - IPHONE 15","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13yaZw7K8AFVLLV7KEAqEFC4HXCEWHvj5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1maBeOm3Tj64bNe2sDNQrw7VDR0WxlomU"}]},{"id":"HIST-2025-000085","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"22/02/2025","produto":"CASE","modelo":"MAGSAFE CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1B7jR6o7emYRvJoJU6cEH1kMO0yiGYA6f"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1AJC1WFBK7CV6KExYwASFNGYmxjNbHnpD"}]},{"id":"HIST-2025-000086","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"26/02/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10WmRVl0WrLqGhE-vmlgHjgAUgS4YCEQ0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_hkElI-Q-sxz_V50Bv76onn71HG9xJ7r"}]},{"id":"HIST-2025-000087","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"02/07/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEARN - IPHONE 15","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Bie8VpH3WWkEw8z2kxrfMECoA3yWccjx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1uPlysoHJDvXAkJhY0V6P1wRteVsF5HWA"}]},{"id":"HIST-2025-000088","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"25/03/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1JcQ7kNr55YatJfq6ndICdqWa5YYQKhVg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UhL6nqd8k8hXlvZGuri6QuS43yaHv_r_"}]},{"id":"HIST-2025-000089","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"08/07/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PzF3yWcy6AX2qMBjwR8jEGmBXqsgUH6U"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1KKtTXLySGJEmDUQiBjuF3FTxw8Zeoq-M"}]},{"id":"HIST-2025-000090","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"12/06/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1WecV9D-COq22DvmWegmOVrYcanb9UbiZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1yeyUXf1y9LgRVRNPYby_02hvPywL1LKf"}]},{"id":"HIST-2025-000091","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"29/05/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 12","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Z5R2uOoyBTjlZwnBvugYNQRq2YIo_LFO"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1NwqGxFP4-faFiNOscuYwf0miZCG4-U1A"}]},{"id":"HIST-2025-000092","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"20/12/2024","produto":"CASE","modelo":"CLEAR LOGO BLACK - SAMSUNG S24 PLUS","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1blsHMdp16-nieHMqFPBr1lBxX6MbKrTl"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tNVUQdCUZjyIEXorwAiaiY2D57P6QTRI"}]},{"id":"HIST-2025-000093","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"08/03/2025","produto":"CASE","modelo":"MAGSAFE CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — fora de estoque","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1T1r1GCHyvwbjPb97f8gFOfyd0c_L0I4i"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Wluf9hbjGcX5flcdFD0c4bpnmFxtO9cN"}]},{"id":"HIST-2025-000094","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"07/03/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1D_tK0CUUwCaa--4Lvs694NmXO2PWXUVz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1pNwRseuKgC0AR9HVZgM8Mi89lBgfpDAJ"}]},{"id":"HIST-2025-000095","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"20/02/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Sa2zBhUQQAoqoCTY1wi3gchY7S6lWk4G"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1g0k-BMJ8gxcVcISAIrNBRwgWh3p_DJTo"}]},{"id":"HIST-2025-000096","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"14/02/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 14 PRO","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1kNAS8jntfjJVnDnphq8Kh7X0O5y2zUdD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1r6gXZGIfeBCLDeO6rQhDcUcLgMWrXJw7"}]},{"id":"HIST-2025-000097","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"14/04/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=169fLXClPh_VZYWlhvJ7NL6l1VGdMmO9L"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1KIhEW6i4xIIsOk-2qfbefGKvwx9C3TSl"}]},{"id":"HIST-2025-000098","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"02/10/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 12 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1oXd51d7Q3r5I_6vixKBqXSBNlMDDR6NR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1S_3lfiIi2lyjFLdepdh4xeJgRqp4OBg2"}]},{"id":"HIST-2025-000099","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"12/06/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 11","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1L-GwmOvcOkZy-tTs8snBJ-KS0iezfoXG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1x8wCfVgN4C7zlkg4UKJnNSab9Dwy_CIb"}]},{"id":"HIST-2025-000100","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"02/05/2025","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1HUc9FERBw-TNrxg7_j1Gk9C-ppzHYVv2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fuV8z0R7gsdU0zfl2RvdWu571i2HUdiW"}]},{"id":"HIST-2025-000101","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"16/06/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE XR","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=17ZkPCG7hfZeuy5UKWECIRAU1usNC6L8V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13Q1E-KrxPePLxKg4b5NPmfsX0GFRS1xy"}]},{"id":"HIST-2025-000102","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"22/05/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1KZnO2YT0Zm7D83a84htOKmwGk_MtmZt_"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Js9UG_YvqbQGwO92QzF-BbBJWrMSnXk2"}]},{"id":"HIST-2025-000103","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"19/07/2025","produto":"CASE","modelo":"CORAÇÃO MINIMALISTAS - IPHONE 16 PRO","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1SyXpRGg5E_Tp3qYiUU-9As7gvqPpB6e-"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MfQP8JfbXh44pYoAsKfjZWL0UlSZFjZ_"}]},{"id":"HIST-2025-000104","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"05/06/2025","produto":"CASE","modelo":"FLORES DIVERTIDAS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1szAqiQUhB4nOckx_P9U2unW6hIQYrR7W"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-om-QDWIRiGzJygrVhCvStuyPIF18G5V"}]},{"id":"HIST-2025-000105","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"30/04/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1eIb_x6-M3WOA6p7oPMmEC6Y22mx3DBZW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LnGz9xm4EAjwqUPk5abMYHQ_oO13LxS3"}]},{"id":"HIST-2025-000106","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"26/07/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1FRzkb_mlB_nddGRckuSOsNcG5sAiJh4I"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ePEWrSQvj5AFOsD5WMFEiJqvtY-_HCrs"}]},{"id":"HIST-2025-000107","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/10/2025","venda":"16/06/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 14 PLUS","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1v4G7_-eMqJ5Kule75QeVdgsqOZOPYJ6c"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TenMcX9xRnRBqKsgYqts4mJ0eKeDuF2W"}]},{"id":"HIST-2025-000108","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"20/10/2025","venda":"01/08/2025","produto":"CASE","modelo":"CORAÇÃO MINIMALISTA - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1y_Ad2HIMyPZ4_TjkRgC3M-9OY-65CsW4"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15f0atsbsfqvbEOb8e0OKag5XKcYb1r5B"}]},{"id":"HIST-2025-000109","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"20/10/2025","venda":"19/07/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16 PRO","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZWCXDwo6ZNh_mhDagnRZjftLqUqDutLx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lZG0RUv41AsMbXBT5uBM1nsJq9zXF9Nk"}]},{"id":"HIST-2025-000110","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"20/10/2025","venda":"08/07/2025","produto":"CASE","modelo":"COLOR DOT BLACK - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1cQZLWITZ8A2OvW98rYCF-NE52vCskbbS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QL1wHYQhzpWR8ZYiyGHZEuhcmvFQh_YK"}]},{"id":"HIST-2025-000111","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"20/10/2025","venda":"25/07/2025","produto":"CASE","modelo":"VIBRANT LOVE - IPHONE 11","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tuHpUBw1XjHRwbMVWRSi-tnl6RNnULMu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1j_koBZWrAnjYI8TPCwsWdh0YV9HKB_ng"}]},{"id":"HIST-2025-000112","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"21/10/2025","venda":"27/06/2025","produto":"CASE","modelo":"Short N’ Sweet - iPhone 13","nf":"—","novoPedido":"","problema":"Amarelamento","email":"dario1998antunes@icloud.com","telefone":"Letícia (vendedora) - (55) 93 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1C1EA7IUCAdII0tDFtRuW-P0dF8Shv5cm"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1DQ8afQ88rD7qrt-uDxx4dvIww9A7B5Yk"}]},{"id":"HIST-2025-000113","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icasegv","cnpj":"39.332.188/0001-00","uf":"MG","resp":"Beatriz N","abertura":"22/10/2025","venda":"20/08/2026","produto":"CASE","modelo":"Clear white - 16 pro max / varal de corações- 14 pro max / elegance e bows laço - 12 comum /  clear white - 14 pro max / margaridinhas - 16 pro max / clear white - 12 comum / corações minimalistas rosa - 15 plus / clear white - 16 pro max","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito)","email":"Carolinatemponi@hotmail.com","telefone":"(33)998526426 - carolina","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15hvhE6y2sZjfEH_GEkmhvvEXUxm-f5db"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1mTXW23ljHDDPq2jv2ft4Lv9YIKpG1ESA"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1GopeWvKO-XRZWYnfv8bv4G-QytLGwgxd"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1mZ8NdOi96DFI3PMJaGAI75iEHZ3g17Ss"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1r4IlrHfATZRQxQr5Kdl3zshJNGAf525X"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1iqvgX4gZ84tjU37GGjwwddT3WTx1a4WY"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1vv15AkUyvUudgK2fNwbdEMEbd_8S9BKs"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1eenLUtNxBahU8AccNWOuwLGk_6osNlHs"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1t8SckzXSNziDuKf2zfGfDnsGtm6GEH9j"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12-tBwl2FQN0AiDGJKL18mMBcjlNU73qV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1XwlOdJWe0_m3m5kh8sgyKNLsbeoUc7At"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UrGeookh9T1ooyR8qi_ILVaJtJOu0bwe"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1O_BNPKV67OuoUhaGF1E4redW8O_69tr7"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ALemhfJZ8P_7lr2ldYU8d4gcUgx6brSU"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1L_PtEdTpoKTGA18sGGRtwQXwwzaXqi3d"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1y9sNkFR4CeheT3FAlvrmBqbq3VxG32oR"}]},{"id":"HIST-2025-000114","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"Divino Encanto","cnpj":"61.186.173/0002-30","uf":"MA","resp":"Beatriz N","abertura":"24/10/2025","venda":"22/09/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Descascamento — CNPJ inválido","email":"marciagardenya70@icloud.com","telefone":"Márcia - 98 99975 6293","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1a0f4Uc30gIgp31X4k3M2-93cPFQlpnn2"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1-MqDUhY1NY4KshD_9roMRqeqKaLoWnCA"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=18bpq9ERw_uWM7HO8uVlsYM0dEckAKh8c"}]},{"id":"HIST-2025-000115","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"ultracell","cnpj":"26.922.718/0001-29","uf":"PA","resp":"Beatriz N","abertura":"25/10/2025","venda":"09/09/2025","produto":"CASE","modelo":"ESCUDO DO CORINTHIANS - IPHONE 14 PRO","nf":"—","novoPedido":"","problema":"Produto esta errado — Sem estoque  do produto","email":"silvamelojosemaria@gmail.com","telefone":"BRUNO - 91 9 8585-8952","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vMNjXZAjQC1vmkfBkpUEu2_H2PDr7ARj"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=16OrusfAlMGq3mj4IPhoIzLMwYKviuYFM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1wldv4XuRAnNaRA3KUcNBZc3dqrTUVnIO"}]},{"id":"HIST-2025-000116","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Lojaslari","cnpj":"50.302.117/0001-06","uf":"—","resp":"Beatriz N","abertura":"31/10/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"garrafa-urban-sao-paulo-escudo 360urbanbranca-garrafaurban500 Quantidade: 20","nf":"—","novoPedido":"","problema":"rasgo","email":"financeirolojaslari@gmail.com","telefone":"11952902059","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DeS5MD144FoTF0iHxJMinK0huDMHZhXv"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Fdb9jNWSL1o7IEjexJEtcbjWOSbqHnSo"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UC4jJ55AHxp79thnpGn2-UWH6z8NErlA"}]},{"id":"HIST-2025-000117","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Paulo Seabra","abertura":"05/11/2025","venda":"31/10/2025","produto":"Têxtil (mochila","modelo":"—","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito)","email":"contato@btggames.com.br","telefone":"11917760811","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=16GUOi9sNiROIcvY-q-MERKKkJgAjD72I"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=16mQ4YOcT1tNZf6v2ky17Vri_s9YfICH8"}]},{"id":"HIST-2025-000118","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Santarém Imports","cnpj":"27.996.795/0001-96","uf":"PA","resp":"Paulo Seabra","abertura":"05/11/2025","venda":"03/09/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento, Produto não funciona (Defeito)","email":"santaremimports02@gmail.com","telefone":"93991751369","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Itwx_4pee2zs9sZ313ug_8efn0iYGISK"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1VNHdZd832KLzLJac7bK_k-SnmY2XIy7r"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1YxXlYxqwVxL9Iqew3k7diS1wBaLV4uVD"}]},{"id":"HIST-2025-000119","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"ImegaCell e Mister","cnpj":"33.652.362/0001-16  33.652.362/0002-05 e 33.652.362/0003-88","uf":"RS","resp":"Paulo Seabra","abertura":"10/11/2025","venda":"—","produto":"CASE","modelo":"4 unidades do iPhone 11, 2 unidades do iphone  11 pro, 1 unidade do iphone 12, 2 unidades do iphone 12 Pro max, uma unidade do iphone 8 plus, 3 unidades do iphone 13 pro, 4 unidades do 13 PM, 7 unidades do iphone 13, 9 unidades do 15 pro max, 6 unidades do 15 pro, 2 unidades do 14 plus, 2 unidades do 14 pro, 1 unidade do 14 pro max, 4 unidades do s23 plus 1 unidade do 16 pro","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento","email":"adm@megatelefonia.com suporte@megatelefonia.com rafael@megatelefonia.com","telefone":"51 981262600","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1nUoLiLXLsFkcwn7DMZTUujXC9YV5JdIC"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=11-90ZXRvQBhv6IkAnqqcsp6dOl_KGMV4"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1caix79qbn0JgGeEnshFYSs_sFjuKPGrL"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1pX5H57G5-ODvdQsgrgUVKuB82LnEJS5d"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1cdjIT5vSZDBh7bi2TbqztGHG9VfI2mAG"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1cDj_50jR-Okag-22x3vKlAzlgKyG2UCt"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1DI7eHMZen4Tilrs-QMrDI2X0iZsM6peV"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=14dkpCLc6cX4fHb1K42PCLH-2-D5F4aWE"},{"name":"Foto do item 9","type":"","url":"https://drive.google.com/open?id=1plpofE9A1bhVCDcGJyl2V9b2FsoOApG-"},{"name":"Foto do item 10","type":"","url":"https://drive.google.com/open?id=1bc_Mzr2RX5zXF1YwBVsACruQ2FI9FBQ9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1R_PKkw0vpwDqR2Aakfo6RB5bYWM86vNk"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1wlxi8NY7ulLB67VCE_TlCxzLwUBJC5vW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Ox83bUm2IbOHK2nJzw2MXGk_DXI48Lz2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1EJ9miSQs5Yk5dSUu4ACLwwYn56oGD4lz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1IoZ1-X-UoRODlGZf4KS1fi48gJSdlDe8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1scxrQIWDxVVJhE4MoDKppddiliRjuLDq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1PgYQp7wKkrRz6Fcqj5btB_blEPB2Rz0U"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1uHfhvbZIoCV2TIkYGLwrQZUH1cUC_xol"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lxd8NWkwrB5ygCnFyPCh2qSuO91lAbrG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1SgbjT7QTCRBIYV4PKl7fGoieFmsXwfNg"}]},{"id":"HIST-2025-000120","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"ImegaCell, Mega Imports e Mister","cnpj":"33.652 362 0001-16   33.652.362 0002-05 e 33.652 362 0003-88","uf":"RS","resp":"Paulo Seabra","abertura":"10/11/2025","venda":"—","produto":"CASE","modelo":"Slin Air","nf":"—","novoPedido":"","problema":"Produto com erro grave na estampa","email":"São 3 emails, sendo um por loja. Suporte@megatelefonia.com - rafael@megatelefonia.com e adm@megatelefonia.com","telefone":"51 981262600","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1nnaSBn9Fo1nUWsQyaTtYutc7CXkjpLI_"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1T1mS58Ya1NEv5zpjwyjkkdHmwNK95RIP"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=13l4mwlhFrV67cLUki9MRrkdBb_gqXN7C"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1ylZzGPxtN2dd8DaWLlGZjyxSTdYjmkis"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=107vwX6hj44RGk5ovAKZpogpd8ePzM-uv"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1rdxBbu7KgGg_mLNJtTEaR5v0R6E2CU65"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=14mPR4BCdnMCukMYootxCGzbYgnZouhdJ"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1j7oBKZxbzU-sYvZZJY2h_pms486LJ-VE"},{"name":"Foto do item 9","type":"","url":"https://drive.google.com/open?id=1bbNqAblcHaea88yOacSfUUzBLJANRQXz"},{"name":"Foto do item 10","type":"","url":"https://drive.google.com/open?id=1Ifcbu7PZuDD3zTl8gU93--CUu28LCBlR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Wk992dlfA-tQyWiIbSGNHnlHE2KKLksx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1JhLdnHk-MML-hAtgfbSdkW2CUdqWWgTW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1s1l9511xY2QBJ0hLXQbr74Eh2a8rthiW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Er8Wi0XH1QXT3TZzdez1f3o_ami8AEbR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1KkZa4O1F3q6rb7MAyna3b6_e0l9D832i"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1JYwGFyjakpwNKAWHzVaAARuVarqsknh5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1xMp7lOh4-mggI2zlgaoo1Z5jY85I3dC4"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Ot0Dsi-Kqnrs_qksjG5cWldYXuqGRHtz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14jWYtqFsbC3FxFPthtIpZb_77vDmq5VN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Bb5KyaK0RrlHcKNJppWvh3JM5BgMmFnM"}]},{"id":"HIST-2025-000121","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"PALE - PAPELARIA CRIATIVA","cnpj":"56.178.370/0001-78","uf":"—","resp":"Paulo Seabra","abertura":"11/11/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento","email":"samyllasalles@icloud.com","telefone":"Samylla Guerreiro (99) 985250857","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1fFBdO2E10NIXFCfOsHMIQEBz7LOuqrKI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1YGaxZ5q-1xOzfCeeL_QlRYEWv-fczc1L"}]},{"id":"HIST-2025-000122","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Paulo Seabra","abertura":"11/11/2025","venda":"16/07/2025","produto":"CASE","modelo":"Bússola- iPhone 15","nf":"—","novoPedido":"","problema":"—","email":"dario1998antunes@icloud.com","telefone":"Letícia (vendedora) - (93) 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1o5AqTt-AsB2ZhfAHIc94KZ7WQvROnIyG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1K2zLNQskv74DTt-iS6UU2ehEtzHqVJlz"}]},{"id":"HIST-2025-000123","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Santa Sofia","cnpj":"10.847.762/0002-62","uf":"PE","resp":"Paulo Seabra","abertura":"13/11/2025","venda":"—","produto":"Só a tampa  da garrafa térmica quebrada","modelo":"—","nf":"—","novoPedido":"","problema":"—","email":"olivia.silva@colegiosantasofia.com.br","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Sea9fHPXdgdNB3AT-91C1HJjh9a3TVMm"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1svmjmd0OyK-3wGdYf2ygK924JlogamB1"}]},{"id":"HIST-2025-000124","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Apoge","cnpj":"52.786.200/0001-15","uf":"SC","resp":"Paulo Seabra","abertura":"17/11/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"—","email":"rafaela@grupoapoge.com.br","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PdlBp2RKbAOJz_JoBUY5IKEisnLxkqXa"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_Sem_F9X79NG8zsm9cstmg0Psp4xWQcI"}]},{"id":"HIST-2025-000125","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0001-04","uf":"PA","resp":"Beatriz N","abertura":"19/11/2025","venda":"16/07/2025","produto":"CASE","modelo":"Seu nome Vibe- iPhone 16 pro Max","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Dario1998antunes@icloud.com","telefone":"Tarcísio (vendedor) - (93) 981181108","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1KJxEJ7nKuOIEcYdW9cPWs4hS8Gnq2s_q"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1IOez8PEBitDlSAE-cgWc8uiZc-K10A7M"}]},{"id":"HIST-2025-000126","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"21/11/2025","venda":"27/08/2025","produto":"CASE","modelo":"Stitch butterfly- iPhone 15","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento","email":"Dario1998antunes@icloud.com","telefone":"Letícia ( vendedora) 93 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1E8dzZWC2Jlz0cwx6GxtkTGwqQgeU5l1v"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1uuN52SfeMb4yHNglPmscwqJ2ApC7rk7z"}]},{"id":"HIST-2025-000127","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Lojas Lari","cnpj":"50.302.117/0001-06","uf":"SP","resp":"Beatriz N","abertura":"21/11/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"gu-santos-u1-2025","nf":"—","novoPedido":"","problema":"Produto esta no modelo errado","email":"financeirolojaslari@gmail.com","telefone":"Larissa 11952902059","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vzoCh9Fdt48Ax4i9sYKdSydnNAd-SvOL"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1ZiArA8hzD1mYswcASMK_m9Q9xrrTGFT6"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1N8vy0DgQ3Bbx74NKKi6pgiKhlANiFMCx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LmeSRV-xOFADpLeez1bUc1nYdcSV8lDP"}]},{"id":"HIST-2025-000128","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"24/11/2025","venda":"20/08/2025","produto":"CASE","modelo":"Disney Alice Gato de Cheshire- iPhone 14","nf":"—","novoPedido":"","problema":"Amarelamento","email":"Dario1998antunes@icloud.com","telefone":"Letícia (vendedora) (55) 93 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1rPQz7CU9RUkc_xYXdySAq7N7XNjPx9aP"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=17gigjJpxP-CO6BxnqGYWgt2dULzK1FC4"}]},{"id":"HIST-2025-000129","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Paula Imports","cnpj":"51.763.355/0001-73","uf":"—","resp":"Paulo Seabra","abertura":"25/11/2025","venda":"14/04/2025","produto":"Térmicos (Garrafas","modelo":"Copo life branco","nf":"—","novoPedido":"","problema":"Produto não funciona (Defeito)","email":"anapaulapinho14@gmail.com","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DgCTXI-T1jBk9x3ATF3q1cdXHJEqnt1w"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1TFQuioGcTXXFkGdWa3uF2dE2fNUa13VF"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Dgo1NYU-1YOYFeOv-PZe25GzM-_hufxo"}]},{"id":"HIST-2025-000130","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Ultracell","cnpj":"26.922.718/0001-29","uf":"—","resp":"Beatriz N","abertura":"25/11/2025","venda":"11/09/2025","produto":"CASE","modelo":"coleção nova - iphone 13","nf":"—","novoPedido":"RESELLERS28204","problema":"Amarelamento","email":"silvamelojosemaria@gmail.com","telefone":"Pedro( vendedor )- (91) 9 8585-8952","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1R8ANDW0NfgbwDFzy2kkQRh_ziwCKZSs1"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Q2qKBZB0UiT2oxniYgv-PcUX32oTOf8s"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1aWmUMWs_yfRNYAavfXarpx2m54DrAr0O"}]},{"id":"HIST-2025-000131","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"—","abertura":"26/11/2025","venda":"12/11/2025","produto":"Têxtil (mochila","modelo":"—","nf":"—","novoPedido":"","problema":"rasgo","email":"contato@btggames.com.br","telefone":"Eduardo (Comercial) - (11)9 917760811","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1RErmRIJKbOeD4zK2WF1C9w7aAJXNIm1q"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1KdqrDwCdtbJOSqr34e8YacKgvRp3ovGp"}]},{"id":"HIST-2025-000132","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Sobral Editora","cnpj":"29.256.699/0001-37","uf":"SP","resp":"Beatriz N","abertura":"26/11/2025","venda":"—","produto":"Tech (Cabo","modelo":"—","nf":"—","novoPedido":"RESELLERS28012","problema":"Produto não funciona (Defeito)","email":"leticia.bononi@grupopermaneo.com.br","telefone":"Letícia -  14920009789","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1MN1RJCRI6itVUqSO8OuT8FkbDAp7VYWu"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1A46lC0dLdwjsNE8xKpZxiyDokLAQMIX9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1BC9h2yOLejhcdke0LliNDJdCQ0kGqQNi"}]},{"id":"HIST-2025-000133","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Beatriz N","abertura":"28/11/2025","venda":"20/09/2025","produto":"—","modelo":"—","nf":"—","novoPedido":"","problema":"Térmicos (Garrafas, copos...)","email":"contato@btggames.com.br","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EFy-pxvsNNPJwKzM7-803SJfOHcVGB9c"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1MydUwSKoVxJMJPcHHTVBNvXwNx2n70lB"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=17PzkKkEI3IQ-MOWB-I1O1AUqPSmufhuQ"}]},{"id":"HIST-2025-000134","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Beatriz N","abertura":"04/12/2025","venda":"01/12/2025","produto":"—","modelo":"—","nf":"—","novoPedido":"","problema":"Térmicos (Garrafas, copos...)","email":"contato@btggames.com.br","telefone":"","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tnrhV3qbpmy6-Cy9VkY23cyoPxFES-5H"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1T8raTDACluko5_1XuWqxftBOj_foVF_d"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1mt3HZNNhu_Ul93dG7zeiWncfx5Ts42wt"}]},{"id":"HIST-2025-000135","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"3tentos ou Tres Tentos Agroindustrial","cnpj":"94.813.102/0059-96","uf":"RS","resp":"Paulo Seabra","abertura":"08/12/2025","venda":"04/11/2025","produto":"—","modelo":"—","nf":"—","novoPedido":"","problema":"Térmicos (Garrafas, copos...)","email":"fernanda.halberstadt@3tentos.com.br","telefone":"Fernanda (vendedora ) 55 9 91921808","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TCByas8cSJpwbHkXBQQY3o_hJ_9HvV2O"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1d_3_eQKPmxaB3o8mogCebMspnB-oU9Ep"}]},{"id":"HIST-2025-000136","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Ishop","cnpj":"19.244.956/0001-67","uf":"CE","resp":"Paulo Seabra","abertura":"10/12/2025","venda":"—","produto":"Capinha case Impact Slimstandard para iPhone 11- coração lin","modelo":"iPhone 11","nf":"—","novoPedido":"","problema":"CASE","email":"contato@ishopbrasil.net","telefone":"Ishop (88) 98803-5455","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1WDat6QtdeQSjQVNZm-lM6iPWJUA3p8PG"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1tGEr2T5-zLDFyUp31QlbDQbT56GGlhC_"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14bFbL8aLUmloqhAD3kvPf5IjmpJysi2e"}]},{"id":"HIST-2025-000137","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Loja Épou","cnpj":"12.600.347/0001-54","uf":"RJ","resp":"Beatriz N","abertura":"11/12/2025","venda":"03/01/2025","produto":"CAPINHA CASEIMPACTSLIMSTANDARD PARA GALAXYA16 - FUJI FOREST","modelo":"—","nf":"—","novoPedido":"","problema":"CASE","email":"","telefone":"Jefferson(Supervisor) - (22) 9 8831-4044","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1pb52_fOk53SiEQsnJOrHyfwXFWXdV12E"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1M2ewmeuuIZf59KmajqThr58zv-mDU2CJ"}]},{"id":"HIST-2025-000138","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"LOJA EPOU","cnpj":"12.600.347/0001-54","uf":"RJ","resp":"Beatriz N","abertura":"11/12/2025","venda":"31/07/2025","produto":"CAPINHA ANTIIMPACTOSLIMAIR PARA GALAXYA55 - GAROTA UNIVERSO","modelo":"—","nf":"—","novoPedido":"","problema":"CASE — O valor do item  foi estornado para o cliente, pois o produto está com ruptura","email":"","telefone":"Jefferson(supervisor) - (22) 9 8831-4044","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1sNbiXL5D3Pugd6I1wHqC0wzmUh1v2nnA"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Cwg_G12lj48uHsLV7zbTQC1Ge8z_9KUr"}]},{"id":"HIST-2025-000139","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"06/05/2025","produto":"JARDIM DAS CORES - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10ELuIZVBQVWW2mYR3cW3X4rKVZVnnTou"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1OZRg5jNcyFll4r8vWRwFSf3clNPYRiiC"}]},{"id":"HIST-2025-000140","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"03/07/2025","produto":"CLEAR LOGO WHITE DUO ROSA E TRANSPARENTE - IPHONE 15 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ntO1GjJR2F3IQWwM41AEUJHwTbZVtC_3"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1u5_-SNLJ3j5ljDhC9IM_21N-buRqR4qY"}]},{"id":"HIST-2025-000141","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"19/07/2025","produto":"BLACK HEARTS - IPHONE 16 PRO","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1lEZxYQFpxTkLSwf1jsPLTgWxziA9f3Df"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QUds7Am7PMDbhXO2c82b2K_JPqZ8zgp2"}]},{"id":"HIST-2025-000142","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"23/08/2025","produto":"LILAC FLOWERS - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1XwWZfr4la0I2rFD2d4ohfNsG3HXv3piU"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fdJqjW3mIgJ91viji6WGCQ68Vj-AZHTa"}]},{"id":"HIST-2025-000143","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"16/01/2025","produto":"COLOR DOT BLACK - IPHONE 14 PRO","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11EIpSJ7kZyXqQAKFKdery56bSJIFwyMl"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lZ8aOqbDdh5FGztUb0MSGFao60EFbtWM"}]},{"id":"HIST-2025-000144","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"12/07/2025","produto":"CLEAR LOGO WHITE - IPHONE 16","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EMpuxz9SY1XWnShP9-z7Hyvnj6qpyEGG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=19h9BuZgVsLlynP6fM0ONk38VNxPyjNPM"}]},{"id":"HIST-2025-000145","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"21/08/2025","produto":"VENTOS DE PRIMAVERA","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1MnHMAFoz2ixVx0MgY2bsOlDhgZKqwmjr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1e0RD9t1ack3JDWvuf9mkSMKJfgd6QkR9"}]},{"id":"HIST-2025-000146","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"16/07/2025","produto":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1jj6j4rjlrhQ4FJnQBSCoGJ9wXUyVB2rw"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1FjxyIJ6_0IOzqt0yCnT1WjlEiTt4vzIM"}]},{"id":"HIST-2025-000147","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"10/06/2025","produto":"CLEAR LOGO WHITE - IPHONE 13 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=19CWoQqzXrxynI72eoXJPS0VGvdONmg5d"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1aFHeI4ogQ8mCoObFFj2p58_jsujpKoN9"}]},{"id":"HIST-2025-000148","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"29/03/2025","produto":"CLEAR LOGO WHITE - IPHONE 13 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1l1iZ6ZtQjJk3kXwBx_siyGTCK5qUx3gL"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1AuyYgEM1i45sEV3fD41SW24Jp9j6Rbgz"}]},{"id":"HIST-2025-000149","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"14/06/2025","produto":"CLEAR LOGO BLACK - IPHONE 15 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1SRUaoEnvEV4rZkkzj_3NWKXkqjPVGERr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13HNHqpWI3tYH81qOdbNkYqCm0FuM5DT-"}]},{"id":"HIST-2025-000150","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"05/07/2025","produto":"VENTOS DE PRIMAVERA - IPHONE 11","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TA4wB0o6ylya_2O2qQU1SnjjuZiMlVyE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15iUeJCGYdLABTKdcR2ji97lpyQ0eEaDy"}]},{"id":"HIST-2025-000151","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"28/07/2025","produto":"CLEAR LOGO WHITE - IPHONE XR","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1u5upsfBS4wmPOGEnrDoRbu83i8SbBZ69"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1mJt43p-xyzUnOVajJeUZN0YmL6anHnmx"}]},{"id":"HIST-2025-000152","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"04/09/2025","produto":"WATERCOLOR CHERRY BLOSSOM","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1kCMkaTfymcFRcJv3rJ4djBTdeeAyu0rz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1gR9gs3-Egd_7sPZJTLgYFBfMpGbIJL4y"}]},{"id":"HIST-2025-000153","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"06/09/2025","produto":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1r7xZfQgzecfyLYvQBgMQ3btt_TlvM3oN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QaiXL3coEOBtO2ADrwZQZriBIpnLxip3"}]},{"id":"HIST-2025-000154","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"02/07/2025","produto":"Mickey &amp; Amigos - Minnie Flores em Aquarela - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tWqXnBOjKRdNbtRETHcGy5VowhlhR6fN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1gQcuqk2d5DS-cSd_VfCmEn5i5FG56nd8"}]},{"id":"HIST-2025-000155","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"02/07/2025","produto":"BLACK HEARTS - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GfiRftzgyd9B7Ea_3CoOLa33eXd5Eklf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1GPE-ygZu8qB2CxfZFFa9yEgC3m8iomkq"}]},{"id":"HIST-2025-000156","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"14/07/2025","produto":"MARGARIDINHAS CLEAN - IPHONE 16 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1AWJoQ5a2nNEDZ6EmXFHb-VvNApYZ-Gv_"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=184s0HUf_ebRIJoQ9R3VR6878oy9qABC0"}]},{"id":"HIST-2025-000157","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/12/2025","venda":"22/08/2025","produto":"CLEAR LOGO WHITE MAGASAFE - IPHONE 16","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PrpWHuRxHehSyo3ZUgKHh10PeDq1kak4"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1kSdemJOFBLEJpCiegLXebSQawjS3RxBc"}]},{"id":"HIST-2025-000158","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"05/06/2025","produto":"CORAÇÕES MINIMALISTAS - IPHONE 14 PLUS","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EWDWonWngQmSwITzXVgo7Rt3MfuabhiV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14bl9UXVrjjyFIXX1BHbCYwBLlTmSr1Vl"}]},{"id":"HIST-2025-000159","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"19/07/2025","produto":"CLEAR LOGO WHITE - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1x7Is3VdZJ2FOypVyPIY0eC-TSktD6H4E"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1XE-DfC4Ly9fbLQBkbWjAPCyFxwfiWKCi"}]},{"id":"HIST-2025-000160","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"14/06/2025","produto":"ATLETICO MINEIRO ESCUDO - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1d6BWyrDUt2xfvqvJgH6uBcqyOv5YSF2A"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1uM2zy9T7CSr4mR_K3uLQycB2RVlwefpu"}]},{"id":"HIST-2025-000161","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"14/06/2025","produto":"JARDIM DAS CORES - IPHONE 15 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1YClhfba6l671y71XRrceyfs92OAdvprq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1C1TpAEOzZeXBUaioWC2JGe7CKAlqMsof"}]},{"id":"HIST-2025-000162","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"08/10/2025","produto":"TINY PINK FLOWERS","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1bS9IIVBwG4xeijoVdTZ2T6fJpVNYX-kE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1cJ1JAGkr21xasxPpU8WX5G_eUwdJnJ-p"}]},{"id":"HIST-2025-000163","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"16/10/2025","produto":"CORAÇÕES MINIMALISTAS - IPHONE 12 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Oa_6CkF8Spxk0GjzUjKhJKRH-ehs53r_"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1gTeaHlpDlAGfh67xusI9N2GwP3ILjf4n"}]},{"id":"HIST-2025-000164","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"19/09/2025","produto":"CORAÇÕES MINIMALISTAS - IPHONE 14 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=17nyoAj6HM7Uumpax6lw65PbGREGQX_9u"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=19HvQCnskjAtiWI3w8YsNlFtPTs5b0ofp"}]},{"id":"HIST-2025-000165","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"02/10/2025","produto":"COTTAGECORE CORE BOWS - IPHONE 15 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vcZbFdn6cJpw6U9NQIoh1oDoFcx0rORD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1eGQ8ddOQNs8f98Xc1D5eXcdnMP3P3qVW"}]},{"id":"HIST-2025-000166","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"04/09/2025","produto":"CLEAR LOGO WHITE - IPHONE 15","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GUa60Vh5kP3-fP36EWflW-iNLXD3ZqWD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tMIYRwGn_XC0-BtE_pMC5mkh_odigGYr"}]},{"id":"HIST-2025-000167","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"11/09/2025","produto":"BLACK HEARTS - IPHONE 14 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1MWv242rITU_89-oCvt4qRfS7TjSzg-UI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1w9DtS1pK-kWVK7DuNlN-F9S0Nuk3NO4Y"}]},{"id":"HIST-2025-000168","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"24/10/2025","produto":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1NqNGISmpU4eIO3VQ0cULLYMLZhx_jPuv"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1X6M_ZXbnCZaRNatLn_b_bG_7wNifvEef"}]},{"id":"HIST-2025-000169","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/12/2025","venda":"13/09/2025","produto":"CLEAR LOGO WHITE - IPHONE 16 PRO","modelo":"—","nf":"—","novoPedido":"RESELLERS27723","problema":"CASE — capa com defeito","email":"","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1IzZdCQaN1sFlsXfWJlMWoBB8t7ZGM6L4"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ssG1VdOXtqdIy50o_pBCdCgX1Sc_3fJv"}]},{"id":"HIST-2025-000170","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"17/12/2025","venda":"10/10/2025","produto":"CASE IPHONE 16 PRO","modelo":"—","nf":"—","novoPedido":"","problema":"CASE — capa amarelada","email":"","telefone":"94984119898","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1dwXEurWejCGK6Lb2V8-yahdIqqGdGOPR"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=19OgxapcvFmS8svl3FurrTCFcHZ18vS-k"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1A64JPjbmsjHiGSi5cmUFPgbOtImAkAiR"}]},{"id":"HIST-2025-000171","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"17/12/2025","venda":"03/07/2025","produto":"CASE IPHONE 11","modelo":"—","nf":"—","novoPedido":"","problema":"CASE — capa amarelada","email":"","telefone":"94984119898","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1y0muyPX6Ttd9re_ZCuMT1I4g4Q7WOwXw"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1YkWdZCQit_Q9RzYzZajo-vBhzrbEaMei"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15gGwg7QISH1Tq2MwsEmf24thktrTrfEQ"}]},{"id":"HIST-2025-000172","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"17/12/2025","venda":"10/09/2025","produto":"CASE IPHONE 13","modelo":"—","nf":"—","novoPedido":"","problema":"CASE — capa descascando","email":"","telefone":"94984119898","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1mUImZ6qY05wsmrtiRRqAldD1bd_A45iN"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Wm4eCViO2li_XGC3WRK71qV4XVTuraLq"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1CoMfDsQoGKRm-DYW-xhauMftpl2fQWXR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1qUWG4vfSouDyBQEEpYjBliSmnawvy3JS"}]},{"id":"HIST-2025-000173","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"17/12/2025","venda":"11/06/2025","produto":"CASE IPHONE 13","modelo":"—","nf":"—","novoPedido":"","problema":"CASE — capa amarelada","email":"","telefone":"94984119898","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1CPgEujin_u96JxglHeEqYtnc5ZO5Z5EI"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=19ixwIc70ZOqmufqXzmfMQrilRaImMMVV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1kweZC5T4xV9_gjCfKQlJxgkLE_unxZ3g"}]},{"id":"HIST-2025-000174","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"NAÇÃO RUBRO NEGRA ICARAÍ","cnpj":"41.939.428/0001-81","uf":"RJ","resp":"Beatriz N","abertura":"18/12/2025","venda":"08/11/2025","produto":"—","modelo":"—","nf":"—","novoPedido":"","problema":"Térmicos (Garrafas, copos...), alça removível de transporte que vem junto da garrafa — Pedido com defeito.","email":"","telefone":"Jéssica (Gerente Administrativo) 21 96897-9392","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1FXANuzPEz3JhyCr-ipDmfyaVGXijHulB"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1uPjzoD9IqHEwpACeKr1Usw5V6dYwXABe"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MT9o9rw6fc9oVk_vxZa0_orNTdHqf4GO"}]},{"id":"HIST-2025-000175","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"WSV IMPORTS","cnpj":"40.949.690/0001-44","uf":"PA","resp":"Beatriz N","abertura":"22/12/2025","venda":"—","produto":"CASE","modelo":"IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"capa amarelada","email":"","telefone":"94984119898","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ydBWHmpN-JN-WIfUGolw6px7IRRpU3Oo"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=10LmbA7d2YysgLTIv0KkKZ3HGxvVRlUjN"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1DK2Hu_VnsvS-v8MoFgzlHKX404Dw-BPb"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1rdarkgEYRNoER0tBViYVp9r5-ivIUKhC"}]},{"id":"HIST-2025-000176","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"26/12/2025","venda":"—","produto":"CASE","modelo":"- Mickey expressões coloridas- iPhone 13/14","nf":"—","novoPedido":"","problema":"capa amarelada","email":"","telefone":"Emilly (Vendedora) (93) 984206719","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UB3YnDBkrgMR1NJ4QRuQ3qJ58LZfzG47"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1zifhn-F4ChAAkhu2bl74Dn-KP14HVMu8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LAx90HpxAlyJBUlGUikRMPeiCtwlfwmI"}]},{"id":"HIST-2025-000177","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"26/12/2025","venda":"—","produto":"CASE","modelo":"O essencial é invisível- iPhone 13","nf":"—","novoPedido":"","problema":"capa amarelada","email":"","telefone":"Leticia(Vendedora) - (93) 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Bj_7V3tmowKDKg18b2rXLUyVdKDYCi6V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1yz9eq3n3VWzsD25uRjrhUgMU6zqFPzrK"}]},{"id":"HIST-2025-000178","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"26/12/2025","venda":"—","produto":"CASE","modelo":"Clear logo white - iPhone 16 pro Max","nf":"—","novoPedido":"","problema":"capa amarelada","email":"","telefone":"Keveny (vendedor) (93) 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ecS9gZnyFTnTILYoGii_tAeGWjJehzsH"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1U44FEh0O8AUOn4G2GztF209DDNXXMOmH"}]},{"id":"HIST-2025-000179","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Lovemed","cnpj":"49.962.490/0001-04","uf":"MG","resp":"Beatriz N","abertura":"29/12/2025","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Garrafa com a tampa quebrada","email":"","telefone":"38991848020","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=18ojeaZsosHqz9WIEoc_Q1hncUu5QPlcp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=19LPUh7FKChZl-rGDCbXM1IsEY3Z07fPk"}]},{"id":"HIST-2025-000180","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"30/12/2025","venda":"—","produto":"CASE","modelo":"Harry Porter personagens- iPhone 13","nf":"—","novoPedido":"","problema":"capa amarelada","email":"","telefone":"Letícia (vendedora) - (93) 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1FqJIbV9bUHr3xfLLKw8Fy_VXktfNt_Pn"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1IYuqDelvp65MAA7GK5GLoezfLgH26KBP"}]},{"id":"HIST-2025-000181","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"31/07/2025","produto":"CASE","modelo":"I AM CHOSEN - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1RidAKHDkSxU4xftKc7oGVMem3AH5MpA2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1WUK-32kwl6CQsdT0vZVu9uRdjqvIi0eu"}]},{"id":"HIST-2025-000182","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"23/07/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 8","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1gCBffunR0CFfhEC_ZNFxcVJCyStsaU8N"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Rc1CL-gwxAlSf_zYFClGLcdjC_G5VIuG"}]},{"id":"HIST-2025-000183","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"12/08/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1lWCDReu-v7H8k3s9R2b4z3eVjcLMSTWt"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jHME_h22DY_CnfFYqt4-BD8kW5GhQOlG"}]},{"id":"HIST-2025-000184","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"23/06/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1QQ-uPUG4pBK8h8VIxI0xhDn_sIDempQU"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vawQR1YhVdnkxZ5w5DqurKzD9L-_HD40"}]},{"id":"HIST-2025-000185","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"03/06/2025","produto":"CASE","modelo":"STARS LOVER - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15BsXrlISUJZ-NtkhTe4mGuWpS4sQvNry"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=18vUqz_i9fEHvqEwljifOMcpq6ZNSlr7F"}]},{"id":"HIST-2025-000186","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"30/07/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 13 PRO","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1xvNckGlqVKOwJ_uIsNikJLlNclywMQl0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TmRx246zTBmlPr3vMYEvuGCTy6xnm964"}]},{"id":"HIST-2025-000187","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"01/08/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1iFcxIbstQLTaGNAVOJa4Q9yux9n4gkR5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1IaICPXWN9XF8M5XP6rQ8VVIy1RHd7slP"}]},{"id":"HIST-2025-000188","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"09/07/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 16","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=118CH80-rD9E9MDGexzF4MbggrO4kEqpF"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1V6-vTSfheiRM0uolHW7kvMjYyWBl7OnX"}]},{"id":"HIST-2025-000189","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"22/04/2025","produto":"CASE","modelo":"Stitch Garden - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1buSV8f8xOrqYWcCcrC-FKs17z5EV4Ynp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=195ql08wUXIEPBGC8KygrAZo9T0KNmv0b"}]},{"id":"HIST-2025-000190","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"14/07/2025","produto":"CASE","modelo":"CORAÇÃO MINIMALISTAS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1e6K1ekQUdmFtydLIQDLiFnVFRRvVr13t"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1FMF-QPQHRK1xN6_RbGGwPX1tXdQoqSHT"}]},{"id":"HIST-2025-000191","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"05/11/2025","produto":"CASE","modelo":"FLORESCER SUAVE - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UArgmnUZdAlc25HVN6KSoBfR0uTO9J3R"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Z8ZyBh1A7Hv7CnPLZe05BVkJPb0hFK3_"}]},{"id":"HIST-2025-000192","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"23/08/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1hJL6K9RpLkMOFVJ0FWxVI8m2wPtnf8rN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=11aeFHeJPpDAJmkN5kRVvr5QYGZtI8LxC"}]},{"id":"HIST-2025-000193","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"01/09/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1oUDoNZOobh3dPetmrbk7lBlcOEpWwnLh"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12NMJXy8KAssXEr8Hx0em29OmqtmOaSJD"}]},{"id":"HIST-2025-000194","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"09/10/2025","produto":"CASE","modelo":"CELAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1rz89xDFan0jUT_oEXZp41QKHnENx9AIl"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1I6HOvSx3_t6B1mxOaQi1OIAirPUBSCFV"}]},{"id":"HIST-2025-000195","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"08/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16 PRO","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1HYz6wkljHDmAl-8BqrzP8hooALkK43WP"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Zxb34tOfJiELk5qiY2pLEItELVQKjwGj"}]},{"id":"HIST-2025-000196","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/01/2026","venda":"21/10/2025","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1WRZWCNruWmSuzIonWnS0rmJCjIVDtvzd"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Rd3kxKekECn2vFGCASKn8Wgz1UzK19wJ"}]},{"id":"HIST-2025-000197","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"01/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=14PKRhotG4XB_Nq9xp9hnS38Gt5JoR3qb"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1VqGSlDxgXuntDblkRDjOa07Vo98MWzUU"}]},{"id":"HIST-2025-000198","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"25/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZsZc2o79kIP0xbL0cxguiyJsqzjm_qKB"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fKVALc4hB2JHsLyDLtjkp6kiUCn1qKdw"}]},{"id":"HIST-2025-000199","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"27/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11sBlLbC6I0OjlJxreLQB2KMVcqjaiPHD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1d1D99cMbw--t3vD2-dDnC-kLL4fWI80d"}]},{"id":"HIST-2025-000200","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"24/11/2025","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 15 PRO","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TErwWlcKSZ5KUsUGR0HyRcwBnQFAGxfZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13PlYZHxPW9dOOb8F9i38--9dXuYJPznx"}]},{"id":"HIST-2025-000201","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"04/12/2025","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1MZvbIcjVbN9Cx3gZ4sdjtO5Verd80QDe"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lhJ01psBPzdV_ebLRXs9RWsJhKMU994c"}]},{"id":"HIST-2025-000202","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"08/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11470xarodpeJh9z4ZoaYmMW-YG-WknH5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1bMSuZgRUcbl8ArJSOD8cIFSuqnClePIb"}]},{"id":"HIST-2025-000203","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Molib.Store","cnpj":"40.829.059/0001-01","uf":"RJ","resp":"Beatriz N","abertura":"07/01/2026","venda":"—","produto":"Têxtil (mochila","modelo":"—","nf":"—","novoPedido":"RESELLERS28101","problema":"Térmicos com arranhões ou manchas e bolsa térmica personalizada com marca de outra empresa — Itens com variados defeitos","email":"molib@molib.store","telefone":"21979717777","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1qWKoz9-JNcvFW_9DwoHi9VTkBDfV5T5w"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Wo_ZSzbZPwrPvppCrSfUEVpxCh3x1RK_"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1x54okpS7zhUFyoghuILli6VGmLCT5HGO"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1Rmgb7Wt2ZYVAPudQ_pNQ7Ebfu4LSGuPP"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1GL92qTJaCZ2jIso8sCT5Bi8bTjd9VLRW"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1TBbm5LFsuW2KYOkAj4krEgGZZusxwimS"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1evkDUwFYES6hIfxLuzOEl5l25T9ENwJk"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=12Da6SXIVVEu1EU98rFQCMF1qfrDslome"},{"name":"Foto do item 9","type":"","url":"https://drive.google.com/open?id=1JCHXz3u1BGd86mDP_9UehES555lhdHI8"},{"name":"Foto do item 10","type":"","url":"https://drive.google.com/open?id=1hdejnq0aeTzATOdOjV-hUwyWDTEfBK7z"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lfAuhoWagFepNO_UvLhc5jjigT551yI5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1B-He7vQVvPKko3m2k1UN7XPNIKJGtyKQ"}]},{"id":"HIST-2025-000204","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"09/09/2025","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1P-_Ro170jkz00PsRHK8d6WzE2p6zCf_c"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1t1pbaj0DgCvdVjNth9HqUyV9vNPcp_Kg"}]},{"id":"HIST-2025-000205","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"11/10/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 16 PLUS","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=17VJWtyGEAAccjxkBgpSVzkKDsqK56sYk"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1pM6PO3PCdEugOr-ULhyH0fIQVAoWX-Du"}]},{"id":"HIST-2025-000206","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"07/01/2026","venda":"21/11/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15","nf":"—","novoPedido":"RESELLERS27723","problema":"Amarelamento — capa com defeito","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1CEYFkDRfs7tXSb8ONKujbdjLuW5Y6Rgi"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QqJbtUKbWDrqd21DD5dA9AjKd6o50GpL"}]},{"id":"HIST-2025-000207","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Dinho- Wosniack","cnpj":"01.127.671/0003-42","uf":"PR","resp":"Beatriz N","abertura":"08/01/2026","venda":"01/12/2025","produto":"Térmicos (Garrafas","modelo":"ficou faltando a logo da empresa","nf":"—","novoPedido":"RESELLERS28107","problema":"Item não veio com a Logo — Garrafa faltante","email":"gabriela.tessaro@dinhodistribuidora.com.br","telefone":"41 93500-5436","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1cqeWSzWzkCX_tA8wvQtdBx1oUSzLwvTz"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=19h5BygKMWAJ-JdBOINHRwZ_7oMO0FABJ"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1idnnLj1JJpNBNFsoyC9wM76e7pu4a8zR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1uVoojNiUti4wKIKDypK5LBzjvk9GaUHD"}]},{"id":"HIST-2025-000208","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"PAX VOBIS COMERCIO DE PRODUTOS","cnpj":"18.137.175/0001-00","uf":"RJ","resp":"Beatriz N","abertura":"08/01/2026","venda":"25/11/2025","produto":"Têxtil (mochila","modelo":"—","nf":"—","novoPedido":"RESELLERS28020","problema":"Descascamento — Item faltante","email":"grupowenkemultifranquias@gmail.com","telefone":"(24) 992713180","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tVnev0-X9XucJ_vuSt2nMSTmy2mHlBKT"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1thsMYOy_ooegzSBEDl_f0u6UnZfPS4fr"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=17YFqr68Id_qHljWKIpgQ1A9aywl-7sRD"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1mYF1zFd9QTUaZCC3QtdKwx539hixH18D"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1NPs5V9L32DGsJwkLN8PXwMrA5c1GP2VP"}]},{"id":"HIST-2025-000209","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Beatriz N","abertura":"09/01/2026","venda":"28/12/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS28116","problema":"Risco e Amassado","email":"contato@btggames.com.br","telefone":"11917760811","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Ww37Yf5E3jppWZ7QGKUngyEV5AJgOGr5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1C0Sq-qUmB1u5KYGiWy_019EXIT5pH18A"}]},{"id":"HIST-2025-000210","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"BTG GAMES","cnpj":"53.552.349/0001-00","uf":"SP","resp":"Beatriz N","abertura":"09/01/2026","venda":"19/12/2025","produto":"Térmicos (Garrafas","modelo":"Copo Life Clear 1180ml Cor Rosa Claro","nf":"—","novoPedido":"RESELLERS28116","problema":"veio faltando a alça","email":"contato@btggames.com.br","telefone":"(11) 917760811","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1JVFjebQxyiBrjNY1aBl-oZnlC4msjaUu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1EbKS2izn0fMbGBx3cof5NCwmwh5DWwNb"}]},{"id":"HIST-2025-000211","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc Imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"09/01/2026","venda":"26/07/2025","produto":"CASE","modelo":"Marvel pattern cute - iPhone 14","nf":"—","novoPedido":"RESELLERS28033","problema":"Amarelamento — capinha amarelada","email":"Tecnologiacelularesimportados@gmail.com","telefone":"Tarcísio (vendedor) 93 981181108","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1yf7t4mtsFb1RV1Y_wdA2yB5RRl3Yobi3"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TMM5NBJjzeb013_b8Wb-e7LB4G9m4iSJ"}]},{"id":"HIST-2025-000212","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Molib.Store","cnpj":"4082905900001","uf":"RJ","resp":"Beatriz N","abertura":"13/01/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"9 itens com erros variados","email":"molib@molib.store","telefone":"21979717777","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1z_HW2gLWbjqWlRTXBm69j2cQ7JDUBIq9"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1hy9C5l19xhW3AguCRNdrKUMO-exPBx0d"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1npiJl1kHoxANASqcuse01AiEV_XXdZ09"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1x3TVvN_IRQCUebtXEHhRfYj9aynzqagf"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1cGYk18h90ZBypYBnYCiaWA4bOdRJRRAL"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1h_WSNqiDQke9ETmxIrfMN-5901Qd4df-"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=17Gsgbjke8WR4fJIvZU5jANXa-e3YgfPZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1kb3nYYl_f1737JcBqksRXe4ZNW0OG_4W"}]},{"id":"HIST-2025-000213","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Palmeiras Store Tucuruvi","cnpj":"51.078.032/0002-21","uf":"SP","resp":"Beatriz N","abertura":"14/01/2026","venda":"18/12/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS27897","problema":"Amarelamento — Produto azulado","email":"santanaparque@palmeirasstore.com.br","telefone":"11950554996","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LFokC0vFAV6hy556FqPJil6Bc9DlFAER"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1d6-T1vtletU0zwIjZbA4ZnZKk84i7WFj"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1eG-Gje4hAhDi9YjSX0L2dyPktxHLnEpe"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=15uZ7r4Bssa-FeBnguPYG_yMIVJfMJZjl"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MNXeyDPzoU3gY4bvBB2tNepIpx3DIZQt"}]},{"id":"HIST-2025-000214","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"Palmeiras Store","cnpj":"30.399.628/0001-72","uf":"SP","resp":"Samuel R","abertura":"14/01/2026","venda":"06/01/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Cor diferente do apresentado logo esticados — Sem erro de personalização e de envio","email":"Lienevidals@gmail.com","telefone":"11964172611","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1QjUeU1QobP802DpNjhB1jjViRAilBVA-"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1e0Lo4OXjlItxCknkBZJMsesltNbt67C9"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1pfJQvRR7vA6dO01PAoJotpGcu3iccT4G"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1_BAj9qReSnXkiB7zWNAc3PQNdDnrBH_B"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1HxKUjHoHtQIFsfUZOUORPRgtJe1f8yKg"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=15SH2RSm83CfEQ9SQpbgk2YvMaWRLOB8G"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1bH-JNtXY3Fd7Z69Y4l0Qh7oEb6dCbnva"}]},{"id":"HIST-2025-000215","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"NAÇÃO RUBRO NEGRA ICARAÍ","cnpj":"41.939.428/0001-81","uf":"RJ","resp":"Samuel R","abertura":"20/01/2026","venda":"—","produto":"Case","modelo":"FLAMENGO CAMPEAO DOURADO - 2 UNIDADES - IPHONE 12PRO MAX / FINGER HEART CEREJEIRAS - IPHONE 16 / ROSE BUTTERFLY-LINE - IPHONE 16","nf":"—","novoPedido":"RESELLERS27358","problema":"Produto não condiz com modelo do celular — Cases com tamanho das formas de capinha errados","email":"lojanrnicarai@grupoe2r.com.br","telefone":"21) 994617782 - Jessica Gerente Administrativa","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TcExnTr97SHUC_mmA3C2ypbRhmwYRAYo"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1YA2wpB7QIYUuEkFIaYCO-Gfo0yaY0gvR"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1aR-PxUJPWgFK7h8zq2fs85MZIla6x-Z3"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1otakae9Sx3DxAiFiB7yOlGKgB4nraqBS"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1Z_kuBk8jIfWMWzZQVUj0B_dCE6kF9EIN"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1aCwP0qKitetUhtN3rr-kIzleZ0TMQoI6"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1F_9UZftNf5vX57ygpG8KbwT4yaB_zyL2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1f4oSvu67I6Lb9AQvBPiUqKrgln-3xeOd"}]},{"id":"HIST-2025-000216","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"CRUZEIRO IMP TECNOLOGIA LTDA","cnpj":"27.399.579/0001-63","uf":"—","resp":"Samuel R","abertura":"21/01/2026","venda":"21/06/2026","produto":"Tech (Cabo","modelo":"—","nf":"—","novoPedido":"RESELLERS28273","problema":"OBS: não teve cupom pois foi identificado na venda que o produto tava estufado e por isso não vendemos por não funcionar e por estar estufado/dilatado a bateria. — Foto insuficiente para análise","email":"elcssilva@hotmail.com","telefone":"68 999837631","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1VL7u3WYZg4UqQ6AzM9Ayk2f4iLA8j4xx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1WahZtkys79H6sFc3WMF0reC25TNWW14O"}]},{"id":"HIST-2025-000217","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Grandes Torcidas","cnpj":"49.975.854/0001-82","uf":"DF","resp":"Samuel R","abertura":"23/01/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"Amarelamento — Resgatando mais informações com cliente","email":"marcio@grandestorcidas.com.br","telefone":"61981499981","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10ho3qrM0VM4jsaX_wMnCKjQqFlDSE2vx"}]},{"id":"HIST-2025-000218","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Mandacaru Store","cnpj":"42.751.176/0001-25","uf":"BA","resp":"Samuel R","abertura":"28/01/2026","venda":"—","produto":"Case","modelo":"Lirios e borboletas - duo rosa transparente / iPhone12promax - iPhone12ProMax","nf":"—","novoPedido":"RESELLERS28345","problema":"Capa veio errada — Cliente alega ser do tamanho errado","email":"derleialves10gmail.com","telefone":"75998133255","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1x4QRKCCyu9OS2IKa_C0-aTUqwTQadEJx"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1pXJEOGi_Q5tLhypHZMWCMudi3sDArcpG"}]},{"id":"HIST-2025-000219","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Nação Rubro Negra Maricá","cnpj":"38.100.014/0001-50","uf":"RJ","resp":"Beatriz N","abertura":"05/02/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS28599","problema":"Produto não funciona (Defeito) — Copo com o fundo descolado","email":"fla.plazaitaborai@gmail.com","telefone":"21999785701","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=158iN_BhyWQ6lmrpC71lig50yuKvixxyQ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1sO_DdtIBJd3diiMukUEQh24qSxaMB1lb"}]},{"id":"HIST-2025-000220","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icasegv","cnpj":"39.332.188/0001-01","uf":"MG","resp":"Beatriz N","abertura":"09/02/2026","venda":"04/12/2025","produto":"CASE","modelo":"Marie’s Bows - iPhone 14 comum / Clear White - 16 Pro max","nf":"—","novoPedido":"RESELLERS28645","problema":"Amarelamento — Case amarelada","email":"carolinatemponi@hotmail.com","telefone":"Carolina (33)998526426","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1fW0SQE4J5-J4W2YeFJN7nJ_E9Xxg853_"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=132SZRsjfi1EuZfILeH97W6YHDbxdiQpo"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=15bSy5a53w9YXF0rf9UFVP1YdLxk0bLKo"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-bzJR1h_9WMdiBIZeHqHHDyG_8_GWkbI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=118OO7Ikod9D_-EZ15VSuK9rh-iZGUi-y"}]},{"id":"HIST-2025-000221","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"MULTI","cnpj":"26.106.968/0001-90","uf":"SP","resp":"Beatriz N","abertura":"09/02/2026","venda":"—","produto":"CARREGADOR PORTATIL","modelo":"—","nf":"—","novoPedido":"RESELLERS28692","problema":"ESCRITA — Erro de personalização","email":"valemulti@outlook.com","telefone":"(15)98188-8800","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1fMhaT8Qr-10qIR-Fu4ipPeH-xctWq44e"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Stj17NjE2fgeuQfW0_gHgdLF0bM2xJOW"}]},{"id":"HIST-2025-000222","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"FLU VITORIA","cnpj":"58.520.087/0001-08","uf":"RJ","resp":"Samuel R","abertura":"13/02/2026","venda":"15/12/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"TJ373741412BR","problema":"Tampa rachada — Apenas a tampa da garrafa rachada","email":"compras@flymultyimarcas.com.br","telefone":"Estefanny ( Analise ) - 22 992547494","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Nz3w-75EeWfKjgaUBTbGqvRLhrqvPlXV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QIfoQOOHVUkv740e3Go1SwVDyw-UJB4Q"}]},{"id":"HIST-2025-000223","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Mandacaru Store","cnpj":"42.751.176/0001-25","uf":"—","resp":"Beatriz N","abertura":"13/02/2026","venda":"—","produto":"CASE","modelo":"Case aquarela brisa floral IPhone 15 anti impacto","nf":"—","novoPedido":"RESELLERS28693","problema":"Descascamento — Capa com descascamento","email":"","telefone":"Vanderlei (75) 998133255","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1mBforBScX8_w1KZ2tXOhY3IGCXqWXI_4"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1aIH_cC02WOLFE716m78zf_Ckc58ruxuk"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1Tijlz76STSoa_PtMMdpzsSdulhSOZMXf"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=12Cp2p564oOfNBUr240AGmOL1kRNJbiQp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UJLI8qmtI8Pn4iGaX6OUh1c6DWZmFm6D"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1BoAusuFKeUk-sRDoiDEko6GVspZSVwlq"}]},{"id":"HIST-2025-000224","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icasegv","cnpj":"39.332.188/0001-00","uf":"MG","resp":"Samuel R","abertura":"13/02/2026","venda":"17/12/2025","produto":"CASE","modelo":"Clear white - iphone 15 comum","nf":"—","novoPedido":"RESELLERS28844","problema":"Amarelamento — Case amarelada","email":"carolinatemponi@hotmail.com","telefone":"Carol (33)998526426","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1pUJNlGzpbWqa2TjNBILIrifVoadQwFVa"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1PgoP5nSxlOu0JLTYA0k2ud-XHEQ2upW8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1E0CkUjVDK6wuYboRQxNnnMK-ZtY3-4wU"}]},{"id":"HIST-2025-000225","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"31/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1pQgrHXST367Jyykgdl-_nMh1sjrJFIQE"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1t6_7BOwpYLhSEeWE92_yFqVsYOK0jq2p"}]},{"id":"HIST-2025-000226","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"26/11/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13Egi3yVWbW5TPXag0U3xIPCAx5PyjkFB"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1PkkfSQGFEoam083mbDRvLSF7TpHFXH00"}]},{"id":"HIST-2025-000227","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"15/12/2025","produto":"CASE","modelo":"RAMOS LATERAIS LAVANDA - IPHONE 15","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=16wQwVKUHg0GhatVb5wKX2DyG3wGRPxsg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Yct7McnPhyIF3zTm4EvbZC4G1kdROj9I"}]},{"id":"HIST-2025-000228","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"06/12/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 15","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1poQ2NjKyhicTePMFIaJx6U1q03xIclCZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1mOTyYZBH9EJ2LdWpIPu6c3jiECcNaIFe"}]},{"id":"HIST-2025-000229","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Samuel R","abertura":"21/02/2026","venda":"11/08/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16","nf":"—","novoPedido":"RESELLERS28970","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1zg-NMBiS2oiY6awXzTmgO2UAgkCUTNLS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-QphdEdX7mHyWYtnqUX3P0An6bEqU1BU"}]},{"id":"HIST-2025-000230","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"08/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16 PRO","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Reh6lJRIsBSjMxwLEMwigL8NKF7bMJpg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UUIfzmt7CN8snEnNUFeZqxciqpJUHfuC"}]},{"id":"HIST-2025-000231","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"11/12/2025","produto":"CASE","modelo":"RAMOS LATERAIS LAVANDA - IPHONE 11","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DJmk1QqlBOlHu9fDbfLHJA_wdoP3gusq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Si13Zf02tX9CI1ITr1Jyb3b_YTb23Wf1"}]},{"id":"HIST-2025-000232","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Samuel R","abertura":"21/02/2026","venda":"15/07/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAR - IPHONE 13 PRO","nf":"—","novoPedido":"RESELLERS28970","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1BmBb_O1siQetlzcrmlYcmlwvlVHXcgVM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jC1ZqvuuYWww2XuYS3tHD27P_Kb1mDuz"}]},{"id":"HIST-2025-000233","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Samuel R","abertura":"21/02/2026","venda":"05/07/2025","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 11","nf":"—","novoPedido":"RESELLERS28970","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13GRLkUdl8ORT3LaQ2-kHxYHN07GexojG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ppTNfB6JHqsZqlHIHeT86KhjHQdweL7B"}]},{"id":"HIST-2025-000234","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"16/10/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UchwU8ageIQHCbnxK0MkujmF43SIiEh0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1akHbsqovAS6aq8PU5FQhXZBzZ3YgmtDT"}]},{"id":"HIST-2025-000235","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"16/10/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 12 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1zEzLeYqenc6s9FuSpCIMvajKZpaa_grZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1UzIVbnVwS6ItTua2hpPUmkDV7pkHM0mX"}]},{"id":"HIST-2025-000236","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"19/09/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 14 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13t-91j6WBauksUsvanFScsUEzEIb8Py1"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Xs3egjedwtmUXEt1Hxqs8kc4R40CIYOA"}]},{"id":"HIST-2025-000237","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"11/09/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 14 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1aCfgX0e2CY509wkDRB7meyyuVBm9cS_V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TlUk60VoVgwtDS82pLh8KHNpO1_0K6qE"}]},{"id":"HIST-2025-000238","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"25/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EbcLThY5zjZkzQ-tEbQ3jDUJSTHoDQD8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=11yYUvwFl1_uipKqYOl5lz1oLVI2qZ9xi"}]},{"id":"HIST-2025-000239","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"25/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=12qaTDHa7FzS-0qEFRrFEU_h3E2l1vPZP"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14Awj5IU19lnvajN1D6gJWq1K0A4s6vhy"}]},{"id":"HIST-2025-000240","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Samuel R","abertura":"21/02/2026","venda":"03/07/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE DUO ROSA - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28970","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1B5KMZWXO6yd5dOUXQo3IzXyW8RSTIqKR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fVuOu9Vss_44Z-sWkHnDW07Vg46JfT7k"}]},{"id":"HIST-2025-000241","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"02/10/2025","produto":"CASE","modelo":"COTTAGECORE CORE BOWS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1-ob_U183CYPy_SY8kWZCHkxk2hL8PoMG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1G2TWXyv5otGxXlNOAUYYnYFsv50E40Qp"}]},{"id":"HIST-2025-000242","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"03/12/2025","produto":"CASE","modelo":"HOLOGRÁFICA CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1L1VKQrbn4yL2aJPSAXy4PhBC9RdKHBah"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=14KidYPe5k_KEvKucrxkveYnP80pjSKal"}]},{"id":"HIST-2025-000243","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"03/12/2025","produto":"CASE","modelo":"STAR LOVERS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TPl9sqx4lZfzwQzUGRRx3hbsa8SMAKne"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1GFg6Tn3XknFkjkQQ41RaN8xKDWs2Qq8A"}]},{"id":"HIST-2025-000244","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"01/10/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1rAZYMCd3TchpLv4j-F6_Hd8lMuFxFiJ5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ftiJsvt40-Yv1QLoqiHlfX0RK6jS24wq"}]},{"id":"HIST-2025-000245","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/02/2026","venda":"14/11/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS28003","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11RDtYAHrGpFwdPdOnkKXfLpdpjQe-4FN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1U9qJAgKxnaXMnjHezIpKv1BVODsgSPcc"}]},{"id":"HIST-2025-000246","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"19/12/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAXNOTA","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1zg-NMBiS2oiY6awXzTmgO2UAgkCUTNLS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12QuNSuqYZkP0uViDqov23VQYDPyjZ_5B"}]},{"id":"HIST-2025-000247","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"29/12/2025","produto":"CASE","modelo":"ROSINHAS - IPHONE 15NOTA","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1BgVoRaQ8GZk-oVBqyeokSEH4zmiHgk3N"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1g9c0uzN_J2H2al-eKI8DPf_ODfAPV7R9"}]},{"id":"HIST-2025-000248","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"12/11/2025","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 13 PRO","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UF01irX_K4esI0ROF2-RPa2Y4iyAr-Wa"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1C1h35ynzBwy0Ch9oTYQWD0B1Wto8lmsW"}]},{"id":"HIST-2025-000249","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"29/12/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 14 PLUS","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1XJp4g3oBNNkzlnmngQVBZAh5E0J89V2J"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1w4MhHSJQZ_VEUkGs58J4VIJNL-2zTFZH"}]},{"id":"HIST-2025-000250","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"12/11/2025","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 13 PRO","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1NaLPUnaEgA_puZrhDEzyPmMwiRgM_IwG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15Duwl0EV812WPa06zhpnqd183YpS-uNy"}]},{"id":"HIST-2025-000251","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"16/10/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 15 PLUS","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1sLAwOh3xlmtIOmcRDjm5GWs_1cLRtnq7"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=16WanksnNT4kzWe5YeJIKIi8kRkyShn9h"}]},{"id":"HIST-2025-000252","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"04/09/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 15 PLUS","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=14oLeV0dgXm6ImGV5ueO0rr4qq6qqD-xi"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1a2DnXItMU3iN6IFD_-g2Ni6Otqhe5iCV"}]},{"id":"HIST-2025-000253","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"08/12/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1oxVaFAJfcvsKDqm7ff2S7frzYDFJNwUR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_4mYOljGgJg7nqAR-7b57iw4HQo7nyBr"}]},{"id":"HIST-2025-000254","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"08/12/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAR - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Q6H462BkY_ms88m7A7GZjff-SybKgIGa"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tmIEh1ZPjp34hTSjeLZX2AZ6WP2SoYEQ"}]},{"id":"HIST-2025-000255","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"17/11/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Ft2tNPd-VSs8X0Fx5NIPpRFb1eNZLt1Y"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=18lMy06ziRobB-EkqykdIIaG94nlO0Cp_"}]},{"id":"HIST-2025-000256","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"26/12/2025","produto":"CASE","modelo":"COTTAGECORE CORE BOWS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ciJA_aznCYxFwCPUPh_9-saPuOA7XhGo"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1lA7zYwWfSRxKDo-2dbRXp9EHaIXXnOn_"}]},{"id":"HIST-2025-000257","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"13/10/2025","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1RRo9Y_pWYJbQdSewyWs3JmDVL1gJIkkh"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1hxXJUoWI3xLh5lbilf5mfEqdnrKVhAdl"}]},{"id":"HIST-2025-000258","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"19/12/2025","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1gEcQngPT036jsAOvJXpje28lR91RTEbl"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=11Sx9-UsByYZjPYurHl7rkHS8GpoXn6On"}]},{"id":"HIST-2025-000259","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"07/11/2025","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 15","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10uOpdrIrUN1K85-LT6VaQnPJr_WPryQW"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-WQNrKzitBwgEMbmoasg84ouvZm6UJ93"}]},{"id":"HIST-2025-000260","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"01/10/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAR - IPHONE 16","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ks3GwRAOrSWjW4sE750HrV0MdOVwvwsq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1swcYgJscfVWwptyGrSwwubqAAT3SbzvG"}]},{"id":"HIST-2025-000261","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"29/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1q6AspJRJ66PabVe_VqqtmD2eLJKMGXK8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1xORBmMLBy0Gqcl6nEI8g36Sxk21RP7OX"}]},{"id":"HIST-2025-000262","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"20/12/2025","produto":"CASE","modelo":"COLOR DOT BLACK - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1BQlaq5z2Z07wA5U9_HJDZdYDzdAZ7M5C"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MbWVgpO-m_nVtlQqe8iYvaL5JQOr6vZU"}]},{"id":"HIST-2025-000263","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"10/02/2026","produto":"CASE","modelo":"MINIMAL BUG - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tJob4rTwdbm-JJgdTn90tSvziWk9yBle"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tlw0-iXwPIygVOwQO2UujO-Y_oaBRsu1"}]},{"id":"HIST-2025-000264","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"10/02/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 14 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UUc-SPp4G1oi9o9-aHNeT_8py53bDHz8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1i3cOopQ_ydTyN958-a74KHPVZVoseq2P"}]},{"id":"HIST-2025-000265","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"20/12/2025","produto":"CASE","modelo":"BLUE SEA SHELLS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1l7f6UHSu_0gMVVxJvWUAJE0sq13qvPhh"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1L2G1CYX5RMoRW6ahDyW7CxOJcLCEHMz9"}]},{"id":"HIST-2025-000266","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"25/02/2026","venda":"05/01/2026","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS28975","problema":"Amarelamento — Case amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Sa4A-7rFWbNP1ole2H9TBPw8o5562qQD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1GW6jXifESOnQf4MAgT0d1lv6TvEKJz2D"}]},{"id":"HIST-2025-000267","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"FUTGOL RO","cnpj":"55.401.054/0001-50","uf":"RJ","resp":"Samuel R","abertura":"26/02/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS28840","problema":"Produto veio personalizado no nome OLIVER, porem nao foi comprado personalizado — Erro de personalização","email":"compras@flymultimarcas.com.br","telefone":"Maria Vitória (compradora) - (22) 99251-6131","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ikB2s0Yn8rXRvBzrpet9xbQPJZJAA1eg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1B9AQUFBqUjdrHovREPax_sy7clqgmaUO"}]},{"id":"HIST-2025-000268","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Térmica Sergipe","cnpj":"37.724.179/0001-30","uf":"—","resp":"Samuel R","abertura":"26/02/2026","venda":"31/12/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS27049","problema":"Está com um vazamento anormal na tampa do copo Life de 1.18L preto — Copo com vazamento","email":"termicasergipe@gmail.com","telefone":"Ediana ( Proprietária) 799.91123259","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LlZArn4KL2xyAJswMvjgVvcXrwwCG5vd"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13cJB9lwZ-Z_iM2xsH5M-1UbEPYq7xSNV"}]},{"id":"HIST-2025-000269","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Samuel R","abertura":"27/02/2026","venda":"07/01/2026","produto":"CASE","modelo":"POÁ CHIC - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29025","problema":"Amarelamento — Personalização da capinha saiu ao ser puxado a ventosa","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1e7HHArjbH8e27WzVYOSdfO8Vcb0htq2H"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Zymev08SxlihlwKievAwHYLdp9SHd4n6"}]},{"id":"HIST-2025-000270","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Santos loja de variedades LTDA","cnpj":"23.340.589/0001-72","uf":"—","resp":"Beatriz N","abertura":"07/03/2026","venda":"24/02/2026","produto":"CASE","modelo":"Faltando do 17 pro Max ( hello Kitty Ramos laterais 1) (sem nome low)( transparente)(ramos laterais) do 17 pro faltado (ramos laterais) do A56 faltando (ramos laterais)","nf":"—","novoPedido":"RESELLERS29252","problema":"Itens faltantes","email":"rosilane.s.silva@gmail.com","telefone":"","qtd":"3 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LY72tBI_p89RPbJ3fHrfhp4DLkNvoq1o"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1Ar7pouJjZ63qfLeN2awAPH95G9NfBg_L"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1x9nHDwoAJfq8b5wSYsltGTpQKQndi0Av"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1XUHNsfOqZMbUG93-9YTMf6ziUJ9j8p-4"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=18o42exlqZEjamYFaeqSRr5Q3RfrYNAR7"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1-sMQitHtR-i6QYEmixT_yVkaqR0XkWXa"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=153T7uujD57e-3vZJiNgo2cqd_hbAlm_1"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1lZvrgcCCJgqA0dTAVAiBLKOTV54fa7Z8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10ZHNiHLeBox5vy04re2JtRkJ-yS0byzM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jZVkASoB2d6vsYM2B5tDjPveBJNe2Fgm"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1W8IAwpX7f50dmXum5oZ4gzuQuGTo9voR"}]},{"id":"HIST-2025-000271","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Futtebol Rio Bonito","cnpj":"53.242.737/0001-62","uf":"RJ","resp":"Beatriz N","abertura":"10/03/2026","venda":"04/02/2026","produto":"Têxtil (mochila","modelo":"Mochila casual Flamengo","nf":"—","novoPedido":"RESELLERS28179","problema":"Bolsa com estampa descascando","email":"futtebolriobonito@gmail.com","telefone":"21972995578","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1AKQs0B-8usewYUOWlHBzdfsofQl3X2Uu"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=10FuPZRwSKEktfSuPDk4nu8Il9cegDV1Y"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LrRoJW3KCsRzwmP11R7jaA7lcfWUin7F"}]},{"id":"HIST-2025-000272","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Loja do Cruzeiro Montes Claros","cnpj":"31.765.330/0001-00","uf":"MG","resp":"Beatriz N","abertura":"11/03/2026","venda":"02/03/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS29304","problema":"produtos com descascamentos","email":"welderlula@hotmail.com","telefone":"Welder(Sócio proprietário) -(38)99260-1151","qtd":"3 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1p2Pq3ANVRW7zOgUZb4N24d0hH3z0Bd3B"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1knuGwI_XCjKcEGue9M4QG5T3bjLTmiA6"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1U5zHXEwYa2wGclcEV8NYAbhcQr6kbNFq"}]},{"id":"HIST-2025-000273","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icasegv","cnpj":"39.332.188/0001-01","uf":"MG","resp":"Beatriz N","abertura":"12/03/2026","venda":"01/10/2025","produto":"CASE","modelo":"Clear white - 14 pro max","nf":"—","novoPedido":"RESELLERS24181","problema":"capa amarelada","email":"carolinatemponi@hotmail.com","telefone":"Carol (33)998526426","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1cCtSbIyzs9MaZufBAw3DB87jviltt3Kt"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1NUsg8AuWJ4PlsANWEWKQhsRnE0AKJRpo"}]},{"id":"HIST-2025-000274","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Samuel R","abertura":"17/03/2026","venda":"13/12/2025","produto":"CASE","modelo":"Lute me - iPhone 12/12 Pro","nf":"—","novoPedido":"RESELLERS29289","problema":"Amarelamento — Capa amarelada","email":"Tecnologiacelularesimportados@gmail.com","telefone":"Letícia (vendedora) - (93) 981271555","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1I47lHyP18OvVE6fsXClb09AIgJ71Bk3V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13_0I_HRCyXJAB4k5n-Ux_pNyYAQIatXh"}]},{"id":"HIST-2025-000275","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"INFINITY LHAN PST (LOJA DO SPORT)","cnpj":"64.189.833/0001-25","uf":"—","resp":"Samuel R","abertura":"18/03/2026","venda":"27/01/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS29586","problema":"PERSONALIZAÇÃO ERRADA — Cliente aguardando estoque da garrafa mini 350ml","email":"compras.pst@infinitylhan.com.br","telefone":"BRUNO 11 95824-0029","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1xz6qwnN5gQC1UH6PRqeSUGNeY9yV0ewn"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1xEzvyrKjEO-sJT72Xurgaebza8Q4yUOf"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1jv72xXSjwxSVxvkgE7IrOMjDJs3Fatbu"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1BGPAMC9hYqyja2od_vk4-uv-eyzWteT3"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ejsCP8FBS8Jsg8tpyuY7FKDhWAq6x5Er"}]},{"id":"HIST-2025-000276","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"20/03/2026","produto":"CASE","modelo":"BUTTERFLY LINE - IPHONE 15","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1WsAhzuAyniH-qx5xJudJH_mkk5ygMekF"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1qEGUNe07qzSNMeaOZ3Z-eEknD7tSkA4M"}]},{"id":"HIST-2025-000277","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"30/12/2025","produto":"CASE","modelo":"RAMOS LATERAIS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Descascamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1_RZPwSToSREUYeG3el6UP50gtVcaqpvu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QE1lEd0SM4bQIrhLc5MSbRQ8Sv-nqT_T"}]},{"id":"HIST-2025-000278","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"06/01/2026","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 11 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1wjjg-6l0Xo192aa2lWcuKnWgQbFaDGhc"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=18yyugQapas0jfqui2-EbzvSDYN5-opRf"}]},{"id":"HIST-2025-000279","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"06/12/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10ReBAlc4GkmyOMZAnoeajV7lcWqQeIE0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1B73STrxyXtMD3UTnduZxasJ6t6dl1ShG"}]},{"id":"HIST-2025-000280","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"22/01/2026","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1aNJPFGIEtedcKwFOql013wJLxquOa4Q-"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1KGmX0h4Aa56pUm7L-LF7WSxzEaDzr207"}]},{"id":"HIST-2025-000281","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"02/10/2025","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 13 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1lmlGsN81yv4StXaYJchrOF_EQDbpPZl-"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1L3zSEUeGMs9wWq3W-B4d8Vu-9oFjAGZy"}]},{"id":"HIST-2025-000282","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"21/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 11 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10subUvEi7RY65OkKF3vkeRytJ9_Hln1T"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tUyFqkpWQ0Uwy8Dhx1ylXFrtESFg7GaI"}]},{"id":"HIST-2025-000283","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"31/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Neq0oRvSV23_aKU-GJQJX5bV1U6FweSD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1y8JPHrrtxCY-41p59a1AkO01QsNAPgGF"}]},{"id":"HIST-2025-000284","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"22/01/2026","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 15","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1r8lsqjTsSQ0eT962RfmPfQO8WfLF5gQ0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ny8qEvA0Zp7otGJjxwh2-QSpBaVB6fnH"}]},{"id":"HIST-2025-000285","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"04/10/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 15","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1L0FRes_rgJUJpvXZF0xupameZMhGRsQr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=17XwV7a7Bbe0N_5iuklG7ghM3nh1S_PNV"}]},{"id":"HIST-2025-000286","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"01/10/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 14 PLUS","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LzaoPOz5kzK56ug3UUi9a9PMpVYoQr2W"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1EnW9e96NAFSaQKGxE6rvl8B5jPJ5IFR8"}]},{"id":"HIST-2025-000287","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"18/03/2026","venda":"24/12/2025","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS29359","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1JRVjID7i_V6iRghDiRkB1lQ_YxaVuj_l"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=13l8ahdATUx7Eve64kwcc6siJolfqTUER"}]},{"id":"HIST-2025-000288","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Mandacaru Store","cnpj":"42.751.176/0001-25","uf":"BA","resp":"Beatriz N","abertura":"20/03/2026","venda":"23/02/2026","produto":"CASE","modelo":"-Case slim black Iphone 15 pro  (Santos)","nf":"—","novoPedido":"RESELLERS29329","problema":"Descascamento — Capa com descascamento","email":"derleialves10@gmail.com","telefone":"(75) 9 98133255","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Tj_FKDN_itxjnfIWScnURme5cnSgvrDa"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=184Kwp7reeTeEflpNGGnfl3849jyEPPHL"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1YJaC100_CnrQZ3c79qalrHd6E-31Xjkg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fddn9l9wwo02BKJnJ_g7zzkkMVwaip7B"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=12DGL8q7lDxf-fFmtGp1snxnSVRv1sH4G"}]},{"id":"HIST-2025-000289","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Petmogi","cnpj":"41.435.487/0001-12","uf":"SP","resp":"Beatriz N","abertura":"21/03/2026","venda":"02/12/2025","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"","problema":"1 é tampa vazando e outro é falta de canudo na entrega — Pedido feito diretamente para o time de operações, pois não conseguimos subir um pedido apenas com tampas","email":"aquapetnotas@gmail.com","telefone":"Rodrigo (11)997674236","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1j34dnzHa1vvysi33Oytjri9UvuGwB4SV"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1fS2OpB2VuSyMHEfKysWnsbsrMUe3pzLg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1tHTSHvwVL5b_Vb2v4vvpzYWJrk-NENBZ"}]},{"id":"HIST-2025-000290","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Petmogi","cnpj":"41.435.487/0001-12","uf":"SP","resp":"Beatriz N","abertura":"26/03/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS29431","problema":"Produto chegou diferente do solicitado, Chegou customizado — Garrafa com defeito na personalização","email":"aquapetnotas@gmail.com","telefone":"Rodrigo (11)997674236","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1oD-N24EH_-yDy6-uni4yWT0coMD6ve8y"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1D8PHsG2PRg3FgNPFw5dH4kxWCkZDwwHK"}]},{"id":"HIST-2025-000291","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"Info&Tech eletrônicos e assistência","cnpj":"36.685.208/0001-39","uf":"MG","resp":"Samuel R","abertura":"26/03/2026","venda":"—","produto":"CASE","modelo":"Estampa do Cruzeiro, IPhone 14","nf":"—","novoPedido":"","problema":"Amarelamento, Descascamento — Aguardando cliente escolher outro modelo compatível","email":"Companhiamfs@gmail.com","telefone":"Ana Clara (Vendedora) (31)99507-6205","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10BIS5WyhlY2O7fiR096OMZ0mg_WW8zbX"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1SJ6YuFYV2nA-njcXtmaUTxj0ukQzA9XQ"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1CZ2hLgSJl1-wRbZaTi63nnPSGaJpsa12"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1RwBGiA3m-FGqIBZVNvL4QFglYW5epzpz"}]},{"id":"HIST-2025-000292","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"24/03/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE MAGSAFE - IPHONE 16","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GeNgXtZNerLkm2ueUgdpkTRXiHJSdgHZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=18mN2I9fuRnXyv_sJS0dboRnFv8hXU9Q4"}]},{"id":"HIST-2025-000293","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"16/01/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Z-bOdvQtFmXiBcdOt-lz8GhvEqdcjE3-"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1j-GGKT8XfbEhpJZ0IXwKcTogr-aznDOn"}]},{"id":"HIST-2025-000294","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"12/02/2026","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1gmFsm7XrTISEGwpznoswQXV6_eTrpRZX"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1R5s2t40jmLw7j0_4I8ckGUhmhUtm-7Kn"}]},{"id":"HIST-2025-000295","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"12/12/2025","produto":"CASE","modelo":"FLORAL - IPHONE 15 PRO","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1gHE2o4Qx6Q4w_FiLPnOoiHbtFMGWAjPt"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=188gptOFokxQBsRxpIiuMnSPXyJfzFto0"}]},{"id":"HIST-2025-000296","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"10/01/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 14 PRO MAX","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GyCJVPupC0pCheRpstvkP-KX1--rZK6Q"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1pBm28OikUZRetcimOQ1rHx6-54tIr28y"}]},{"id":"HIST-2025-000297","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"24/02/2026","produto":"CASE","modelo":"SMILE GRAFITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1syYVJxQK5GlY-Y6FY1Rh5pZD2cpOPr0B"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1k-dnAnm97rHao38_rQHZG_W_kOtrF2Nv"}]},{"id":"HIST-2025-000298","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"28/03/2026","venda":"11/11/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16","nf":"—","novoPedido":"RESELLERS29445","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1f1fgc_vBc1sVJuwh0HJtoyAR_dbaunf5"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1nL55bNvdbTd8wtGAwjSyrzkSLOSh1uqf"}]},{"id":"HIST-2025-000299","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"NSG comercio do vestuário","cnpj":"35.828.547/0001-64","uf":"SP","resp":"Beatriz N","abertura":"09/04/2026","venda":"—","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS29949","problema":"—","email":"gabriel.vinci@gmail.com","telefone":"11983587777","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1jvaUfpS3IAcBY4TaN8d3PbsQVjJfNGhI"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1L3ZvE0n4vWgEWpsHwwaldkrsf_gUoMK7"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1SbnWpiGZEhLOayqhVu2zWUcSsDuyr2fG"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=1DNKwwEUYRILfk2JUHuD_j0nd0kZYXPqM"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1d0TuuyHLM2vPhv9bpY69hileOKIayzFB"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1YD73D6sU7G23DB4_qK-aYpeN8U2AKerj"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1ci9pUsWp0S_vE63cJnSfXNhjokoAZvVH"},{"name":"Foto do item 8","type":"","url":"https://drive.google.com/open?id=1yVTYXkTpZtAspyqhocfl6fmg5CuXTfGd"},{"name":"Foto do item 9","type":"","url":"https://drive.google.com/open?id=1_Kxij9-3lC40Yk9E-roM0djs5Tkf5qFY"},{"name":"Foto do item 10","type":"","url":"https://drive.google.com/open?id=1GPzkgu_t_xEkVrztjLZIrQX1S5PWjb9p"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1j3Yz_suFO9009vp45U4wr0AyyVhysoU6"}]},{"id":"HIST-2025-000300","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"INFINITY LHAN PST (LOJA DO SPORT)","cnpj":"64.189.833/0001-25","uf":"PE","resp":"Samuel R","abertura":"10/04/2026","venda":"27/01/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS28422","problema":"—","email":"compras.pst@infinitylhan.com.br","telefone":"","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1-zRIhbLXqX80UHSGQ8VI_hQV1TZg_gE4"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1F08R5i71AlEts_RrQjTXGZse-vRY-nOs"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1xnqNd2sYVEFduyCqU9Q65F9xZZVqV6Hy"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=14rm48WQVWxjBP57I0tmUosXIlGwRAgyx"},{"name":"Cupom fiscal","type":"","url":"https://static-erpoint.gocase.com.br/invoices/merged/2026/03/CLIENT-RESELLERS28659-ITAPEVA.pdf"},{"name":"Cupom fiscal","type":"","url":"https://static-erpoint.gocase.com.br/invoices/merged/2026/01/CLIENT-RESELLERS28102-ITAPEVA.pdf"}]},{"id":"HIST-2025-000301","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"Tc imports","cnpj":"38.561.732/0002-04","uf":"PA","resp":"Beatriz N","abertura":"13/04/2026","venda":"30/01/2026","produto":"CASE","modelo":"Capa gocase guarde-iPhone 16 pro Max   Capa gocase clear logo-iPhone 16 pro max","nf":"—","novoPedido":"","problema":"Aguardando cliente pagar boleto em atraso para subir o pedido","email":"tecnologiacelularesimportados@gmail.com","telefone":"Tarcísio (vendedor) - 93981181108","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1lxEHeYmcNXd3F0tlzziBfivjFSsVZ5w9"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1e1f_YARBiEd7SEmGWVIHh2OxQXO9GITk"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1aFUjTaeQa3skM7NVSzJ9gQDc3hBaSVFz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1f-Tmc5X9rHIdnVSUvMMD2Azg-TBkIbvX"}]},{"id":"HIST-2025-000302","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"27/11/2025","produto":"CASE","modelo":"RED FLOWERS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1a1T5WdzyV9GudPEhKaey5u8RiD0ZG9mZ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1n_FQNopMcv6l305aeHc1fqvX3DIT9NS4"}]},{"id":"HIST-2025-000303","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"19/01/2026","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1UBZpLrDGhxHdh3zw1uyPB2yU6zU9WAsf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1POdgdAwWsb28wsP0XB1Q_RhMVTlp6Lc3"}]},{"id":"HIST-2025-000304","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"12/12/2025","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 14 PRO","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1f79cV5qPVbNTpddEa2ceWucn1xEaiDbB"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1yMHQXPqM2RT8qq_oGMDMMNrXUw42YOhP"}]},{"id":"HIST-2025-000305","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"24/09/2025","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 11","nf":"—","novoPedido":"","problema":"Pedido passou do prazo de troca","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1qi4qPTmmrko9DJ0txgPIH57GUKWaxePM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1S6BFaPDUrw2qIfL0i-SUIo-6foCm4fF4"}]},{"id":"HIST-2025-000306","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"09/10/2025","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 11 PRO","nf":"—","novoPedido":"","problema":"Pedido passou do prazo de troca","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1P8nw9swVht1Ib3G5KNg3yWrWGtVeFka0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fq6DWSQIVFf3t_mtu9hG60AdUtKHuqsb"}]},{"id":"HIST-2025-000307","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"08/12/2025","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 16 PRO","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=12fue4QcFekuhbus0vnfa0vRJfHZN0sJu"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1e6s89hpOlf9ThdovIfKF5JV2z35cHfli"}]},{"id":"HIST-2025-000308","tipo":"Troca/Garantia","historico":true,"status":"NEGADA","statusOriginal":"Pedido negado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"23/09/2025","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 13 PRO MAX","nf":"—","novoPedido":"","problema":"Pedido fora do prazo de troca","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1wJJf-GfFG0Ty8l6q8mhPL-KoKdvQ069a"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jwCWWDQMjbuIW8gfSiow9Hy9GAUGbyci"}]},{"id":"HIST-2025-000309","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"05/03/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Capinha não está amarelada","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1EAXfmx8x6S-7lsJ20_x2AsD8ke9UjVDy"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1L4v2S3DBaUHSgCkdd94NKBxkRbTSMY2q"}]},{"id":"HIST-2025-000310","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"03/02/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vjfGn4H5MjrQyKV29dZl1AX9euQgVU8q"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1O9H-MhdJVfKunGzvOA3c1teGyLimHCRY"}]},{"id":"HIST-2025-000311","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"16/01/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 12 PRO MAX","nf":"—","novoPedido":"","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1qsQMDRJZHHxUSCBU-uVsj_d_xvhaYRft"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1giTX5of_faV7kZQChS2vKMd-nhQIt4xp"}]},{"id":"HIST-2025-000312","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"16/01/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1A7dRFFUyyEftU5I_NuNZa4NrDrNnnuC1"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=15hsviOJLMkiAB5F8ahVHvWRDkcTsh0Ly"}]},{"id":"HIST-2025-000313","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/04/2026","venda":"10/02/2026","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1jmLkCb53ViiukQYx3X4iUDa4wtYpSj9m"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1xo51OmxFSq1eTvYury3HmhLOnc0ItVc3"}]},{"id":"HIST-2025-000314","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"14/04/2026","venda":"18/03/2026","produto":"CASE","modelo":"COTTAGECORE CORES BOWS - IPHONE 15 PRO","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ffAfLerTQWAQ1g6776frlkthenl1Bx-E"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Lzqan5-pptFw3tsTRSma1jt-P6NbuQHx"}]},{"id":"HIST-2025-000315","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"15/04/2026","venda":"24/02/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"RESELLERS29918","problema":"—","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1LwcoLNSsCXFbRiaMlNOtKg1nxBaTEdXg"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_-nlcd-5odbPiOWxqK5DUgJ9a1l0IX7V"}]},{"id":"HIST-2025-000316","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"Icasegv","cnpj":"39.332.188/0001-01","uf":"MG","resp":"Beatriz N","abertura":"15/04/2026","venda":"29/01/2026","produto":"CASE","modelo":"Fancy Hearts - 16 Plus","nf":"—","novoPedido":"RESELLERS29886","problema":"Capinha amarelada","email":"carolinatemponi@hotmail.com","telefone":"Carolina (33)999094626","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1IIeAUnUehBqMtBCGI-1sf2sSwrDVaLwJ"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1nwNS8JxPP92OafclxIlbSvsfOTKd2-Y2"}]},{"id":"HIST-2025-000317","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"17/04/2026","venda":"05/12/2025","produto":"CASE","modelo":"Margaridinhas Clean - Iphone 11","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1R_XDoAq7lzKASEVHKXDXYjNEYx_xCEok"}]},{"id":"HIST-2025-000318","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"19/02/2026","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 13 PRO","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1sd61BxcYsnqUjo_FoRQy8fKJIpH6F5pw"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1cmtKEczcrbYfThLuHJ2298d9wW8iTv6L"}]},{"id":"HIST-2025-000319","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"12/01/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11buk_dY9r0_TAvvh9Y00lWK9tOK2G13J"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1xjgecdi8ZpI4OksQ2kLA4j2-EHtIk4LD"}]},{"id":"HIST-2025-000320","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"20/03/2026","produto":"CASE","modelo":"LACINHO - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Descascamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1eC9sKZ4oNedcWpdLvkLp_eHa_vpH7mhD"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1XgrvSjf4y4HaAVPvj6X9KA99drVlnOL5"}]},{"id":"HIST-2025-000321","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"15/10/2025","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 16","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1oh-72K3eS1UOy-H1m_izd5HseDvSRMTC"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fYLgOihxTqJqKshm5enAOv_2CF63zu-C"}]},{"id":"HIST-2025-000322","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"22/12/2025","produto":"CASE","modelo":"GOOD VIBES STICKERS - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1TMWPEIUdXY4Mz6ODgSD_CHC8JmDIhj03"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ZLCZgGfKG2wbqXpkDgyHbpyt_MArUrEY"}]},{"id":"HIST-2025-000323","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"22/04/2026","venda":"18/12/2025","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 13 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1xDUq2CSQy15HIBMxMfVrxcqd9ocCdqAj"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1x0ZSiwSMlxJLEeeF1_Y_AQJei1U28mF9"}]},{"id":"HIST-2025-000324","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"23/04/2026","venda":"25/03/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=10maMa8wsQ5ezGd_HK0yU4ATGlTSaYTdk"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1N3233wk1lzl-yQjwmD1y0ernVcfayjk3"}]},{"id":"HIST-2025-000325","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"23/04/2026","venda":"04/12/2025","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 12","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=13goqOAFDuaJMQWLB3nAUAIzuKlGbc9p2"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TZ0S_wMTbvopNTAx_dPrOHFwGEN8sVbP"}]},{"id":"HIST-2025-000326","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"23/04/2026","venda":"02/02/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 12","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=12QaSy-hn0nZPBc9nqSY_iyH6fls7aJt8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1MxqTfv_ESOHrkpqS0oiOxSgtK6NTy6oF"}]},{"id":"HIST-2025-000327","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"23/04/2026","venda":"27/01/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Xt4jczl3u86_64U3zjg3JUsR6cvdqVQr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1wbTRTFdj7f_5Ne1JE2eWwAgP0devqUmN"}]},{"id":"HIST-2025-000328","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"30/04/2026","venda":"26/02/2026","produto":"CASE","modelo":"MAGSAFE CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ZTGAfc9OHevs5198ggCcX42zRfK0EoU8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1BhxWWnRVYesEYiZF_8h-OfmJl3Zy875o"}]},{"id":"HIST-2025-000329","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"30/04/2026","venda":"11/03/2026","produto":"CASE","modelo":"ESTRELAS MINIMALISTAS - IPHONE 13 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DT3PETkKBo4ed1Qde4IegSMpfJ0TEOiG"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10RP1sOW9aU44SqoqkypWWjvC-TDxeRzf"}]},{"id":"HIST-2025-000330","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"05/05/2026","venda":"20/01/2026","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1770voEdvDvqOQ4SMlYezAMp5G6_sC1Qf"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1kJoD-AGQ9j5YwCcF7tw-C_l1PAMIRAmg"}]},{"id":"HIST-2025-000331","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"06/05/2026","venda":"11/12/2025","produto":"CASE","modelo":"INFINITE AIR MARGARIDINHAS CLEAN - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1XzFER8_ItlKXy_tC0SdRuADT3wPPI16Z"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1vt6sDWthU3JO3O08iUiFMX_oK0TnPLfV"}]},{"id":"HIST-2025-000332","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"POWE CASE JN LTDA","cnpj":"48.894.605/0001-08","uf":"MG","resp":"Beatriz N","abertura":"06/05/2026","venda":"07/12/2025","produto":"CASE","modelo":"Case floralwhite - florai white - iphone 16 pro","nf":"—","novoPedido":"","problema":"Amarelamento","email":"upcase.jardimnorte@gmail.com","telefone":"+55 32 9154-3385","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1MHika9mxqlTbj6SsmAW32FYkMWRcuARK"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1HrgGEi9PI795Z3wY4qkSx7YiqgE4oIVp"}]},{"id":"HIST-2025-000333","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/05/2026","venda":"24/02/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1SEhfzlXq9GKGs9UtOa68IgokcZtl-6Sq"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1h2WNNxy2qRv4sarcXQ-cmL2J8eNYre8X"}]},{"id":"HIST-2025-000334","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/05/2026","venda":"06/03/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15abEUn5cBtYiAlW7BhzylEjBnrN9r-wO"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1gogbgGaotbHj8jVSi-MKkHZyRIK4ZKkp"}]},{"id":"HIST-2025-000335","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/05/2026","venda":"07/04/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 16 PRO MAX / CORAÇÕES MINIMALISTAS - IPHONE 15 PRO / VAN GOGH OBRAS - IPHONE 14 PRO MAX / CRIAÇÃO DE ADÃ - IPHONE 14 PRO MAX / CRIAÇÃO DE ADÃ - IPHONE 14 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1p29McJNKGkl1p6Zcu9KE-nXstsJbCGlH"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1bz053DFujVUbB3eTA7Yy4cciN3MCaeLD"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1HpD-ZuqyxGmRCZRbIm-3Kjaow0GcCSw8"},{"name":"Foto do item 4","type":"","url":"https://drive.google.com/open?id=174Ah6OsesWCehxFpOuxCoOURucWp0x-R"},{"name":"Foto do item 5","type":"","url":"https://drive.google.com/open?id=1OOYKwxerfCRAKPL5jqFqgrpy9vXGIhSR"},{"name":"Foto do item 6","type":"","url":"https://drive.google.com/open?id=1lqUVtM9SYxwtTZNuX5vSdVxHJ-VbybH7"},{"name":"Foto do item 7","type":"","url":"https://drive.google.com/open?id=1oXZtG-j9RKj63qps2QzyM1DEP1YrEtnC"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1TZF_cDnOlejfeq78itoJKMihU7iyvqjl"}]},{"id":"HIST-2025-000336","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/05/2026","venda":"07/04/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=15_o8r17csES90eqXrIFdSeIfKscvQ5J9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=17LVxwd_yfP_ShA5YHNuRuPEEwO6TL5Io"}]},{"id":"HIST-2025-000337","tipo":"Troca/Garantia","historico":true,"status":"DESCONTINUADO","statusOriginal":"Descontinuado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"12/05/2026","venda":"05/03/2026","produto":"CASE","modelo":"CLEAR LOGO BLACK - IPHONE 12 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1bPkzainG-Kewvq0N1ByHAbfhoiqPPF0V"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1-ziMI1-g-ABoXJ3VVr2otW-lSTMVo2d1"}]},{"id":"HIST-2025-000338","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"13/05/2026","venda":"26/03/2026","produto":"CASE","modelo":"JARDIM DAS CORES - IPHONE 16 PLUS","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1DHA7tEzpLOS6qdzfPhPp1vjPeLj7utXI"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1u_an7GLtcTM4NBfbUZ8uzVG_0S28l5Jk"}]},{"id":"HIST-2025-000339","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"ULTRACELL","cnpj":"26.922.718/001-29","uf":"PA","resp":"Beatriz N","abertura":"13/05/2026","venda":"07/05/2026","produto":"Térmicos (Garrafas","modelo":"GARRAFA CLEAR-650ML","nf":"—","novoPedido":"","problema":"Amarelamento","email":"silvamelojosemaria@gmail.com","telefone":"BRENO- (91)9 85726427","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1tceguJHQEC_F8aeoQQQO_Iddbb4G2Yrt"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1fRYjJ12dJlSC_SujPG2YTWY98l6ElGOD"}]},{"id":"HIST-2025-000340","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"07/04/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"MANCHADA","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"2 Itens","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1Qm7Oo8XeYHYNVZZCf2lvsyugQPetR7G5"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1dLHdG1U1t7mlewakiGCOKUmZj-6v1VJz"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1xqXtC_yiTyflWiulxsA21HUURVEv3Fox"}]},{"id":"HIST-2025-000341","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"11/03/2026","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1WvFYNPWSf9FzNqAU7J9nwkJL6CsJTNz4"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Lxw8NnJMaVedJGkBhYlLcrJSGn41Xk7E"}]},{"id":"HIST-2025-000342","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"05/03/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPH 12 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1hMmrRsUvBAV1QcMM0MrBAOucTrNl9r_z"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1gK9_0KSQvWaMfB0TbBWFH3E4_2h-papZ"}]},{"id":"HIST-2025-000343","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"20/03/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1SD7XG2d3kRqM2Ax1OQAPvQjqSJ4IcfC8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1S_sHYBb5KdmqZNsyInktZnGIBtsHMUOB"}]},{"id":"HIST-2025-000344","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"02/04/2026","produto":"CASE","modelo":"LILAC FLOWERS - IPHONE 15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1JLvwcqb85ioci0fgoO43dBPJX6Rq8eqR"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1W8xGaoLG-9obNTg1vO7viTNoMxa6xGSB"}]},{"id":"HIST-2025-000345","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"10/02/2026","produto":"CASE","modelo":"TINY PINK FLOWERS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1GkuMhQc0V6runo8qld9guM7wqc5aC-_K"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1LacCaTI6bgfMPV8cD2fkIsaGP8aOJnqU"}]},{"id":"HIST-2025-000346","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"26/03/2026","produto":"CASE","modelo":"JARDIM DAS CORES -  16 PLUS","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ThV8ODIuRUKCuO-rJZtU5dsa6hDgTntM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_D4RTRism-iLn3xmBQWzpPhcADK9jiFV"}]},{"id":"HIST-2025-000347","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"21/05/2026","venda":"07/04/2026","produto":"CASE","modelo":"CLEAR WHITE - 16 PRO MAX","nf":"—","novoPedido":"","problema":"MANCHADA","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1nAeBeajiUc2hw4Ls0SpeArh6yskHB3ey"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1XLdVGIqfMWC9VSlZT8PbsD6j30wwt_uc"}]},{"id":"HIST-2025-000348","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"26/05/2026","venda":"13/04/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1kAAzv3PBfdaqKkTBiR_cEtT3vRj4PFzH"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1Y6gPSz_Vne1p4CfxwEA-qBuO2rgOaVzB"}]},{"id":"HIST-2025-000349","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"26/05/2026","venda":"26/02/2026","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 13/14/15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1fFbIQFP1IRfPH1osOjRJSXMfgqkcmIXh"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QwXnpCVHeSi5XrS33xIFuZ_9ee0cyGu0"}]},{"id":"HIST-2025-000350","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"26/05/2026","venda":"10/02/2026","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - IPHONE 13/14/15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vzsbAcip45ggkTNXP-Zi_odfeMhIHiTT"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1u1NoNOY17C4G8xKAdpw6VF7RB21bDudu"}]},{"id":"HIST-2025-000351","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"26/05/2026","venda":"12/02/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 13/14/15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1CcgvMWyTzdSRdnQqnJQBlhgveRA68sFr"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1RAHoWo-9IR0C_45StnwJZ4cO9uBaM--d"}]},{"id":"HIST-2025-000352","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"27/05/2026","venda":"05/01/2026","produto":"CASE","modelo":"MARGARIDINHAS CLEAN - INFINITE AIR IPH 17","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1hEAp0CXaYL-jXoOxx5vPSd7aaOwXrzgp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=11YK0-cFyfQhnOPCwvqWYeNcFsaUjEwQt"}]},{"id":"HIST-2025-000353","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"01/06/2026","venda":"24/03/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1vbvRGeMZ8sA43PWb4OzFHSWZkZ1K8p6m"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1wUlePQX5hgnejrI4Ow4eZjEJFfkwoVfo"}]},{"id":"HIST-2025-000354","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"01/06/2026","venda":"27/03/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1eyPFW6xFywIrJyNQy2hrwvv1NecVYxjS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=11-aKRbjja_jBBA4Nz9VGDTrftv3oLZmG"}]},{"id":"HIST-2025-000355","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"01/06/2026","venda":"27/12/2025","produto":"CASE","modelo":"MAGSAFE CLEAR LOGO WHITE - IPHONE 16 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1b52PAT_i5D903owhIGf3OFKL0NP9rXDn"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1yhJ-3SKj7ajrbyA6KnDjpQwlp9Fqw2IH"}]},{"id":"HIST-2025-000356","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"ULTRACELL","cnpj":"26.922.718/0001-29","uf":"PA","resp":"—","abertura":"02/06/2026","venda":"18/04/2025","produto":"CASE","modelo":"AYRTON SENNA - IP 12/12 PRO","nf":"—","novoPedido":"","problema":"Descascamento","email":"silvamelojosemaria@gmail.com","telefone":"PABLO - 91994889915","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ThH4WQ9J6eZzO8rPgF6dYA9sMM-BBTsg"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=14eL9W2S1QUJqdM_SmNRbrCyqJxwewjpt"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=13zdN4Sd3UCeDdrIrA41YYNg1ykEOsTbV"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1HDoOjvlkvFL3Rpy9zW2Ph_Gpu-v9nj-E"}]},{"id":"HIST-2025-000357","tipo":"Troca/Garantia","historico":true,"status":"APROVADA","statusOriginal":"Pedido criado","parceiro":"PERSONAL CELULAR","cnpj":"22.380.373/0001-78","uf":"PA","resp":"Samuel R","abertura":"02/06/2026","venda":"30/05/2026","produto":"Garrafa Urban","modelo":"—","nf":"—","novoPedido":"RESELLERS31038","problema":"Arranhão interno","email":"alex_xy_alex@hotmail.com","telefone":"Alex - 91991324338","qtd":"1 Item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1-bvw5iLFWxaHWu3fTC2YroWeKd8A7X3W"},{"name":"Cupom fiscal","type":"","url":"https://s3.amazonaws.com/api.treble.ai.files/68511/990761720238753.pdf"}]},{"id":"HIST-2025-000358","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"05/06/2026","venda":"20/01/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1_9A5TWo5u4Q8Ls1Z3fb-jjyr5QnhpswN"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1sE4GVw3eF6yKw0RYDYKpN0HYRwG2IukX"}]},{"id":"HIST-2025-000359","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"05/06/2026","venda":"12/02/2026","produto":"CASE","modelo":"CLEAR LOGO WHITE - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1IDcecE6qU-MiMYBkdrKJOGRQz93l_O4s"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1s_Pr03hf85OEU7kujpGcOBdob5cUED1e"}]},{"id":"HIST-2025-000360","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"23/04/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=19_VqUN1_Or3aL-x7qGwo9uWgeFtQqVG9"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1QbcyjY4oxqMLgs-kdEGagmE679NZShVL"}]},{"id":"HIST-2025-000361","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"23/04/2026","produto":"CASE","modelo":"POÁ CHIC - INFINITE AIR IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=18I_Jy6Z2GJhkzAC6j8_V5lhXLTcxNtTp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1BOoZRjDIUh9qefNuG_J1lv6siv4B95k8"}]},{"id":"HIST-2025-000362","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"12/03/2026","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 13/14/15","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1If0WFH4Fl3CsEdl9ftHJ9DY31r8euozb"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1U1C8MfdwbHFHFHDKJ8jD94c0LqN3o8vc"}]},{"id":"HIST-2025-000363","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"22/04/2026","produto":"CASE","modelo":"INFINITE AIR CLEAR LOGO WHITE - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ra2EDNcMC78zh4i39DxANxCssCOEPu6b"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1_u_OtcrnHrU1inMR6J6ib7g1_3iwZ29b"}]},{"id":"HIST-2025-000364","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"09/03/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 14 PRO","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=17ZFjoSUp3M2T51-MBWFsCm3Tv2gQLMWM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jAUXLIq6AW9w-F4bzU94FEyvyVp1X0Ws"}]},{"id":"HIST-2025-000365","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"11/03/2026","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 11 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1RfGbni5qg_BJgNljaYgKKQd8ERFq_BCH"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1cbqVQKu_Y4w8RVHgSWvu3-7N4hjyv0jo"}]},{"id":"HIST-2025-000366","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"21/05/2026","produto":"CASE","modelo":"PATRIMONIO DO BRASIL - IPHONE 17 PRO","nf":"—","novoPedido":"","problema":"Descascamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1PuXElY6_QMmi8bTNHqh8o8zcFd5Iz5l0"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1jXls4ra51Q7u1nqg_l4_rxFr93AXf50l"}]},{"id":"HIST-2025-000367","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"11/06/2026","venda":"25/05/2026","produto":"CASE","modelo":"FLORES DIVERTIDAS - IPHONE 15 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1cem21pFFLzbEZ8KSoBkIfxojUEp6oAfp"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1qRYAy2kVJr8z4c0ItqjU5hSagtMCSuxa"}]},{"id":"HIST-2025-000368","tipo":"Troca/Garantia","historico":true,"status":"EM_ANALISE","statusOriginal":"em análise","parceiro":"ULTRACELL","cnpj":"26.922.718/0001-29","uf":"PA","resp":"Samuel R","abertura":"12/06/2026","venda":"12/05/2026","produto":"Térmicos (Garrafas","modelo":"—","nf":"—","novoPedido":"RESELLERS31040","problema":"PRODUTOS VIERAM COM NOMES PERSONALIZADOS ERRADOS. OBS: ERA PRA TER VINDO SOMENTE A ESTAMPA ORIGINAL","email":"silvamelojosemaria@gmail.com","telefone":"BRENO (VENDEDOR) 91 985726427","qtd":"4 ou mais","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=11NtBY_gUpiLjzRKsAXpm-o6oSs5ndt_U"},{"name":"Foto do item 2","type":"","url":"https://drive.google.com/open?id=1qpgI0YohbFNrxZLbaEh2Zbyrv_B6OZBm"},{"name":"Foto do item 3","type":"","url":"https://drive.google.com/open?id=1lUYnUtb9E5BOLlpHQMeLwlNvqwirhi3D"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1qjhHttYp9Z_bdvU0mAKXvItD7HN4XhMo"}]},{"id":"HIST-2025-000369","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"15/06/2026","venda":"11/03/2026","produto":"CASE","modelo":"BLACK HEARTS - IPHONE 16","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1N9vQ9JDpPcnnUMr74ybNXdHFVFlkliZ8"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1pOHSgme8U7FPp2WA40H6_CXL-wGF1w7k"}]},{"id":"HIST-2025-000370","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/06/2026","venda":"08/04/2026","produto":"CASE","modelo":"CLEAR WHITE - IPHONE 15 PLUS","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1l1g5IJL-rYgFTnl3-5WoE1PFdFwI64gS"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1FCC8_yVDrll1mB8pDjfvY32FDYTBf9pZ"}]},{"id":"HIST-2025-000371","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/06/2026","venda":"09/01/2026","produto":"CASE","modelo":"COTTAGECORE CORE BOWS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Descascamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1yzp36IubaZnsCMw6NhwNsNDelgL1WtoX"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=10Z1rCYJN7G2C4ZTgv1dr94RIKlho2Uuz"}]},{"id":"HIST-2025-000372","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/06/2026","venda":"28/03/2026","produto":"CASE","modelo":"CORAÇÕES MINIMALISTAS - IPHONE 17 PRO MAX","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=1ToHA68ccK35mQ49-CuiJNNBLht4hf9Rd"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1ofJQ5XKQeNi130aVUh2fw5rgBd3mROyO"}]},{"id":"HIST-2025-000373","tipo":"Troca/Garantia","historico":true,"status":"SEM_INFO","statusOriginal":"—","parceiro":"KING CEL","cnpj":"26.059.806/0001-49","uf":"MG","resp":"Beatriz N","abertura":"16/06/2026","venda":"23/12/2025","produto":"CASE","modelo":"VENTOS DE PRIMAVERA - IPHONE 12 / 12PRO","nf":"—","novoPedido":"","problema":"Amarelamento","email":"kingcelgv@gmail.com","telefone":"RODRIGO (PROPRIETÁRIO) (33)99850-1515","qtd":"1 item","anexos":[{"name":"Foto do item 1","type":"","url":"https://drive.google.com/open?id=156w9UUvRgPVaTruItQFTUyotf_2GrBtM"},{"name":"Cupom fiscal","type":"","url":"https://drive.google.com/open?id=1WjQItYQePHMsdR7RFcYIir8Sx9mIGehf"}]}];

/* ===================== Histórico (pós-venda, importado da planilha 2025+) ===================== */
function Historico({ nav }) {
  const [q, setQ] = React.useState("");
  const [fStatus, setFStatus] = React.useState("Todos");
  const [fAno, setFAno] = React.useState("Todos");
  const [report, setReport] = React.useState(null);
  const [aviso, setAviso] = React.useState("");
  const anos = React.useMemo(() => {
    const s = new Set(HISTORICO.map(h => (h.abertura.split("/")[2] || "")).filter(Boolean));
    return ["Todos", ...Array.from(s).sort()];
  }, []);
  const statusOpts = ["Todos", ...Object.keys(HSTATUS)];
  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return HISTORICO.filter(h => {
      if (fStatus !== "Todos" && h.status !== fStatus) return false;
      if (fAno !== "Todos" && !h.abertura.endsWith(fAno)) return false;
      if (!term) return true;
      return [h.id, h.parceiro, h.cnpj, h.produto, h.modelo, h.problema, h.resp, h.uf]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(term));
    });
  }, [q, fStatus, fAno]);
  const count = (s) => HISTORICO.filter(h => h.status === s).length;

  const exportarCSV = () => {
    const cols = [
      ["id", "Número"], ["statusOriginal", "Status original (pós-venda)"], ["status", "Status plataforma"],
      ["parceiro", "Revendedor"], ["cnpj", "CNPJ"], ["uf", "UF"], ["resp", "Responsável"],
      ["abertura", "Abertura"], ["venda", "Data da venda"], ["produto", "Produto"],
      ["modelo", "Modelo / estampa"], ["qtd", "Quantidade"], ["novoPedido", "Novo pedido"],
      ["email", "E-mail"], ["telefone", "Telefone / contato"], ["problema", "Motivo / observação"],
    ];
    const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const head = cols.map(c => esc(c[1])).join(";");
    const body = rows.map(r => cols.map(([k]) => esc(k === "status" ? (HSTATUS[r.status]?.label || r.status) : r[k])).join(";")).join("\r\n");
    const csv = "\uFEFF" + head + "\r\n" + body; // BOM p/ Excel reconhecer acentos
    const nome = `historico_trocas_garantias_${rows.length}_registros.csv`;
    const ok = baixarArquivo(nome, csv, "text/csv;charset=utf-8");
    setAviso(ok ? `CSV gerado com ${rows.length} registro(s). Se nada baixar, é restrição deste preview — no site publicado funciona normalmente.` : "Download bloqueado neste preview — funciona no site publicado.");
    setTimeout(() => setAviso(""), 6000);
  };
  const gerarRelatorio = () => setReport({ html: relatorioHTML("historico", []), title: "Histórico de Trocas e Garantias" });

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.text }}>Histórico de Trocas e Garantias</h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Registros importados da planilha do canal de atendimento de pós-venda (de 2025 em diante). Somente leitura · {HISTORICO.length} registros.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn icon={Download} onClick={exportarCSV}>Exportar CSV</Btn>
          <Btn icon={BarChart3} variant="outline" onClick={gerarRelatorio}>Relatório</Btn>
        </div>
      </div>
      {aviso && <div className="text-xs mb-3 rounded-lg px-3 py-2" style={{ background: C.coralSoft, color: C.coralDark }}>{aviso}</div>}
      <div className="mb-4" />

      <div className="grid sm:grid-cols-5 gap-3 mb-4">
        <StatCard icon={FileText} label="Total" value={HISTORICO.length} color={C.coral} />
        <StatCard icon={CheckCircle2} label="Aprovadas" value={count("APROVADA")} color={C.green} />
        <StatCard icon={XCircle} label="Negadas" value={count("NEGADA")} color={C.coral} />
        <StatCard icon={Clock} label="Em análise" value={count("EM_ANALISE")} color={C.violet} />
        <StatCard icon={AlertTriangle} label="Sem info" value={count("SEM_INFO")} color="#8A8A99" />
      </div>

      <Card className="p-3 mb-4">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por loja, CNPJ, produto, estampa, responsável…"
            className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none" style={{ borderColor: C.line }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} style={{ color: C.muted }} />
          {statusOpts.map(s => (
            <button key={s} onClick={() => setFStatus(s)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={fStatus === s ? { background: C.coral, color: "white" } : { background: C.bg, color: C.muted }}>
              {s === "Todos" ? "Todos" : HSTATUS[s].label}
            </button>
          ))}
          <span className="w-px h-5 mx-1" style={{ background: C.line }} />
          {anos.map(a => (
            <button key={a} onClick={() => setFAno(a)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={fAno === a ? { background: C.violet, color: "white" } : { background: C.bg, color: C.muted }}>{a}</button>
          ))}
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: C.muted }}>Nenhum registro encontrado com os filtros atuais.</div>
        ) : (
          <DataTable rows={rows} cols={["Número", "Revendedor", "UF", "Produto", "Status", "Abertura", ""]} onRow={r => nav("hist-detalhe", r.id)} render={r => (
            <>
              <td className="px-4 py-3 font-mono font-semibold" style={{ color: C.coral }}>{r.id}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{r.parceiro}</td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.uf}</td>
              <td className="px-4 py-3" style={{ color: C.text }}>{r.produto}</td>
              <td className="px-4 py-3"><Pill {...HSTATUS[r.status]} /></td>
              <td className="px-4 py-3" style={{ color: C.muted }}>{r.abertura}</td>
              <td className="px-4 py-3"><ChevronRight size={16} style={{ color: C.muted }} /></td>
            </>
          )} />
        )}
      </Card>
      {rows.length > 0 && rows.length !== HISTORICO.length && (
        <p className="text-xs mt-3" style={{ color: C.muted }}>Mostrando {rows.length} de {HISTORICO.length} registros.</p>
      )}
      {report && <ReportViewer report={report} onClose={() => setReport(null)} toast={(m) => { setAviso(m); setTimeout(() => setAviso(""), 6000); }} />}
    </div>
  );
}

function HistDetalhe({ r, back }) {
  if (!r) return null;
  return (
    <div>
      <button onClick={back} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.muted }}><ArrowLeft size={15} /> Voltar</button>
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h1 className="text-2xl font-bold font-mono" style={{ color: C.text }}>{r.id}</h1>
        <Pill {...HSTATUS[r.status]} />
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: C.bg, color: C.muted, border: `1px solid ${C.line}` }}>Histórico · somente leitura</span>
      </div>
      <p className="text-sm mb-6" style={{ color: C.muted }}>
        Troca/Garantia · Aberta em {r.abertura} · Responsável {r.resp}
        {r.statusOriginal && r.statusOriginal !== "—" ? <> · Status original (pós-venda): <b style={{ color: C.text }}>{r.statusOriginal}</b></> : null}
      </p>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Dados do revendedor</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Revendedor", r.parceiro], ["CNPJ", r.cnpj], ["UF", r.uf], ["E-mail", r.email || "—"], ["Telefone / contato", r.telefone || "—"]].map(([k, v]) =>
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium break-words" style={{ color: C.text }}>{v}</div></div>)}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Dados da venda e produto</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Produto", r.produto], ["Modelo / estampa", r.modelo], ["Quantidade", r.qtd || "—"], ["Data da venda", r.venda], ["Novo pedido", r.novoPedido || "—"]].map(([k, v]) =>
                <div key={k}><div className="text-xs" style={{ color: C.muted }}>{k}</div><div className="font-medium" style={{ color: C.text }}>{v}</div></div>)}
            </div>
            <div className="mt-3"><div className="text-xs" style={{ color: C.muted }}>Motivo / observação</div><p className="text-sm" style={{ color: C.text }}>{r.problema}</p></div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold mb-3" style={{ color: C.text }}>Anexos da planilha</h2>
            {(r.anexos && r.anexos.length > 0) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {r.anexos.map((a, i) => (
                  <button key={i} onClick={() => abrirDoc(a, null)} className="block rounded-xl border overflow-hidden text-left w-full hover:shadow-md transition" style={{ borderColor: C.line }}>
                    <div className="h-24 flex items-center justify-center bg-gray-50" style={{ color: C.coral }}><Paperclip size={26} /></div>
                    <div className="p-2">
                      <div className="text-xs font-medium truncate" style={{ color: C.text }}>{a.name}</div>
                      <div className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: C.coral }}><Eye size={10} /> Visualizar</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: C.muted }}>Sem anexos registrados na planilha.</p>
            )}
          </Card>
        </div>

        <Card className="p-5 self-start">
          <h2 className="font-bold mb-3" style={{ color: C.text }}>Registro do pós-venda</h2>
          <div className="space-y-3 text-sm">
            <div><div className="text-xs" style={{ color: C.muted }}>Status original</div><div className="font-medium" style={{ color: C.text }}>{r.statusOriginal || "—"}</div></div>
            <div><div className="text-xs" style={{ color: C.muted }}>Status na plataforma</div><div className="mt-1"><Pill {...HSTATUS[r.status]} /></div></div>
            <div><div className="text-xs" style={{ color: C.muted }}>Responsável</div><div className="font-medium" style={{ color: C.text }}>{r.resp}</div></div>
            <div><div className="text-xs" style={{ color: C.muted }}>Data de abertura</div><div className="font-medium" style={{ color: C.text }}>{r.abertura}</div></div>
          </div>
          <div className="mt-4 rounded-xl p-3 text-xs" style={{ background: C.bg, color: C.muted }}>
            Importado da planilha do canal de atendimento de pós-venda. Este registro é histórico e não pode ser editado pela plataforma.
          </div>
        </Card>
      </div>
    </div>
  );
}


/* ===================== Acervo de documentos (admin/gestor) ===================== */
function AcervoDocs({ acervo, onAdd, onRemove, toast }) {
  const docs = acervo || [];
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
        {docs.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>Nenhum documento no acervo ainda. Adicione acima.</p>
        ) : (
          <div className="space-y-2">
            {docs.map(d => {
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
                  <button onClick={() => onRemove(d.id)} title="Excluir" className="shrink-0 rounded-lg p-2 hover:bg-gray-50" style={{ color: C.coral }}><X size={16} /></button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ===================== Root ===================== */
// Sessão do usuário logado, persistida para sobreviver a F5 / reabertura da aba.
const SESSION_KEY = "gocase_session_v1";
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
  const [themePref, setThemePref] = useState(() => { try { return localStorage.getItem("gocase_theme") || "auto"; } catch (e) { return "auto"; } });
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

      if (Array.isArray(data.requests)) setRequests(data.requests);
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
    toast("Conta criada! Bem-vindo(a) ao portal do revendedor.");
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
      : status === "APROVADA"   ? "Solicitação aprovada pelo pós-venda."
      : status === "NEGADA"     ? `Solicitação negada.${obs ? ` Motivo: ${obs}` : ""}`
      : status === "AGUARDANDO" ? `Aguardando informações ou documentos do revendedor.${obs ? ` Detalhe: ${obs}` : ""}`
      : status === "CONCLUIDA"  ? "Processo concluído e revendedor comunicado."
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
    const prefix = payload.tipo === "Cadastro" ? "CAD" : "TG";
    const nums = requests.filter(r => r.id.startsWith(prefix)).map(r => parseInt(r.id.split("-")[2], 10)).filter(n => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const today = new Date();
    const prazoDate = new Date(today); prazoDate.setDate(prazoDate.getDate() + 7);
    const req = {
      id: `${prefix}-${today.getFullYear()}-${String(next).padStart(6, "0")}`,
      abertura: fmtBR(today), prazo: fmtBR(prazoDate), sla: "DENTRO", ownerEmail: currentUser?.email || payload.email || "", ...payload,
    };
    setRequests(rs => [req, ...rs]);
    db.saveRequest(req);
    // Notifica a equipe interna sobre o novo envio
    pushNotif({ message: `Nova solicitação de ${req.tipo === "Cadastro" ? "cadastro" : "troca/garantia"} recebida (${req.id}) de ${req.parceiro}.`, requestId: req.id, color: C.cyan, audience: "interno" });
    // Notifica o cliente sobre o status inicial (inclui decisão automática da IA)
    const negadaIA = req.status === "NEGADA" && req.resp === "IA";
    const msgCliente = negadaIA
      ? `Sua solicitação ${req.id} foi negada automaticamente pela IA (fora do prazo de 6 meses).`
      : `Sua solicitação ${req.id} foi recebida e está ${STATUS[req.status].label.toLowerCase()}.`;
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
    [data-theme="dark"] body{background:#14141B}
    [data-theme="dark"] .bg-white{background-color:#1E1E29 !important}
    [data-theme="dark"] .bg-gray-50{background-color:#23232E !important}
    [data-theme="dark"] .hover\\:bg-gray-50:hover{background-color:#262633 !important}
    [data-theme="dark"] .bg-gray-100{background-color:#262633 !important}
    [data-theme="dark"] input,[data-theme="dark"] textarea,[data-theme="dark"] select{color:#ECECF1}
    [data-theme="dark"] input::placeholder,[data-theme="dark"] textarea::placeholder{color:#71718A}
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

  if (view === "detalhe") screen = <Detalhe r={selected} back={() => nav(portal === "externo" ? "minhas" : "lista-tg")} interno={portal === "interno"} openModal={setModal} currentUser={currentUser} onSendMsg={sendChatMsg} onReopenRequest={reopenRequest} />;
  else if (view === "hist-detalhe" && portal === "interno") screen = <HistDetalhe r={HISTORICO.find(h => h.id === selId)} back={() => nav("historico")} />;
  else if (view === "cliente" && portal === "interno") screen = <ClienteDetalhe nome={selId} requests={requests} users={users} nav={nav} historico={HISTORICO} />;
  else if (portal === "externo") {
    screen = { inicio: <ExtInicio nav={nav} requests={requests} user={currentUser} />, "nova-tg": <ExtNovaTG nav={nav} toast={toast} onCreate={createRequest} user={currentUser} />, "nova-cad": <ExtNovaCad nav={nav} toast={toast} onCreate={createRequest} acervo={acervo} />, minhas: <ExtMinhas nav={nav} requests={requests} user={currentUser} />, manual: <Manual />, perfil: <Perfil toast={toast} user={currentUser} /> }[view];
  } else {
    screen = { dash: <IntDash nav={nav} requests={requests} />, "lista-tg": <IntLista nav={nav} requests={requests} tipo="Troca/Garantia" titulo="Trocas e Garantias" />, "lista-cad": <IntLista nav={nav} requests={requests} tipo="Cadastro" titulo="Solicitações de Cadastro" />, clientes: <Clientes requests={requests} users={users} nav={nav} />, acervo: (["ADMIN", "GESTOR"].includes(currentUser?.role) ? <AcervoDocs acervo={acervo} onAdd={addAcervoDoc} onRemove={removeAcervoDoc} toast={toast} /> : <IntDash nav={nav} requests={requests} />), historico: <Historico nav={nav} />, usuarios: <Usuarios toast={toast} users={users} currentUser={currentUser} onAddUser={addUser} onUpdateUser={updateUser} />, relatorios: <Relatorios toast={toast} requests={requests} />, config: <Config toast={toast} templates={templates} onSaveTemplates={saveTemplates} /> }[view];
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
      <Shell portal={portal} switchPortal={switchPortal} view={view} nav={nav} onLogout={logout} notifOpen={notifOpen} setNotifOpen={setNotifOpen} user={currentUser} notifs={visibleNotifs} badge={badge} onOpenNotifs={openNotifs} themePref={themePref} onCycleTheme={cycleTheme}>
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
