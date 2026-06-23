# Zeitabrechnung — Spezifikation

> Stand: 2026-06-23 · Version 0.1.0
> Diese Spec beschreibt den **Ist-Zustand** der Anwendung sowie die geltenden Anforderungen.
> Sie ist die Referenz für Weiterentwicklung und Tests ([TEST_STRATEGY.md](./TEST_STRATEGY.md)).

---

## 1. Zweck & Kontext

**Zeitabrechnung** ist eine kleine Single-User-Web-App zur Erfassung von Arbeitszeit
und zur monatlichen Abrechnung. Eine Person erfasst Zeiteinträge — entweder live über
einen Timer oder manuell — und exportiert am Monatsende einen PDF-Stundenrapport.

- **Sprache der Oberfläche:** Deutsch (Schweiz), `<html lang="de">`.
- **Währung / Ansatz:** CHF, fester Stundenansatz **25 CHF/h** (`HOURLY_RATE` in [`src/lib/types.ts`](../src/lib/types.ts)).
- **Zielgruppe:** Einzelperson (kein Login, keine Mandantentrennung, kein Mehrbenutzerbetrieb).

---

## 2. Funktionale Anforderungen

### 2.1 Timer (Seite `/`)

Ein Stoppuhr-Timer zur Live-Erfassung der Arbeitszeit.

| ID    | Anforderung |
|-------|-------------|
| F-T1  | Timer kann **gestartet** werden; zählt sekundengenau hoch (`HH:MM:SS`). |
| F-T2  | Laufender Timer kann **pausiert** und **fortgesetzt** werden; Pausenzeit wird nicht mitgezählt. |
| F-T3  | Timer kann **gestoppt** werden. Stopp **speichert nicht automatisch**, sondern füllt das Erfassungsformular mit Datum, Start- und Endzeit vor. |
| F-T4  | Startzeit = Zeitpunkt des Starts (auf Minute abgeschnitten). Endzeit = Stopp-Zeitpunkt, **auf die nächste Minute gerundet**. |
| F-T5  | Timer-Zustand **überlebt Reload und Seitenwechsel** (persistiert in `localStorage`, Schlüssel `zeitabrechnung_timer`). |
| F-T6  | Läuft der Timer und ist eine andere Seite aktiv, zeigt die Navigationsleiste einen **Live-Indikator** (rot = läuft, gelb = pausiert). |

### 2.2 Manuelle Erfassung (Seite `/`)

| ID    | Anforderung |
|-------|-------------|
| F-E1  | Felder: **Datum**, **Von**, **Bis**, **Beschreibung**. |
| F-E2  | Zeitauswahl über eigene `TimeSelect`-Komponente (Stunden 00–23, Minuten 00–59). |
| F-E3  | **Validierung:** Alle Felder Pflicht. Fehlt eines → „Alle Felder ausfüllen.“ |
| F-E4  | **Validierung:** Endzeit muss nach Startzeit liegen (Dauer > 0). Sonst → „Endzeit muss nach Startzeit liegen.“ |
| F-E5  | Nach erfolgreichem Speichern wird das Formular auf „jetzt“ zurückgesetzt. |
| F-E6  | Dauer (`durationMinutes`) wird aus Von/Bis berechnet, nicht eingegeben. |

> **Hinweis Tagesgrenze:** Die Dauerberechnung (`calcDuration`) arbeitet rein auf
> `HH:MM` ohne Datum. Einträge über Mitternacht (Bis < Von) ergeben eine negative
> Dauer und werden von F-E4 abgelehnt. Mitternachts-Schichten sind **nicht** unterstützt.

### 2.3 Tagesübersicht „Heute“ (Seite `/`)

| ID    | Anforderung |
|-------|-------------|
| F-H1  | Listet alle Einträge des heutigen Datums. |
| F-H2  | Zeigt Tagessumme in Stunden und CHF, sofern > 0. |
| F-H3  | Einzelne Einträge können direkt gelöscht werden (✕). |

### 2.4 Alle Einträge (Seite `/eintraege`)

| ID    | Anforderung |
|-------|-------------|
| F-A1  | Alle Einträge, **nach Datum gruppiert** (absteigend), pro Tag chronologisch. |
| F-A2  | Pro Tag: Tagessumme (Stunden + CHF). Gesamt: Totalsumme oben rechts. |
| F-A3  | Eintrag **inline bearbeiten** (Von, Bis, Beschreibung). Datum ist im Edit nicht änderbar. |
| F-A4  | Bearbeiten validiert wie F-E4 (Dauer > 0). |
| F-A5  | Eintrag löschen (✕). |

### 2.5 Rapporte & PDF-Export (Seite `/rapporte`)

