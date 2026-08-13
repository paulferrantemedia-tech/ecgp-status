/* ECGP Ops Board — shared task status store.
   Speaks the exact GET API the board already uses:
     GET /api/status?action=read
       -> { tasks: [ { task, status, note, held_since, updated_by, updated_at } ] }
     GET /api/status?action=write&task=3&status=complete&note=...&who=Rachel
       -> { ok: true }
   Storage: Upstash Redis over its REST API — no npm packages, so nothing to
   install and nothing to deprecate. Accepts either env-var naming that Vercel's
   Upstash integration may inject. */

const KEY = "ecgp:tasks";
const STATUSES = ["not started", "in progress", "complete", "on hold"];

const URL_ =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_REST_API_URL;
const TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_REST_API_TOKEN;

async function redis(path, body) {
  const r = await fetch(URL_ + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + TOKEN },
    body,
    cache: "no-store"
  });
  if (!r.ok) throw new Error("redis " + r.status);
  const j = await r.json();
  return j.result;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!URL_ || !TOKEN) {
    return res.status(500).json({ error: "no store connected — add Upstash Redis in the Storage tab, then redeploy" });
  }

  const { action = "read", task, status, note = "", who = "" } = req.query;

  try {
    const raw = await redis("/get/" + KEY);
    const store = raw ? JSON.parse(raw) : {};

    if (action === "read") {
      const tasks = Object.keys(store)
        .sort((a, b) => Number(a) - Number(b))
        .map(n => ({ task: Number(n), ...store[n] }));
      return res.status(200).json({ tasks });
    }

    if (action === "write") {
      const num = parseInt(task, 10);
      if (!num || num < 1) return res.status(400).json({ error: "bad task" });
      if (!STATUSES.includes(status)) return res.status(400).json({ error: "bad status" });

      const prev = store[num] || {};
      const today = new Date().toISOString().slice(0, 10);
      let held_since = prev.held_since || null;
      if (status === "on hold" && prev.status !== "on hold") held_since = today;
      if (status !== "on hold") held_since = null;

      store[num] = {
        status,
        note: String(note).slice(0, 300),
        held_since,
        updated_by: String(who).slice(0, 60),
        updated_at: new Date().toISOString()
      };

      await redis("/set/" + KEY, JSON.stringify(store));
      return res.status(200).json({ ok: true, task: num, ...store[num] });
    }

    return res.status(400).json({ error: "unknown action" });
  } catch (e) {
    return res.status(500).json({ error: "store unavailable" });
  }
}
