# AI-Log

Dokumentation der KI-Nutzung gemäss den Vorgaben der Praxisarbeit P2.
Pro Eintrag: Prompt (Kurzfassung), übernommene Vorschläge, nötige Korrekturen,
Testergebnisse, eigene Entscheidungen.

---

## 2026-09-21 — App-Grundgerüst (Backend-Basis ohne Endpoints)

**Werkzeug:** Claude Code (Opus 5)

**Prompt (Kurzfassung):** Zuerst "Basis-Setup, das mit `bun test` getestet
werden kann", danach die Korrektur: "die Endpoints wieder entfernen — ich baue
nur das Backend-Grundgerüst, die Routen machen meine Kollegen".

**Eigene Entscheidungen:**

- Arbeitsteilung: Ich baue nur die Plattform (`buildApp`, Fehlerformat,
  Validierungs-Helper, Test-Setup). US1/US2 (Bikes) und US3 (Touren) werden von
  den anderen Teammitgliedern als Module umgesetzt.
- Erster Entwurf enthielt bereits die Bikes-Endpoints — bewusst wieder
  entfernt, damit die Kollegen ihre Stories selbst implementieren (Vorgabe:
  Stories möglichst von verschiedenen Personen).
- `AppModule`-Typ als Erweiterungspunkt: ein Feature-Modul ist eine Funktion
  `(app, ctx) => void`. So kann jede Story unabhängig entwickelt und in den
  Tests einzeln registriert werden.
- `generateId()` und `now()` liegen im geteilten `AppContext`, damit IDs und
  Erstelldaten in Tests deterministisch sind und kein Modul direkt auf
  `crypto.randomUUID()` oder `new Date()` zugreift.
- `buildApp()` ruft bewusst kein `listen()` auf — Tests nutzen `app.inject()`,
  also ohne echten Port und ohne externe Abhängigkeiten.

**Übernommene Vorschläge:**

- `AppError` mit Statuscode, Fehlercode und Details, plus zentraler
  `setErrorHandler`/`setNotFoundHandler`, damit alle Endpoints dasselbe
  Fehlerformat `{ error: { code, message, details } }` liefern.
- Unerwartete Fehler werden geloggt, aber nur als generische 500-Antwort
  ausgeliefert (keine internen Details an den Client).
- `parseOrThrow(schema, input, message)` als gemeinsamer Zod-Helper, der pro
  ungültigem Feld ein `{ field, message }` erzeugt.

**Nötige Korrekturen:**

- `tsc --noEmit` meldete `TS18046: 'error' is of type 'unknown'` im
  Error-Handler → Parameter explizit als `FastifyError | AppError` typisiert.
- `response.json()` war in den Tests nicht typisiert (`TS2769`) → Generic
  `response.json<Record<string, unknown>>()` gesetzt.
- Veralteter Verweis `"module": "index.ts"` in `package.json` auf
  `src/server.ts` korrigiert, `index.ts` gelöscht.

**Testergebnis (selbst ausgeführt):**

- `bun test` → 9 pass / 0 fail, 20 expect() calls.
- `bunx tsc --noEmit` → keine Fehler.
- Manueller Check mit laufendem Server (`PORT=3124 bun src/server.ts`):
  `GET /health` → `{"status":"ok"}`;
  `GET /nope` → `{"error":{"code":"NOT_FOUND","message":"No route GET /nope."}}`.

---

## 2026-09-21 — Datenbank (bun:sqlite) im Grundgerüst

**Werkzeug:** Claude Code (Opus 5)

**Prompt (Kurzfassung):** "Wo ist unsere Datenbank? Ich will eine Datenbank im
Setup, die abgefragt wird."

**Eigene Entscheidungen:**

- **`bun:sqlite` statt Postgres** für Checkpoint 1: eine echte, abfragbare
  Datenbank ohne zusätzliche Infrastruktur. Läuft auf jedem Teamrechner und in
  der CI ohne Service-Container — damit bleiben die Unit-Tests isoliert
  (Vorgabe CP1). Postgres bliebe für P4 ein möglicher Wechsel, die
  Repository-Schicht der Module kapselt den Zugriff.
- **Migrationen statt `CREATE TABLE IF NOT EXISTS`**: versionierte, einmalig
  angewendete Schritte über `PRAGMA user_version`. Passt zum CI/CD-Thema und
  macht Schemaänderungen im Team nachvollziehbar (Regel: bestehende Migration
  nie ändern, immer eine neue anhängen).
