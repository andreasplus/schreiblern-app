# Backlog: Schreiblern-App Deutsch und Englisch

Stand: 19. November 2026

## Ziel

Nutzer geben ein deutsches Wort ein und erhalten eine druckbare A4-Schreibseite mit passender englischer Übersetzung und einem einfachen Piktogramm. Bereits erstellte Einträge können alle wiederverwenden. Nutzer können ohne Konto eigene Wortlisten zusammenstellen und drucken.

Die beigefügten PDFs zeigen die bestätigte Gestaltung. Die Python-Skripte sind eine funktionierende Layoutreferenz und keine fertige WebApp.

## Beschlossene Anforderungen

- Cloudflare und TypeScript als Zielarchitektur.
- Keine Nutzerkonten und kein Login.
- Zufällige Browserkennung in einem Cookie. Die Tagesbegrenzung wird auf dem Server geprüft.
- Maximal zehn neue Worteinträge je Browser und Kalendertag. Ein Eintrag bezeichnet ein Wort mit einer konkreten Bedeutung und Übersetzung.
- Zusätzlich ein globales Stundenkontingent für neue Einträge. Dessen Höhe ist konfigurierbar und noch festzulegen.
- Sichtbare Anzeige der verbleibenden Stundenplätze und des nächsten Rücksetzzeitpunkts.
- Bereits vorhandene Einträge bleiben auch bei ausgeschöpften Erstellkontingenten nutzbar.
- Wörter und Bedeutungen werden gemeinsam gespeichert. Wortlisten gehören zur Browserkennung.
- Bei mehreren Bedeutungen muss der Nutzer eine Variante markieren.
- Einfache Piktogramme reichen aus. Zum Start keine generative Bild-KI.
- Farben werden als farbige Kreise dargestellt.
- Zahlen erhalten Ziffer und passende Zählpunkte. In beiden Spalten stehen Zahlwort und Ziffer zum Nachspuren.
- Drucken über den Browser. Ein eigener serverseitiger PDF-Download wird zunächst zurückgestellt.
- Die 1.000 häufigsten deutschen Wörter sollen vorbereitet werden. Die ersten 25 Wortpaare, zehn Zahlwörter und Blitz liegen bereits als Referenzdaten vor.

## Verbindliche Gestaltung der Schreibseite

- DIN A4 hochkant, 210 × 297 mm, weißer Hintergrund.
- Schrift ABeeZee Regular, lokal bereitstellen. Der Lizenztext liegt bei.
- Oben links „Meine ersten Wörter“, bei Zahlen „Meine ersten Zahlen“.
- Oben rechts eine freie Namenslinie.
- Ein einfaches, gut erkennbares Piktogramm oben mittig.
- Zwei Spalten: Deutsch links, Englisch rechts.
- Deutsche und britische Flagge statt ausgeschriebener Sprachbezeichnungen.
- Je Spalte ein schwarzes Beispielwort als Überschrift.
- Danach drei Zeilen mit jeweils genau einem hellgrauen Wort direkt in der Lineatur.
- Anschließend drei identische leere Schreibzeilen.
- Vier waagerechte Linien bilden drei gleich hohe Bereiche. Abstand benachbarter Linien: 40/3 PDF-Punkte, etwa 4,70 mm.
- Links jeder Lineatur ein Häuschen mit Dach, Wohnbereich und Keller.
- Hellgraue Vorlage ungefähr RGB 201/201/201. Grundlinie und Schriftpositionen anhand der Referenz-PDFs abgleichen.
- Keine Texte „Jetzt selbst schreiben:“ und „Erst nachspuren. Dann selbst schreiben.“.
- Bei Zahlen steht zusätzlich rechts vom Zahlwort die Ziffer, sowohl in der Überschrift als auch in jeder der drei Nachspurzeilen. Beispiel „eins   1“ und „one   1“.
- In der englischen Spalte Kleinbuchstaben beibehalten. Deutsche Substantive groß, Farben und Zahlwörter wie in den Seed-Daten klein schreiben.
- Kein Abschneiden langer Wörter. Nur die betroffene Vorlage bei Bedarf proportional verkleinern. Die Lineatur bleibt unverändert.

