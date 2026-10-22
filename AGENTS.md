# Job Hunt — agent context

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
- **The data file is sacred.** The owner uses the app live every day. Never overwrite, reset or "clean up" his
  `data.json`. Schema changes must be backward compatible: extend `normalize()` so old data still loads, and use a
  one-time upgrade (set a flag, return `migrated: true` so the page saves once) when data has to change shape.
- **Back up before touching code:** copy `data.json` to a dated file first.
- **Test every change.** `npm test` for unit/integration tests; check UI changes in a headless browser against a
  throwaway data folder, never the real one.
- **UI text in plain English.** Dark theme with a dark-blue palette; colours are CSS tokens in `base.css`.
- **Report briefly** what changed, and whether the owner only needs to refresh the tab (front-end change) or also
  restart the server (`server/` change).

## Layout

| Path | What |
|---|---|
| `AGENTS.md` | This file. |
| `CLAUDE.md` | Points Claude Code at this file. |
| `README.md` | User-facing: how to run, where data lives. |
| `server/index.js` | Entry point (`npm start`). |
| `server/config.js` | Port (`PORT` env, default 4317), folders and data file paths. |
| `server/app.js` | Builds the HTTP server from its parts (so tests can start it on a random port). |
| `server/routes.js` | API route table: `"METHOD /path": handler`. |
| `server/storage.js` | `JsonStore`: reads/writes the data file. |
| `server/backups.js` | `Backups`: activity-driven automatic backups (see below). |
| `server/static.js` | Serves `public/` (known file types only, no path traversal). |
| `server/http.js` | `send`, `sendJson`, `readBody`. |
| `server/lookup/` | Naive company lookup (see below). `index.js` builds it with an injectable `get`. |
| `public/index.html` | Page shell: header, `<main>`, dialogs, one module script. |
| `public/favicon.svg` | Crosshair-target icon (navy square, blue rings). |
| `public/css/` | `base.css` (tokens, buttons, header), `sheet.css`, `stages.css`, `detail.css`, `dialogs.css`, `drawer.css`. |
| `public/js/main.js` | Composition root: calls each feature's `init()`, loads data, routes. |
| `public/js/store.js` | Owns the state; `load()`, debounced `save()` (350ms), `writeNow()`; server or localStorage. |
| `public/js/api.js` | `fetch` wrappers for the server API. |
| `public/js/bus.js` | Tiny pub/sub: `status`, `render`, `route`, `field`, `company:changed`, `stages:changed`, `meeting:changed`. |
| `public/js/dom.js` | `$`, `$$`, `delegate()`, `autosize()`. |
| `public/js/router.js` | `#/c/<id>` → company page, otherwise the sheet. |
| `public/js/config.js` | Default stages, statuses. |
| `public/js/model/` | Pure logic, unit-tested: `normalize`, `company`, `stages`, `progress`, `meetings`, `search`, `sort`, `contacts`, `bookmarks`. |
| `public/js/views/` | One file per UI feature, each with an `init()` that registers its own delegated listeners. |
| `test/` | `node --test` suites; `test/helpers.js` starts the app against a temp data folder. |

## Server API