- **Kein Foreign Key von `tours.bike_id` auf `bikes.id`.** Ein FK würde genau
  die Kopplung auf DB-Ebene wieder einführen, die laut Auftrag verboten ist:
  der Touren-Endpoint muss das Bike über den Bikes-Endpoint prüfen. Ein Test
  hält das explizit fest.
- **Default in `buildApp()` ist `:memory:`.** Ein Test, der vergisst eine DB zu
  übergeben, kann so nie die echte Datei anfassen. Nur `server.ts` öffnet die
  Datei aus `DATABASE_PATH`.
- `/health` führt jetzt ein echtes `SELECT 1` aus und meldet die Schemaversion,
  damit eine kaputte oder nicht migrierte DB sofort sichtbar wird.

**Übernommene Vorschläge:**

- Migration + Versions-Bump laufen gemeinsam in einer Transaktion, damit bei
  einem Fehler die Version nicht hochgezählt wird.
- `PRAGMA journal_mode = WAL` und `PRAGMA foreign_keys = ON` pro Verbindung.
- `UNIQUE COLLATE NOCASE` auf `frame_number`, damit die Eindeutigkeit aus US1
  auch von der Datenbank erzwungen wird, nicht nur vom Service.

**Nötige Korrekturen:**

- Der bestehende `/health`-Test schlug fehl, weil die Antwort neu `database`
  und `schemaVersion` enthält → Test auf die neue Antwort angepasst.
- In `db.test.ts` hatte die KI `require("bun:sqlite")` mitten im Test benutzt →
  durch einen normalen `import { Database }` ersetzt.
- Erster manueller Server-Check lief ins Leere, weil zsh die Befehlskette bei
  einem nicht passenden Glob abgebrochen hatte → Check wiederholt.

**Testergebnis (selbst ausgeführt):**

- `bun test` → 15 pass / 0 fail, 29 expect() calls.
- `bunx tsc --noEmit` → keine Fehler.
- Manueller Check mit Datei-Datenbank (`DATABASE_PATH=data/demo.db`):
  `GET /health` → `{"status":"ok","database":"ok","schemaVersion":1}`;
  Insert eines Bikes, Server gestoppt, danach neuer Prozess → Zeile war noch
  vorhanden und `schemaVersion` weiterhin 1 (Migration nicht erneut angewendet).

---

## 2026-09-21 — Persistenz über Releases hinweg (Docker-Volume)

**Werkzeug:** Claude Code (Opus 5)

**Prompt (Kurzfassung):** "Wenn ich pushe und eine neue Version released wird,
sind dann alle Daten weg? Ich will etwas, das persistiert."

**Analyse (zwei getrennte Punkte):**

1. Ein neues Release löscht die Daten *nicht* von sich aus: Migrationen sind
   über `user_version` versioniert, ein Release führt nur die neu
   dazugekommenen Migrationen aus, bestehende Zeilen bleiben unberührt.
2. Das eigentliche Problem ist der Container: `data/app.db` läge im
   Image-Dateisystem, und das wird bei jedem Release verworfen.

**Eigene Entscheidungen:**

- Bei `bun:sqlite` bleiben und die Datei auf ein **Named Volume** legen
  (`bike-data:/data`, `DATABASE_PATH=/data/app.db`). Der Container wird
  ersetzt, das Volume nicht.
- DB-Datei bewusst **ausserhalb** von `/app`, damit nichts Geschriebenes
  versehentlich im Image landet.
- Bun-Version `1.3.13` im Dockerfile gepinnt (identisch zu lokal und CI).
- `HEALTHCHECK` im Image nutzt den `/health`-Endpoint, der die DB wirklich
  abfragt — damit gilt ein Container erst als gesund, wenn die Datenbank
  erreichbar und migriert ist.
- Image-Tag über `APP_VERSION` (z.B. Commit-ID) statt `latest`, passend zur
  Rollback-Empfehlung aus T4.

**Übernommene Vorschläge:**

- `migrate(db, migrations)` nimmt die Migrationsliste jetzt als Parameter,
  damit das Upgrade-Szenario testbar ist (vorher fest an `MIGRATIONS` gebunden).
- Multi-Stage-Build und `bun install --frozen-lockfile --production`.
- Non-root (`USER bun`), `/data` vorher auf `bun:bun` gechownt.

