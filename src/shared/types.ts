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
  status: MeaningStatus;
  collection: string | null;
  sortOrder: number | null;
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
