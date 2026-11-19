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
| Seed-Daten | 36 Referenzeinträge + Bank-Ergänzung | `data/` |

Die Druckvorlage übernimmt die Geometrie aus `reference/render_reference.py` unverändert in PDF-Punkten. Der Abgleich mit den freigegebenen PDFs ergibt weniger als 0,02 % abweichende Pixel (Auto ausgenommen, siehe unten).

## Lokal starten

Voraussetzung: Node.js 22.18 oder neuer. Ein Cloudflare-Konto ist für die lokale Entwicklung nicht nötig.

```bash
npm install
npm run db:setup:local   # D1-Migrationen und Seed-Import in die lokale Datenbank (.wrangler/)
npm run dev              # http://localhost:5173
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

## Deployment

Siehe [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Es werden keine kostenpflichtigen Dienste aktiviert. P0 braucht keine Geheimnisse.

## Rechte

- ABeeZee: SIL Open Font License 1.1, unverändert unter `public/fonts/` mit Lizenztext. Quelle: https://github.com/google/fonts/tree/main/ofl/abeezee
- Piktogramme: Vektorzeichnungen aus den Skripten des Übergabepakets.
- Auto: Das frühere Rasterbild `car.png` stammt aus einer Nutzervorlage ohne Nachweis zur öffentlichen Weiterverwendung. Es ist durch eine eigene Vektorzeichnung ersetzt. `car.png`, `reference.png` und die 35-seitige Beispiel-PDF (enthält das Bild) liegen deshalb nicht in diesem öffentlichen Repository.