**Nötige Korrekturen:**

- Docker-Daemon lief nicht; Docker Desktop gestartet, danach verifiziert.

**Testergebnis (selbst ausgeführt):**

- `bun test` → 17 pass / 0 fail, 34 expect() calls. Neu darunter:
  "applies only new migrations and keeps existing data" (neue Migration auf
  bestehender DB: nur die neue läuft, vorhandene Zeile bleibt) und
  "does not advance the version when a migration fails".
- `docker build` → erfolgreich.
- **Release-Szenario real durchgespielt:** `APP_VERSION=v1 docker compose up -d
  --build` → `/health` = `{"status":"ok","database":"ok","schemaVersion":1}`;
  Bike `XL6234-D2S` eingefügt; Code geändert und `APP_VERSION=v2 ... up -d
  --build` → Container wurde *recreated* (Image `biketouren:v2`), danach war
  die Zeile weiterhin vorhanden und `schemaVersion` = 1.
- Gegenprobe: `docker compose down -v` entfernt das Volume (`Volume
  code_bike-data Removed`) — nur damit sind die Daten tatsächlich weg.

---

## 2026-09-21 — Plattform von US1/US2-Schema entkoppelt

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "US1/US2-Zeug entfernen — wir betreiben nur einen
Service, der die Datenbank abfragt, das ganze Schulmodul dreht sich um
CI/CD."

**Eigene Entscheidung:** Die `bikes`/`tours`-Tabellen aus Migration
`001_create_bikes_and_tours` gehörten nicht in dieses Modul — hier wird die
CI/CD-Plattform bewertet, nicht das Bikes-Datenmodell. `MIGRATIONS` ist jetzt
bewusst leer; das eigentliche Schema kommt später aus den Feature-Modulen
(oder bleibt für dieses Modul irrelevant, falls nur die Plattform zählt).

**Nötige Korrekturen:**

- `tests/unit/db.test.ts` prüfte hart auf die Spalten/Tabellen `bikes` und
  `tours` → durch eine generische `EXAMPLE_MIGRATIONS`-Fixture ersetzt, die
  den Migrations-Mechanismus testet, ohne ein Domainschema vorauszusetzen.
- Ein Testdatum in `validation.test.ts` ("Ghost XY1") genericisiert zu
  "Widget", da es nur ein Zod-Beispiel war, keine echte Anforderung.
- Kommentare in `app.ts`/`server.ts`, die "bikes"/"tours" als *Beispiel* für
  einen künftigen Feature-Modul-Namen nennen, bewusst belassen — sie
  beschreiben nur den Erweiterungspunkt (`AppModule`), keine Datenbank.

**Testergebnis (selbst ausgeführt):**

- `bun test` → 15 pass / 0 fail, 33 expect() calls.
- `bunx tsc --noEmit` → keine Fehler.
- Server-Check: `GET /health` → `{"status":"ok","database":"ok","schemaVersion":0}`
  (leere, aber funktionierende und migrierte Datenbank).

---

## 2026-09-21 — README aktualisiert + Bug beim ersten Start gefunden

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Was brauche ich, um die App zu starten? README
aktualisieren."

**Vorgehen:** README komplett neu geschrieben (das alte `bun init`-Boilerplate
verwies noch auf `index.ts`, das nicht mehr existiert) und dabei jeden
dokumentierten Befehl selbst ausgeführt, bevor er ins README kam.

**Gefundener Bug:** `bun run dev` auf einem frischen Checkout (kein `data/`-
Ordner) schlug fehl: `SQLiteError: unable to open database file
(SQLITE_CANTOPEN)`. `bun:sqlite` legt den übergeordneten Ordner der
Datenbankdatei nicht selbst an.

**Fix:** `createDatabase()` legt jetzt mit `mkdirSync(dir, { recursive: true
})` den Zielordner an, bevor die Datei geöffnet wird (übersprungen bei
`:memory:`). Test dazu ergänzt: erstellt eine verschachtelte, noch nicht
existierende Zielstruktur und prüft, dass die Datei danach existiert.

**Testergebnis (selbst ausgeführt):**
- `bun test` → 16 pass / 0 fail, 35 expect() calls.
- `bunx tsc --noEmit` → keine Fehler.
- Lokal auf frischem `data/`-Stand: `rm -rf data && bun install && bun run
  dev` → `GET /health` = `{"status":"ok","database":"ok","schemaVersion":0}`,
  `data/app.db` wurde angelegt.
