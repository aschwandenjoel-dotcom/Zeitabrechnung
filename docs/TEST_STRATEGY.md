# Zeitabrechnung — Teststrategie

> Stand: 2026-06-23 · Bezug: [SPEC.md](./SPEC.md)
> Diese Strategie definiert **was**, **wie** und **womit** getestet wird, sowie eine
> priorisierte Einführungsreihenfolge. Aktuell existieren **noch keine Tests** im Projekt.

---

## 1. Ziele & Prinzipien

1. **Korrektheit der Geschäftslogik zuerst** — Dauer-/CHF-Berechnung, Timer-Rundung
   und Validierung sind das Herzstück und am billigsten zu testen.
2. **Risikobasiert** — Aufwand dorthin, wo Fehler am teuersten sind (falsche Abrechnung,
   Datenverlust), nicht gleichmässig über alles.
3. **Schnelle Rückmeldung** — Unit-Tests in Millisekunden, vor jedem Commit lauffähig.
4. **Realistische Integration** — API gegen eine echte Postgres-Instanz (Test-DB), nicht
   nur Mocks, da die DB-Schicht heute ungetestet und unvalidiert ist (siehe SPEC §4.1).

---

## 2. Testpyramide

```
        ╱╲        E2E (Playwright) ........ wenige, kritische Flows
       ╱──╲       Integration (API+DB) .... API-Routen gegen Test-Postgres
      ╱────╲      Komponenten (RTL) ....... Formulare, Timer-UI, TimeSelect
     ╱──────╲     Unit (Vitest) ........... Berechnungen, Validierung, Timer-Logik
    ╱────────╲
```

| Ebene        | Anteil (Ziel) | Geschwindigkeit | Werkzeug |
|--------------|---------------|-----------------|----------|
| Unit         | ~60 %         | < 1 s gesamt    | Vitest |
| Komponenten  | ~25 %         | Sekunden        | Vitest + React Testing Library + jsdom |
| Integration  | ~10 %         | Sekunden–Minuten| Vitest + Test-Postgres (Neon-Branch / lokaler PG) |
| E2E          | ~5 %          | Minuten         | Playwright |

---

## 3. Empfohlener Tooling-Stack

| Zweck                | Werkzeug | Begründung |
|----------------------|----------|------------|
| Test-Runner          | **Vitest** | Schnell, native TS/ESM, passt zu Vite/Next, gleicher Runner für Unit + Komponenten + Integration. |
| Komponenten-Tests    | **@testing-library/react** + **@testing-library/user-event** + **jsdom** | Verhalten statt Implementierung; gute Praxis für React 19. |
| API/Integration      | **Vitest** + **Neon-Test-Branch** oder lokaler Postgres (Docker) | API-Handler direkt aufrufen, gegen echtes Schema. |
| E2E                  | **Playwright** | Echte Browser, Multi-Page-Flows, PDF-Download-Prüfung. |
| Coverage             | **Vitest c8/v8** | Abdeckungsmessung der Logik-Schicht. |
| CI                   | **GitHub Actions** | `lint` + `test` + `build` bei jedem Push/PR. |

> Diese Pakete sind noch **nicht** installiert. Einführung: siehe §8.

---

## 4. Testumfang nach Modul

### 4.1 Berechnungen — `src/lib/storage.ts` (Unit, höchste Priorität)

`calcDuration`, `formatDuration`, `formatChf`, `generateId`.

| Test | Erwartung |
|------|-----------|
| `calcDuration("09:00","17:00")` | `480` |
| `calcDuration("09:15","09:45")` | `30` |
| `calcDuration("17:00","09:00")` (negativ) | `< 0` → von Aufrufer abgelehnt (F-E4) |
| `formatDuration(480)` | `"8h 00m"` |
| `formatDuration(90)` | `"1h 30m"` |
| `formatDuration(5)` | `"0h 05m"` |
| `formatChf(60, 25)` | `"25.00"` |
| `formatChf(30, 25)` | `"12.50"` |
| `formatChf(0, 25)` | `"0.00"` |
| `generateId()` | zwei Aufrufe ⇒ unterschiedliche Strings |

