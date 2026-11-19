# Deployment auf Cloudflare

Alle Schritte bleiben im kostenlosen Workers- und D1-Tarif, solange keine kostenpflichtigen Produkte hinzugefügt werden.

## Über Cloudflare Workers Builds (Git-Anbindung)

Im Cloudflare-Dashboard unter Workers & Pages → schreiblern-app → Einstellungen → Build:

| Einstellung | Wert |
| --- | --- |
| Build-Befehl | leer lassen (`wrangler deploy` baut selbst über `build.command` in `wrangler.jsonc`) |
| Deploy-Befehl | `npm run deploy` |
| Stammverzeichnis | `/` |

`npm run deploy` führt nacheinander aus:

1. `wrangler deploy`: baut Frontend und Worker und lädt beides hoch. Beim ersten Mal legt Wrangler die D1-Datenbank `schreiblern-app` automatisch an, weil in `wrangler.jsonc` keine `database_id` steht.
2. `db:migrate:remote`: wendet neue Migrationen an.
3. `db:seed:remote`: Seed-Import, wiederholbar und ohne Überschreiben.

Die Node-Version steht in `.node-version` (22). Der Seed-Import braucht Node 22.18 oder neuer.

## Von Hand

```bash
npx wrangler login
npm run deploy
```

Danach ist die App unter `https://schreiblern-app.<konto>.workers.dev` erreichbar. Eine eigene Domain ist noch offen.

## Geheimnisse

P0 benötigt keine. Spätere Schlüssel (z. B. für Übersetzungsdienste) gehören ausschließlich in `wrangler secret put …` bzw. lokal in `.dev.vars` (nicht eingecheckt, Vorlage: `.dev.vars.example`).