- Docker: `docker compose up -d --build` → Logs zeigen `Using database at
  /data/app.db`, `GET /health` → 200 mit derselben Antwort. `docker compose
  down -v` danach zum Aufräumen ausgeführt.

---

## 2026-09-21 — Projekt in granulare Dateien aufgeteilt

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Projekt lesbarer machen, in granulare Dateien
aufteilen."

**Vorgehen:** `app.ts` bündelte bisher vier verschiedene Zuständigkeiten
(Context-/Modul-Typen, Fehlerbehandlung, Health-Route, Bootstrapping) in
einer Datei. Aufgeteilt in:
- `src/context.ts` — `AppContext`, `AppModule`
- `src/error-handling.ts` — `registerErrorHandling(app)`
- `src/health.ts` — `registerHealthRoute(app, ctx)`
- `src/app.ts` — nur noch `buildApp(options)`, orchestriert die drei obigen

`app.ts` re-exportiert `AppContext`/`AppModule` weiterhin, damit bestehender
Import-Code (`import { buildApp, type AppModule } from "./app"`) unverändert
funktioniert.

**Tests neu organisiert statt nur verschoben:** `error-handling.test.ts` und
`health.test.ts` testen ihr Modul jetzt direkt und isoliert (eigene, minimale
Fastify-Instanz statt `buildApp()`). `app.test.ts` wurde auf das reduziert,
wofür `buildApp` selbst verantwortlich ist (Verdrahtung), da die
Fehlerformat-Details jetzt in `error-handling.test.ts` liegen — vorher gab es
Dopplung zwischen beiden Dateien.

**Gefundener Bug (durch den neuen, isolierten Health-Test aufgedeckt):** Ein
geschlossener/kaputter DB-Handle wirft beim Query direkt eine Exception statt
ein leeres Resultat zurückzugeben — dieser Pfad landete vorher unbeabsichtigt
als generischer 500 statt als 503 (`SERVICE_UNAVAILABLE`). Fix: `try/catch`
um die Abfrage in `health.ts`, beide Fälle (Exception und leeres Resultat)
laufen jetzt auf denselben `AppError.unavailable(...)`.

**Testergebnis (selbst ausgeführt):**
- `bun test` → 19 pass / 0 fail, 41 expect() calls (vorher 16 pass).
- `bunx tsc --noEmit` → keine Fehler.
- Server-Check nach dem Split: `bun run dev` → `GET /health` = `{"status":
  "ok","database":"ok","schemaVersion":0}`, `GET /nope` weiterhin im
  gemeinsamen Fehlerformat.

**README aktualisiert:** Projektstruktur um die neuen Dateien ergänzt, dazu
ein Absatz, der klarstellt, dass `bun run dev`/`bun run start` kein Docker
benutzen — der Docker-Pfad läuft nur bei explizitem `docker compose up`.

---

## 2026-09-21 — Endpoint-Verzeichnisse als Konvention (health/ als Vorbild)

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Warum können nicht alle Verzeichnisse die
Endpoints sein?"

**Antwort/Analyse:** Es gab keinen technischen Grund dagegen — das war
bereits die im CLAUDE.md-Plan vorgesehene Struktur (`src/bikes/`,
`src/tours/` je `routes.ts → service.ts → repository.ts`). Inkonsequent war
nur, dass `health.ts` als einziger Endpoint flach in `src/` lag statt in
einem eigenen Verzeichnis wie die geplanten `bikes/`/`tours/`-Module.

**Durchgeführt:**
- `src/health.ts` → `src/health/routes.ts` verschoben (Test entsprechend
  nach `tests/unit/health/routes.test.ts`), Importpfade angepasst.
- `AppModule`-Doku in `context.ts` um die Konvention ergänzt: jeder Endpoint
  bekommt ein eigenes Verzeichnis unter `src/`; nur echt geteilter Code
  (`app.ts`, `server.ts`, `context.ts`, `error-handling.ts`, `shared/`)
  bleibt flach, weil er selbst kein Endpoint ist.
- README-Projektstruktur entsprechend aktualisiert, inkl. Platzhalter für
  `bikes/`, `tours/`.

**Testergebnis (selbst ausgeführt):**
- `bun test` → 19 pass / 0 fail, 41 expect() calls (unverändert, nur
  verschoben).