## Empfohlene technische Aufteilung

Diese Punkte sind Umsetzungsvorschläge, sofern unten nicht als beschlossen bezeichnet.

- TypeScript-Frontend mit einem kleinen Komponentenaufbau, beispielsweise React mit Vite.
- Cloudflare Worker als API und zur Auslieferung der App.
- D1 für Wortbestand, Bedeutungen, Browserkennungen, Listen, Erstellaufträge und Kontingente.
- Piktogramme zunächst als versionierte lokale SVG-Dateien aus einer ausgewählten Bibliothek. R2 nur bei Bedarf für zusätzliche Dateien verwenden.
- Eine zentrale Druckvorlage für alle Einträge. Pro Wort keine vollständige HTML-Seite oder PDF dauerhaft ablegen.
- Übersetzung und Bedeutungsfindung über eine austauschbare serverseitige Schnittstelle. Anbieter und Kostenobergrenze sind noch offen.
- Neue Einträge benötigen Wort, Bedeutung, Übersetzung und ein Piktogramm oder einen ausdrücklichen Status „ohne Bild“.
- Eintragserstellung idempotent und gegen parallele Anfragen abgesichert umsetzen.
- Bereite bestehende Daten so auf, dass später ein PDF-Renderer ergänzt werden kann, ohne den Wortbestand umzubauen.

## P0: Druckbare erste Version

### APP-01: Projekt und lokale Entwicklung

Umfang: Frontend, Worker, D1-Migrationen, Konfiguration und lokale Startanleitung.

Abnahme:
- Ein neuer Checkout lässt sich anhand der README lokal starten.
- Geheimnisse stehen ausschließlich in der Serverumgebung. Beispielkonfiguration enthält keine echten Schlüssel.
- Seed-Import und Build sind dokumentiert.
- Deployment ist vorbereitet. Keine kostenpflichtigen Dienste ohne freigegebene Konfiguration aktivieren.

### APP-02: Wortbestand und Bedeutungen modellieren

Umfang: Ein deutsches Wort kann mehrere Bedeutungen haben. Jede Bedeutung hat eine eindeutige Kennung, eine konkrete englische Übersetzung und eine Bildzuordnung.

Abnahme:
- „Bank, Geldinstitut, bank“ und „Bank, Sitzgelegenheit, bench“ sind getrennte Einträge.
- Wiederholte Imports und parallele Anfragen erzeugen keine doppelten Bedeutungen.
- Suchen tolerieren überflüssige Leerzeichen und Groß-/Kleinschreibung. Angezeigte Schreibweisen bleiben korrekt.
- Umlaute und ß gehen nicht verloren. Keine automatische Gleichsetzung von „schon“ und „schön“.
- Piktogramm und Übersetzung gehören zur Bedeutung, nicht nur zum Suchwort.

### APP-03: Suche und direkte Wiederverwendung

Abnahme:
- Nutzer können ein Wort eingeben und bereits vorhandene Treffer auswählen.
- Ein Treffer öffnet eine Vorschau der passenden Schreibseite.
- Aufrufe vorhandener Einträge verbrauchen keine Erstellplätze.
- Status für Laden, keine Treffer und Fehler sind verständlich dargestellt.

### APP-04: Mehrdeutige Wörter auswählen

Abnahme:
- Bei mehreren sinnvollen Bedeutungen erscheint eine Auswahl mit Wort, kurzer Bedeutungsangabe, englischer Übersetzung und Piktogramm, sofern vorhanden.
- Beispiel: „Bank (Geldinstitut) · bank“ und „Bank (Sitzgelegenheit) · bench“.
- Keine Variante wird automatisch verbindlich ausgewählt.
- Erst nach Auswahl wird ein neuer Eintrag angelegt und das Kontingent belastet.
- Auf dem Arbeitsblatt steht das Wort ohne Klammerzusatz. Das Piktogramm und die Übersetzung verdeutlichen die Bedeutung.
- Wenn die Zuordnung nicht eindeutig ist, fragt die App nach oder zeigt einen korrigierbaren Vorschlag. Keine erfundene eindeutige Zuordnung.

