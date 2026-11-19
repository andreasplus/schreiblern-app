# Übergabe an Claude: Schreiblern-App

## Einstieg

1. BACKLOG.md lesen. Es enthält die beschlossenen Anforderungen, offene Entscheidungen und Abnahmekriterien.
2. reference/examples/ öffnen. Die PDFs zeigen das freigegebene Layout.
3. data/seed-words.json prüfen. Enthalten sind die 25 vorgegebenen Wortpaare, Zahlen eins bis zehn und Blitz/lightning.
4. Die portable Referenz bei Bedarf ausführen. Danach die gemeinsame Druckvorlage in HTML/CSS/SVG für die WebApp umsetzen.
5. CLAUDE-AUFTRAG.md kann direkt als Arbeitsauftrag verwendet werden.

## Inhalt

- BACKLOG.md: Produktumfang, Prioritäten, technische Empfehlungen und Abnahme.
- CLAUDE-AUFTRAG.md: kompakter Implementierungsauftrag.
- data/seed-words.json: 36 vorhandene Einträge, noch keine 1.000 Wörter und kein vollständiges Bedeutungsmodell.
- reference/render_reference.py: portable Python-Fassung zur Reproduktion der PDFs.
- reference/requirements.txt: benötigte Python-Pakete.
- reference/original-scripts/: die drei relevanten Originalskripte aus dem bisherigen Verlauf.
- reference/assets/: ABeeZee mit Lizenz, das Auto-Bild und eine gerenderte alte Vorlage.
- reference/examples/: bestätigte Gesamtausgabe mit 35 Seiten und zusätzliche Blitz-Seite.

## Referenz ausführen

Voraussetzung: Python 3.10 oder neuer. Im entpackten Projektordner starten.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r reference/requirements.txt
python reference/render_reference.py --output generated/35-seiten.pdf
python reference/render_reference.py --word Blitz --output generated/Blitz.pdf
python reference/render_reference.py --word Haus --output generated/Haus.pdf
```

Neues Wort mit selbst vorgegebener Übersetzung:

```bash
python reference/render_reference.py --word Baum --english tree --output generated/Baum.pdf
```

Die Referenz übersetzt nicht selbst und findet keine neuen Symbole. Für unbekannte Wörter bleibt der Bildbereich leer. Ein vorhandener Bildschlüssel kann über --pictogram angegeben werden.

## Was die Skripte leisten

Die portable Fassung zeichnet die bisherigen einfachen Piktogramme, Farben und Zählpunkte. Sie erstellt A4-PDFs mit ABeeZee, Flaggen, Häuschen, drei Nachspurzeilen und drei freien Zeilen. Wort und Ziffer erscheinen auf Zahlenseiten in beiden Spalten.

Die Originalskripte werden unverändert als historische Referenz mitgeliefert. Sie sind an frühere Pfade wie tmp/pdfs/ gebunden und verwenden teilweise dynamische Codeübernahme aus anderen Skripten. Dafür nicht den Produktivbetrieb aufbauen. Der portable Einstieg beseitigt diese Pfadabhängigkeiten und übernimmt die Layoutfunktionen direkt. Die alten Schriftvergleichsskripte sind nicht relevant für das freigegebene ABeeZee-Layout und deshalb nicht Teil des Pakets.

## Grenzen des aktuellen Stands

- Noch keine WebApp, API, Datenbank, Nutzerlisten oder Kontingentlogik vorhanden.
- Keine automatische Übersetzung und keine generative Bild-KI vorhanden.
- Kein vorbereiteter Bestand von 1.000 Wörtern vorhanden.
- Piktogramme wurden gezielt als Vektorformen gezeichnet, mit Ausnahme des Autos aus der ursprünglichen Nutzervorlage.
- Die Python-Referenz ist keine Empfehlung, PDFs bei jedem Seitenaufruf serverseitig zu erzeugen. Erste Produktversion über Browserdruck umsetzen.
- Originalquellen und Schriftlizenz beachten. Das Auto für den öffentlichen Betrieb durch ein Symbol mit geklärten Rechten ersetzen.

## Rechte und Herkunft

ABeeZee wurde aus dem Google-Fonts-Repository bezogen. Der SIL-OFL-Lizenztext liegt unter reference/assets/ABeeZee-OFL.txt. Die Schriftdatei unverändert verwenden und den Lizenztext mitführen.

Quelle: https://github.com/google/fonts/tree/main/ofl/abeezee

Die übrigen gezeichneten Vektorformen stammen aus den hier beigefügten Skripten. Die Herkunft der Rasterbilder car.png und reference.png ist die frühere Nutzervorlage. Es liegt in diesem Paket kein Nachweis für öffentliche Weiterverwendung dieser Vorlage vor.