- `bunx tsc --noEmit` → keine Fehler.
- `bun run dev` → `GET /health` weiterhin `{"status":"ok","database":"ok",
  "schemaVersion":0}`.

---

## 2026-09-21 — Postgres-Treiber für Vercel-Deployment ergänzt

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Wenn ich jetzt deploye, bleiben die Daten dann
erhalten?" → geklärt, dass geplant ist auf Vercel zu hosten → Rückfrage
gestellt (Postgres vs. Turso vs. später) → Antwort: Postgres (Neon/Vercel
Postgres).

**Problem:** Vercel führt kein `docker-compose` aus und hat kein
beschreibbares, persistentes Dateisystem (serverless Functions, `/tmp` wird
zwischen Aufrufen/Deployments geleert). Die bestehende Architektur
(`bun:sqlite`-Datei + Docker-Volume) funktioniert dort nicht — das Volume
existiert auf Vercel schlicht nicht.

**Eigene Entscheidungen:**
- **Nicht** die bestehende, bereits getestete SQLite-Plattform ersetzen
  (Checkpoint 1 verlangt laut Auftrag explizit noch kein Deployment) —
  stattdessen Postgres **zusätzlich** über eine treiberunabhängige
  `AppDb`-Union in `context.ts` einführen: `{ kind: "sqlite", sqlite } |
  { kind: "postgres", sql }`. Lokal/Tests bleiben auf SQLite (kein externer
  Service nötig, Vorgabe für isolierte Unit-Tests), Produktion (Vercel) nutzt
  Postgres.
- Treiberwahl in `server.ts` über `DATABASE_URL`: gesetzt → Postgres,
  ungesetzt → SQLite-Datei wie bisher. Kein Codepfad in `buildApp()` selbst
  weiss, welcher Treiber aktiv ist — nur `server.ts` entscheidet.
- `Bun.sql` statt `pg`/`postgres.js`, wie in unseren Vorgaben festgelegt.
- Für Postgres bewusst noch keine Migrationen angelegt — es gibt noch keine
  Tabellen (Bikes/Tours-Schema wurde ja gerade erst aus der Plattform
  entfernt). `shared/postgres.ts` deckt aktuell nur Verbindungsaufbau und
  den Health-Check ab; ein Migrations-Runner käme dazu, sobald ein
  Feature-Modul Tabellen braucht.
- `AppModule`-Beispiel in `context.ts` aktualisiert: eine Repository-Klasse
  pro Treiber (`SqliteBikeRepository`/`PostgresBikeRepository`), ausgewählt
  über `ctx.db.kind` — konsistent mit dem bereits bestehenden
  Repository-Interface-Muster.

**Nötige Korrekturen:**
- `tests/unit/health/routes.test.ts` baute `AppContext.db` bisher direkt aus
  dem rohen `bun:sqlite`-Handle → musste auf `{ kind: "sqlite", sqlite: db }`
  umgestellt werden; neue Tests für den Postgres-Zweig mit einem minimalen
  Fake für Bun's `SQL`-Tagged-Template ergänzt (kein echter Netzwerkzugriff
  im Unit-Test).

**Testergebnis (selbst ausgeführt):**
- `bun test` → 21 pass / 0 fail, 45 expect() calls.
- `bunx tsc --noEmit` → keine Fehler.
- SQLite-Pfad (`bun run dev`, kein `DATABASE_URL`): `GET /health` =
  `{"status":"ok","database":"ok","schemaVersion":0}`, Log zeigt "Using
  SQLite database at data/app.db".
- **Postgres-Pfad real getestet**, nicht nur mit Fakes: temporären
  `postgres:16-alpine`-Container gestartet, Server mit
  `DATABASE_URL=postgres://postgres:test@localhost:55432/app` gestartet →
  `GET /health` = `{"status":"ok","database":"ok"}`, Log zeigt "Using
  Postgres database". Danach mit falschem Passwort erneut gestartet →
  `GET /health` = 503 `SERVICE_UNAVAILABLE` statt Absturz. Postgres-Container
  danach entfernt.
- README aktualisiert: neuer Abschnitt "Database driver: SQLite vs.
  Postgres", `DATABASE_URL` in der Konfigurationstabelle, Hinweis dass der
  Docker-Compose-Pfad SQLite ist und nicht der Vercel-Pfad.