### APP-05: Gemeinsame Druckvorlage

Abnahme:
- Alle verbindlichen Gestaltungsmerkmale aus diesem Dokument sind umgesetzt.
- Die Referenzen Auto, Blau, Banane, Blitz sowie eins und zehn werden zum Abgleich verwendet.
- ABeeZee ist vor dem Druck geladen. Piktogramme sind ebenfalls vollständig verfügbar.
- Eine Seite pro Eintrag, keine abgeschnittenen Elemente, keine zusätzliche leere Schlussseite.
- Navigation, Schaltflächen und Kontingentanzeigen erscheinen nicht im Ausdruck.
- Farben und Flaggen bleiben farbig, soweit die Druckereinstellungen das erlauben.
- A4-Druck bei 100 Prozent in Chrome und Firefox prüfen. Safari und mobiles Drucken gesondert prüfen und bekannte Abweichungen dokumentieren.
- „Drucken“ öffnet den Browserdruckdialog. „Als PDF speichern“ ist über diesen Dialog möglich.

### APP-06: Seed-Daten importieren

Abnahme:
- Die 25 vorgegebenen Wortpaare werden in derselben Reihenfolge importiert.
- Zahlwörter eins bis zehn sowie Blitz/lightning sind enthalten.
- Farben erhalten Kreise und Zahlen die korrekte Anzahl Zählpunkte.
- Bestehende Wörter werden durch wiederholten Import nicht dupliziert oder kommentarlos überschrieben.
- Die mitgelieferten Daten werden geprüft und ergänzt. Sie ersetzen keinen vollständigen 1.000-Wörter-Datensatz.

## P1: Eigene Wörter, Kontingente und Listen

### APP-07: Piktogrammbibliothek und Zuordnung

Abnahme:
- Eine einheitliche, für die Veröffentlichung nutzbare SVG-Bibliothek wird ausgewählt. Lizenz und notwendige Namensnennung sind dokumentiert.
- Zu jedem Symbol gibt es eine stabile ID und eine Zuordnung zu Bedeutungen.
- Farben und Zahlbilder entstehen direkt aus Daten.
- Fehlt ein Symbol, ist eine Schreibseite ohne Bild möglich. Der Nutzer wird vor dem Erstellen darauf hingewiesen.
- Kein generatives Bildmodell im ersten Release.
- Keine ungeprüften SVG-Uploads oder beliebigen externen Bild-URLs durch Nutzer.
- Die Herkunft des Auto-Bildes ist nur die alte Nutzervorlage. Für einen öffentlichen Betrieb ein lizenziertes Ersatzsymbol verwenden, solange Rechte nicht geklärt sind.

### APP-08: Neue Wörter vorbereiten und erstellen

Abnahme:
- Vor jeder externen Anfrage wird der vorhandene Wortbestand durchsucht.
- Bedeutungen und Übersetzungen werden zunächst vorgeschlagen. Der Nutzer wählt oder bestätigt die passende Variante.
- Erstellung darf keinen Auftrag für eine bereits vorhandene Bedeutung auslösen.
- Anfragezustände sind nachvollziehbar: vorbereitet, reserviert, in Bearbeitung, fertig, fehlgeschlagen.
- Doppelklicks und Wiederholungen derselben Anfrage erzeugen weder zusätzliche Einträge noch zusätzlichen Verbrauch.
- Zeitüberschreitungen und Fehler erhalten eine verständliche Meldung und einen sicheren Wiederholungsweg.
- Neue, ungeprüfte Einträge sind als solche erkennbar. Eine Empfehlung ist, sie erst nach Prüfung öffentlich suchbar zu machen.
- Ein öffentliches Korrektur- oder Meldeverfahren und ein geschützter Betreiberzugang zur Prüfung werden vorgesehen. Das erfordert keine Nutzerkonten für die Anwender.

### APP-09: Browserkennung ohne Nutzerkonto

