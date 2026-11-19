import { useMemo } from "react";
import type { Meaning } from "../shared/types.ts";
import { renderWorksheetSvg } from "../shared/worksheet.ts";
import { pictogramSvg } from "../shared/pictograms.ts";

/** Eine Schreibseite aus der gemeinsamen Druckvorlage. */
export function Worksheet({ meaning, idPrefix }: { meaning: Meaning; idPrefix: string }) {
  const svg = useMemo(
    () =>
      renderWorksheetSvg(
        { de: meaning.de, en: meaning.en, number: meaning.number, color: meaning.color, pictogram: meaning.pictogram },
        idPrefix,
      ),
    [meaning, idPrefix],
  );
  // Der SVG-Text entsteht ausschließlich in renderWorksheetSvg; alle Datenwerte werden dort XML-escaped.
  return <div className="worksheet-frame" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Wort, Bedeutungsangabe und Übersetzung für Auswahllisten. */
export function MeaningLabel({ meaning }: { meaning: Meaning }) {
  return (
    <span className="meaning-label">
      <span className="meaning-de">{meaning.de}</span>
      {meaning.description && <span className="meaning-desc"> ({meaning.description})</span>}
      <span className="meaning-sep"> · </span>
      <span className="meaning-en">{meaning.en}</span>
      {meaning.number !== null && <span className="meaning-num"> {meaning.number}</span>}
    </span>
  );
}

export function PictogramThumb({ meaning }: { meaning: Meaning }) {
  const inner = pictogramSvg(meaning);
  if (!inner) return <span className="thumb thumb-empty" aria-label="ohne Bild" />;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-72 -72 144 144" font-family="ABeeZee" aria-hidden="true">` +
    `<g transform="scale(1 -1)" stroke-miterlimit="10">${inner}</g></svg>`;
  return <span className="thumb" dangerouslySetInnerHTML={{ __html: svg }} />;
}
