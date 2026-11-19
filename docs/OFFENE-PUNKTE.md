# Offene Punkte nach P0

## Gewählte Voreinstellungen (änderbar)

- **Frontend ohne Router-Bibliothek.** Die Druckauswahl steht im Adress-Fragment `#auswahl=…`. Das ist bewusst nur eine Sitzungsauswahl, keine gespeicherte Wortliste (APP-12 folgt in P1).
- **Druckvorlage als SVG.** Die ganze Seite ist ein SVG in PDF-Punkten. Dadurch stimmen Maße mit der Referenz überein und ein späterer PDF-Renderer kann dieselbe Funktion nutzen.
- **Schriftbreiten als Tabelle.** `src/shared/fontMetrics.ts` wird aus der Schriftdatei erzeugt (`npm run fonts:metrics`). Die Verkleinerung langer Wörter rechnet damit wie die Referenz (ohne Kerning) und ist unabhängig vom Browser.
- **Fußzeile übernommen.** Die freigegebenen PDFs enthalten unten „ABeeZee • Wort / word • Druckgröße: 100 %“. Sie ist übernommen. Falls sie als Bedienhinweis gilt, lässt sie sich in `src/shared/worksheet.ts` mit einer Zeile entfernen.
- **Bank als Ergänzung.** Für die Abnahme von APP-04 enthält `data/seed-supplement.json` „Bank (Geldinstitut) · bank“ und „Bank (Sitzgelegenheit) · bench“, Status „ungeprüft“, ohne Piktogramm.
- **Tests ohne vitest-pool-workers.** Das Paket war zum Zeitpunkt der Umsetzung nicht mit Vitest 5 kompatibel. Die Integrationstests nutzen stattdessen eine flüchtige D1 über `getPlatformProxy` aus Wrangler.

## Noch zu prüfen

- Druck bei 100 % in **Firefox** und **Safari** sowie mobiles Drucken. Automatisiert geprüft ist nur Chromium.
- Auto-Piktogramm: eigene Zeichnung statt der Nutzervorlage. Bitte optisch abnehmen.

## Aus dem Backlog offen (P1 und später)

1. APP-07 Piktogrammbibliothek. Vorschlag: Microsoft Fluent Emoji (MIT), einfarbige Variante für den Druck; Alternative Noto Emoji (Apache 2.0).
2. APP-08 Neue Wörter, Übersetzungsschnittstelle. Vorschlag: Wiktionary-Daten (CC BY-SA, Namensnennung nötig) für Bedeutungen und Übersetzungen, Cloudflare Workers AI als Ersatz für unbekannte Wörter mit fester Kostenobergrenze.
3. APP-09 bis APP-11 Browserkennung, zehn Einträge pro Tag, globales Stundenbudget mit Anzeige.
4. APP-12 Private Wortlisten.
5. APP-13 Die 1.000 häufigsten Wörter (Quelle, Nutzungsrecht und Prüfung offen).
6. APP-14 Qualität, Sicherheit, Betrieb. APP-15 optionaler PDF-Download.
7. Aus „Noch festzulegen“: Name und Domain, Höhe der Kontingente, Prüfverfahren für neue öffentliche Einträge, Aufbewahrung privater Listen.
