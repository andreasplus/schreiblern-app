import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Collection, Meaning } from "../shared/types.ts";
import { fetchCollections, fetchMeanings, fetchWords, WORDS_PAGE } from "./api.ts";
import { MeaningLabel, PictogramThumb, Worksheet } from "./Worksheet.tsx";
import { readSelection, writeSelection, MAX_SELECTION } from "./selection.ts";
import { DEFAULT_FILTERS, MAX_DIFF, MAX_LEN, letterCount, type Filters, type SortKey } from "./filters.ts";
import { DIFFICULTY_LABELS } from "../shared/difficulty.ts";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

/** Bilddateien vor dem Druck laden, damit sie auf jeder Seite erscheinen. Fehler blockieren den Druck nicht. */
async function imagesReady(pages: Meaning[]) {
  const urls = [...new Set(pages.map((m) => m.pictogramUrl).filter((u): u is string => !!u))];
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  );
}

const DIFF_LEVELS = Array.from({ length: MAX_DIFF }, (_, i) => i + 1);

async function fontsReady() {
  await document.fonts.load('27px "ABeeZee"');
  await document.fonts.ready;
}

const LENGTH_PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: "Alle Längen", min: 1, max: MAX_LEN },
  { label: "3 Buchstaben", min: 3, max: 3 },
  { label: "3 bis 5", min: 3, max: 5 },
  { label: "bis 4", min: 1, max: 4 },
  { label: "ab 6", min: 6, max: MAX_LEN },
];

