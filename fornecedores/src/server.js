/*
 * Backend do gocase Cadastro de Fornecedores — worker GoDeploy sobre o banco nativo
 * (env.DB, SQLite). App GoDeploy separado do Service Desk, com banco próprio: aqui só
 * entram solicitações de Cadastro.
 *
 * O app é PÚBLICO no GoDeploy (qualquer pessoa abre o formulário de cadastro), então
 * a separação de acesso é feita AQUI, no servidor:
 *   - Rotas /api/public/* → abertas: enviar solicitação (só o CNPJ é obrigatório),
 *     anexar arquivos e consultar o status pelo protocolo + CNPJ. Nunca devolvem
 *     dados de outras solicitações, contas ou links do acervo.
 *   - Todo o resto (dados, dashboard, relatórios, usuários, arquivos) exige sessão
 *     de equipe (ADMIN/GESTOR/COLABORADOR): login + senha → cookie HttpOnly
 *     `gcf_session` (também aceito como `Authorization: Bearer`).
 *
 * Senhas: hash PBKDF2-SHA256. A senha padrão antiga (que está no repositório público)
 * é recusada no login e, se alguma conta ainda a usa, é trocada pela senha do segredo
 * SEED_ADMIN_PASSWORD (setAppSecret). Sem esse segredo, essas contas ficam sem login.
 *
 * O gateway do GoDeploy serve os assets estáticos ANTES de chamar o worker, então
 * aqui tratamos apenas as rotas /api/*.
 *
 * API pública
 *   GET    /api/health
 *   GET    /api/public/acervo                   → [{ id, nome, documento, empresa, descricao, envioAutomatico }] (sem links)
 *   POST   /api/public/files  {name,type,size,data(base64)} → { id, name, type, size, url }
 *   POST   /api/public/cadastro {cnpj, dados…}  → { id, abertura, prazo, entregues:[doc] }
 *   GET    /api/public/status?id=&cnpj=         → { resultados: [{ id, status, abertura, prazo, ultimaAtualiz, entregues? }] }
 *          Basta um dos dois: só CNPJ lista todas as solicitações da empresa (com documentos);
 *          só protocolo mostra o status, sem documentos (o protocolo é sequencial).
 *   GET    /api/public/entrega/:token/:docId    → arquivo de um documento do acervo com
 *          "envio automático" ou enviado pela equipe nessa solicitação (token só vai para quem enviou).
 *          Documentos sem envio automático só saem por aqui depois que a equipe clica em
 *          "Enviar ao fornecedor" no chamado (docsEnviados[].liberado).
 *   POST   /api/login        {email,password}   → { user, token } + cookie | 401 | 403 | 429
 *   POST   /api/logout
 *   GET    /api/me                              → { user } | 401
 *
 * API da equipe (sessão obrigatória)
 *   POST   /api/me/password  {current,next}     → troca a própria senha
 *   GET    /api/bootstrap                       → tudo que o portal interno precisa
 *   GET    /api/users | POST /api/users | PATCH/DELETE /api/users/:email  (mutação: ADMIN/GESTOR)
 *   PUT    /api/requests/:id {request}
 *   POST   /api/notifications | POST /api/notifications/read {ids:[]}
 *   PUT    /api/templates
 *   GET    /api/acervo | PUT/DELETE /api/acervo/:id  (mutação: ADMIN/GESTOR)
 *   POST   /api/files | GET /api/files/:id[?download=1]
 *   GET    /api/reseller-lookup?cnpj=           → base de clientes gocase (Datamart)
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CHUNK = 700000; // base64 por linha (limite de linha do SQLite é 2 MB)
const SESSION_COOKIE = "gcf_session";
const SESSION_TTL_MS = 12 * 3600 * 1000;
const STAFF = ["ADMIN", "GESTOR", "COLABORADOR"];
const MANAGERS = ["ADMIN", "GESTOR"];
// Senhas que já foram publicadas (código aberto) — nunca aceitas.
const BLOCKED_PASSWORDS = ["123456QAZ"];
const SEED_ADMINS = [
  { email: "beatriz.nogueira@gocase.com", name: "Beatriz Nogueira", role: "ADMIN" },
  { email: "rodrigo.costa@gocase.com", name: "Rodrigo Costa", role: "ADMIN" },
  { email: "larissa.simoes@gocase.com", name: "Larissa Simões", role: "ADMIN" },
];
const PUBLIC_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "application/pdf"];
const PUBLIC_FILE_MAX = 10 * 1024 * 1024; // 10 MB por arquivo
const LOGIN_MAX_FAILS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { ...JSON_HEADERS, ...headers } });

/* ---------------------------------- schema --------------------------------- */
let schemaReady = null;
function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = (async () => {
      const ddl = [
        "CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, status TEXT, cnpj TEXT, telefone TEXT, contato TEXT, created_at TEXT DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, owner_email TEXT, status TEXT, tipo TEXT, updated_ts INTEGER, payload TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, audience TEXT, for_user_email TEXT, read INTEGER DEFAULT 0, ts INTEGER, payload TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS acervo (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER, created_at TEXT DEFAULT (datetime('now')))",
        "CREATE TABLE IF NOT EXISTS file_chunks (file_id TEXT NOT NULL, seq INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (file_id, seq))",
        "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, email TEXT NOT NULL, expires_ts INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, fails INTEGER NOT NULL, first_ts INTEGER NOT NULL)",
      ];
      for (const sql of ddl) await env.DB.exec(sql, []);
      await secureAccounts(env);
      await normalizarAcervo(env);
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/* Garante que nenhuma conta use senha publicada e semeia os admins num banco vazio.
 * A nova senha vem do segredo SEED_ADMIN_PASSWORD; sem ele, a conta fica sem senha
 * (login bloqueado) até um gestor definir outra. */
async function secureAccounts(env) {
  const seedPw = env.SEED_ADMIN_PASSWORD && !BLOCKED_PASSWORDS.includes(env.SEED_ADMIN_PASSWORD)
    ? env.SEED_ADMIN_PASSWORD : "";
  const r = await env.DB.query("SELECT email, password, role FROM users", []);
  const rows = r.rows || [];
  for (const u of rows) {
    let blocked = false;
    for (const bad of BLOCKED_PASSWORDS) if (await verifyPassword(bad, u.password)) blocked = true;
    if (blocked) {
      await env.DB.exec("UPDATE users SET password = ? WHERE email = ?", [seedPw ? await hashPassword(seedPw) : "", u.email]);
      await env.DB.exec("DELETE FROM sessions WHERE email = ?", [u.email]);
    }
  }
  if (!rows.some((u) => STAFF.includes(u.role)) && seedPw) {
    for (const a of SEED_ADMINS) await upsertUser(env, { ...a, password: seedPw, status: "Ativo" });
  }
}

/* --------------------------------- helpers --------------------------------- */
const lower = (s) => String(s || "").trim().toLowerCase();
const stripPw = ({ password, ...rest }) => rest;
const parse = (s, def = null) => {
  try {
    return JSON.parse(s);
  } catch {
    return def;
  }
};
const str = (v, max = 300) => String(v == null ? "" : v).trim().slice(0, max);
const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
function cnpjValido(d) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n) => {
    let soma = 0, peso = n - 7;
    for (let i = 0; i < n; i++) { soma += Number(d[i]) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}
const fmtCnpj = (d) => `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
// Datas no fuso de Brasília (o worker roda em UTC).
const fmtBR = (ts) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(ts));
const fmtBRFull = (ts) => new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}
const sessionCookie = (token, maxAgeS) =>
  `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeS}`;

/* ----------------------------------- senha ---------------------------------- *
 * Hash de senha via PBKDF2-SHA256 (Web Crypto — crypto.subtle). Formato armazenado:
 * pbkdf2$<iterações>$<salt em base64>$<hash em base64>. Contas legadas em texto puro
 * são migradas para hash no primeiro login bem-sucedido. */
const PBKDF2_ITERATIONS = 100000;

function bufToB64(buf) {
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function deriveBits(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256,
  );
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bufToB64(salt)}$${bufToB64(bits)}`;
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function isHashed(stored) {
  return typeof stored === "string" && stored.startsWith("pbkdf2$");
}
async function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  if (isHashed(stored)) {
    const [, iterStr, saltB64, hashB64] = stored.split("$");
    const iterations = parseInt(iterStr, 10) || PBKDF2_ITERATIONS;
    const bits = await deriveBits(password, b64ToBuf(saltB64), iterations);
    return timingSafeEqual(new Uint8Array(bits), b64ToBuf(hashB64));
  }
  // Conta legada, senha ainda em texto puro no banco.
  return stored === password;
}
async function hashIfNeeded(password) {
  if (!password || isHashed(password)) return password || "";
  return hashPassword(password);
}
// Regra mínima para senhas novas definidas pela equipe.
function senhaFraca(pw) {
  return !pw || String(pw).length < 8 || BLOCKED_PASSWORDS.includes(pw);
}

