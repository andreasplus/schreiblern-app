import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Meaning, SearchResultWord } from "../shared/types.ts";
import { fetchCollection, fetchMeanings, searchWords } from "./api.ts";
import { MeaningLabel, PictogramThumb, Worksheet } from "./Worksheet.tsx";
import { readSelection, writeSelection } from "./selection.ts";

type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; results: SearchResultWord[] }
  | { status: "error"; query: string; message: string };

async function fontsReady() {
  await document.fonts.load('27px "ABeeZee"');
  await document.fonts.ready;
}

export function App() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [chosenWord, setChosenWord] = useState<SearchResultWord | null>(null);
  const [preview, setPreview] = useState<Meaning | null>(null);
  const [selection, setSelection] = useState<Meaning[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [printPages, setPrintPages] = useState<Meaning[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Druckauswahl aus der Adresse wiederherstellen (#auswahl=id1,id2).
  useEffect(() => {
    const ids = readSelection(window.location.hash);
    if (!ids.length) return;
    fetchMeanings(ids)
      .then(setSelection)
      .catch((e: Error) => setSelectionError(`Druckauswahl konnte nicht geladen werden: ${e.message}`));
  }, []);

  useEffect(() => {
    const hash = writeSelection(selection.map((m) => m.id));
    if (hash !== window.location.hash) history.replaceState(null, "", hash || window.location.pathname + window.location.search);
  }, [selection]);

  // Suche mit kurzer Verzögerung; ältere Anfragen werden abgebrochen.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearch({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading", query: q });
      searchWords(q, ctrl.signal)
        .then((r) => setSearch({ status: "done", query: q, results: r.results }))
        .catch((e: Error) => {
          if (e.name !== "AbortError") setSearch({ status: "error", query: q, message: e.message });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const pickWord = (w: SearchResultWord) => {
    setChosenWord(w);
    // Nur eine Bedeutung: direkt anzeigen. Mehrere: keine Vorauswahl (APP-04).
    setPreview(w.meanings.length === 1 ? w.meanings[0]! : null);
  };

  const inSelection = useMemo(() => new Set(selection.map((m) => m.id)), [selection]);
  const addToSelection = (m: Meaning) => setSelection((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
  const removeFromSelection = (id: string) => setSelection((s) => s.filter((m) => m.id !== id));
  const move = (index: number, delta: number) =>
    setSelection((s) => {
      const t = index + delta;
      if (t < 0 || t >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[t]] = [copy[t]!, copy[index]!];
      return copy;
    });

  const addCollection = async (name: string) => {
    setBusy(true);
    setSelectionError(null);
    try {
      const items = await fetchCollection(name);
      setSelection((s) => [...s, ...items.filter((m) => !s.some((x) => x.id === m.id))]);
    } catch (e) {
      setSelectionError(`Sammlung konnte nicht geladen werden: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const print = useCallback(async (pages: Meaning[]) => {
    if (!pages.length) return;
    setBusy(true);
    try {
      await fontsReady();
      setPrintPages(pages);
    } finally {
      setBusy(false);
    }
  }, []);

  // Erst drucken, wenn die Druckseiten im DOM stehen.
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

  return (
    <>
      <div className="app">
        <header className="app-header">
          <h1>Schreiblern-App</h1>
          <p>Deutsche Wörter suchen, Schreibseite ansehen und im Browser drucken.</p>
        </header>

        <main className="layout">
          <section className="panel search-panel" aria-labelledby="search-title">
            <h2 id="search-title">Wort suchen</h2>
            <label className="sr-only" htmlFor="q">Deutsches Wort</label>
            <input
              id="q"
              ref={inputRef}
              className="search-input"
              type="search"
              placeholder="z. B. Haus, blau, eins, Bank"
              autoComplete="off"
              autoFocus
              maxLength={60}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <SearchResults state={search} chosen={chosenWord} onPick={pickWord} />

            {chosenWord && chosenWord.meanings.length > 1 && (
              <div className="choice" role="group" aria-labelledby="choice-title">
                <h3 id="choice-title">„{chosenWord.de}“ hat mehrere Bedeutungen. Bitte eine auswählen:</h3>
                <ul className="choice-list">
                  {chosenWord.meanings.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={`choice-item${preview?.id === m.id ? " is-active" : ""}`}
                        aria-pressed={preview?.id === m.id}
                        onClick={() => setPreview(m)}
                      >
                        <PictogramThumb meaning={m} />
                        <MeaningLabel meaning={m} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="presets">
              <h3>Vorbereitete Sammlungen</h3>
              <button type="button" disabled={busy} onClick={() => addCollection("words")}>Erste Wörter (25) hinzufügen</button>
              <button type="button" disabled={busy} onClick={() => addCollection("numbers")}>Zahlen 1 bis 10 hinzufügen</button>
            </div>
          </section>

          <section className="panel preview-panel" aria-labelledby="preview-title">
            <h2 id="preview-title">Vorschau</h2>
            {preview ? (
              <>
                <div className="preview-actions">
                  <MeaningLabel meaning={preview} />
                  {preview.status === "draft" && <span className="badge">ungeprüft</span>}
                  <div className="spacer" />
                  <button type="button" onClick={() => addToSelection(preview)} disabled={inSelection.has(preview.id)}>
                    {inSelection.has(preview.id) ? "In der Druckauswahl" : "Zur Druckauswahl"}
                  </button>
                  <button type="button" className="primary" disabled={busy} onClick={() => print([preview])}>
                    Diese Seite drucken
                  </button>
                </div>
                <div className="preview">
                  <Worksheet meaning={preview} idPrefix="pv" />
                </div>
              </>
            ) : (
              <p className="hint">
                {chosenWord && chosenWord.meanings.length > 1
                  ? "Wähle links eine Bedeutung, dann erscheint hier die Schreibseite."
                  : "Suche ein Wort und wähle einen Treffer, dann erscheint hier die Schreibseite."}
              </p>
            )}
          </section>

          <section className="panel selection-panel" aria-labelledby="selection-title">
            <h2 id="selection-title">Druckauswahl ({selection.length})</h2>
            {selectionError && <p className="error" role="alert">{selectionError}</p>}
            {selection.length === 0 ? (
              <p className="hint">Noch leer. Jede Seite der Auswahl wird als eigene A4-Seite gedruckt.</p>
            ) : (
              <ol className="selection-list">
                {selection.map((m, i) => (
                  <li key={m.id}>
                    <button type="button" className="link" onClick={() => setPreview(m)}>
                      <MeaningLabel meaning={m} />
                    </button>
                    <span className="row-actions">
                      <button type="button" aria-label={`${m.de} nach oben`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" aria-label={`${m.de} nach unten`} disabled={i === selection.length - 1} onClick={() => move(i, 1)}>↓</button>
                      <button type="button" aria-label={`${m.de} entfernen`} onClick={() => removeFromSelection(m.id)}>✕</button>
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
          </section>
        </main>

        <footer className="app-footer">
          Schrift ABeeZee (SIL Open Font License 1.1, <a href="/fonts/ABeeZee-OFL.txt">Lizenztext</a>).
        </footer>
      </div>

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

function SearchResults({
  state,
  chosen,
  onPick,
}: {
  state: SearchState;
  chosen: SearchResultWord | null;
  onPick: (w: SearchResultWord) => void;
}) {
  if (state.status === "idle") return null;
  if (state.status === "loading") return <p className="status" role="status">Suche läuft …</p>;
  if (state.status === "error")
    return <p className="error" role="alert">Die Suche ist fehlgeschlagen: {state.message}</p>;
  if (!state.results.length)
    return (
      <p className="status" role="status">
        Kein vorhandener Eintrag für „{state.query}“. Neue Wörter anlegen kommt in einer späteren Version.
      </p>
    );
  return (
    <ul className="results" aria-label="Treffer">
      {state.results.map((w) => (
        <li key={w.wordId}>
          <button
            type="button"
            className={`result${chosen?.wordId === w.wordId ? " is-active" : ""}`}
            onClick={() => onPick(w)}
          >
            {w.meanings.length === 1 ? <PictogramThumb meaning={w.meanings[0]!} /> : <span className="thumb thumb-multi">{w.meanings.length}</span>}
            <span className="result-text">
              {w.meanings.length === 1 ? (
                <MeaningLabel meaning={w.meanings[0]!} />
              ) : (
                <>
                  <span className="meaning-de">{w.de}</span>
                  <span className="meaning-desc"> · {w.meanings.length} Bedeutungen</span>
                </>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