### 4.2 Timer-Logik — `src/lib/TimerContext.tsx` (Unit/Komponente, hohe Priorität)

> Zeit deterministisch mit **Fake-Timers** (`vi.useFakeTimers`) und gemocktem `Date.now`.

| Test | Erwartung |
|------|-----------|
| Start → 90 s vergehen | `elapsed === 90` |
| Pause friert `elapsed` ein | bleibt konstant während Pause |
| Resume zählt weiter, **ohne** Pausenzeit | Pausendauer nicht enthalten |
| Stop liefert `StopResult` mit korrektem `date`/`startTime`/`endTime` | Endzeit auf nächste Minute gerundet (F-T4) |
| Stop setzt State auf DEFAULT zurück | Timer nicht mehr laufend |
| `load()`/`save()` Persistenz | State aus `localStorage` wiederhergestellt (F-T5) |
| `stop()` ohne Start | gibt `null` zurück |

### 4.3 Manuelle Erfassung — `src/app/page.tsx` (Komponente, hohe Priorität)

| Test | Erwartung |
|------|-----------|
| Leeres Pflichtfeld absenden | Fehler „Alle Felder ausfüllen.“ (F-E3) |
| Bis ≤ Von absenden | Fehler „Endzeit muss nach Startzeit liegen.“ (F-E4) |
| Gültiger Eintrag | `saveEntry` aufgerufen, Liste neu geladen, Formular zurückgesetzt (F-E5) |
| „Heute“-Summe | Stunden + CHF korrekt aggregiert (F-H2) |
| Löschen | `deleteEntry` aufgerufen, Eintrag verschwindet (F-H3) |

> `storage.ts`-Funktionen (fetch) werden hier gemockt; echte API in §4.6.

### 4.4 Einträge-Seite — `src/app/eintraege/page.tsx` (Komponente)

| Test | Erwartung |
|------|-----------|
| Gruppierung nach Datum, absteigend | korrekte Reihenfolge (F-A1) |
| Inline-Edit speichern | `updateEntry` mit neuer Dauer (F-A3/F-A4) |
| Edit mit Bis ≤ Von | Fehlermeldung, kein Save |
| Tages- und Gesamtsumme | korrekt (F-A2) |

### 4.5 Rapporte & PDF — `src/app/rapporte/page.tsx` (Komponente)

| Test | Erwartung |
|------|-----------|
| Monatsfilter | nur Einträge des gewählten Monats (F-R1/F-R2) |
| Kennzahlen | Anzahl/Stunden/CHF korrekt |
| Export-Button | nur sichtbar bei ≥1 Eintrag (F-R6) |
| PDF-Auslösung | `jsPDF`-Instanz erzeugt + `save("Stundenrapport_YYYY-MM.pdf")` (jsPDF gemockt) — geprüft werden Aufruf & Dateiname, nicht das Binärlayout |

### 4.6 API + DB — `src/app/api/entries/**` (Integration, hohe Priorität)

> Gegen Test-Postgres. Setup: Schema via `initDb()`, Teardown: Tabelle leeren.

| Test | Erwartung |
|------|-----------|
| `POST` legt Eintrag an | `201`, Zeile in DB vorhanden |
| `GET` liefert sortiert | Datum desc, Startzeit desc (F-A1) |
| `PATCH` ändert Eintrag | Felder aktualisiert |
| `DELETE` entfernt Eintrag | Zeile weg, `{ ok: true }` |
| `initDb()` idempotent | mehrfacher Aufruf wirft nicht |
| **Regression (SPEC §4.1):** `POST` mit `durationMinutes ≤ 0` / fehlenden Feldern | dokumentiert aktuelles Verhalten; Soll: serverseitige Ablehnung (offener Bug) |

### 4.7 TimeSelect — `src/components/TimeSelect.tsx` (Komponente)

| Test | Erwartung |
|------|-----------|
| Stunde + Minute wählen | `onChange("HH:MM")` mit Padding |
| Klick ausserhalb | schliesst Dropdown |
| Vorbelegter Wert | wird angezeigt („HH:MM Uhr“) |