/* --------------------------------- contas ---------------------------------- */
async function getUser(env, email) {
  const r = await env.DB.query("SELECT * FROM users WHERE email = ?", [lower(email)]);
  return r.rows && r.rows[0] ? r.rows[0] : null;
}

async function upsertUser(env, u) {
  const email = lower(u.email);
  if (!email) throw new Error("email required");
  const password = await hashIfNeeded(u.password);
  await env.DB.exec(
    `INSERT INTO users (email, password, name, role, status, cnpj, telefone, contato)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       password = excluded.password, name = excluded.name, role = excluded.role,
       status = excluded.status, cnpj = excluded.cnpj, telefone = excluded.telefone,
       contato = excluded.contato`,
    [
      email,
      password,
      u.name || "",
      u.role || "COLABORADOR",
      u.status || "Ativo",
      u.cnpj || "",
      u.telefone || "",
      u.contato || "",
    ],
  );
  return stripPw(await getUser(env, email));
}

async function listUsers(env) {
  const r = await env.DB.query("SELECT * FROM users ORDER BY created_at ASC", []);
  return (r.rows || []).map(stripPw);
}

/* -------------------------------- sessões ---------------------------------- */
async function createSession(env, email) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.exec("DELETE FROM sessions WHERE expires_ts < ?", [now]);
  await env.DB.exec("INSERT INTO sessions (token, email, expires_ts) VALUES (?, ?, ?)", [token, lower(email), now + SESSION_TTL_MS]);
  return token;
}
function sessionToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return readCookie(request, SESSION_COOKIE);
}
// Usuário da equipe dono da sessão (ativo e com papel interno) — ou null.
async function staffUser(request, env) {
  const token = sessionToken(request);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const r = await env.DB.query("SELECT email, expires_ts FROM sessions WHERE token = ?", [token]);
  const s = r.rows && r.rows[0];
  if (!s || s.expires_ts < Date.now()) return null;
  const u = await getUser(env, s.email);
  if (!u || !STAFF.includes(u.role) || (u.status && u.status !== "Ativo")) return null;
  return { ...stripPw(u), token };
}

