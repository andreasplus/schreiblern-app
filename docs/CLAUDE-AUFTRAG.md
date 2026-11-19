# Implementierungsauftrag

Baue eine WebApp zum Erstellen und Drucken zweisprachiger Schreiblernseiten auf Basis dieses Pakets.

Lies zuerst BACKLOG.md und README.md. Die PDFs unter reference/examples/ sind die visuelle Referenz. Nutze die mitgelieferte ABeeZee-Schrift und die Seed-Daten. Die Python-Skripte dienen zum Verständnis und zur Reproduktion der bisherigen Druckseiten.

## Wichtige Festlegungen

- Cloudflare und TypeScript.
- Keine Nutzerkonten. Zufällige Browserkennung im Cookie.
- Zehn neue Einträge pro Browser und Tag, verbindlich auf dem Server geprüft.
- Globales konfigurierbares Stundenkontingent mit sichtbarem Restzähler und Rücksetzzeitpunkt.
- Vorhandene Wörter bleiben abrufbar und druckbar, auch wenn Erstellkontingente ausgeschöpft sind.
- Wortlisten gehören zum jeweiligen Browser und sind standardmäßig privat.
- Mehrdeutige Wörter benötigen eine explizite Auswahl der Bedeutung und Übersetzung.
- Gemeinsamer Bestand mit getrennten Einträgen je Bedeutung.
- Einfache Piktogramme aus einer lizenzierten Bibliothek. Farben als Kreise, Zahlen als Ziffern und Zählpunkte. Zum Start keine Bild-KI.
- Browserdruck zuerst. Ein eigener serverseitiger PDF-Download ist zurückgestellt.
- Bestätigtes Arbeitsblattlayout erhalten. Keine Bedienhinweise in die Arbeitsblätter einfügen.

## Vorgehen

Starte mit einer lokal lauffähigen Version für vorhandene Wörter, Suche und Browserdruck. Ergänze anschließend Bedeutungswahl, private Listen und verbindliche Kontingente. Bereite neue Übersetzungen über eine austauschbare Schnittstelle vor. Kennzeichne fehlende Anbieterzugänge klar und verwende keine erfundenen produktiven Ergebnisse.

Teste besonders parallele Erstellanfragen, Idempotenz, doppelte Wörter, Kontingentwechsel, Ablauf alter Reservierungen und private Listen. Prüfe die Druckansicht visuell und mit mehreren Seiten.

Wähle für Routinefragen sinnvolle, dokumentierte Voreinstellungen. Hole Entscheidungen nur für echte externe Abhängigkeiten und Kosten ein. Liste noch offene Punkte aus dem Backlog in der Abschlussübergabe auf.

Implementiere keine Umgehung der Tages- oder Stundenlimits über Listenimporte, Vorschlagsanfragen oder Wiederholungen. Ein globales Budget für kostenpflichtige Versuche ist zusätzlich zum erfolgreichen Eintragszähler nötig.

Die 1.000 häufigsten Wörter sind ein eigenes Lieferziel. Es sind derzeit nur 36 Referenzeinträge vorhanden. Behaupte keinen vollständigen Import, solange Quelle, Nutzungsrecht, Definition und Prüfung fehlen.

## Erwartete Lieferung

Lauffähiger Quellcode, Datenbankmigrationen, wiederholbarer Seed-Import, lokale Startanleitung, Deploymentanleitung, Beispielkonfiguration ohne Geheimnisse, relevante Tests und eine kurze Dokumentation offener Punkte. Keine Veröffentlichung oder kostenpflichtige Aktivierung ohne passende Freigabe.
