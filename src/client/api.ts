import type { Collection, Meaning, SearchResponse, WordsPage } from "../shared/types.ts";
import { filtersToParams, type Filters } from "../shared/filters.ts";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { accept: "application/json" } });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `Serverfehler (${res.status})`);
  return body;
}

export const searchWords = (q: string, signal?: AbortSignal) =>
  get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, signal);

export const fetchMeanings = async (ids: string[], signal?: AbortSignal) =>
  ids.length ? (await get<{ meanings: Meaning[] }>(`/api/meanings?ids=${ids.map(encodeURIComponent).join(",")}`, signal)).meanings : [];

export const fetchCollection = async (name: string) =>
  (await get<{ meanings: Meaning[] }>(`/api/collections/${encodeURIComponent(name)}`)).meanings;

export const WORDS_PAGE = 120;

/** Eine Seite der Wortübersicht, vom Server gefiltert und sortiert. */
export const fetchWords = (filters: Filters, offset = 0, signal?: AbortSignal) => {
  const p = filtersToParams(filters);
  if (offset) p.set("offset", String(offset));
  p.set("limit", String(WORDS_PAGE));
  return get<WordsPage>(`/api/words?${p}`, signal);
};

export const fetchCollections = async () => (await get<{ collections: Collection[] }>("/api/collections")).collections;
