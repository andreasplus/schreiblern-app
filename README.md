# Schreiblern-App

WebApp für druckbare zweisprachige Schreiblernseiten (Deutsch und Englisch). Nutzer suchen ein deutsches Wort, wählen bei mehreren Bedeutungen eine aus, sehen die A4-Schreibseite und drucken einzelne Seiten oder eine ganze Auswahl über den Browser.

Stand: P0 aus [docs/BACKLOG.md](docs/BACKLOG.md) (APP-01 bis APP-06). Offene Punkte stehen in [docs/OFFENE-PUNKTE.md](docs/OFFENE-PUNKTE.md).

## Aufbau

| Teil | Technik | Ort |
| --- | --- | --- |
| Frontend | React, Vite, TypeScript | `src/client/` |
| API | Cloudflare Worker | `src/worker/` |
| Datenbank | Cloudflare D1 (SQLite) | `migrations/` |
| Druckvorlage | eine reine Funktion, erzeugt SVG in A4 | `src/shared/worksheet.ts` |
| Piktogramme | Vektorzeichnungen aus der Referenz | `src/shared/pictograms.ts` |
| Seed-Daten | 36 Referenzeinträge, Ergänzungen und der Wortschatz (über 10.000 Bedeutungen in 242 Sammlungen) | `data/`, `data/wortschatz/` |

Die Druckvorlage übernimmt die Geometrie aus `reference/render_reference.py` unverändert in PDF-Punkten. Der Abgleich mit den freigegebenen PDFs ergibt weniger als 0,02 % abweichende Pixel (Auto ausgenommen, siehe unten).

## Lokal starten

Voraussetzung: Node.js 22.18 oder neuer. Ein Cloudflare-Konto ist für die lokale Entwicklung nicht nötig.

```bash
npm install
npm run db:setup:local   # D1-Migrationen und Seed-Import in die lokale Datenbank (.wrangler/)
npm run dev              # http://localhost:5173
```

## Wortschatz

Der Wortschatz für Kinder von 5 bis 8 Jahren liegt als Textdateien in `data/wortschatz/`, eine Datei je Sammlung („In der Kita“, „Unser Haus“, „Am Bahnhof“ …). Die Nummer im Dateinamen ist die Reihenfolge.

```text
# In der Kita
> Was es in der Kita gibt
Bank (Sitzgelegenheit) = bench
rot = red #e53935
zwei = two [2]
```

- `# Name` und optional `> Beschreibung` stehen oben, danach eine Zeile je Wort: `Deutsch (Bedeutung) = englisch`, optional `#rrggbb` für Farben und `[n]` für Zählpunkte (bis 20). Zeilen mit `//` sind Kommentare.
- Hat ein Wort mehrere Bedeutungen, braucht jede eine Angabe in Klammern. Sonst bricht der Seed-Import ab.
- Dasselbe Wort in mehreren Sammlungen ist eine Bedeutung mit mehreren Sammlungen.
- Neue Einträge haben den Status `draft` (in der App „ungeprüft“) und noch kein Bild.
- Die **Schwierigkeit** (1 sehr leicht bis 5 sehr schwer) berechnet `src/shared/difficulty.ts` aus der Schreibweise: Buchstabenzahl, Silben und Rechtschreibbesonderheiten (sch, ck, ie, Doppelkonsonanten, Dehnungs-h, ß, Fremdwortschreibungen …). Innerhalb einer Sammlung stehen leichte Wörter vorn.
- `node scripts/wortschatz-report.ts` zeigt Zahlen, Verteilung der Stufen und Warnungen (`--warnings`, `--collections`, `--level 1`).

## Bilder

- **Eingebaute Zeichnungen** (`src/shared/pictograms.ts`) für die Referenzwörter.
- **Noto Emoji** (Apache 2.0) für rund 700 weitere Wörter. `scripts/bilder-zuordnen.ts` ordnet sie über die deutschen Unicode-Namen zu (nur sichere Treffer, Mehrzahl übernimmt das Bild der Einzahl) und legt die benutzten SVGs unter `public/pictograms/noto/` ab. Korrekturen stehen in `data/bilder/noto-manuell.txt` (`Wort = 🐸` oder `Wort = -`).
- **Eigene SVGs**: Eine Datei `public/pictograms/eigene/<Bedeutungs-ID>.svg` wird beim nächsten Seed automatisch zugeordnet und ersetzt ein Noto-Emoji. Skripte, Ereignis-Attribute und externe Verweise sind darin nicht erlaubt.
- `node scripts/bildauftrag.ts` schreibt `generated/bildauftrag.csv`: alle Wörter ohne Bild mit Dateiname, Wortart, Priorität und einer Bildbeschreibung (deutsch und als englischer Prompt).

