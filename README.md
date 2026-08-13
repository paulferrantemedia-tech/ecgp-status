# ECGP status service — deploy steps

A tiny Vercel endpoint that stores task status so Paul and Rachel see and edit the same list.

## 1. Get the folder
Download this project (Share → Export → Project HTML, or ask me for a zip) and keep the `status-service` folder. It contains only `api/status.js` and `package.json` — that is the whole service.

## 2. Deploy
1. Go to vercel.com → **Add New → Project**.
2. Choose **Import** (from a GitHub repo containing this folder) or drag the `status-service` folder into the Vercel CLI: `npx vercel` from inside it and follow the prompts.
3. Accept the defaults. No build step, no framework preset needed.

## 3. Add the store
1. In the new Vercel project → **Storage** tab → **Create Database** → **KV** (Upstash Redis).
2. Connect it to this project when prompted. Vercel injects the `KV_*` env vars automatically.
3. **Redeploy** once so the function picks up the vars.

## 4. Wire the board
Your endpoint URL will be:

```
https://<your-project>.vercel.app/api/status
```

Test it in a browser — `https://<your-project>.vercel.app/api/status?action=read` should return `{"tasks":[]}`.

Send me that URL and I will set `STATUS_ENDPOINT` in the board. After that:
- Status changes save for everyone, attributed to whoever is named at the gate.
- The board re-reads every 30 seconds and on window focus.
- A failed save rolls the row back and shows an error, so nothing shows as saved when it isn't.

## Notes
- The endpoint is open (CORS `*`, no auth). It holds task statuses and notes only — no creator data. If you want it locked down, say so and I will add a shared token the board sends with each request.
- Re-publish the artifact after I set the endpoint so Rachel's copy points at it.