async function loginThrottled(env, email) {
  const r = await env.DB.query("SELECT fails, first_ts FROM login_attempts WHERE email = ?", [email]);
  const a = r.rows && r.rows[0];
  return !!a && Date.now() - a.first_ts < LOGIN_WINDOW_MS && a.fails >= LOGIN_MAX_FAILS;
}
async function loginFailed(env, email) {
  const now = Date.now();
  const r = await env.DB.query("SELECT fails, first_ts FROM login_attempts WHERE email = ?", [email]);
  const a = r.rows && r.rows[0];
  if (!a || now - a.first_ts >= LOGIN_WINDOW_MS) {
    await env.DB.exec("INSERT INTO login_attempts (email, fails, first_ts) VALUES (?, 1, ?) ON CONFLICT(email) DO UPDATE SET fails = 1, first_ts = excluded.first_ts", [email, now]);
  } else {
    await env.DB.exec("UPDATE login_attempts SET fails = fails + 1 WHERE email = ?", [email]);
  }
}

/* -------------------------------- listagens -------------------------------- */
async function listRequests(env) {
  const r = await env.DB.query(
    "SELECT payload FROM requests ORDER BY updated_ts DESC",
    [],
  );
  return (r.rows || []).map((row) => parse(row.payload)).filter(Boolean);
}

async function listNotifications(env) {
  const r = await env.DB.query(
    "SELECT read, payload FROM notifications ORDER BY ts DESC",
    [],
  );
  return (r.rows || [])
    .map((row) => {
      const p = parse(row.payload);
      if (p) p.read = !!row.read;
      return p;
    })
    .filter(Boolean);
}

async function listAcervo(env) {
  const r = await env.DB.query("SELECT payload FROM acervo", []);
  return (r.rows || []).map((row) => parse(row.payload)).filter(Boolean);
}

async function getTemplates(env) {
  const r = await env.DB.query("SELECT v FROM kv WHERE k = 'templates'", []);
  return r.rows && r.rows[0] ? parse(r.rows[0].v) : null;
}

async function saveNotification(env, n) {
  await env.DB.exec(
    `INSERT INTO notifications (id, audience, for_user_email, read, ts, payload)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET read = excluded.read, payload = excluded.payload`,
    [n.id, n.audience || "", lower(n.forUserEmail || ""), n.read ? 1 : 0, n.ts || Date.now(), JSON.stringify(n)],
  );
}

/* ---------------------------------- files ---------------------------------- */
function randId() {
  return "f" + Date.now().toString(36) + randomToken(6);
}
async function fileInsert(env, { name, type, size, data }) {
  const id = randId();
  await env.DB.exec("INSERT INTO files (id, name, type, size) VALUES (?, ?, ?, ?)", [
    id,
    str(name, 200) || "arquivo",
    str(type, 100),
    Number(size) || 0,
  ]);
  let seq = 0;
  for (let i = 0; i < data.length; i += CHUNK) {
    await env.DB.exec(
      "INSERT INTO file_chunks (file_id, seq, data) VALUES (?, ?, ?)",
      [id, seq, data.slice(i, i + CHUNK)],
    );
    seq++;
  }
  return id;
}
async function fileResponse(env, id, download) {
  const meta = await env.DB.query("SELECT name, type FROM files WHERE id = ?", [id]);
  if (!meta.rows || !meta.rows[0]) return json({ error: "file_not_found" }, 404);
  const chunks = await env.DB.query(
    "SELECT data FROM file_chunks WHERE file_id = ? ORDER BY seq ASC",
    [id],
  );
  if (!chunks.rows || chunks.rows.length === 0)
    return json({ error: "file_empty" }, 404);
  const b64 = chunks.rows.map((r) => r.data).join("");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const name = (meta.rows[0].name || "arquivo").replace(/[^\w.\-]+/g, "_").slice(0, 120);
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": meta.rows[0].type || "application/octet-stream",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
      "content-length": String(bytes.length),
      "cache-control": "private, max-age=3600",
    },
  });
}
function fileRefResponse(id, body) {
  return json({ id, name: body.name || "arquivo", type: body.type || "", size: Number(body.size) || 0, url: `/api/files/${id}` });
}