Abnahme:
- Der Server vergibt eine zufällige, nicht erratbare Kennung in einem Cookie.
- Cookie in Produktion mit Secure, HttpOnly und geeignetem SameSite-Wert.
- Keine IP-Adresse als alleinige Identität und kein Fingerprinting.
- Die Kennung besitzt keine Rechte auf Betreiberfunktionen.
- Nutzer sehen den Hinweis, dass Listen an diesen Browser gebunden sind und beim Löschen der Browserdaten verloren gehen können.
- Tageszähler und Listen sind serverseitig der Kennung zugeordnet. Der Client kann sie nicht durch Änderung einer Zahl manipulieren.
- Fremde Kennungen können nicht aus öffentlichen Listen oder API-Antworten ausgelesen werden.

### APP-10: Zehn neue Einträge pro Tag

Abnahme:
- Tagesgrenze zehn neu angelegte Bedeutungs-Einträge je Browserkennung.
- Empfehlung: Kalendertag in Europe/Berlin. Zeitzone zentral konfigurieren und Sommer-/Winterzeit berücksichtigen.
- Vorhandene Einträge, Suchtreffer, Druck und Listenbearbeitung zählen nicht.
- Reservierung wird serverseitig atomar geprüft. Auch 20 gleichzeitige Anfragen können die Grenze nicht überschreiten.
- Ein endgültig fehlgeschlagener Auftrag gibt den reservierten Eintragsplatz wieder frei. Tatsächlich entstandene externe Kosten werden dennoch gesondert erfasst.
- Nur die erste erfolgreiche Erstellung einer Bedeutung zählt. Andere Nutzer, die denselben fertigen Eintrag übernehmen, werden nicht belastet.
- Die Begrenzung ist bewusst umgehbar, etwa durch Cookie-Löschung. Das ist akzeptiert. Der globale Schutz muss trotzdem verbindlich sein.

### APP-11: Globales Stundenbudget und Anzeige

Abnahme:
- Globale maximale Zahl neuer Einträge pro Stunde konfigurierbar, ohne Frontendänderung.
- Empfehlung: feste Stundenfenster. API liefert verbleibende Plätze, reservierte Plätze und Rücksetzzeitpunkt.
- Anzeige etwa „Noch 18 neue Wörter in dieser Stunde verfügbar. Neues Kontingent ab 15:00 Uhr“.
- Bei null Plätzen sind neue Erstellungen gesperrt. Bestehende Inhalte bleiben nutzbar.
- Eintragserstellung reserviert vor Arbeitsbeginn atomar Tages- und Stundenplatz. Keine getrennten ungesicherten Lese-/Schreibschritte.
- Reservierungen besitzen Ablaufzeiten. Abgebrochene Aufträge blockieren keine Plätze dauerhaft.
- Reservierungen aus einer alten Stunde bleiben ihrem ursprünglichen Fenster zugeordnet. Ein verspäteter Abschluss belastet das neue Fenster nicht zusätzlich.
- Anzeige kann kurz verzögert sein. Maßgeblich bleibt die serverseitige Prüfung bei der Anfrage.
- Zusätzlich externe Versuche, parallele Aufträge und tatsächliche Kosten begrenzen. Fehler dürfen nicht durch unbegrenzte kostenlose Neuversuche Kosten verursachen.
- Vorschläge und Übersetzungsanfragen ebenfalls begrenzen, da sie vor der endgültigen Erstellung Kosten verursachen können.

### APP-12: Wortlisten ohne Konto

Abnahme:
- Liste erstellen, umbenennen, löschen und Wörter hinzufügen oder entfernen.
- Reihenfolge ändern und mehrere Seiten zusammen drucken.
- Nur die eigene Browserkennung kann eine private Liste lesen oder ändern.
- Listen sind standardmäßig privat. Freigabelinks sind eine optionale spätere Erweiterung und nicht automatisch aktiv.
- Unbekannte Wörter aus einer Liste durchlaufen dieselbe Bedeutungswahl und dieselben Kontingente.
- Ein Listenimport kann die Erstellgrenzen nicht umgehen.
- Empfehlung: JSON-Export und Import als einfache Sicherung bei Browserwechsel. Keine unbeabsichtigte automatische öffentliche Veröffentlichung.

## P2: Vorbereiteter Bestand und Betrieb

### APP-13: Die 1.000 häufigsten deutschen Wörter vorbereiten

