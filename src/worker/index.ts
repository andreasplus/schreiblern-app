import { getCollection, getMeanings, getWordsPage, listCollections, searchWords, MAX_IDS, MAX_QUERY_LENGTH, WORDS_PAGE_DEFAULT, WORDS_PAGE_MAX } from "./db.ts";
import { filtersFromParams } from "../shared/filters.ts";

export interface Env {
  DB: D1Database;
}

const json = (body: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache, "x-content-type-options": "nosniff" },
  });
const error = (status: number, message: string) => json({ error: message }, status);

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET") return error(405, "Nur GET wird unterstützt.");
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/health") return json({ ok: true });

  if (path === "/api/search") {
    const q = url.searchParams.get("q") ?? "";
    if (q.length > MAX_QUERY_LENGTH) return error(400, `Suchbegriff ist länger als ${MAX_QUERY_LENGTH} Zeichen.`);
    return json({ query: q, results: await searchWords(env.DB, q) });
  }

  if (path === "/api/meanings") {
    const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) return error(400, "Parameter ids fehlt.");
    if (ids.length > MAX_IDS) return error(400, `Höchstens ${MAX_IDS} Einträge pro Abruf.`);
    return json({ meanings: await getMeanings(env.DB, ids) });
  }

  if (path === "/api/words") {
    const p = url.searchParams;
    if ((p.get("q") ?? "").length > MAX_QUERY_LENGTH) return error(400, `Suchbegriff ist länger als ${MAX_QUERY_LENGTH} Zeichen.`);
    const offset = Number(p.get("offset") ?? 0);
    const limit = Number(p.get("limit") ?? WORDS_PAGE_DEFAULT);
    if (!Number.isInteger(offset) || offset < 0) return error(400, "offset muss eine ganze Zahl ab 0 sein.");
    if (!Number.isInteger(limit) || limit < 1 || limit > WORDS_PAGE_MAX) return error(400, `limit muss zwischen 1 und ${WORDS_PAGE_MAX} liegen.`);
    return json(await getWordsPage(env.DB, filtersFromParams(p), offset, limit));
  }
  if (path === "/api/collections") return json({ collections: await listCollections(env.DB) });

  const collection = /^\/api\/collections\/([a-z0-9-]{1,64})$/.exec(path);
  if (collection) return json({ meanings: await getCollection(env.DB, collection[1]!) });

  return error(404, "Unbekannter API-Pfad.");
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (err) {
        console.error("API-Fehler", err);
        return error(500, "Interner Fehler. Bitte später erneut versuchen.");
      }
    }
    // Alles andere liefert die Asset-Auslieferung (SPA). Dieser Pfad wird nur bei Fehlkonfiguration erreicht.
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