/* --------------------------- solicitação pública ---------------------------- */
async function nextCadastroId(env, year) {
  const r = await env.DB.query("SELECT id FROM requests WHERE id LIKE ?", [`CAD-${year}-%`]);
  const nums = (r.rows || []).map((x) => parseInt(String(x.id).split("-")[2], 10)).filter((n) => !isNaN(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

/* Documento do acervo → { link, arquivo }. O link (Drive) é opcional: basta o
 * arquivo enviado. Aceita o formato antigo (tipo "link"/"arquivo" + url). */
function acervoPartes(doc) {
  const arquivo = doc.arquivo && doc.arquivo.url ? doc.arquivo
    : doc.tipo === "arquivo" && doc.url ? { url: doc.url, name: doc.arquivoNome || "", type: doc.arquivoType || "" } : null;
  const link = doc.link !== undefined ? String(doc.link || "") : doc.tipo !== "arquivo" ? String(doc.url || "") : "";
  return { arquivo, link: /^https?:\/\//i.test(link) ? link : "" };
}
const acervoTemConteudo = (doc) => { const p = acervoPartes(doc); return !!(p.arquivo || p.link); };

/* Regra de empresa gocase (igual ao cliente, ver empresaDoFornecedor no App.jsx):
 * isento de IE ou venda de Gift (na mensagem) → Go Comércio; com IE → BB Indústria.
 * Vale para documentos que existem nas duas empresas (mesmo nome sem a empresa). */
const docNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const EMPRESA_TOK = { bb: "bb", industria: "bb", go: "go", comercio: "go" };
const docEmpresa = (nome) => { for (const t of docNorm(nome).split(" ")) if (EMPRESA_TOK[t]) return EMPRESA_TOK[t]; return null; };
const DOC_STOP = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "para", "com", "na", "no", "ou", "por", "um", "uma", "copia", "via"]); // igual ao cliente
const docBase = (nome) => docNorm(nome).split(" ").filter((t) => t && !DOC_STOP.has(t) && !EMPRESA_TOK[t] && !/^\d+$/.test(t)).join(" ");
function empresaDoFornecedor(ie, mensagem) {
  if (/\bgifts?\b/.test(docNorm(mensagem))) return "go";
  const v = String(ie || "").trim().toUpperCase();
  return v === "ISENTO" ? "go" : v ? "bb" : null;
}
// Empresa e "documento" (nome sem a empresa) de um item do acervo. Itens novos trazem
// os campos `empresa` ("bb" | "go" | "") e `documento`; os antigos são lidos do nome.
const EMPRESA_NOME = { bb: "BB Indústria", go: "Go Comércio" };
const empresaDe = (doc) => (doc.empresa === "bb" || doc.empresa === "go" ? doc.empresa : doc.empresa === "" ? null : docEmpresa(doc.nome));
const baseDe = (doc) => docBase(doc.documento || doc.nome);
// Tira do nome as palavras da empresa ("BB", "Indústria", "Go", "Comércio") e separadores soltos.
function nomeSemEmpresa(nome) {
  let s = String(nome || "").replace(/\b(bb|ind[uú]stria|go|com[eé]rcio)\b/giu, " ").replace(/\s+/g, " ").trim();
  let antes;
  do { antes = s; s = s.replace(/^[\s—–\-\/|:·,()]+|[\s—–\-\/|:·,()]+$/g, "").replace(/[\s—–\-\/|]+\d+$/g, "").trim(); } while (s !== antes);
  return s || String(nome || "").trim();
}
const nomeComEmpresa = (documento, empresa) => (empresa ? `${documento} — ${EMPRESA_NOME[empresa]}` : documento);

/* Padroniza uma vez os documentos antigos do acervo (sem o campo `documento`) no
 * formato "Documento — Empresa", para os pares BB/Go se formarem pelo nome. */
async function normalizarAcervo(env) {
  for (const doc of await listAcervo(env)) {
    if (doc.documento !== undefined) continue;
    const empresa = docEmpresa(doc.nome) || "";
    const documento = empresa ? nomeSemEmpresa(doc.nome) : String(doc.nome || "").trim();
    const novo = { ...doc, documento, empresa, nome: nomeComEmpresa(documento, empresa), nomeOriginal: doc.nome };
    await env.DB.exec("UPDATE acervo SET payload = ? WHERE id = ?", [JSON.stringify(novo), doc.id]);
  }
}

// Documento de uma empresa que tem equivalente na outra: só vale se for da empresa da regra
// (sem empresa definida, nenhum dos dois é liberado automaticamente).
function docForaDaRegra(doc, acervo, empresa) {
  const e = empresaDe(doc);
  if (!e) return false;
  const temPar = acervo.some((o) => o.id !== doc.id && empresaDe(o) && empresaDe(o) !== e && baseDe(o) === baseDe(doc));
  return temPar && e !== empresa;
}
const fileIdFromUrl = (u) => (String(u || "").match(/^\/api\/files\/(f[0-9a-z]+)$/) || [])[1] || "";
const linkHttp = (u) => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "");

/* Documentos da solicitação que o fornecedor pode baixar:
 *  - envio automático: o documento do acervo ainda existe e continua com envio automático;
 *  - envio pela equipe (`liberado`): o arquivo anexado no chamado (`arquivoEnviado`)
 *    ou, se não houver, o arquivo/link atual do acervo.
 * O arquivo é servido por /api/public/entrega/:token/:docId; o link do Drive vai direto.
 * `_fileUrl` é interno (nunca vai na resposta). */
async function itensEntrega(env, req) {
  if (!req.entregaToken) return [];
  const atual = new Map((await listAcervo(env)).map((doc) => [String(doc.id), doc]));
  return (req.docsEnviados || []).map((e) => {
    const doc = atual.get(String(e.docId));
    let arquivo = null, link = "";
    if (e.liberado) {
      if (e.arquivoEnviado && fileIdFromUrl(e.arquivoEnviado.url)) arquivo = e.arquivoEnviado;
      else if (doc) { const p = acervoPartes(doc); arquivo = p.arquivo; link = p.link; }
      if (linkHttp(e.linkEnviado)) link = e.linkEnviado;
    } else if (e.automatico && doc && doc.envioAutomatico) {
      const p = acervoPartes(doc); arquivo = p.arquivo; link = p.link;
    }
    if (!arquivo && !link) return null;
    const nome = e.nome || (doc && doc.nome) || "Documento";
    return {
      id: e.docId, nome, link,
      arquivo: arquivo ? { url: `/api/public/entrega/${req.entregaToken}/${encodeURIComponent(e.docId)}`, name: arquivo.name || nome, type: arquivo.type || "" } : null,
      _fileUrl: arquivo ? arquivo.url : "",
    };
  }).filter(Boolean);
}
const entregaPublica = async (env, req) => (await itensEntrega(env, req)).map(({ _fileUrl, ...item }) => item);

async function createCadastro(env, body) {
  const digits = onlyDigits(body.cnpj);
  if (!cnpjValido(digits)) return json({ error: "invalid_cnpj" }, 400);
  const d = body.dados || {};
  const dados = {};
  for (const k of ["razaoSocial", "nomeFantasia", "inscricaoEstadual", "situacao", "nomeContato", "telefone", "email", "cep", "logradouro", "bairro", "municipio", "estado", "complemento", "fonte"]) dados[k] = str(d[k]);
  dados.estado = dados.estado.toUpperCase().slice(0, 2);
  const mensagem = str(body.mensagem, 4000);
  const anexos = (Array.isArray(body.anexos) ? body.anexos : []).slice(0, 20)
    .filter((a) => a && /^\/api\/files\/f[0-9a-z]+$/.test(String(a.url || "")))
    .map((a) => ({ id: str(a.id, 60), name: str(a.name, 200), type: str(a.type, 100), size: Number(a.size) || 0, url: a.url }));
  const wanted = new Set((Array.isArray(body.docsSolicitados) ? body.docsSolicitados : []).map(String));
  const acervo = await listAcervo(env);
  const docs = acervo.filter((doc) => wanted.has(String(doc.id)));
  const empresa = empresaDoFornecedor(dados.inscricaoEstadual, mensagem); // "bb" | "go" | null
  // Lista colada pelo fornecedor: o texto original e os itens que não bateram com o acervo.
  const listaDocumentos = str(body.listaDocumentos, 4000);
  const docsNaoEncontrados = (Array.isArray(body.docsNaoEncontrados) ? body.docsNaoEncontrados : []).slice(0, 40).map((x) => str(x, 200)).filter(Boolean);
  const docsEnviados = docs.map((doc) => {
    const p = acervoPartes(doc);
    const fora = docForaDaRegra(doc, acervo, empresa);
    return {
      docId: doc.id, nome: doc.nome,
      url: p.arquivo ? p.arquivo.url : p.link, link: p.link,
      tipo: p.arquivo ? "arquivo" : "link", arquivoType: p.arquivo ? p.arquivo.type || "" : "",
      automatico: !fora && !!doc.envioAutomatico && acervoTemConteudo(doc),
      ...(fora ? { foraDaRegra: true } : {}),
    };
  });

  const now = Date.now();
  const year = fmtBR(now).slice(-4);
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const id = `CAD-${year}-${String((await nextCadastroId(env, year)) + tentativa).padStart(6, "0")}`;
    const req = {
      id, tipo: "Cadastro", status: "NOVA", resp: "—", sla: "DENTRO", origem: "publico",
      abertura: fmtBR(now), aberturaTs: now, prazo: fmtBR(now + 7 * 86400000),
      ultimaAtualiz: fmtBRFull(now), ultimaAtualizTs: now,
      parceiro: dados.nomeFantasia || dados.razaoSocial || `CNPJ ${fmtCnpj(digits)}`,
      cnpj: fmtCnpj(digits), uf: dados.estado || "—", email: dados.email, ie: dados.inscricaoEstadual,
      ownerEmail: lower(dados.email),
      dados,
      produto: "—", modelo: "—", nf: "—", venda: "—",
      problema: mensagem || "Solicitação de cadastro / homologação de parceiro.",
      mensagemCadastro: mensagem,
      anexos,
      docsSolicitados: docs.map((doc) => doc.nome),
      // automatico=true → liberado ao fornecedor na hora; os demais a equipe envia após a análise.
      docsEnviados,
      listaDocumentos, docsNaoEncontrados,
      empresaGocase: empresa || "",
      entregaToken: docsEnviados.some((e) => e.automatico) ? randomToken(24) : "",
    };
    try {
      await env.DB.exec(
        "INSERT INTO requests (id, owner_email, status, tipo, updated_ts, payload) VALUES (?, ?, ?, ?, ?, ?)",
        [id, req.ownerEmail, req.status, req.tipo, now, JSON.stringify(req)],
      );
    } catch (e) {
      if (/UNIQUE|constraint/i.test(String(e))) continue; // outro envio levou o mesmo número
      throw e;
    }
    await saveNotification(env, {
      id: `n-${now}-${randomToken(3)}`, ts: now, read: false, audience: "interno", requestId: id, color: "#00B8D9",
      message: `Nova solicitação de cadastro recebida (${id}) de ${req.parceiro}.`,
    });
    return json({ id, abertura: req.abertura, prazo: req.prazo, entregues: await entregaPublica(env, req) }, 201);
  }
  return json({ error: "busy" }, 503);
}