| ID    | Anforderung |
|-------|-------------|
| F-R1  | Monat/Jahr wählbar (Jahr: aktuelles ±2). Default: aktueller Monat. |
| F-R2  | Kennzahlen für den gewählten Monat: Anzahl Einträge, Summe Stunden, Summe CHF. |
| F-R3  | Tabellarische Monatsübersicht, nach Tag gruppiert, mit Total-Fusszeile. |
| F-R4  | **PDF-Export** des Monatsrapports (A4, jsPDF), Dateiname `Stundenrapport_YYYY-MM.pdf`. |
| F-R5  | PDF enthält: Titel, Monat, Ansatz, Tageszeilen mit Zeit/Beschreibung/Dauer, Gesamttotal (Stunden + CHF). Seitenumbruch bei Überlauf. |
| F-R6  | Export-Button nur sichtbar, wenn der Monat Einträge enthält. |

### 2.6 Navigation & Layout

| ID    | Anforderung |
|-------|-------------|
| F-N1  | Drei Seiten: **Timer** (`/`), **Einträge** (`/eintraege`), **Rapporte** (`/rapporte`). |
| F-N2  | Aktive Seite ist in der Navigation hervorgehoben. |
| F-N3  | Zentrierter Content-Container (max. `3xl`), `TimerProvider` umschliesst die App. |

---

## 3. Datenmodell

### `TimeEntry` ([`src/lib/types.ts`](../src/lib/types.ts))

| Feld              | Typ      | Format       | Beschreibung |
|-------------------|----------|--------------|--------------|
| `id`              | string   | —            | Eindeutige ID (`Date.now()`-Base36 + Random) |
| `date`            | string   | `YYYY-MM-DD` | Datum des Eintrags |
| `startTime`       | string   | `HH:MM`      | Startzeit |
| `endTime`         | string   | `HH:MM`      | Endzeit |
| `durationMinutes` | number   | Minuten      | Berechnete Dauer |
| `description`     | string   | —            | Tätigkeitsbeschreibung |

### Datenbank-Tabelle `entries` ([`src/lib/db.ts`](../src/lib/db.ts))

```sql
CREATE TABLE IF NOT EXISTS entries (
  id               TEXT PRIMARY KEY,
  date             TEXT NOT NULL,
  start_time       TEXT NOT NULL,
  end_time         TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description      TEXT NOT NULL DEFAULT ''
);
```

> Schema-Migration: Aktuell idempotent via `initDb()` (`CREATE TABLE IF NOT EXISTS`),
> aufgerufen zu Beginn jedes API-Handlers. Kein dediziertes Migrationstool.

---

## 4. Persistenz & API

> **Wichtig:** Zeiteinträge werden in einer **Postgres-Datenbank (Neon serverless)**
> gespeichert — *nicht* mehr im `localStorage`. Nur der flüchtige **Timer-Zustand**
> (laufend/pausiert/Startzeitpunkt) liegt im `localStorage`.

Client (`src/lib/storage.ts`) ruft eine REST-API auf; die API ([Next.js Route Handlers](../src/app/api/entries/)) schreibt nach Postgres.

| Methode & Pfad              | Funktion        | Body / Antwort |
|-----------------------------|-----------------|----------------|
| `GET /api/entries`          | Alle Einträge   | → `TimeEntry[]` (sortiert: Datum desc, Startzeit desc) |
| `POST /api/entries`         | Eintrag anlegen | `TimeEntry` → `201` + Eintrag |
| `PATCH /api/entries/:id`    | Eintrag ändern  | `TimeEntry` → `200` + Eintrag |
| `DELETE /api/entries/:id`   | Eintrag löschen | → `{ ok: true }` |

### 4.1 Bekannte Lücken / Tech-Debt (Stand 0.1.0)

- ⚠️ **`DATABASE_URL` ist Pflicht.** Ohne gesetzte Env-Variable wirft [`db.ts`](../src/lib/db.ts) beim Import → API-Routen liefern Fehler, `getEntries` fängt ab und zeigt eine leere Liste. Es existiert noch **kein** `.env.local`.
- ⚠️ **Keine serverseitige Validierung.** Die API vertraut dem Client-Body vollständig (keine Prüfung von `dur > 0`, Pflichtfeldern, Zeitformat, ID-Kollision). Validierung existiert nur im UI.
- ⚠️ **Keine Authentifizierung / kein Rate-Limiting.** API ist offen.
- ⚠️ **`HOURLY_RATE` ist hartkodiert** (25 CHF/h), nicht konfigurierbar.
- ⚠️ **Keine Zeitzonen-Behandlung** — alle Datums-/Zeitoperationen laufen in der lokalen Zeit des Browsers bzw. Servers.

---

## 5. Tech-Stack (vollständig)