---

## 2026-09-21 — docker-compose in zwei Services aufgeteilt (app + db)

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Haben wir mehrere Container oder einen DB- und
einen Webserver-Container?" → aktuell nur einer (SQLite ist eine
eingebettete Datei, kein eigener Dienst) → "Das sollten wir zur Lesbarkeit
trennen."

**Durchgeführt:** `docker-compose.yml` von einem `app`-Service (SQLite-Datei
auf Volume) auf zwei Services umgestellt:
- `app` — zustandslos, `DATABASE_URL` zeigt auf `db`.
- `db` — `postgres:16-alpine`, eigenes Volume `db-data`, `HEALTHCHECK` via
  `pg_isready`; `app` wartet über `depends_on: condition: service_healthy`
  darauf.

Damit läuft lokal exakt derselbe Postgres-Pfad wie in Produktion (Vercel +
Neon), nicht mehr SQLite in Docker.

**Gefundener Bug (real reproduziert, kein Konfigurationsfehler):** Beim
ersten Testlauf des neuen Setups antwortete `/health` durchgehend mit 503,
obwohl `db` laut Healthcheck gesund war und `nc`/`Bun.connect()` die
TCP-Verbindung zu `db:5432` problemlos aufbauten. Isoliert durch schrittweises
Ausschliessen (Netzwerk, DNS, Nutzer, `NODE_ENV`, Compose vs. `docker run`,
verschiedene Basis-Images):

**Ursache gefunden:** `Bun.sql`s Postgres-Client (Bun 1.3.13) wirft
`FailedToOpenSocket`, wenn das Arbeitsverzeichnis des Prozesses exakt `/app`
ist — unabhängig von Rechten/Besitzer, reproduziert mit frisch angelegtem,
`bun`-eigenem `/app`. `/srv`, `/home/bun/app`, `/application` funktionieren
alle einwandfrei mit identischem Connection-String. Nebenbefund: das
ursprüngliche `-alpine`-Image war zusätzlich betroffen (dort schlägt sogar
eine simple IP-Verbindung fehl) — daher zusätzlich auf das Debian-basierte
`oven/bun:1.3.13`-Image gewechselt.

**Fix:** `Dockerfile`s `WORKDIR` von `/app` auf `/srv` geändert (inkl. der
`COPY --from=deps`-Pfade), beide Ursachen mit Kommentar im Dockerfile
festgehalten, damit sie bei einem Bun-Upgrade erneut geprüft werden.

**Testergebnis (selbst ausgeführt, nicht nur behauptet):**
- `bun test` → 21 pass / 0 fail, 45 expect() calls (unverändert).
- `bunx tsc --noEmit` → keine Fehler.
- `docker compose up -d --build`: `db` wird zuerst gesund, `app` startet
  danach; `GET /health` → `{"status":"ok","database":"ok"}`, echte
  Postgres-Antwort über den Compose-Netzwerknamen `db`, nicht gefaked.
- **Redeploy-Szenario erneut durchgespielt, diesmal mit Postgres:** Marker-
  Zeile direkt in `db` per `psql` eingefügt, `app`-Container mit neuem Tag
  (`APP_VERSION=v2`) neu gebaut und ersetzt (`db` blieb unberührt) → Marker
  danach weiterhin vorhanden, `/health` weiterhin 200.
- Danach `docker compose down -v` zum Aufräumen, Test-Images entfernt.

**README aktualisiert:** "Run with Docker" beschreibt jetzt beide Services,
den Healthcheck-Wartemechanismus und den gefundenen Bun-`/app`-Bug samt
Workaround.

---

## 2026-09-21 — Testlücke in shared/postgres.ts geschlossen

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Sind die Tests noch aktuell?" → geprüft: alle
grün, aber `shared/postgres.ts` hatte keine eigene Testdatei —
`pingPostgres` war nur indirekt über den Health-Test abgedeckt,
`createPostgresDatabase` gar nicht.

**Durchgeführt:** `tests/unit/postgres.test.ts` ergänzt: `pingPostgres` mit
Erfolg, leerem Resultat und durchgereichtem Verbindungsfehler getestet
(letzteres bewusst, weil `pingPostgres` selbst nichts abfängt — das macht
erst der Aufrufer, siehe `health/routes.ts`); `createPostgresDatabase`
mit einer Verbindungs-URL getestet (kein echter Verbindungsaufbau nötig,
`Bun.sql` verbindet erst bei der ersten Query).