/* Acompanhamento público: basta o protocolo OU o CNPJ.
 *  - só CNPJ        → todas as solicitações da empresa, com os documentos liberados;
 *  - só protocolo   → só o status (o protocolo é sequencial, então sem o CNPJ não
 *                     mostramos documentos — evita baixar arquivos "chutando" números);
 *  - os dois        → aquela solicitação, com os documentos.
 * Nunca devolve dados cadastrais, mensagens ou anexos do fornecedor. */
async function publicStatus(env, id, cnpj) {
  const protocolo = str(id, 40).toUpperCase();
  const digits = onlyDigits(cnpj);
  if (!protocolo && !digits) return json({ error: "missing" }, 400);
  if (digits && !cnpjValido(digits)) return json({ error: "invalid_cnpj" }, 400);
  let reqs;
  if (protocolo) {
    const r = await env.DB.query("SELECT payload FROM requests WHERE id = ?", [protocolo]);
    reqs = (r.rows || []).map((row) => parse(row.payload)).filter(Boolean);
  } else {
    const r = await env.DB.query(
      "SELECT payload FROM requests WHERE json_extract(payload, '$.cnpj') IN (?, ?) ORDER BY updated_ts DESC LIMIT 30",
      [fmtCnpj(digits), digits],
    );
    reqs = (r.rows || []).map((row) => parse(row.payload)).filter(Boolean);
  }
  if (digits) reqs = reqs.filter((req) => onlyDigits(req.cnpj) === digits);
  if (!reqs.length) return json({ error: "not_found" }, 404);
  const resultados = [];
  for (const req of reqs) {
    resultados.push({
      id: req.id, status: req.status, abertura: req.abertura, prazo: req.prazo, ultimaAtualiz: req.ultimaAtualiz || req.abertura,
      ...(digits ? { entregues: await entregaPublica(env, req) } : { documentosComCnpj: true }),
    });
  }
  return json({ resultados });
}