Abnahme:
- Eine geeignete Häufigkeitsquelle wird mit URL, Version und Nutzungsrecht dokumentiert.
- Vor dem Import ist entschieden, ob „Wörter“ Lemmata oder einzelne Wortformen bedeutet.
- Die häufigsten 1.000 Wörter bleiben das Ziel. Eine abweichende kindgerechte Auswahl benötigt eine ausdrückliche Entscheidung.
- Funktionswörter und abstrakte Wörter werden nicht stillschweigend entfernt. Sie dürfen ohne Piktogramm angeboten werden.
- Bedeutungen und englische Übersetzungen werden geprüft. Die Zahl der Bedeutungs-Einträge darf dadurch größer als 1.000 werden.
- Vorbereitung läuft als kontrollierter Batch, außerhalb der Nutzerkontingente und mit eigenem Kostenbudget.
- Jeder Eintrag erhält Quellen- und Prüfstatus.
- Import lässt sich fortsetzen und wiederholen. Es gibt einen Bericht über fertiggestellte, fehlende und fehlerhafte Einträge.
- Der erste Release darf mit den vorhandenen 36 Einträgen starten. Die 1.000 vorbereiteten Wörter bleiben ein eigenes Lieferziel.

### APP-14: Qualität, Sicherheit und Betrieb

Abnahme:
- Nutzertext wird als Text gerendert. Keine HTML- oder Skriptausführung aus Worteingaben.
- Server validiert Eingabelänge, erlaubte Anfragegrößen und Listenlänge.
- Schreibende Anfragen sind gegen fremde Webseiten abgesichert, beispielsweise durch Origin-Prüfung und CSRF-Schutz.
- Prüfoberfläche ist geschützt. Keine öffentlich erreichbaren Freigabe- oder Löschfunktionen.
- Neue Einträge enthalten keinen automatisch veröffentlichten personenbezogenen Freitext.
- Einträge können gemeldet, korrigiert und bei Bedarf gesperrt werden. Listenreferenzen bleiben möglichst stabil.
- Aufbewahrung und Löschung verwaister Browserkennungen und Listen werden dokumentiert.
- Betreiber sehen Zahl der Erstellungen, Fehlversuche, Wartezeiten, Kontingentblockaden und externen Kosten. Keine unnötigen personenbezogenen Protokolle.
- Datenexport, Sicherung und Wiederherstellung werden beschrieben und einmal geprüft.

### APP-15: Optionaler direkter PDF-Download

Noch nicht Teil des ersten Releases.

Vor Umsetzung prüfen:
- Reicht Browserdruck einschließlich „Als PDF speichern“ auf den genutzten Geräten aus?
- Wird eine PDF im Browser erzeugt oder einmal serverseitig gerendert und zwischengespeichert?
- Wie hoch sind Laufzeit, Speicherbedarf und Kosten pro Export?
- Wie werden Schriften, Bilder, Seitenumbrüche und große Listen zuverlässig verarbeitet?
- Ein serverseitiger Renderer darf keine frei eingegebenen URLs oder beliebiges HTML laden.

## Neu aufgenommen am 19. November 2026

Diese drei Punkte kamen nach Abschluss von P0 dazu. Sie sind erfasst, aber noch nicht umgesetzt. Die Einordnung ist ein Vorschlag.

### APP-16: Eigene Schrift importieren (P1, vor APP-08)

Hintergrund: Online verfügbare Schriften sind für Kinder schlecht nachzuschreiben. Eine eigene, kindgerechte Schreibschrift oder Druckschrift soll ABeeZee ersetzen oder ergänzen.

Einordnung: Zu Beginn von P1, vor neuen Wörtern und vor dem 1.000-Wörter-Bestand. Die Schrift bestimmt Schriftgröße, Verkleinerung langer Wörter und die Lage in der Lineatur. Ein späterer Wechsel würde alle Druckseiten erneut abnahmepflichtig machen.

