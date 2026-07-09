/*
 * Backend do gocase Service Desk — worker GoDeploy sobre o banco nativo (env.DB, SQLite).
 *
 * TODO registro do sistema é persistido aqui: contas, solicitações, notificações,
 * templates, acervo e arquivos (imagens/vídeos/PDFs). Cada entidade é UMA LINHA
 * própria (não um array gigante), então gravações concorrentes não se sobrescrevem
 * e nada se perde ao recarregar a página ou trocar de aba.
 *
 * O gateway do GoDeploy serve os assets estáticos ANTES de chamar o worker, então
 * aqui tratamos apenas as rotas /api/*.
 *
 * API
 *   GET    /api/health
 *   GET    /api/bootstrap                       → tudo que a SPA precisa para hidratar
 *   POST   /api/login        {email,password}   → { user } | 401 | 403 (inativo)
 *   POST   /api/signup       {user}             → { user } | 409 (já existe)
 *   GET    /api/users                           → [user sem senha]
 *   POST   /api/users        {user}             → upsert de conta (semear/criar)
 *   PATCH  /api/users/:email {changes}          → atualiza conta
 *   PUT    /api/requests/:id {request}          → upsert de solicitação
 *   POST   /api/notifications {notif}           → cria notificação
 *   POST   /api/notifications/read {ids:[]}      → marca como lidas
 *   PUT    /api/templates    {templates}        → salva modelos de e-mail
 *   GET    /api/acervo                          → [doc]
 *   PUT    /api/acervo/:id   {doc}              → upsert de documento do acervo
 *   DELETE /api/acervo/:id                      → remove do acervo
 *   POST   /api/files        {name,type,size,data(base64)} → { id, url, ... }
 *   GET    /api/files/:id[?download=1]          → bytes do arquivo (inline)
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const CHUNK = 700000; // base64 por linha (limite de linha do SQLite é 2 MB)

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

/* ---------------------------------- schema --------------------------------- */
let schemaReady = null;
function ensureSchema(env) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, password TEXT, name TEXT, role TEXT, status TEXT, cnpj TEXT, telefone TEXT, contato TEXT, created_at TEXT DEFAULT (datetime('now')))",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, owner_email TEXT, status TEXT, tipo TEXT, updated_ts INTEGER, payload TEXT NOT NULL)",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, audience TEXT, for_user_email TEXT, read INTEGER DEFAULT 0, ts INTEGER, payload TEXT NOT NULL)",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS acervo (id TEXT PRIMARY KEY, payload TEXT NOT NULL)",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER, created_at TEXT DEFAULT (datetime('now')))",
        [],
      );
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS file_chunks (file_id TEXT NOT NULL, seq INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (file_id, seq))",
        [],
      );
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
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

async function getUser(env, email) {
  const r = await env.DB.query("SELECT * FROM users WHERE email = ?", [lower(email)]);
  return r.rows && r.rows[0] ? r.rows[0] : null;
}

async function upsertUser(env, u) {
  const email = lower(u.email);
  if (!email) throw new Error("email required");
  await env.DB.exec(
    `INSERT INTO users (email, password, name, role, status, cnpj, telefone, contato)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       password = excluded.password, name = excluded.name, role = excluded.role,
       status = excluded.status, cnpj = excluded.cnpj, telefone = excluded.telefone,
       contato = excluded.contato`,
    [
      email,
      u.password || "",
      u.name || "",
      u.role || "CLIENTE",
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

/* ---------------------------------- files ---------------------------------- */
function randId() {
  return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
async function fileInsert(env, { name, type, size, data }) {
  const id = randId();
  await env.DB.exec("INSERT INTO files (id, name, type, size) VALUES (?, ?, ?, ?)", [
    id,
    name || "arquivo",
    type || "",
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
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
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
      return json({ error: "db_unavailable", detail: String(e) }, 500);
    }

    try {
      if (path === "/api/health") return json({ ok: true });

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

      if (path === "/api/login" && method === "POST") {
        const { email, password } = (await request.json().catch(() => ({}))) || {};
        const u = await getUser(env, email);
        if (!u || u.password !== password) return json({ error: "invalid" }, 401);
        if (u.status && u.status !== "Ativo") return json({ error: "inactive" }, 403);
        return json({ user: stripPw(u) });
      }

      if (path === "/api/signup" && method === "POST") {
        const body = (await request.json().catch(() => ({}))) || {};
        const email = lower(body.email);
        if (!email || !body.password || !body.name)
          return json({ error: "missing_fields" }, 400);
        if (await getUser(env, email)) return json({ error: "exists" }, 409);
        const user = await upsertUser(env, { ...body, role: body.role || "CLIENTE", status: "Ativo" });
        return json({ user }, 201);
      }

      if (path === "/api/users") {
        if (method === "GET") return json({ users: await listUsers(env) });
        if (method === "POST") {
          const body = (await request.json().catch(() => ({}))) || {};
          return json({ user: await upsertUser(env, body) });
        }
      }
      if (path.startsWith("/api/users/") && method === "PATCH") {
        const email = decodeURIComponent(path.slice("/api/users/".length));
        const existing = await getUser(env, email);
        if (!existing) return json({ error: "not_found" }, 404);
        const changes = (await request.json().catch(() => ({}))) || {};
        return json({ user: await upsertUser(env, { ...existing, ...changes, email }) });
      }

      if (path.startsWith("/api/requests/") && method === "PUT") {
        const id = decodeURIComponent(path.slice("/api/requests/".length));
        const req = (await request.json().catch(() => null)) || null;
        if (!req || !req.id) return json({ error: "invalid_body" }, 400);
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
        await env.DB.exec(
          `INSERT INTO notifications (id, audience, for_user_email, read, ts, payload)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET read = excluded.read, payload = excluded.payload`,
          [
            n.id,
            n.audience || "",
            lower(n.forUserEmail || ""),
            n.read ? 1 : 0,
            n.ts || Date.now(),
            JSON.stringify(n),
          ],
        );
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
        const id = await fileInsert(env, body);
        return json({
          id,
          name: body.name || "arquivo",
          type: body.type || "",
          size: Number(body.size) || 0,
          url: `/api/files/${id}`,
        });
      }
      if (path.startsWith("/api/files/") && method === "GET") {
        const id = decodeURIComponent(path.slice("/api/files/".length));
        return await fileResponse(env, id, url.searchParams.get("download") === "1");
      }

      return json({ error: "not_found" }, 404);
    } catch (e) {
      return json({ error: "server_error", detail: String(e) }, 500);
    }
  },
};