### Laufzeit & Framework
| Komponente        | Version    | Zweck |
|-------------------|------------|-------|
| **Next.js**       | 16.2.9     | App Router, Route Handlers (API), Turbopack-Dev. Siehe [`AGENTS.md`](../AGENTS.md): diese Next-Version weicht von Standard ab — Doku unter `node_modules/next/dist/docs/` konsultieren. |
| **React**         | 19.2.4     | UI (Client Components, Context) |
| **React DOM**     | 19.2.4     | DOM-Rendering |
| **Node.js**       | ≥ 20 (`@types/node` ^20) | Server-Runtime der Route Handlers |
| **TypeScript**    | ^5         | `strict: true`, Pfad-Alias `@/* → ./src/*` |

### Daten
| Komponente                   | Version | Zweck |
|------------------------------|---------|-------|
| **@neondatabase/serverless** | ^1.1.0  | Postgres-Client (serverless `sql`-Tag) gegen Neon |
| **Postgres (Neon)**          | —       | Persistenz der `entries`-Tabelle |
| **localStorage**             | —       | Nur flüchtiger Timer-Zustand (`zeitabrechnung_timer`) |

### UI & Styling
| Komponente              | Version | Zweck |
|-------------------------|---------|-------|
| **Tailwind CSS**        | ^4      | Utility-CSS (via `@tailwindcss/postcss`) |
| **next/font (Geist)**   | —       | Schriftart Geist |
| **date-fns**            | ^4.4.0  | Datums-Formatierung & -Berechnung, Locale `de` |
| **jsPDF**               | ^4.2.1  | PDF-Erzeugung des Monatsrapports |

### Tooling
| Komponente            | Version  | Zweck |
|-----------------------|----------|-------|
| **ESLint**            | ^9       | Linting (`eslint-config-next`) |
| **PostCSS**           | —        | Tailwind-Pipeline |
| **Turbopack**         | (Next)   | Dev-Bundler |

### NPM-Scripts
| Script        | Befehl       | Zweck |
|---------------|--------------|-------|
| `dev`         | `next dev`   | Dev-Server (Turbopack) auf `:3000` |
| `build`       | `next build` | Production-Build |
| `start`       | `next start` | Production-Server |
| `lint`        | `eslint`     | Linting |

> **Noch nicht im Stack (siehe [TEST_STRATEGY.md](./TEST_STRATEGY.md)):** ein Test-Runner
> (Vitest), Komponenten-/E2E-Test-Frameworks (Testing Library / Playwright). Diese sind
> für die Umsetzung der Teststrategie vorgesehen.

---

## 6. Projektstruktur

```
src/
├── app/
│   ├── layout.tsx              # Root-Layout, TimerProvider, Nav
│   ├── page.tsx                # Timer + manuelle Erfassung + "Heute"
│   ├── eintraege/page.tsx      # Alle Einträge (gruppiert, editierbar)
│   ├── rapporte/page.tsx       # Monatsrapport + PDF-Export
│   ├── globals.css             # Tailwind
│   └── api/entries/
│       ├── route.ts            # GET (Liste) / POST (anlegen)
│       └── [id]/route.ts       # PATCH (ändern) / DELETE (löschen)
├── components/
│   ├── Nav.tsx                 # Navigation + Timer-Indikator
│   ├── Providers.tsx           # TimerProvider-Wrapper
│   └── TimeSelect.tsx          # Stunden/Minuten-Dropdown
└── lib/
    ├── types.ts                # TimeEntry, HOURLY_RATE
    ├── db.ts                   # Neon-Client, initDb()
    ├── storage.ts              # API-Client + Hilfsfunktionen (calc/format)
    └── TimerContext.tsx        # Timer-State (localStorage)
```

---

## 7. Geschäftsregeln (Berechnungen)

| Regel | Definition | Quelle |
|-------|------------|--------|
| Dauer | `(eh*60 + em) − (sh*60 + sm)` Minuten | `calcDuration` |
| Betrag | `(durationMinutes / 60) * rate`, 2 Nachkommastellen | `formatChf` |
| Dauer-Anzeige | `{h}h {mm}m` | `formatDuration` |
| Timer-Endzeit | auf nächste **Minute** gerundet | `TimerContext.stop` |
| Ansatz | **25 CHF/h** fix | `HOURLY_RATE` |

---

## 8. Nicht-Ziele (Out of Scope, Stand 0.1.0)

- Mehrbenutzer / Login / Rollen.
- Mehrere Projekte / Kunden / variable Ansätze.
- Schichten über Mitternacht.
- Offline-Betrieb / PWA / Sync-Konfliktauflösung.
- Rechnungs-/Steuerlogik (MwSt, Rundungsregeln über CHF hinaus).
- Mobile-native App.