Abnahme:
- Die Schriftdatei liegt als TTF, OTF oder WOFF2 vor. Lizenz und Erlaubnis zur Einbettung im Web sind dokumentiert. Bei einem öffentlichen Repository auch die Erlaubnis zur Weitergabe.
- Die Schrift wird lokal ausgeliefert, nicht über einen externen Schriftdienst.
- Die Schriftbreiten werden aus der Datei erzeugt (`npm run fonts:metrics`), damit lange Wörter weiter proportional verkleinert werden.
- Die x-Höhe füllt wie bisher genau einen Lineaturbereich von 40/3 pt. Ober- und Unterlängen treffen die obere und untere Linie. Die Lineatur selbst bleibt unverändert.
- Umlaute, ß, Ziffern 0 bis 9 und alle Buchstaben der Seed-Daten sind enthalten. Fehlende Zeichen werden beim Erzeugen der Breiten gemeldet.
- Alle Referenzseiten (Auto, blau, Banane, Blitz, eins, zehn) werden mit der neuen Schrift neu gerendert und von Andreas freigegeben. Danach ersetzen sie die bisherigen Referenzen.
- Offen: Ersetzt die eigene Schrift ABeeZee vollständig, oder können Nutzer zwischen Schriften wählen? Eine Auswahl wirkt sich auf Vorlage, Vorschau und gespeicherte Listen aus.

### APP-17: Druck-Sets (P1, mit APP-12)

Hintergrund: Vorbereitete Sets wie „Kurze Wörter“, „Tiere“ oder „Zahlen“ sollen mit einem Klick gedruckt werden können.

Einordnung: P1 zusammen mit den Wortlisten (APP-12). Technisch ist ein Set eine vom Betreiber gepflegte, öffentliche Liste. P0 enthält bereits zwei feste Sammlungen („Erste Wörter“ und „Zahlen 1 bis 10“), auf denen das aufbaut.

Abnahme:
- Sets haben Namen, Beschreibung, feste Reihenfolge und verweisen auf Bedeutungen, nicht auf Suchwörter.
- Eine Bedeutung kann in mehreren Sets vorkommen, etwa „Kuh“ in „Tiere“ und „Kurze Wörter“.
- Erste Sets: Kurze Wörter, Tiere, Zahlen. Kriterium für „kurz“ festlegen, Vorschlag höchstens vier Buchstaben.
- Ein Set druckt genau eine A4-Seite je Eintrag. Nutzer können ein Set in die Druckauswahl oder eine eigene Liste übernehmen und dort anpassen.
- Sets werden über Seed-Dateien oder die Betreiberprüfung gepflegt, nicht von anonymen Nutzern.
- Beim Import der 1.000 Wörter (APP-13) erhalten Einträge Themen, damit Sets automatisch wachsen können.

### APP-18: Kurze einfache Sätze üben (P2)

Hintergrund: Nach einzelnen Wörtern sollen Kinder kurze, einfache Sätze nachspuren und schreiben, etwa „Der Hund ist braun.“

Einordnung: P2, nach APP-16 (die Schrift bestimmt die Satzbreite) und nach dem Wortbestand. Es ist ein neuer Seitentyp mit eigenem Layout, das wie das Wortblatt freigegeben werden muss.

Abnahme:
- Ein neues Arbeitsblattlayout für Sätze wird entworfen und freigegeben, vor der Umsetzung als Muster-PDF. Zu klären: eine Spalte über die volle Breite oder weiter Deutsch und Englisch nebeneinander, Zahl der Nachspur- und freien Zeilen, Bild ja oder nein.
- Sätze werden nicht abgeschnitten. Lange Sätze werden in der Länge begrenzt (Vorschlag: höchstens etwa 25 Zeichen) oder auf zwei Zeilen umbrochen, nicht beliebig verkleinert.
- Sätze bestehen aus vorhandenen, geprüften Wörtern. Die Übersetzung wird geprüft, nicht ungeprüft automatisch erzeugt.
- Satzzeichen und Großschreibung am Satzanfang bleiben erhalten.
- Ob Nutzer eigene Sätze eingeben dürfen, ist offen. Wenn ja, gelten dieselben Kontingente und Prüfregeln wie für neue Wörter (APP-08 bis APP-11).

## Datenmodell als Ausgangspunkt

