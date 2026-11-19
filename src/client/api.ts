import type { Meaning, SearchResponse } from "../shared/types.ts";

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