// Arquivo de um documento liberado (automático ou pela equipe), para quem tem o token da solicitação.
async function entregaArquivo(env, token, docId) {
  if (!/^[0-9a-f]{48}$/.test(token)) return json({ error: "not_found" }, 404);
  const r = await env.DB.query("SELECT payload FROM requests WHERE json_extract(payload, '$.entregaToken') = ?", [token]);
  const req = r.rows && r.rows[0] ? parse(r.rows[0].payload) : null;
  if (!req) return json({ error: "not_found" }, 404);
  const item = (await itensEntrega(env, req)).find((e) => String(e.id) === docId && e.arquivo);
  const fileId = item ? fileIdFromUrl(item._fileUrl) : "";
  if (!fileId) return json({ error: "not_found" }, 404);
  const res = await fileResponse(env, fileId, false);
  res.headers.set("cache-control", "no-store"); // cancelar o envio precisa valer na hora
  return res;
}

/* Consulta o CNPJ na base de clientes gocase (Datamart / Reseller) pelo proxy de dados
 * do GoDeploy. O proxy autentica com o cookie de sessão do GoDeploy de quem está
 * navegando — num app público ele pode não vir, e aí devolvemos found:false com o
 * motivo (a tela mostra "indisponível"). Só a equipe logada chama esta rota. */
async function resellerLookup(request, env, rawCnpj) {
  const digits = onlyDigits(rawCnpj);
  if (digits.length !== 14) return json({ found: false, error: "invalid_cnpj" }, 400);
  if (!env.PROXY_BASE_URL) return json({ found: false, error: "proxy_unavailable" });
  const formatted = fmtCnpj(digits);
  const params = new URLSearchParams({
    or: `(cpf_cnpj.eq.${digits},cpf_cnpj.eq.${formatted})`,
    select: "nome_completo,nome_fantasia,cpf_cnpj,incricao_estadual,contribuinte_icms",
    limit: "1",
  });
  // Repassa só os cookies da plataforma — nunca o nosso cookie de sessão.
  const cookie = (request.headers.get("Cookie") || "").split(";").map((c) => c.trim())
    .filter((c) => c && !c.startsWith(`${SESSION_COOKIE}=`)).join("; ");
  try {
    const upstream = await fetch(
      `${env.PROXY_BASE_URL}/datamart/raw.webgex_clientes_gocase?${params.toString()}`,
      { headers: { Cookie: cookie } },
    );
    if (upstream.status === 401) return json({ found: false, error: "not_authenticated" });
    if (!upstream.ok) return json({ found: false, error: "lookup_failed" });
    const rows = await upstream.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return json({ found: false });
    return json({
      found: true, razaoSocial: row.nome_completo || "", nomeFantasia: row.nome_fantasia || row.nome_completo || "",
      cnpj: row.cpf_cnpj || formatted, inscricaoEstadual: row.incricao_estadual || "", contribuinteIcms: row.contribuinte_icms || "",
    });
  } catch (e) {
    return json({ found: false, error: "lookup_error" });
  }
}

