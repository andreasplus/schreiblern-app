# Deployment auf Cloudflare

Noch nicht ausgeführt. Alle Schritte bleiben im kostenlosen Workers- und D1-Tarif, solange keine kostenpflichtigen Produkte hinzugefügt werden.

## Einmalig

```bash
npx wrangler login                       # öffnet den Browser zur Anmeldung
npx wrangler d1 create schreiblern-app   # gibt eine database_id aus
```

Die ausgegebene `database_id` in `wrangler.jsonc` eintragen (ersetzt den Platzhalter `00000000-…`).

## Bei jeder Veröffentlichung

```bash
npm run db:migrate:remote   # neue Migrationen anwenden
npm run db:seed:remote      # wiederholbar, überschreibt nichts
npm run deploy              # baut Frontend und Worker und lädt beides hoch
```

Danach ist die App unter `https://schreiblern-app.<konto>.workers.dev` erreichbar. Eine eigene Domain ist noch offen.

## Automatisch über GitHub (optional)

Für Deployments aus GitHub Actions ein API-Token mit den Rechten „Workers Scripts: Edit“ und „D1: Edit“ anlegen und als Repository-Secret `CLOUDFLARE_API_TOKEN` hinterlegen, dazu `CLOUDFLARE_ACCOUNT_ID`. Der mitgelieferte Workflow `.github/workflows/ci.yml` prüft nur und veröffentlicht nichts.

## Geheimnisse

P0 benötigt keine. Spätere Schlüssel (z. B. für Übersetzungsdienste) gehören ausschließlich in `wrangler secret put …` bzw. lokal in `.dev.vars` (nicht eingecheckt, Vorlage: `.dev.vars.example`).
