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
- **The data file is sacred.** The owner uses the app live every day. Never overwrite, reset or "clean up"
  `user-data/data.json`. Schema changes must be backward compatible: extend `normalize()` so old data still loads, and use a
  one-time upgrade (set a flag, return `migrated: true` so the page saves once) when data has to change shape.
- **Back up before touching code:** copy `user-data/data.json` to `user-data/backups/manual/` with a date first.
- **Test every change.** `npm test` for unit/integration tests; check UI changes in a headless browser against a
  throwaway data folder, never the real one.
- **Times are 24-hour** everywhere (owner's preference): display uses `TIME_24` (`hourCycle: 'h23'`), and the
  stage "when?" field is a date input plus a typed `HH:MM` box, because the browser's own time picker follows the
  OS locale (AM/PM on an English Mac). `parseTime()` accepts `9`, `930`, `9:30`, `21.05`.
- **UI text in plain English.** Dark theme with a dark-blue palette; colours are CSS tokens in `base.css`.
- **Report briefly** what changed, and whether the owner only needs to refresh the tab (front-end change) or also
  restart the server (`server/` change).

## Layout

| Path | What |
|---|---|
| `AGENTS.md` | This file. |
| `CLAUDE.md` | Points Claude Code at this file. |
| `README.md` | User-facing: features, how to run, your data, backups. |
| `scripts/demo.js` | `npm run demo`: runs on fictional sample data (`scripts/demo-data.js`) in `.demo-data/` (git-ignored), port 4318. |
| `docs/screenshots/` | README screenshots, taken with Playwright from the demo data. |
| `start.command` | macOS double-click launcher (login + interactive zsh, so `node` from nvm/Homebrew is found). |
| `server/index.js` | Entry point (`npm start`). |
| `server/config.js` | Port (`PORT` env, default 4317) and paths; `DATA_DIR` env overrides the data folder. |
| `server/app.js` | Builds the HTTP server from its parts (so tests can start it on a random port). |
| `server/routes.js` | API route table: `"METHOD /path": handler`. |
| `server/storage.js` | `JsonStore`: reads/writes the data file. |
| `server/backups.js` | `Backups`: activity-driven automatic backups (see below). |
| `server/static.js` | Serves `public/` (known file types only, no path traversal). |
| `server/http.js` | `send`, `sendJson`, `readBody`. |
| `server/lookup/` | Naive company lookup (see below). `index.js` builds it with an injectable `get`. |
| `public/index.html` | Page shell: header, `<main>`, dialogs, one module script. |
| `public/favicon.svg` | Crosshair-target icon (navy square, blue rings). |
| `public/css/` | `base.css` (tokens, buttons, header), `sheet.css`, `stages.css`, `detail.css`, `dialogs.css`, `drawer.css`, `action.css`. |
| `public/js/main.js` | Composition root: calls each feature's `init()`, loads data, routes. |
| `public/js/store.js` | Owns the state; `load()`, debounced `save()` (350ms), `writeNow()`; server or localStorage. |
| `public/js/api.js` | `fetch` wrappers for the server API. |
| `public/js/bus.js` | Tiny pub/sub: `status`, `render`, `route`, `field`, `company:changed`, `stages:changed`, `meeting:changed`. |
| `public/js/dom.js` | `$`, `$$`, `delegate()`, `autosize()`. |
| `public/js/router.js` | `#/c/<id>` → company page, otherwise the sheet. |
| `public/js/config.js` | Default stages, statuses. |
| `public/js/model/` | Pure logic, unit-tested: `normalize`, `company`, `stages`, `progress`, `meetings`, `search`, `sort`, `contacts`, `bookmarks`, `action`. |
| `public/js/views/` | One file per UI feature, each with an `init()` that registers its own delegated listeners. |
| `test/` | `node --test` suites; `test/helpers.js` starts the app against a temp data folder. |
| `user-data/` | **All personal data** (git-ignored, created on start): `data.json`, `data.backup.json`, `backups/`. |

## Server API

| Endpoint | Behaviour |
|---|---|
| `GET /api/data` | Returns `data.json`, or `{}` if nothing has been saved yet. Runs the backup check. |
| `PUT /api/data` | Validates the JSON, runs the backup check, copies the current file to `data.backup.json`, then writes via temp file + rename (atomic). |
| `POST /api/backup` | Forces a backup now → `{ name }` (409 if there's no data yet). |
| `GET /api/lookup?name=X` | Naive lookup → `{ website, logo, links: { <field>: url }, source, log }`; prints a ✓/✗ report per site to the terminal. |
| `GET /*` | Static files from `public/`. |

App code and personal data are kept apart: everything personal is in `user-data/` (or `DATA_DIR`). Copy the repo
without it to give the app to someone (they start empty); copy `user-data/` alone to move the data.

The server listens on `127.0.0.1` only: it's a personal tool, not something to expose on a network.

## Front-end conventions

- **Features plug in.** A view module exports render helpers plus `init()`, which registers delegated listeners on
  `#main` (`dom.delegate`). `main.js` lists the modules; nothing else has to change to add one.
- **Views talk through the bus**, not by importing each other:
  - `render` → redraw the current view; `route` ← emitted by the router (`{ detail }`);
  - `field` ← after any `data-f` edit (`{ c, field, el }`);
  - `company:changed` ← after a stage edit (views patch just that company); `meeting:changed` patches only the Next
    meeting cell (so the popover being typed in isn't redrawn);
  - `stages:changed` ← a stage was added from a company (`{ c }`); `status` → the save-status text.
- **`data-f="<field>"` inputs are bound automatically** by `views/fields.js`.
- **Model code is pure** (no DOM, no fetch) and lives in `public/js/model/`, so `node --test` can import it.

## Data model (`user-data/data.json`)

```js
{
  stages: [{ id, name, defaultOn }],      // shared list; its order is the default for new companies
                                          // defaultOn = switched on for new companies (Applied + HR by default)
  companies: [{
    id, name, position, website, careersUrl, comments, createdAt,
    lastInteraction: 'YYYY-MM-DD',       // set by hand, or to today when a stage is ticked done
    closeReason,                          // why a rejected/withdrawn/closed process ended
    logo,                                 // image URL
    glassdoorUrl, linkedinUrl, crunchbaseUrl, levelsUrl, blindUrl, comparablyUrl,
    // (older data may still hold indeedUrl / finderUrl: those fields were removed from the UI, values left alone)
    contacts: [{ id, name, role, phone, linkedin }],   // phone in international format
    status: 'interested'|'approached'|'active'|'rejected'|'withdrawn',   // 'active' shows as "In process"
    order: [stageId...],                  // this company's own stage order
    stages: { [stageId]: { enabled, done, comment, meeting: 'YYYY-MM-DDTHH:mm' } },   // enabled = applies to this company
    notes: [{ id, title, body }],
    action: { text, url, since },          // pending action ('' when none); since = day it was written
    actionLog: [{ id, text, url, since, done }],   // finished actions, newest first
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

## UI map

### Main screen
- **Sheet** (`views/sheet.js`, columns in `views/columns.js`): deliberately minimal.
  - Logo and Company are frozen on the left and read-only; clicking either opens the company page.
  - Movable columns: Progress (bar · % · "x/y · <last done stage> - done. next: <stage>", relevant stages only), Next meeting (earliest
    upcoming meeting on a relevant stage; amber for today/tomorrow), Last interaction (date + "x days ago", amber
    after 7 days) and Status. Drag a header to reorder them (both tables; remembered per browser).
  - ✕ deletes. Website, position and comments live on the company page only. Up to 1600px wide.
- **Statuses:** Interested (thinking of applying, grey stripe) · Approached me (they reached out, blue stripe) · In
  process · Rejected · Withdrew. Offer and "Closed / done" were dropped by the owner.
- **Rejected & closed** (rejected, withdrawn) move to a collapsible table below, with an editable Reason column in
  place of Next meeting. Changing the status moves the row.
- **Sorting:** click a header; again to flip. Empty values always go last. Last interaction and Progress start
  descending. Ties always fall back (owner's rule, fixed direction): next meeting (soonest first) → last interaction
  (most recent first) → status (Interested → Approached me → In process) → company name (A–Z).
- **Last interaction:** ticking a stage sets it to today; adding a company does not (owner's rule).
- **Progress popover** (`views/popover.js`): hovering a Progress cell opens the company's stage list. It stays open
  while focused or dragging, closes on Esc, outside click, scroll or mouse-out.
- **Search:** every word must match somewhere: all fields, contacts, research links, stage comments and notes.
- **+ Add Company** (`views/addCompany.js`): asks for the name and a status (defaults to Interested), then a loader (with Skip) runs `/api/lookup`, fills
  only empty fields and opens the company page.
- **Hiring Stages dialog** (`views/stagesDialog.js`): rename, reorder and delete shared stages; a switch for "on by
  default for new companies"; "Apply this order to all companies".
  - Deleting a stage that companies have data on (✓, meeting or comment, even if switched off — `stageUsage()`)
    shows a warning listing them and what each would lose. Clicking one opens it with the stage highlighted
    (`focusStageOnOpen`); "Delete anyway, lose this data" deletes after a second confirmation. A stage with no
    data gets a short confirmation. Recovery after a delete is only from `backups/`.
- **Bookmarks drawer** (`views/bookmarks.js`): 🔖 at the right end of the top bar. Add, edit inline, delete, drag to
  reorder. Hidden on company pages.
- **⤓ Back up now** (`views/backupButton.js`): flushes any pending save, then `POST /api/backup`.

### Company page (`#/c/<id>`, `views/detail.js`)
- **Header:** ← All, a big logo (click to paste an image URL — `views/logoEditor.js`; Enter saves, Esc restores,
  empty removes), the name, the status and "↻ Look up" (fills only empty fields).
- **Fields:** position, last interaction, Reason (when closed), website, careers link, comments.
- **Points of contact** (`views/contacts.js`): name · role · phone (international format) with 📞 (`tel:`) and
  WhatsApp Web buttons computed from it (local 05x numbers fall back to +9725x) · LinkedIn chat. WhatsApp links use
  `target="whatsapp"`, so they reuse one tab (a tab opened by hand can't be reused — browser limit). ＋ adds a
  contact, ✕ removes one (asks if it has data). Empty links are greyed out; clicking one focuses its field.
- **Stages** (`views/stageList.js`, shared with the popover): done ✓, a "when?" meeting (date + 24-hour time box;
  an invalid time turns red and isn't saved), comment, relevant
  switch (off = greyed and excluded from progress), reorder by ⋮⋮ drag or ↑↓, and "+ Add stage" (adds to the shared
  list; every company gets it, switched on only for the company it was added from).
- **Research** (`views/research.js`): 6 sites from `config.RESEARCH` (field, label, domain, tooltip). Hover a name
  for what the site is for; an empty field's 🔍 opens a Google `site:` search.
- **Pending action** (`views/action.js`, `model/action.js`): a box under the progress bar — what to do next plus an
  optional link (e.g. a scheduling page). "✓ Done" moves it to a collapsible "Done actions" log (date done, struck
  through, ✕ to remove). In the sheet, a company with a pending action gets a bold amber "⚑ Action" badge next to its
  name; hovering (or clicking) it opens a card with the action, the link, Edit (→ company page) and ✓ Done. Clicking
  the badge doesn't open the company. Done does not change Last interaction (not asked for). Searchable.
- **Notes** (`views/notes.js`): titled free-text sections; titles suggest stage names.

### Keys
`/` search · `B` bookmarks · `Esc` closes the popover, drawer or dialog, or leaves the company page.

### Saving
Every edit autosaves (350ms debounce); the top-right status says where. Without the server the page falls back to
`localStorage['jobTracker']` and says so in red.

### Saved in the browser only (`localStorage`)
`jobTrackerSort` (sort), `jobHuntCols` (column order), `jobHuntDrawer` (drawer open), `jobTracker` (data fallback
when there's no server).

## Backups

All in `user-data/`:

1. `data.backup.json`: the previous version, rewritten on every save.
2. `backups/auto-YYYY-MM-DD_HH-MM-SS.json`: there's no timer. On every `GET`/`PUT /api/data` (checked at most once
   a minute), if the newest automatic backup is 6+ hours old (time read from the file name), `data.json` is copied
   there. On a save this happens before writing. Automatic backups older than 7 days are deleted; any other file in
   `backups/` (e.g. `backups/manual/`) is never touched. Nothing happens while the app isn't used.
3. The ⤓ button forces a backup.

## Company lookup — what works and what doesn't

Learned on 2026-10-22 by running real lookups through the owner's running app:

- **Website:** DuckDuckGo Instant Answer → Wikidata P856 → guessing `name.{com,io,ai,co.il,…}` (kept only if the
  page title contains the name and it isn't a domain-for-sale page). A domain must look like the name
  (`plausible()`); directory sites are excluded by whole hostname (so `x.com` doesn't match `wix.com`).
- **Logo:** the homepage's best `<link rel=icon|apple-touch-icon>`, checked to be an image, else Google's s2
  favicon service.
- **Research links, most reliable first** (`server/lookup/index.js`; no API keys — the owner chose not to set any up):
  1. **Wikidata IDs** (`wikidata.js`, `WD_IDS`). In practice useful mostly for Glassdoor; coverage is patchy.

     | Property | Site | URL pattern |
     |---|---|---|
     | P4264 | LinkedIn | `linkedin.com/company/$1/` |
     | P8060 | Glassdoor | `glassdoor.com/Overview/-EI_IE$1.htm` |
     | P2088 | Crunchbase | `crunchbase.com/organization/$1` |
     | P10206 | Comparably | `comparably.com/companies/$1` |
     | P10146 | Levels.fyi | `levels.fyi/company/$1/` |
  2. **The company's own website** (`companySite.js`): the homepage plus `/about`, `/careers`, `/company`, scanned
     for links matching `SITES` (escaped `\/` in inline JSON is handled). No name check: a company's site only
     links to itself. Best source for LinkedIn.
  3. **Guessed addresses** (`probes.js`, `PROBES`): Levels.fyi, Comparably. Tries
     `name-with-dashes`, `namejoined`, `firstword`; keeps a page only if it's a 200 HTML page whose title names the
     company. Stops at the first 403/429/999 (the site blocks bots). Expectations, checked 2026-10-22: Comparably serves a JS shell ("comparably-companies-ui"), so it rarely verifies; Levels.fyi refused an
     automated fetch.
  4. **One DuckDuckGo search** for Glassdoor, only if it's still missing.
  5. **Naive addresses** (`probes.js`, `NAIVE`) for sites that block bots but have a fixed pattern — filled
     unchecked when nothing else found them (owner's call). Blind: `teamblind.com/company/<Name>` with the name as
     typed, spaces → dashes (`Fiverr` → `/company/Fiverr`). LinkedIn: `linkedin.com/company/<slug>/about/`,
     lowercase with dashes (`HoneyBook` → `/company/honeybook/about/`). Crunchbase: `crunchbase.com/organization/<slug>`,
     lowercase with dashes (`Fiverr` → `/organization/fiverr`). Comparably: `comparably.com/companies/<slug>`, same
     slug (`HoneyBook` → `/companies/honeybook`), used when the guessed-address check fails.

  Blind has no Wikidata property; Blind and Crunchbase block automated visits, so
  they mostly come from the company website (LinkedIn, Blind, Crunchbase, Comparably: else the naive address) or stay empty (the UI's 🔍 search link covers them). The terminal report
  says where each link came from.
- **Possible next step (needs a key, owner declined for now):** a search API restricted to one site per query —
  Tavily (1,000 free credits/month, no card) or Brave ($5 free credit/month, card required). Google's Custom Search
  API is closed to new users and shuts down 2027-01-01.
- **Scraping search engines failed and is deliberately minimal:**
  - DuckDuckGo's HTML endpoint answers the first automated search, then returns 202 bot checks.
  - Bing returns pages without result markup; Bing's `format=rss` ignores `site:`.
  - **Don't add parallel or bulk searching back.** It gets the owner's connection flagged with CAPTCHAs.
- **Glassdoor URLs** are always normalized to the Overview ("About") tab (`toOverview()`).
- A lookup takes roughly 5–20s. The client waits up to 60s and has a Skip button.
- **Testing:** there's no internet in the test environment; `test/server/fakeNet.js` answers requests with canned
  responses. In the browser, stub `/api/lookup` with Playwright's `page.route`.

## Running it

- `npm start`, then http://localhost:4317. Only one server can hold the port: `EADDRINUSE` means an older one is
  still running — stop it first (it may be writing to an old data location).
- macOS: `start.command`. A plain `#!/bin/zsh` script didn't find `node` on the owner's Mac (it comes from his shell
  profile), hence `#!/bin/zsh -il` and a fallback over common install folders. It keeps the window open after the
  server stops, so errors stay readable.
- On a freshly set-up Mac, Node may simply not be installed: `brew install node` (or the nodejs.org installer).
- If `npm start` hangs with no output at all, a likely cause (not confirmed) is a hidden macOS privacy prompt ("iTerm
  would like to access files in your Documents folder"): the process waits until it's answered.

## Testing recipe

- To try changes on realistic data without touching `user-data/`, use `npm run demo` (delete `.demo-data/` to reset).
- `npm test` runs everything under `test/` with `node:test` (no dependencies). Model tests import the browser's pure
  modules directly; server tests start the app on a random port against a temp folder (`test/helpers.js`); lookup
  tests use `test/server/fakeNet.js` instead of the internet.
- UI: run the server against a throwaway data folder (`PORT=4399`) and drive it with Playwright (Chromium). Stub
  `/api/lookup` with `page.route`. Treat any `pageerror` or console error as a failure.
- When stopping a test server, use `pkill -f '^node .*server/index[.]js'`: a plain `pkill -f server` also kills the
  shell running the command.

## Known gaps and ideas

- Adding a company whose name already exists creates a duplicate without warning.
- No button to look up logos and links for all existing companies at once.
- WhatsApp could open in the desktop app (`whatsapp://send?phone=`) instead of WhatsApp Web.
- From the owner's original list: save without the server (File System Access API), stage reminders, CSV export.
- Possible: an "archive stage" option, to hide a stage while keeping its data, instead of deleting it.

## Work log

Newest first.

- **2026-10-26 10:05:** Pending action per company (badge + hover card in the sheet, box + Done log on the company
  page). New fields `action`, `actionLog` (filled by `normalize()`, no migration). Demo data has one. The hover card
  is `position: fixed` in `#main` because `.sheet-wrap` scrolls (an absolute tooltip would be clipped).
- **2026-10-26 09:55:** Progress text names the last completed stage ("Applied - done. next: HR phone"; `progress()`
  now returns `last`). Sorting breaks ties by next meeting → last interaction → status → name (`model/sort.js`).
- **2026-10-22 22:10:** Company page order: Stages now come before Research.

- **2026-10-22 22:00:** LinkedIn falls back to the naive `linkedin.com/company/<slug>/about/` address.

- **2026-10-22 21:55:** Comparably falls back to the naive `comparably.com/companies/<slug>` address.

- **2026-10-22 21:50:** Crunchbase falls back to the naive `crunchbase.com/organization/<slug>` address.

- **2026-10-22 21:45:** Removed Startup Nation Finder: Startup Nation Central stopped operating it on 2026-08-31.
  Existing `finderUrl` values are left in saved data, no longer shown.

- **2026-10-22 21:40:** Removed the Indeed research field (owner: irrelevant to him). Existing `indeedUrl` values in
  saved data are left in place, just no longer shown, searched or looked up.

- **2026-10-22 21:35:** Blind falls back to the naive `teamblind.com/company/<Name>` address when not found.
- **2026-10-22 21:40:** Status picker in the Add company dialog, defaulting to Interested.
- **2026-10-22 21:30:** 24-hour time everywhere; the "when?" picker became date + typed 24-hour time.
- **2026-10-22 21:20:** Lookup: research links also from the company's own website and from guessed addresses
  (Levels.fyi, Comparably; Finder at first). Owner: Wikidata alone wasn't finding much beyond Glassdoor; no API keys for now.
- **2026-10-22 17:30:** Ported to a public GitHub repo: this history was rebuilt commit by commit from the session
  logs, with the code split into modules. Added a sample-data demo, README screenshots and a showcase README.
  Personal data stays out of git (`user-data/`, `.demo-data/` ignored).
- **2026-10-22 16:10:** `start.command` launcher for macOS; notes on starting the server on a fresh Mac.
- **2026-10-22 16:04:** Personal data moved to `user-data/` (`DATA_DIR` overrides it), so the app is portable and
  shareable without the owner's data. Owner's existing files were moved in by hand: `data.json`, `data.backup.json`,
  `backups/`, and the first day's dated safety copies → `backups/manual/`.
- **2026-10-22 12:44:** Full handoff pass on this file: UI map, keys, bus events, testing recipe, known gaps.
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