**Testergebnis (selbst ausgeführt):**
- `bun test` → 25 pass / 0 fail, 49 expect() calls (vorher 21 pass).
- `bunx tsc --noEmit` → keine Fehler.

---

## 2026-09-21 — GitHub Actions CI (lint/format/typecheck/test + Docker)

**Werkzeug:** Claude Code (Sonnet 5)

**Prompt (Kurzfassung):** "Update the testing platform" → präzisiert per
Rückfrage: CI/CD für GitHub (nicht GitLab wie im ursprünglichen Plan
skizziert — bestätigt via `git remote -v`: Repo liegt tatsächlich auf
GitHub, damit ist die offene Frage "GitLab vs. GitHub" aus dem Projektplan
beantwortet).

**Nebenbefund vor der eigentlichen Arbeit:** `bun run lint` war komplett
kaputt — kein `eslint.config.*` vorhanden, ESLint 10 hatte nichts zum
Ausführen. Zusätzlich fehlten `@eslint/js` und `typescript-eslint` als
direkte Abhängigkeiten (nur transitiv vorhanden).

**Durchgeführt:**
- `typescript-eslint` + `@eslint/js` installiert, `eslint.config.mjs`
  (flat config, TS-aware) ergänzt. `.ts`-Endung für die Config selbst
  scheiterte an ESLint 10s Anforderung nach `jiti` für TS-Configs → auf
  `.mjs` gewechselt.
- `prettier --write .` einmalig laufen lassen; `.prettierignore` legt
  Markdown (`*.md`) bewusst aus, damit handgeschriebene Prosa (README,
  CLAUDE.md, ai-log.md) nicht von Prettiers Markdown-Regeln umformatiert
  wird.
- `package.json`: `format`/`format:check`-Skripte ergänzt.
- `.github/workflows/ci.yml`: zwei Jobs.
  1. `test` — `bun install --frozen-lockfile`, dann format-check, lint,
     typecheck, `bun test`. Läuft ohne externe Dienste (nur `bun:sqlite`),
     passend zur Vorgabe isolierter Unit-Tests.
  2. `docker-build` (nach `test`) — baut den echten Zwei-Service-Stack
     (`docker compose up -d --build`), wartet auf den `HEALTHCHECK` des
     `app`-Containers, prüft dann `GET /health` wirklich auf
     `"status":"ok"` statt nur "Image gebaut".
- Beide Jobs pinnen Bun exakt auf `1.3.13` (wie `Dockerfile` und lokale
  Entwicklung) — bewusst wegen des zuvor gefundenen Bun-`/app`-Bugs: eine
  andere Bun-Version könnte sich dort wieder anders verhalten.

**Nötige Korrekturen:**
- Der Healthcheck-Wartepolling-Schritt im Workflow verwendete zunächst eine
  Variable namens `status` → beim lokalen Testen unter zsh schlug das mit
  `read-only variable: status` fehl (zsh reserviert `$status`). GitHub
  Actions führt `run:`-Schritte aber unter `bash` aus, wo das kein Problem
  gewesen wäre — trotzdem zur Sicherheit auf `health_status` umbenannt.

**Testergebnis (selbst ausgeführt, jeder Workflow-Schritt einzeln lokal
nachvollzogen, nicht nur der Workflow-Text geschrieben):**
- `bun install --frozen-lockfile`, `bun run format:check`, `bun run lint`,
  `bun run typecheck`, `bun test` → alle grün (25 pass / 0 fail, 49
  expect() calls).
- `docker compose up -d --build` → `db` wird zuerst gesund, `app` danach;
  Wartepolling auf `app`'s eigenen `HEALTHCHECK` (aus dem Dockerfile) →
  "healthy" nach ~2s; `curl -sf localhost:3000/health` →
  `{"status":"ok","database":"ok"}`, Grep auf `"status":"ok"` erfolgreich.
- Danach `docker compose down -v`, Test-Images bereinigt.

**README aktualisiert:** neuer Abschnitt "CI (GitHub Actions)" mit
Job-Beschreibung, CI-Badge oben im README (zeigt den echten Workflow-Status
von `cediackermann/m324-gruppe3`), Projektstruktur um `.github/`,
`eslint.config.mjs`, `.prettierignore` ergänzt.
