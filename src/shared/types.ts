export type MeaningKind = "word" | "color" | "number";
export type MeaningStatus = "reference" | "reviewed" | "draft";

/** Eine konkrete Bedeutung eines deutschen Wortes. Grundlage genau einer Schreibseite. */
export interface Meaning {
  id: string;
  wordId: string;
  de: string;
  en: string;
  description: string | null;
  kind: MeaningKind;
  number: number | null;
  color: string | null;
  /** Schlüssel einer eingebauten Vektorzeichnung oder null für „ohne Bild“. */
  pictogram: string | null;
  /** Adresse einer Bilddatei (Noto-Emoji oder eigene Zeichnung), wenn es keine eingebaute Zeichnung gibt. */
  pictogramUrl: string | null;
  status: MeaningStatus;
  collection: string | null;
  sortOrder: number | null;
  /** Schwierigkeitsstufe 1 (sehr leicht) bis 5 (sehr schwer), berechnet aus der Schreibweise. */
  difficulty: number | null;
  /** IDs der Sammlungen, in denen die Bedeutung steht (nur in /api/words). */
  collections?: string[];
  /** Position je Sammlung (1-basiert), passend zu `collections`. */
  collectionPositions?: Record<string, number>;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  count: number;
}

/** Eine Seite der Wortübersicht (/api/words). */
export interface WordsPage {
  meanings: Meaning[];
  /** Anzahl aller Treffer für die Filter, unabhängig von limit und offset. */
  total: number;
  offset: number;
  limit: number;
}

export interface SearchResultWord {
  wordId: string;
  de: string;
  exact: boolean;
  meanings: Meaning[];
}

export interface SearchResponse {
  query: string;
  results: SearchResultWord[];
}

export interface ApiError {
  error: string;
}
