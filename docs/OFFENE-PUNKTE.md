# Offene Punkte nach P0

## Gewählte Voreinstellungen (änderbar)

- **Frontend ohne Router-Bibliothek.** Die Druckauswahl steht im Adress-Fragment `#auswahl=…`. Das ist bewusst nur eine Sitzungsauswahl, keine gespeicherte Wortliste (APP-12 folgt in P1).
- **Druckvorlage als SVG.** Die ganze Seite ist ein SVG in PDF-Punkten. Dadurch stimmen Maße mit der Referenz überein und ein späterer PDF-Renderer kann dieselbe Funktion nutzen.
- **Schriftbreiten als Tabelle.** `src/shared/fontMetrics.ts` wird aus der Schriftdatei erzeugt (`npm run fonts:metrics`). Die Verkleinerung langer Wörter rechnet damit wie die Referenz (ohne Kerning) und ist unabhängig vom Browser.
- **Fußzeile übernommen.** Die freigegebenen PDFs enthalten unten „ABeeZee • Wort / word • Druckgröße: 100 %“. Sie ist übernommen. Falls sie als Bedienhinweis gilt, lässt sie sich in `src/shared/worksheet.ts` mit einer Zeile entfernen.
- **Bank als Ergänzung.** Für die Abnahme von APP-04 enthält `data/seed-supplement.json` „Bank (Geldinstitut) · bank“ und „Bank (Sitzgelegenheit) · bench“, Status „ungeprüft“, ohne Piktogramm.
- **Tests ohne vitest-pool-workers.** Das Paket war zum Zeitpunkt der Umsetzung nicht mit Vitest 5 kompatibel. Die Integrationstests nutzen stattdessen eine flüchtige D1 über `getPlatformProxy` aus Wrangler.

## Wortübersicht und Sammlungen (APP-17, erster Stand)

- Sammlungen liegen in `data/collections.json` und den Tabellen `collections` und `collection_items` (Migration 0002). Eine Bedeutung kann in mehreren Sammlungen stehen. Der Seed-Import ergänzt neue Mitglieder, entfernt aber keine. Dafür braucht es eine Migration.
- „Kurze Wörter“ ist bewusst ein Längenfilter (Deutsch oder Englisch) und keine feste Sammlung.
- Neu und ungeprüft: orange, lila, rosa, braun, schwarz, weiß sowie Vogel, Wolke, Baum, Blume und Herz mit eigenen Zeichnungen.
- `/api/words` filtert und sortiert serverseitig und liefert Seiten zu 120 Wörtern (`limit` bis 500, `offset`). Parameter: `q`, `collection`, `lang`, `minLen`, `maxLen`, `minDiff`, `maxDiff`, `sort` (`collection`, `alpha`, `length`, `difficulty`). Die Sammlungsauswahl ist bei 242 Sammlungen eine Liste statt Knöpfen.
- Der Worker liest für „Alle Sammlungen“ je Abruf alle rund 10.000 Bedeutungen und filtert sie (lokal etwa 0,3 s, davon 20 bis 30 ms Rechenzeit). Im kostenlosen Workers-Tarif (10 ms CPU) kann das knapp werden. Wenn ja: Buchstabenzahl als Spalte speichern und alles in SQL filtern, oder Antworten zwischenspeichern.

## Wortschatz (10.000 Wörter)

- 10.057 Bedeutungen (10.021 Wörter) in 242 Sammlungen aus dem Alltag, Textdateien in `data/wortschatz/`. Format und Regeln stehen im README.
- **Alles ungeprüft** (`draft`) und **ohne Bilder**. Übersetzungen und Bedeutungsangaben sollten stichprobenartig geprüft werden, besonders bei Wörtern mit mehreren Bedeutungen.
- Enthalten sind auch Mehrzahlformen (Äpfel, Bäume), Zeitformen (ging, gelaufen, er läuft) und Steigerungen (größer, am größten), weil gerade diese Schreibweisen geübt werden.
- Schwierigkeit ist eine Regel, kein Urteil von Lehrkräften. Verteilung: Stufe 1 4 %, 2 17 %, 3 25 %, 4 30 %, 5 23 %. Wenn die Stufen zu streng wirken, lassen sich die Schwellen in `src/shared/difficulty.ts` an einer Stelle anpassen; der nächste Seed setzt die Stufe aber nur bei leeren Werten, für bestehende braucht es eine Migration.
- Migration 0003 legt die Spalte `meanings.difficulty` an; der Seed trägt sie auch bei bestehenden Einträgen nach.

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
7. APP-16 Eigene Schrift (P1, vor neuen Wörtern), APP-17 Druck-Sets (P1, mit Wortlisten), APP-18 kurze Sätze (P2). Details in BACKLOG.md.
8. Aus „Noch festzulegen“: Name und Domain, Höhe der Kontingente, Prüfverfahren für neue öffentliche Einträge, Aufbewahrung privater Listen.