Neu zuordnen (die Quellen sind bewusst keine Abhängigkeit des Projekts):

```bash
npm i --no-save @iconify-json/noto cldr-annotations-full cldr-annotations-derived-full
node scripts/bilder-zuordnen.ts
```

Der Seed-Import ist wiederholbar: Er legt nur Fehlendes an, überschreibt nichts und meldet Abweichungen zwischen `data/*.json` und der Datenbank. Änderungen an bestehenden Einträgen gehören in eine neue Migration.

## Prüfen

```bash
npm run typecheck
npm test                 # Unit- und D1-Integrationstests (Miniflare, keine Netzverbindung nötig)
npm run build

# Browsertests gegen den laufenden Entwicklungsserver (npm run dev in zweitem Terminal)
npx playwright install chromium   # einmalig
npm run test:e2e

# Visueller Abgleich mit den Referenz-PDFs (Poppler und ImageMagick nötig)
npm run compare:reference -- --ref-dir /pfad/zu/reference/examples
```

Die 35-seitige Referenz-PDF ist nicht im Repository (siehe Rechte). Ohne sie vergleicht `compare:reference` nur die Blitz-Seite.

## Drucken

„Drucken“ öffnet den Druckdialog des Browsers, dort ist auch „Als PDF speichern“ möglich. Für exakte Maße A4, Skalierung 100 % und Hintergrundgrafiken wählen. Jede Bedeutung ergibt genau eine A4-Seite, ohne leere Schlussseite. Navigation und Schaltflächen erscheinen nicht im Ausdruck. Die Druckauswahl steht in der Adresse (`#auswahl=…`) und übersteht Neuladen.

Geprüft: Chromium (automatisiert, 35 Seiten). Firefox, Safari und mobiles Drucken sind noch von Hand zu prüfen, siehe offene Punkte.

### Gedruckte Seiten

Nach dem Druckdialog fragt die App, ob die Seiten wirklich gedruckt wurden (der Browser meldet nicht, ob abgebrochen wurde). Mit „Ja“ werden sie als gedruckt markiert; in der Vorschau lässt sich die Markierung auch von Hand setzen oder entfernen. Der Filter „Gedruckt“ zeigt alle, nur noch nicht gedruckte oder nur schon gedruckte Seiten.

Die Markierungen liegen nur im Browser (`localStorage`, Schlüssel `schreiblern.gedruckt.v1`, ID → Datum). Ein Cookie wäre auf etwa 4 KB begrenzt und ginge bei jedem Abruf an den Server. Für den Filter schickt die App die IDs per `POST /api/words` mit; gespeichert wird auf dem Server nichts.

## Deployment

Siehe [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Es werden keine kostenpflichtigen Dienste aktiviert. P0 braucht keine Geheimnisse.

## Rechte

- ABeeZee: SIL Open Font License 1.1, unverändert unter `public/fonts/` mit Lizenztext. Quelle: https://github.com/google/fonts/tree/main/ofl/abeezee
- Piktogramme: Vektorzeichnungen aus den Skripten des Übergabepakets.
- Noto Emoji (`public/pictograms/noto/`): Copyright Google LLC, Apache License 2.0, siehe `public/pictograms/noto/LICENSE.txt`. Die Zuordnung nutzt die deutschen Emoji-Namen aus Unicode CLDR (Unicode License); diese Daten werden nur beim Zuordnen gelesen und nicht ausgeliefert.
- Wortschatz (`data/wortschatz/`): eigene Zusammenstellung für dieses Projekt, ohne Übernahme aus fremden Wortlisten oder Datenbanken.
- Auto: Das frühere Rasterbild `car.png` stammt aus einer Nutzervorlage ohne Nachweis zur öffentlichen Weiterverwendung. Es ist durch eine eigene Vektorzeichnung ersetzt. `car.png`, `reference.png` und die 35-seitige Beispiel-PDF (enthält das Bild) liegen deshalb nicht in diesem öffentlichen Repository.