| Endpoint | Behaviour |
|---|---|
| `GET /api/data` | Returns `data.json`, or `{}` if nothing has been saved yet. Runs the backup check. |
| `PUT /api/data` | Validates the JSON, runs the backup check, copies the current file to `data.backup.json`, then writes via temp file + rename (atomic). |
| `POST /api/backup` | Forces a backup now → `{ name }` (409 if there's no data yet). |
| `GET /api/lookup?name=X` | Naive lookup → `{ website, logo, links: { <field>: url }, source, log }`; prints a ✓/✗ report per site to the terminal. |
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
  stages: [{ id, name, defaultOn }],      // shared list; its order is the default for new companies
                                          // defaultOn = switched on for new companies (Applied + HR by default)
  companies: [{
    id, name, position, website, careersUrl, comments, createdAt,
    lastInteraction: 'YYYY-MM-DD',       // set by hand, or to today when a stage is ticked done
    closeReason,                          // why a rejected/withdrawn/closed process ended
    logo,                                 // image URL
    glassdoorUrl, linkedinUrl, finderUrl, crunchbaseUrl, levelsUrl, blindUrl, indeedUrl, comparablyUrl,
    contacts: [{ id, name, role, phone, linkedin }],   // phone in international format
    status: 'interested'|'approached'|'active'|'rejected'|'withdrawn',   // 'active' shows as "In process"
    order: [stageId...],                  // this company's own stage order
    stages: { [stageId]: { enabled, done, comment, meeting: 'YYYY-MM-DDTHH:mm' } },   // enabled = applies to this company
    notes: [{ id, title, body }],
  }],
  bookmarks: [{ id, title, url }],
  updatedAt, stageDefaultsV2: true,
}
```

### Upgrades in `normalize()` (keep them all)

- **`stageDefaultsV2` (one-time):** sets `defaultOn` for Applied and HR Initial/HR phone. Companies not past that
  stage get their other stages switched off, except stages with a ✓, a meeting or a comment. Returns
  `migrated: true`, so the page saves once after loading.
- **Contacts (v3):** the old `contact` text and `recruiterUrl` become `contacts[0]`, and the old fields are deleted.
  Every company keeps at least one (blank) contact row.
- **Old WhatsApp links:** a contact's old `whatsapp` link becomes its `phone` if the phone was empty, then the field
  is removed.
- **Removed statuses** (`OLD_STATUS` in `config.js`): `offer` loads as `active`, `closed` as `withdrawn`. Unknown
  statuses become `active`.

`normalize()` also fills defaults for anything missing, so partial or old data always loads. It also keeps every
company's `order` and `stages` in sync with the shared list (unknown stages are appended).

## UI

- **Sheet** (`views/sheet.js`, columns in `views/columns.js`): deliberately minimal.
  - Logo and Company are frozen on the left and read-only; clicking either opens the company page.
  - Movable columns: Progress (bar · % · "x/y · next: <stage>", relevant stages only), Next meeting (earliest
    upcoming meeting on a relevant stage; amber for today/tomorrow), Last interaction (date + "x days ago", amber
    after 7 days) and Status. Drag a header to reorder them (both tables; remembered in
    `localStorage['jobHuntCols']`).
  - ✕ deletes. Website, position and comments live on the company page only. Up to 1600px wide.
- **Statuses:** Interested (thinking of applying, grey stripe) · Approached me (they reached out, blue stripe) · In
  process · Rejected · Withdrew. Offer and "Closed / done" were dropped by the owner.
- **Rejected & closed** (rejected, withdrawn) move to a collapsible table below, with an editable Reason
  column in place of Next meeting. Changing the status moves the row.
- **Sorting:** click a header; again to flip. Empty values always go last. Last interaction and Progress start
  descending. Remembered per browser in `localStorage['jobTrackerSort']`.
- **Last interaction:** ticking a stage sets it to today; adding a company does not (owner's rule).
- **Progress popover:** hovering a Progress cell opens the company's stage list (`views/popover.js`). It stays open
  while focused or dragging, closes on Esc, outside click, scroll or mouse-out.
- **Stage list** (popover and company page, `views/stageList.js`): done ✓, a "when?" meeting date-time, comment,
  relevant switch (off = greyed and excluded from progress), reorder by ⋮⋮ drag or ↑↓, and "+ Add stage" (adds to
  the shared list; every company gets it, but it's switched on only for the company it was added from).
- **Hiring Stages dialog** (`views/stagesDialog.js`): rename, reorder and delete shared stages; a switch for "on by
  default for new companies"; "Apply this order to all companies".
  - Deleting a stage that companies have data on (✓, meeting or comment, even if switched off — `stageUsage()`)
    shows a warning listing them and what each would lose. Clicking one opens it with the stage highlighted
    (`focusStageOnOpen`); "Delete anyway, lose this data" deletes after a second confirmation. A stage with no
    data gets a short confirmation. Recovery after a delete is only from `backups/`.
- **Points of contact** (`views/contacts.js`): name · role · phone (international format) with 📞 (`tel:`) and
  WhatsApp Web buttons computed from it (local 05x numbers fall back to +9725x) · LinkedIn chat. WhatsApp links use
  `target="whatsapp"`, so they reuse one tab (a tab opened by hand can't be reused — browser limit). ＋ adds a contact, ✕ removes one (asks if it
  has data). Empty links are greyed out; clicking one focuses its field.
- **+ Add Company:** asks for the name, then a loader (with Skip) runs `/api/lookup`, fills only empty fields and
  opens the company page. "↻ Look up" on the company page runs it again.
- **Logos:** a logo column (initial as fallback); a big logo on the
  company page: click it to paste an image URL (`views/logoEditor.js`; Enter saves, Esc restores, empty removes).
- **Research** (`views/research.js`): 8 sites from `config.RESEARCH` (field, label, domain, tooltip). Hover a name
  for what the site is for; an empty field's 🔍 opens a Google `site:` search.
- **⤓ Back up now** (`views/backupButton.js`): flushes any pending save, then `POST /api/backup`.
- **Bookmarks drawer** (`views/bookmarks.js`): 🔖 at the right end of the top bar, or `B`. Add, edit inline, delete,
  drag to reorder. Hidden on company pages.
- **Search** filters by every word across all text, contacts, research links, stage comments and notes. `/` focuses it.
- **Company page** (`#/c/<id>`): fields (incl. Last interaction, and Reason when closed), the stage list and Notes:
  titled free-text sections whose title suggests stage names. `Esc` goes back.