---

## 5. Nicht-funktionale Tests

| Aspekt | Vorgehen |
|--------|----------|
| **Lint/Typen** | `npm run lint` + `tsc --noEmit` als CI-Gate. |
| **Build** | `next build` muss in CI grün sein. |
| **A11y (leicht)** | Playwright + `@axe-core/playwright` auf den drei Seiten (Basis-Checks). |
| **Zeitzonen/Locale** | Tests mit fixierter TZ (`TZ=Europe/Zurich`) und gemocktem Datum, da Berechnungen lokalzeit-abhängig sind (SPEC §4.1). |

---

## 6. Kritische E2E-Flows (Playwright, wenige)

1. **Manueller Eintrag → erscheint unter „Heute" → erscheint im Monatsrapport.**
2. **Timer Start → Pause → Resume → Stopp → Formular vorbefüllt → speichern.**
3. **Monat wählen → PDF herunterladen** (Download-Event + Dateiname `Stundenrapport_YYYY-MM.pdf` prüfen).
4. **Eintrag bearbeiten und löschen** auf `/eintraege`, Summen aktualisieren sich.

> E2E benötigt eine laufende App + Test-DB. In CI: App via `next build && next start`
> gegen ephemeren Postgres (Service-Container) starten.

---

## 7. Testdaten & Umgebung

- **Fixtures:** kleine Menge `TimeEntry`-Objekte (1 Tag, mehrere Tage, Monatsgrenze).
- **Test-DB:** separater Neon-Branch *oder* Docker-Postgres; `DATABASE_URL` aus
  `.env.test`. Niemals gegen Produktivdaten.
- **Determinismus:** Datum/Zeit immer mocken (`vi.setSystemTime`), nie `new Date()`
  ungebremst im Test.
- **Isolation:** Jeder Integrationstest räumt die `entries`-Tabelle auf (before/after each).

---

## 8. Einführungsreihenfolge (Priorisierung)

| Schritt | Inhalt | Nutzen / Risiko abgedeckt |
|---------|--------|---------------------------|
| **1** | Vitest installieren + konfigurieren; Unit-Tests §4.1 (Berechnungen) | Falsche Abrechnung — höchstes Risiko, kleinster Aufwand. |
| **2** | Timer-Logik §4.2 mit Fake-Timers | Kern-Feature, fehleranfällige Zeitarithmetik. |
| **3** | RTL + Komponenten-Tests §4.3–4.5 | Validierung & UI-Verhalten. |
| **4** | Integration §4.6 gegen Test-Postgres | Bisher völlig ungetestete, unvalidierte DB-Schicht. |
| **5** | Playwright + E2E §6 + CI-Pipeline | Regressionsschutz für komplette Flows. |
| **6** | A11y- & Build-Gates §5 | Qualitäts-Baseline. |

---

## 9. CI-Gates (Definition of Done für PRs)

Ein PR ist mergebar, wenn:

- `npm run lint` ✅ und `tsc --noEmit` ✅
- `vitest run` (Unit + Komponenten + Integration) ✅
- `next build` ✅
- Geänderte Geschäftslogik ist von mindestens einem Test abgedeckt.
- Kritische E2E-Flows (§6) grün (bei Änderungen an Seiten/Flows).

---

## 10. Offene Test-relevante Punkte (aus SPEC §4.1)

Diese sollten beim Schreiben der Tests als **bekannte Lücken** dokumentiert und
idealerweise mit einem Fix begleitet werden:

- Fehlende **serverseitige Validierung** der API → Integrationstests sollen das Soll
  (Ablehnung ungültiger Bodies) prüfen und den aktuellen Bug sichtbar machen.
- **`DATABASE_URL`-Pflicht** ohne `.env.local` → klarer Setup-Schritt für lokale Tests.
- **Zeitzonen-Verhalten** → bewusst mit fixierter TZ testen.
- **Mitternachts-Schichten** → Negativ-Test, der das dokumentierte „nicht unterstützt" absichert.