export function App() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [words, setWords] = useState<Meaning[]>([]);
  const [total, setTotal] = useState(0);
  const [allCount, setAllCount] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [preview, setPreview] = useState<Meaning | null>(null);
  const [selection, setSelection] = useState<Meaning[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [printPages, setPrintPages] = useState<Meaning[] | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch((e: Error) => setLoad({ status: "error", message: e.message }));
  }, [reload]);

  // Der Server filtert und sortiert; geladen wird seitenweise. Tippen in der Suche wird kurz abgewartet.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoad({ status: "loading" });
    const t = setTimeout(() => {
      fetchWords(filters, 0, ctrl.signal)
        .then((page) => {
          setWords(page.meanings);
          setTotal(page.total);
          if (JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)) setAllCount(page.total);
          setLoad({ status: "ready" });
        })
        .catch((e: Error) => {
          if (!ctrl.signal.aborted) setLoad({ status: "error", message: e.message });
        });
    }, filters.query ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [filters, reload]);
  const loadAll = () => setReload((n) => n + 1);

  const loadMore = () => {
    setLoadingMore(true);
    fetchWords(filters, words.length)
      .then((page) => {
        setWords((w) => [...w, ...page.meanings.filter((m) => !w.some((x) => x.id === m.id))]);
        setTotal(page.total);
      })
      .catch((e: Error) => setNotice(`Weitere Wörter konnten nicht geladen werden: ${e.message}`))
      .finally(() => setLoadingMore(false));
  };

  // Druckauswahl aus der Adresse wiederherstellen (#auswahl=id1,id2).
  useEffect(() => {
    const ids = readSelection(window.location.hash);
    if (!ids.length) return;
    fetchMeanings(ids)
      .then(setSelection)
      .catch((e: Error) => setNotice(`Druckauswahl konnte nicht geladen werden: ${e.message}`));
  }, []);

  useEffect(() => {
    const hash = writeSelection(selection.map((m) => m.id));
    if (hash !== window.location.hash) history.replaceState(null, "", hash || window.location.pathname + window.location.search);
  }, [selection]);

  const visible = words;
  const inSelection = useMemo(() => new Set(selection.map((m) => m.id)), [selection]);
  const collectionName = useMemo(() => new Map(collections.map((c) => [c.id, c.name])), [collections]);
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const addMany = (items: Meaning[]) => {
    setNotice(null);
    setSelection((s) => {
      const merged = [...s, ...items.filter((m) => !s.some((x) => x.id === m.id))];
      if (merged.length > MAX_SELECTION) {
        setNotice(`Die Druckauswahl ist auf ${MAX_SELECTION} Seiten begrenzt.`);
        return merged.slice(0, MAX_SELECTION);
      }
      return merged;
    });
  };
  const toggle = (m: Meaning) => (inSelection.has(m.id) ? setSelection((s) => s.filter((x) => x.id !== m.id)) : addMany([m]));
  const move = (index: number, delta: number) =>
    setSelection((s) => {
      const t = index + delta;
      if (t < 0 || t >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[t]] = [copy[t]!, copy[index]!];
      return copy;
    });

  const openPreview = (m: Meaning) => {
    setPreview(m);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  };

  const print = useCallback(async (pages: Meaning[]) => {
    if (!pages.length) return;
    setBusy(true);
    try {
      await fontsReady();
      await imagesReady(pages);
      setPrintPages(pages);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!printPages) return;
    const done = () => setPrintPages(null);
    window.addEventListener("afterprint", done, { once: true });
    const raf = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", done);
    };
  }, [printPages]);

  const lengthActive = (min: number, max: number) => filters.minLen === min && filters.maxLen === max;
  const filtered = filters !== DEFAULT_FILTERS && JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <>
      <div className="app">
        <header className="app-header">
          <h1>Schreiblern-App</h1>
          <p>Wörter auswählen, Schreibseite ansehen und im Browser drucken.</p>
        </header>

        <div className="layout">
          <main className="main">
            <section className="panel toolbar" aria-label="Wörter filtern">
              <label className="sr-only" htmlFor="q">Wort suchen</label>
              <input
                id="q"
                className="search-input"
                type="search"
                placeholder="Suchen, deutsch oder englisch …"
                autoComplete="off"
                maxLength={60}
                value={filters.query}
                onChange={(e) => setFilter("query", e.target.value)}
              />

              <label className="control collection-control">
                <span>Sammlung</span>
                <select aria-label="Sammlung" value={filters.collection} onChange={(e) => setFilter("collection", e.target.value)}>
                  <option value="">Alle Sammlungen{allCount !== null ? ` (${allCount})` : ""}</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id} title={c.description ?? undefined}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </label>

              <div className="controls">
                <label className="control">
                  <span>Sortieren</span>
                  <select aria-label="Sortieren" value={filters.sort} onChange={(e) => setFilter("sort", e.target.value as SortKey)}>
                    <option value="collection">nach Sammlung</option>
                    <option value="alpha">alphabetisch</option>
                    <option value="length">nach Länge</option>
                    <option value="difficulty">nach Schwierigkeit</option>
                  </select>
                </label>

                <div className="control" role="group" aria-label="Sprache für Länge und Sortierung">
                  <span>Sprache</span>
                  <div className="segmented">
                    <button type="button" className={filters.lang === "de" ? "is-active" : ""} aria-pressed={filters.lang === "de"} onClick={() => setFilter("lang", "de")}>Deutsch</button>
                    <button type="button" className={filters.lang === "en" ? "is-active" : ""} aria-pressed={filters.lang === "en"} onClick={() => setFilter("lang", "en")}>Englisch</button>
                  </div>
                </div>

                <div className="control" role="group" aria-label="Wortlänge in Buchstaben">
                  <span>Buchstaben</span>
                  <div className="range">
                    <select aria-label="mindestens" value={filters.minLen} onChange={(e) => {
                      const v = Number(e.target.value);
                      setFilters((f) => ({ ...f, minLen: v, maxLen: Math.max(v, f.maxLen) }));
                    }}>
                      {Array.from({ length: MAX_LEN }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span>bis</span>
                    <select aria-label="höchstens" value={filters.maxLen} onChange={(e) => {
                      const v = Number(e.target.value);
                      setFilters((f) => ({ ...f, maxLen: v, minLen: Math.min(v, f.minLen) }));
                    }}>
                      {Array.from({ length: MAX_LEN }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === MAX_LEN ? `${n}+` : n}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="controls">
                <div className="control" role="group" aria-label="Schwierigkeit">
                  <span>Schwierigkeit</span>
                  <div className="range">
                    <select aria-label="Schwierigkeit ab" value={filters.minDiff} onChange={(e) => {
                      const v = Number(e.target.value);
                      setFilters((f) => ({ ...f, minDiff: v, maxDiff: Math.max(v, f.maxDiff) }));
                    }}>
                      {DIFF_LEVELS.map((n) => <option key={n} value={n}>{n} {DIFFICULTY_LABELS[n as 1]}</option>)}
                    </select>
                    <span>bis</span>
                    <select aria-label="Schwierigkeit bis" value={filters.maxDiff} onChange={(e) => {
                      const v = Number(e.target.value);
                      setFilters((f) => ({ ...f, maxDiff: v, minDiff: Math.min(v, f.minDiff) }));
                    }}>
                      {DIFF_LEVELS.map((n) => <option key={n} value={n}>{n} {DIFFICULTY_LABELS[n as 1]}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="chips small-chips" role="group" aria-label="Schnellauswahl Länge">
                {LENGTH_PRESETS.map((p) => (
                  <button key={p.label} type="button" className={`chip${lengthActive(p.min, p.max) ? " is-active" : ""}`} aria-pressed={lengthActive(p.min, p.max)} onClick={() => setFilters((f) => ({ ...f, minLen: p.min, maxLen: p.max }))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="grid-head">
              <p className="count" role="status">
                {load.status === "ready" && (total === 1 ? "1 Wort" : `${total.toLocaleString("de-DE")} Wörter`)}
                {load.status === "ready" && total > visible.length && ` · ${visible.length} angezeigt`}
              </p>
              {filtered && <button type="button" className="link" onClick={() => setFilters(DEFAULT_FILTERS)}>Filter zurücksetzen</button>}
              <div className="spacer" />
              <button type="button" disabled={!visible.length} onClick={() => addMany(visible)}>
                Alle angezeigten zur Druckauswahl
              </button>
            </div>

            {load.status === "loading" && <p className="status" role="status">Wörter werden geladen …</p>}
            {load.status === "error" && (
              <p className="error" role="alert">
                Die Wörter konnten nicht geladen werden: {load.message}{" "}
                <button type="button" onClick={loadAll}>Erneut versuchen</button>
              </p>
            )}
            {load.status === "ready" && !visible.length && (
              <p className="status">Keine Wörter passen zu diesen Filtern. Neue Wörter anlegen kommt in einer späteren Version.</p>
            )}

            <ul className="word-grid" aria-label="Wörter">
              {visible.map((m) => {
                const selected = inSelection.has(m.id);
                return (
                  <li key={m.id} className={`word-card${selected ? " is-selected" : ""}${m.color ? " is-color" : ""}`}>
                    <button type="button" className="word-open" onClick={() => openPreview(m)} aria-label={`Vorschau ${m.de}${m.description ? ` (${m.description})` : ""} · ${m.en}`}>
                      <span className="word-picture">
                        <PictogramThumb meaning={m} />
                      </span>
                      <span className="word-de">{m.de}{m.number !== null && <span className="word-num"> {m.number}</span>}</span>
                      <span className="word-en">{m.en}</span>
                      {m.description && <span className="word-desc">{m.description}</span>}
                      <span className="word-meta">
                        <span>{letterCount(filters.lang === "de" ? m.de : m.en)} Buchst.</span>
                        {m.difficulty !== null && <span title={DIFFICULTY_LABELS[m.difficulty as 1]}>Stufe {m.difficulty}</span>}
                        {m.status === "draft" && <span className="badge">ungeprüft</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="word-toggle"
                      aria-pressed={selected}
                      aria-label={selected ? `${m.de} aus der Druckauswahl entfernen` : `${m.de} zur Druckauswahl`}
                      title={selected ? "Aus der Druckauswahl entfernen" : "Zur Druckauswahl"}
                      onClick={() => toggle(m)}
                    >
                      {selected ? "✓" : "+"}
                    </button>
                  </li>
                );
              })}
            </ul>
            {load.status === "ready" && total > visible.length && (
              <p className="load-more">
                <button type="button" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? "Wird geladen …" : `Weitere Wörter laden (${Math.min(WORDS_PAGE, total - visible.length)} von ${total - visible.length})`}
                </button>
              </p>
            )}
          </main>

          <aside className="panel selection-panel" aria-labelledby="selection-title">
            <h2 id="selection-title">Druckauswahl ({selection.length})</h2>
            {notice && <p className="error" role="alert">{notice}</p>}
            {selection.length === 0 ? (
              <p className="hint">Noch leer. Tippe auf + bei einem Wort. Jede Seite der Auswahl wird als eigene A4-Seite gedruckt.</p>
            ) : (
              <ol className="selection-list">
                {selection.map((m, i) => (
                  <li key={m.id}>
                    <button type="button" className="sel-item" onClick={() => openPreview(m)}>
                      <PictogramThumb meaning={m} />
                      <MeaningLabel meaning={m} />
                    </button>
                    <span className="row-actions">
                      <button type="button" aria-label={`${m.de} nach oben`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" aria-label={`${m.de} nach unten`} disabled={i === selection.length - 1} onClick={() => move(i, 1)}>↓</button>
                      <button type="button" aria-label={`${m.de} entfernen`} onClick={() => toggle(m)}>✕</button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="selection-actions">
              <button type="button" className="primary" disabled={!selection.length || busy} onClick={() => print(selection)}>
                {selection.length === 1 ? "1 Seite drucken" : `${selection.length} Seiten drucken`}
              </button>
              <button type="button" disabled={!selection.length} onClick={() => setSelection([])}>Leeren</button>
            </div>
            <p className="small">
              Im Druckdialog A4, Skalierung 100 % und „Hintergrundgrafiken“ wählen. „Als PDF speichern“ ist dort ebenfalls möglich.
            </p>
          </aside>
        </div>

        <footer className="app-footer">
          Schrift ABeeZee (SIL Open Font License 1.1, <a href="/fonts/ABeeZee-OFL.txt">Lizenztext</a>).
        </footer>
      </div>

      <dialog ref={dialogRef} className="preview-dialog" aria-labelledby="preview-title" onClose={() => setPreview(null)} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
        {preview && (
          <div className="preview-body">
            <div className="preview-actions">
              <h2 id="preview-title"><MeaningLabel meaning={preview} /></h2>
              {preview.status === "draft" && <span className="badge">ungeprüft</span>}
              <div className="spacer" />
              <button type="button" onClick={() => toggle(preview)}>
                {inSelection.has(preview.id) ? "Aus der Druckauswahl" : "Zur Druckauswahl"}
              </button>
              <button type="button" className="primary" disabled={busy} onClick={() => print([preview])}>Diese Seite drucken</button>
              <button type="button" aria-label="Schließen" onClick={() => dialogRef.current?.close()}>✕</button>
            </div>
            {preview.collections && preview.collections.length > 0 && (
              <p className="small">Sammlungen: {preview.collections.map((c) => collectionName.get(c) ?? c).join(", ")}</p>
            )}
            <div className="preview">
              <Worksheet meaning={preview} idPrefix="pv" />
            </div>
          </div>
        )}
      </dialog>

      {printPages && (
        <div className="print-pages" aria-hidden="true">
          {printPages.map((m, i) => (
            <div className="print-page" key={`${m.id}-${i}`}>
              <Worksheet meaning={m} idPrefix={`pr${i}`} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