- **Saving:** every edit autosaves; the top-right status says where. Without the server it falls back to
  `localStorage['jobTracker']` and says so in red.

### Saved in the browser only (`localStorage`)

`jobTrackerSort` (sort), `jobHuntCols` (column order), `jobHuntDrawer` (drawer open), `jobTracker` (data fallback when there's no server).

## Backups

1. `data.backup.json`: the previous version, rewritten on every save.
2. `backups/auto-YYYY-MM-DD_HH-MM-SS.json`: there's no timer. On every `GET`/`PUT /api/data` (checked at most once
   a minute), if the newest automatic backup is 6+ hours old (time read from the file name), `data.json` is copied
   there. On a save this happens before writing. Automatic backups older than 7 days are deleted; any other file in
   `backups/` is never touched. Nothing happens while the app isn't used.
3. The ⤓ button forces a backup.

## Company lookup — what works and what doesn't

Learned on 2026-10-22 by running real lookups through the owner's running app:

- **Website:** DuckDuckGo Instant Answer → Wikidata P856 → guessing `name.{com,io,ai,co.il,…}` (kept only if the
  page title contains the name and it isn't a domain-for-sale page). A domain must look like the name
  (`plausible()`); directory sites are excluded by whole hostname (so `x.com` doesn't match `wix.com`).
- **Logo:** the homepage's best `<link rel=icon|apple-touch-icon>`, checked to be an image, else Google's s2
  favicon service.
- **Research links come mainly from Wikidata IDs** (`server/lookup/wikidata.js`, `WD_IDS`):

  | Property | Site | URL pattern |
  |---|---|---|
  | P4264 | LinkedIn | `linkedin.com/company/$1/` |
  | P8060 | Glassdoor | `glassdoor.com/Overview/-EI_IE$1.htm` |
  | P10285 | Indeed | `indeed.com/cmp/$1` |
  | P2088 | Crunchbase | `crunchbase.com/organization/$1` |
  | P10206 | Comparably | `comparably.com/companies/$1` |
  | P10146 | Levels.fyi | `levels.fyi/company/$1/` |

  Startup Nation Finder and Blind have no Wikidata property. Coverage is patchy: many companies have only one or
  two IDs; empty fields fall back to the 🔍 search link in the UI.
- **Scraping search engines failed and is deliberately minimal now:**
  - DuckDuckGo's HTML endpoint answers the first automated search, then returns 202 bot checks.
  - Bing returns pages without result markup; Bing's `format=rss` ignores `site:`.
  - Only one DuckDuckGo search per lookup remains, for Glassdoor, and only when Wikidata has no Glassdoor ID.
  - **Don't add parallel or bulk searching back.** It gets the owner's connection flagged with CAPTCHAs.
- **Glassdoor URLs** are always normalized to the Overview ("About") tab (`toOverview()`).
- A lookup takes roughly 5–20s. The client waits up to 60s and has a Skip button.
- **Testing:** there's no internet in the test environment; `test/server/fakeNet.js` answers requests with canned
  responses. In the browser, stub `/api/lookup` with Playwright's `page.route`.

## Ideas not done yet

From the owner's list: save without the server (File System Access API), stage reminders, CSV export.

## Work log

Newest first.

- **2026-10-22 12:42:** Stage-delete warning listing affected companies, with jump-to-company and delete anyway.
- **2026-10-22 12:36:** Company name read-only in the sheet, ⤢ removed (logo/name open the page), draggable column
  order, wider table.
- **2026-10-22 12:30:** Lookup reworked around Wikidata IDs after bulk searching triggered bot checks and a CAPTCHA.
- **2026-10-22 12:14:** Automatic backups (6h interval, 7-day retention, only while the app is used) and ⤓.
- **2026-10-22 12:06:** Bookmarks drawer, button at the end of the top bar.
- **2026-10-22 11:58:** Research section with 8 sites; the lookup tries to fill all of them.
- **2026-10-22 11:52:** WhatsApp computed from the phone (separate field removed and upgraded), one reused tab.
- **2026-10-22 11:44:** Role per contact.
- **2026-10-22 11:40:** Glassdoor links go to the Overview tab.
- **2026-10-22 11:36:** Logo URL field replaced by click-to-paste on the big logo.
- **2026-10-22 11:33:** Multiple contacts with call / WhatsApp / LinkedIn buttons; Recruiter LinkedIn field removed,
  its data upgraded into contacts.
- **2026-10-22 11:26:** Add-company flow with a naive lookup (website, logo, Glassdoor) and logo columns.
- **2026-10-22 11:20:** Button copy ("Hiring Stages", "+ Add Company"); logo next to the app name.

- **2026-10-22 11:14:** Stage defaults. The data is in live use (the owner had renamed a stage to "HR Initial"), so
  the change ships as a one-time upgrade in `normalize()` rather than an edit to `data.json`, which an open tab could
  overwrite. Tell the owner to refresh every open tab.
- **2026-10-22 11:10:** Named the app **Job Hunt** (owner's pick over Pipeline, Next Round, Callback…), crosshair
  favicon, dark-blue palette. Status column widened so "Approached me" fits.
- **2026-10-22 11:00:** New status set; old `offer`/`closed` values upgrade on load. Owner picked "Approached me"
  (alternatives offered: Inbound, They reached out, Recruiter reached out).
- **2026-10-22 10:56:** Stage list column "Meeting" → "when?". (Headers render in capitals via CSS.)
- **2026-10-22 10:45:** Handoff: working rules for future sessions (the owner keeps tweaking the app day to day).
- **2026-10-22 10:30:** README: how to run, where data is saved, why there's a server. Owner asked why a server is
  needed: browsers can't write files. Alternatives offered, none chosen yet: File System Access API (Chromium only,
  re-grant each session), localStorage + export/import, auto-starting the server at login.
- **2026-10-22 10:19:** Point of contact, Recruiter LinkedIn and Glassdoor fields on the company page.
- **2026-10-22 10:18:** Meeting per stage, Next meeting column, sortable columns (`model/sort.js`, `model/meetings.js`).
- **2026-10-22 10:16:** Minimal sheet columns, Last interaction, separate Rejected & closed table with Reason.
- **2026-10-22 10:14:** Shared, growable stage list with per-company order and relevance; progress popover on hover;
  Stages dialog. Owner wants stages mostly common, greyed out where a company doesn't have them.
- **2026-10-22 10:05:** First UI: sheet, search, company page with stages and notes, autosave, localStorage
  fallback. Model tests. Checked in headless Chromium against a temp data folder.
- **2026-10-22 09:52:** Zero-dependency server with atomic JSON storage and static file serving. Tests for storage
  and the API (`npm test`).
- **2026-10-22 09:41:** Project scaffold: package.json (ESM, `npm start`, `npm test`), MIT license, agent context.