| Entität | Wesentliche Felder |
| --- | --- |
| Wort | ID, Sprache, Anzeigeform, normalisierte Suchform |
| Bedeutung | ID, Wort-ID, kurze Beschreibung, englische Übersetzung, Piktogramm-ID, Status, Quelle, Version |
| Piktogramm | ID, Dateipfad, Bibliothek, Lizenz, Namensnennung |
| Browser | zufällige ID, erstellt, zuletzt genutzt |
| Wortliste | ID, Browser-ID, Name, erstellt, geändert |
| Listeneintrag | Listen-ID, Bedeutungs-ID, Reihenfolge |
| Erstellauftrag | ID, Idempotenzschlüssel, Browser-ID, Bedeutungsschlüssel, Status, Reservierungsfenster, Ablaufzeit, Fehler |
| Kontingent | Typ, Besitzer oder global, Fensterbeginn, verbraucht, reserviert |
| Externe Nutzung | Auftrag, Anbieter, Versuch, Zeitpunkt, Kosten oder Verbrauchseinheiten |

Die konkrete Transaktionsstrategie für D1 muss Claude anhand der aktuellen Plattformdokumentation prüfen. Entscheidend sind die Abnahmekriterien für parallele Anfragen und eindeutige Einträge.

## Noch festzulegen

1. Name, Domain und Gestaltung der App außerhalb des Arbeitsblatts.
2. Höhe des globalen Stundenkontingents sowie Tages- und Kostenbudget für externe Dienste.
3. Übersetzungsanbieter und Verfahren für neue Bedeutungen.
4. Piktogrammbibliothek und Umfang der Zuordnung.
5. Quelle und Definition der 1.000 häufigsten Wörter.
6. Prüfverfahren für neue öffentliche Einträge und Betreiberzugang.
7. Aufbewahrungsdauer privater Listen und optionale Freigabelinks.
8. Eigene Schrift: Datei, Lizenz und ob sie ABeeZee ersetzt oder zur Auswahl steht (APP-16).
9. Erste Druck-Sets und die Definition von „kurzes Wort“ (APP-17).
10. Layout der Satzseite und ob Nutzer eigene Sätze eingeben dürfen (APP-18).

## Empfohlene Reihenfolge

1. Druckvorlage und vorhandene Daten lokal funktionsfähig machen.
2. Suche und Bedeutungswahl ergänzen (mit 1. als P0 erledigt).
3. Eigene Schrift einbauen und Referenzseiten neu freigeben (APP-16).
4. Wortlisten und Druck-Sets ergänzen (APP-12, APP-17).
5. Browserkennung, atomare Kontingente und Statusanzeige umsetzen.
6. Externe Übersetzung und neue Einträge kontrolliert aktivieren.
7. Qualitätssicherung und Betreiberprüfung ergänzen.
8. Den vorbereiteten Bestand auf 1.000 Wörter erweitern.
9. Satzseiten ergänzen (APP-18).

## Abnahmeszenarien

- Auto zeigt ein vorhandenes Arbeitsblatt und verbraucht keinen Platz.
- Blau zeigt einen blauen Kreis.
- Bank verlangt eine Auswahl zwischen Geldinstitut und Sitzgelegenheit.
- Eins zeigt „eins 1“ und „one 1“, jeweils auch in den Nachspurzeilen.
- Blitz zeigt ein einfaches Blitzsymbol, lightning passt vollständig in die englische Spalte.
- Der elfte neue Eintrag desselben Tages wird abgelehnt, vorhandene Seiten sind weiter druckbar.
- 20 parallele Erstellanfragen überschreiten weder Tages- noch Stundenkontingent.
- Zwei Browser fragen dieselbe neue Bedeutung gleichzeitig an. Es entsteht genau ein Eintrag und höchstens ein kostenpflichtiger Erstellauftrag.
- Fehlgeschlagene und abgebrochene Aufträge lassen keine Reservierungen dauerhaft zurück.
- Eine private Liste ist aus einem anderen Browser ohne ausdrückliche Freigabe nicht abrufbar.
- Ein Druckauftrag für mehrere Wörter erzeugt exakt eine A4-Seite je Listeneintrag.