/* --------------------------------- router ---------------------------------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (!path.startsWith("/api/")) return json({ error: "not_found" }, 404);

    try {
      await ensureSchema(env);
    } catch (e) {
      return json({ error: "db_unavailable" }, 500);
    }

    try {
      /* ------------------------------ rotas abertas ------------------------------ */
      if (path === "/api/health") return json({ ok: true });

      if (path === "/api/public/acervo" && method === "GET") {
        const docs = (await listAcervo(env)).map((d) => ({ id: d.id, nome: d.nome, documento: d.documento || "", empresa: empresaDe(d) || "", descricao: d.descricao || "", envioAutomatico: !!d.envioAutomatico && acervoTemConteudo(d) }));
        return json({ acervo: docs });
      }

      if (path === "/api/public/files" && method === "POST") {
        const body = (await request.json().catch(() => null)) || null;
        if (!body || typeof body.data !== "string") return json({ error: "invalid_body" }, 400);
        if (!PUBLIC_FILE_TYPES.includes(body.type)) return json({ error: "file_type" }, 415);
        if (body.data.length > Math.ceil(PUBLIC_FILE_MAX / 3) * 4 + 4) return json({ error: "file_too_large" }, 413);
        return fileRefResponse(await fileInsert(env, body), body);
      }

      if (path === "/api/public/cadastro" && method === "POST") {
        const body = (await request.json().catch(() => null)) || null;
        if (!body) return json({ error: "invalid_body" }, 400);
        return await createCadastro(env, body);
      }

      if (path.startsWith("/api/public/entrega/") && method === "GET") {
        const [token = "", docId = ""] = path.slice("/api/public/entrega/".length).split("/").map((x) => decodeURIComponent(x));
        return await entregaArquivo(env, token, docId);
      }

      if (path === "/api/public/status" && method === "GET") {
        return await publicStatus(env, url.searchParams.get("id") || "", url.searchParams.get("cnpj") || "");
      }

      if (path === "/api/login" && method === "POST") {
        const { email, password } = (await request.json().catch(() => ({}))) || {};
        const em = lower(email);
        if (!em || !password) return json({ error: "invalid" }, 401);
        if (await loginThrottled(env, em)) return json({ error: "throttled" }, 429);
        const u = await getUser(env, em);
        const ok = u && !BLOCKED_PASSWORDS.includes(password) && (await verifyPassword(password, u.password));
        if (!ok || !STAFF.includes(u.role)) { await loginFailed(env, em); return json({ error: "invalid" }, 401); }
        if (u.status && u.status !== "Ativo") return json({ error: "inactive" }, 403);
        await env.DB.exec("DELETE FROM login_attempts WHERE email = ?", [em]);
        // Conta antiga com senha em texto puro: migra para hash agora que a senha foi confirmada.
        if (!isHashed(u.password)) {
          await env.DB.exec("UPDATE users SET password = ? WHERE email = ?", [await hashPassword(password), u.email]);
        }
        const token = await createSession(env, u.email);
        return json({ user: stripPw(u), token }, 200, { "set-cookie": sessionCookie(token, SESSION_TTL_MS / 1000) });
      }

      if (path === "/api/logout" && method === "POST") {
        const token = sessionToken(request);
        if (token) await env.DB.exec("DELETE FROM sessions WHERE token = ?", [token]);
        return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
      }

      /* --------------------------- rotas da equipe --------------------------- */
      const me = await staffUser(request, env);
      if (!me) return json({ error: "unauthorized" }, 401);
      const { token: _t, ...meUser } = me;
      const isManager = MANAGERS.includes(me.role);

      if (path === "/api/me" && method === "GET") return json({ user: meUser });

      if (path === "/api/me/password" && method === "POST") {
        const { current, next } = (await request.json().catch(() => ({}))) || {};
        const u = await getUser(env, me.email);
        if (!(await verifyPassword(current || "", u.password))) return json({ error: "invalid_current" }, 400);
        if (senhaFraca(next)) return json({ error: "weak_password" }, 400);
        await env.DB.exec("UPDATE users SET password = ? WHERE email = ?", [await hashPassword(next), u.email]);
        await env.DB.exec("DELETE FROM sessions WHERE email = ? AND token <> ?", [u.email, me.token]);
        return json({ ok: true });
      }

      if (path === "/api/bootstrap" && method === "GET") {
        const [users, requests, notifications, templates, acervo] = await Promise.all([
          listUsers(env),
          listRequests(env),
          listNotifications(env),
          getTemplates(env),
          listAcervo(env),
        ]);
        return json({ users, requests, notifications, templates, acervo });
      }

      if (path === "/api/users") {
        if (method === "GET") return json({ users: await listUsers(env) });
        if (method === "POST") {
          if (!isManager) return json({ error: "forbidden" }, 403);
          const body = (await request.json().catch(() => ({}))) || {};
          if (!lower(body.email) || !STAFF.includes(body.role)) return json({ error: "invalid_body" }, 400);
          if (await getUser(env, body.email)) return json({ error: "exists" }, 409);
          if (senhaFraca(body.password)) return json({ error: "weak_password" }, 400);
          return json({ user: await upsertUser(env, body) });
        }
      }
      if (path.startsWith("/api/users/") && method === "PATCH") {
        if (!isManager) return json({ error: "forbidden" }, 403);
        const email = decodeURIComponent(path.slice("/api/users/".length));
        const existing = await getUser(env, email);
        if (!existing) return json({ error: "not_found" }, 404);
        const changes = (await request.json().catch(() => ({}))) || {};
        const allowed = {};
        for (const k of ["name", "role", "status", "telefone", "contato"]) if (k in changes) allowed[k] = changes[k];
        if ("role" in allowed && !STAFF.includes(allowed.role) && allowed.role !== "CLIENTE") return json({ error: "invalid_role" }, 400);
        if ("password" in changes) {
          if (senhaFraca(changes.password)) return json({ error: "weak_password" }, 400);
          allowed.password = changes.password;
        }
        const user = await upsertUser(env, { ...existing, ...allowed, email });
        if (allowed.status && allowed.status !== "Ativo") await env.DB.exec("DELETE FROM sessions WHERE email = ?", [lower(email)]);
        return json({ user });
      }
      if (path.startsWith("/api/users/") && method === "DELETE") {
        if (!isManager) return json({ error: "forbidden" }, 403);
        const email = lower(decodeURIComponent(path.slice("/api/users/".length)));
        if (email === lower(me.email)) return json({ error: "self_delete" }, 400);
        await env.DB.exec("DELETE FROM users WHERE email = ?", [email]);
        await env.DB.exec("DELETE FROM sessions WHERE email = ?", [email]);
        return json({ ok: true });
      }

      if (path.startsWith("/api/requests/") && method === "PUT") {
        const id = decodeURIComponent(path.slice("/api/requests/".length));
        const req = (await request.json().catch(() => null)) || null;
        if (!req || !req.id || req.id !== id) return json({ error: "invalid_body" }, 400);
        await env.DB.exec(
          `INSERT INTO requests (id, owner_email, status, tipo, updated_ts, payload)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             owner_email = excluded.owner_email, status = excluded.status,
             tipo = excluded.tipo, updated_ts = excluded.updated_ts, payload = excluded.payload`,
          [
            id,
            lower(req.ownerEmail || ""),
            req.status || "",
            req.tipo || "",
            req.ultimaAtualizTs || req.aberturaTs || Date.now(),
            JSON.stringify(req),
          ],
        );
        return json({ ok: true });
      }

      if (path === "/api/notifications" && method === "POST") {
        const n = (await request.json().catch(() => null)) || null;
        if (!n || !n.id) return json({ error: "invalid_body" }, 400);
        await saveNotification(env, n);
        return json({ ok: true });
      }
      if (path === "/api/notifications/read" && method === "POST") {
        const { ids } = (await request.json().catch(() => ({}))) || {};
        if (Array.isArray(ids) && ids.length) {
          const placeholders = ids.map(() => "?").join(",");
          await env.DB.exec(
            `UPDATE notifications SET read = 1 WHERE id IN (${placeholders})`,
            ids,
          );
        }
        return json({ ok: true });
      }

      if (path === "/api/templates" && method === "PUT") {
        const body = (await request.json().catch(() => null)) || null;
        if (!body) return json({ error: "invalid_body" }, 400);
        await env.DB.exec(
          "INSERT INTO kv (k, v) VALUES ('templates', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
          [JSON.stringify(body)],
        );
        return json({ ok: true });
      }

      if (path === "/api/acervo" && method === "GET") {
        return json({ acervo: await listAcervo(env) });
      }
      if (path.startsWith("/api/acervo/")) {
        if (!isManager) return json({ error: "forbidden" }, 403);
        const id = decodeURIComponent(path.slice("/api/acervo/".length));
        if (method === "PUT") {
          const doc = (await request.json().catch(() => null)) || null;
          if (!doc) return json({ error: "invalid_body" }, 400);
          await env.DB.exec(
            "INSERT INTO acervo (id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
            [id, JSON.stringify({ ...doc, id })],
          );
          return json({ ok: true });
        }
        if (method === "DELETE") {
          await env.DB.exec("DELETE FROM acervo WHERE id = ?", [id]);
          return json({ ok: true });
        }
      }

      if (path === "/api/files" && method === "POST") {
        const body = (await request.json().catch(() => null)) || null;
        if (!body || typeof body.data !== "string")
          return json({ error: "invalid_body" }, 400);
        return fileRefResponse(await fileInsert(env, body), body);
      }
      if (path.startsWith("/api/files/") && method === "GET") {
        const id = decodeURIComponent(path.slice("/api/files/".length));
        return await fileResponse(env, id, url.searchParams.get("download") === "1");
      }

      if (path === "/api/reseller-lookup" && method === "GET") {
        return await resellerLookup(request, env, url.searchParams.get("cnpj") || "");
      }

      return json({ error: "not_found" }, 404);
    } catch (e) {
      return json({ error: "server_error" }, 500);
    }
  },
};
