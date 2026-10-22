# Agent context

**Read this whole file before changing anything.** It is the shared memory of this project for every agent (and
human) working on it. `CLAUDE.md` only points here.

## Keep this file current

Document any relevant context you gather **while you work, not only at the end**, so the next agent can pick up
without re-discovering it:

- decisions the owner made and preferences he stated,
- how things actually behave (what was tried, what worked, what failed and why),
- new files, endpoints, data fields, migrations and UI sections,
- environment gotchas and work left half-done.

Update the relevant section in place, add a dated line to the **Work log**, and remove anything that stops being
true.

## What we're building

A personal tracker for job applications and interviews that lives in a browser tab and feels like a spreadsheet you
edit as you go. Every change persists locally to a JSON file. Single user, runs on the owner's machine.

## Ground rules

- **Zero dependencies, no build step.** Plain HTML/CSS and native ES modules in the browser; Node's standard library
  on the server. Anyone with Node ≥ 18 can clone and `npm start`.
- **Small, single-purpose modules.** One responsibility per file; features plug in rather than growing a central
  switch statement. Pure logic (data model, calculations) stays free of DOM and I/O so it can be unit-tested.
- **The data file is sacred.** Never overwrite, reset or "clean up" real data. Schema changes must be backward
  compatible.
- **Test every change.** `npm test` for unit/integration tests; check UI changes in a headless browser against a
  throwaway data folder, never the real one.
- **UI text in plain English.** Dark theme.

## Layout

| Path | What |
|---|---|
| `AGENTS.md` | This file. |
| `CLAUDE.md` | Points Claude Code at this file. |
| `server/index.js` | Entry point (`npm start`). |
| `server/config.js` | Port (`PORT` env, default 4317), folders and data file paths. |
| `server/app.js` | Builds the HTTP server from its parts (so tests can start it on a random port). |
| `server/routes.js` | API route table: `"METHOD /path": handler`. |
| `server/storage.js` | `JsonStore`: reads/writes the data file. |
| `server/static.js` | Serves `public/` (known file types only, no path traversal). |
| `server/http.js` | `send`, `sendJson`, `readBody`. |
| `public/index.html` | Page shell: header, `<main>`, one module script. |
| `public/css/` | `base.css` (tokens, buttons, header), `sheet.css`, `stages.css`, `detail.css`. |
| `public/js/main.js` | Composition root: calls each feature's `init()`, loads data, routes. |
| `public/js/store.js` | Owns the state; `load()`, debounced `save()` (350ms), `writeNow()`; server or localStorage. |
| `public/js/api.js` | `fetch` wrappers for the server API. |
| `public/js/bus.js` | Tiny pub/sub: `status`, `render`, `field`, `company:changed`. |
| `public/js/dom.js` | `$`, `$$`, `delegate()`, `autosize()`. |
| `public/js/router.js` | `#/c/<id>` → company page, otherwise the sheet. |
| `public/js/config.js` | Default stages, statuses. |
| `public/js/model/` | Pure logic, unit-tested: `normalize`, `company`, `progress`, `search`. |
| `public/js/views/` | One file per UI feature, each with an `init()` that registers its own delegated listeners. |
| `test/` | `node --test` suites; `test/helpers.js` starts the app against a temp data folder. |

## Server API

| Endpoint | Behaviour |
|---|---|
| `GET /api/data` | Returns `data.json`, or `{}` if nothing has been saved yet. |
| `PUT /api/data` | Validates the JSON, copies the current file to `data.backup.json`, then writes via temp file + rename (atomic). |
| `GET /*` | Static files from `public/`. |

The server listens on `127.0.0.1` only: it's a personal tool, not something to expose on a network.

## Front-end conventions

- **Features plug in.** A view module exports render helpers plus `init()`, which registers delegated listeners on
  `#main` (`dom.delegate`). `main.js` lists the modules; nothing else has to change to add one.
- **Views talk through the bus**, not by importing each other: emit `render` to redraw the current view,
  `company:changed` after a stage edit (views patch just that company), `field` after a `data-f` edit.
- **`data-f="<field>"` inputs are bound automatically** by `views/fields.js`.
- **Model code is pure** (no DOM, no fetch) and lives in `public/js/model/`, so `node --test` can import it.

## Data model (`data.json`)

```js
{
  stages: [{ id, name }],                 // shared list, in display order
  companies: [{
    id, name, position, website, careersUrl, comments, createdAt,
    status: 'active'|'offer'|'rejected'|'withdrawn'|'closed',
    stages: { [stageId]: { enabled, done, comment } },   // enabled = this stage applies to the company
    notes: [{ id, title, body }],
  }],
  updatedAt,
}
```

`normalize()` fills defaults for anything missing, so partial or old data always loads.

## UI

- **Sheet:** Company, Position, Progress (bar · % · "x/y · next: <stage>", counting relevant stages only), Status,
  ⤢ open, ✕ delete. Closed statuses are dimmed.
- **Search** filters by every word across all text, stage comments and notes. `/` focuses it.
- **Company page** (`#/c/<id>`): fields, the stage list (done, comment, relevant switch) and Notes: titled free-text
  sections, whose title suggests stage names. `Esc` goes back.
- **Saving:** every edit autosaves; the top-right status says where. Without the server it falls back to
  `localStorage['jobTracker']` and says so in red.

## Work log

Newest first.

- **2026-10-22 10:05:** First UI: sheet, search, company page with stages and notes, autosave, localStorage
  fallback. Model tests. Checked in headless Chromium against a temp data folder.
- **2026-10-22 09:52:** Zero-dependency server with atomic JSON storage and static file serving. Tests for storage
  and the API (`npm test`).
- **2026-10-22 09:41:** Project scaffold: package.json (ESM, `npm start`, `npm test`), MIT license, agent context.
