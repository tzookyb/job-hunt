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
- **Status messages:** `emit('status', { text, error })` — always pass `error` as a boolean. `header.js` does
  `classList.toggle('err', error)`, and `toggle` with `undefined` *flips* the class (a success turned red).
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
| `server/cvs.js` | CV files: `POST /api/cvs` upload, `GET /cv/<file>` serving (UI: **CV sent** in the UI map). |
| `server/guard.js` | `checkRequest()`: refuses requests from other websites (see **Security**). |
| `server/ai/secrets.js` | AI API keys per provider: env → macOS Keychain → `user-data/secrets.json` (0600). `get/set/remove/info`, `hint`, `scrub` (see **AI lookup — spec**). |
| `server/ai/providers.js` | The provider table: **free providers only** (Gemini, Groq, OpenRouter, Mistral, Ollama), each with `kind`, `baseURL`, default `model` and its free-key guide (`free`, `privacy`, `steps`, `keyUrl`, `keyLink`); `publicView()` = what the page gets. |
| `server/ai/settings.js` | AI settings in `user-data/settings.json` (provider, model, webSearch); `view/update/resolve`. `providers` is injectable (tests point one at a fake server). |
| `server/ai/routes.js` | `GET/PUT /api/settings`, `POST /api/settings/test`, `GET/PUT /api/profile`. |
| `server/ai/providers/` | `index.js` (`complete({ kind, … })`, `ping`), `openaiCompatible.js` (every listed provider) (+ `parseJsonObject`), `errors.js` (`AiError`, plain-English provider errors, key scrubbed, timeouts). |
| `server/ai/lookup.js` | The AI lookup: gather (naive lookup + company pages + job post + profile) → one model request → `cleanAnswer` → `checkLink` per link → merged result. `SCHEMA` is what the model must return. |
| `server/ai/pageText.js` | `htmlToText`, `titleOf`, `jobPostingFromLd` (JobPosting JSON-LD), `fence` (stops page text from closing the prompt's `<page>` tags). |
| `server/lookup/` | Naive company lookup (see below). `index.js` builds it with an injectable `get`. |
| `public/index.html` | Page shell: header, `<main>`, dialogs, one module script. |
| `public/favicon.svg` | Crosshair-target icon (navy square, blue rings). |
| `public/css/` | `base.css` (tokens, buttons, header), `sheet.css`, `stages.css`, `detail.css`, `dialogs.css`, `drawer.css`, `action.css`, `cv.css`. |
| `public/js/main.js` | Composition root: calls each feature's `init()`, loads data, routes. |
| `public/js/store.js` | Owns the state; `load()`, debounced `save()` (350ms), `writeNow()`; server or localStorage. |
| `public/js/api.js` | `fetch` wrappers for the server API. |
| `public/js/bus.js` | Tiny pub/sub: `status`, `render`, `route`, `field`, `company:changed`, `stages:changed`, `meeting:changed`, `company:moved`, `popover:closed`. |
| `public/js/dom.js` | `$`, `$$`, `delegate()`, `autosize()`. |
| `public/js/router.js` | `#/c/<id>` → company page, otherwise the sheet. |
| `public/js/config.js` | Default stages, statuses. |
| `public/js/model/` | Pure logic, unit-tested: `normalize`, `company`, `stages`, `progress`, `meetings`, `search`, `sort`, `contacts`, `bookmarks`, `action`, `autoStatus`, `cvs`, `lookupResult` (what a lookup does to a company: fill empty, suggestions, AI notes, "job post changed?"). |
| `public/js/views/` | One file per UI feature, each with an `init()` that registers its own delegated listeners. |
| `test/` | `node --test` suites; `test/helpers.js` starts the app against a temp data folder. |
| `user-data/` | **All personal data** (git-ignored, created on start): `data.json`, `data.backup.json`, `backups/`, `cvs/`, `settings.json` (AI provider/model), `profile.md` ("About you"), `secrets.json` (AI keys, 0600, only off macOS or when the Keychain refuses). |

## Server API

| Endpoint | Behaviour |
|---|---|
| `GET /api/data` | Returns `data.json`, or `{}` if nothing has been saved yet. Runs the backup check. |
| `PUT /api/data` | Validates the JSON, runs the backup check, copies the current file to `data.backup.json`, then writes via temp file + rename (atomic). |
| `POST /api/backup` | Forces a backup now → `{ name }` (409 if there's no data yet). |
| `GET /api/lookup?name=X` | Naive lookup → `{ website, logo, links: { <field>: url }, source, log }`; prints a ✓/✗ report per site to the terminal. |
| `POST /api/cvs?name=<file name>` | Body = the raw file (15 MB max; pdf doc docx odt rtf pages txt md png jpg) → `{ file, size }`. Stored as `user-data/cvs/<sha256[0:16]>.<ext>`; same bytes → same file. |
| `GET /cv/<file>` | A stored CV, inline with its type + `nosniff`. Outside `/api/` on purpose (links, `<iframe>` and `download` can't send the header); only `<16 hex>.<known ext>` names are served. |
| `GET /api/settings` | AI settings → `{ provider, model, webSearch, hasKey, keyHint, keySource, keys: {<provider>: {hasKey, keyHint, keySource}}, providers: [{ id, label, needsKey, model, free, privacy, keyUrl, keyLink, steps }] }`. Never the key. |
| `PUT /api/settings` | JSON with any of `provider, model, webSearch, apiKey` (provider must be one of the listed free ones) (`apiKey: ''` removes that provider's key). All checked before anything is written; 400 on bad input. Returns the same shape as GET. |
| `POST /api/settings/test` | One tiny request with the **saved** settings → `{ ok: true, model, ms }` or `{ ok: false, model?, error }` (always 200; error scrubbed of the key, also logged as `[ai] test failed: …`). |
| `POST /api/ai/lookup` | Body `{ name, website?, careersUrl?, jobText? }` → `{ website, logo, links: {<field>: url}, log: {<field>: note}, source, ai }` (`ai` = the result schema in **AI lookup — spec**). 409 when no provider/key ("AI lookup is off…"). If the model call fails, still 200 with the plain results, `ai: null` and `aiError` (plain, scrubbed message). Closing the request cancels the model call. Prints one `[ai] Lookup …` line. |
| `GET /api/profile` · `PUT /api/profile` | `{ text }` ↔ `user-data/profile.md` (50 KB max). |
| `GET /*` | Static files from `public/`. |

App code and personal data are kept apart: everything personal is in `user-data/` (or `DATA_DIR`). Copy the repo
without it to give the app to someone (they start empty); copy `user-data/` alone to move the data.

The server listens on `127.0.0.1` only: it's a personal tool, not something to expose on a network.

## Security

Listening on `127.0.0.1` keeps other computers out, but **any website open in the owner's browser can still send
requests to `localhost:4317`**. `server/guard.js` runs before every route (`app.js`) and answers 403 unless:

- the `Host` header is `localhost`, `127.0.0.1` or `[::1]` on the server's own port (blocks DNS rebinding);
- every `/api/` request carries `X-Job-Hunt: 1`. A cross-site page can't add a custom header without a CORS
  preflight, and the server never approves one. `public/js/api.js` adds it to every call; tests use `api()` from
  `test/helpers.js`; `curl` needs `-H 'X-Job-Hunt: 1'`;
- when the browser sends `Origin` / `Sec-Fetch-Site`, they say the request came from this page.

A tab left open from before this change gets 403 until it's refreshed (the page shows "Refresh the page").
**Any new endpoint is covered automatically** as long as it lives under `/api/`. Never add CORS headers.

## Front-end conventions

- **Features plug in.** A view module exports render helpers plus `init()`, which registers delegated listeners on
  `#main` (`dom.delegate`). `main.js` lists the modules; nothing else has to change to add one.
- **Views talk through the bus**, not by importing each other:
  - `render` → redraw the current view; `route` ← emitted by the router (`{ detail }`);
  - `field` ← after any `data-f` edit (`{ c, field, el }`);
  - `company:changed` ← after a stage edit (views patch just that company); `meeting:changed` patches only the Next
    up cell (so the popover being typed in isn't redrawn);
  - `stages:changed` ← a stage was added from a company (`{ c }`); `status` → the save-status text.
  - `company:moved` ← a stage done / meeting set changed the status automatically (`c`); `popover:closed` ← the
    progress popover closed (the sheet moves a row then, not while the popover is being typed in).
- **`data-f="<field>"` inputs are bound automatically** by `views/fields.js`.
- **Model code is pure** (no DOM, no fetch) and lives in `public/js/model/`, so `node --test` can import it.

## Data model (`user-data/data.json`)

```js
{
  stages: [{ id, name, defaultOn, locked }],   // shared list; its order is the default for new companies
                                          // locked = the Application stage (exactly one; see below)
                                          // defaultOn = switched on for new companies (Applied + HR by default)
  companies: [{
    id, name, position, website, careersUrl, comments, createdAt,
    lastInteraction: 'YYYY-MM-DD',       // set by hand, or to today when a stage is ticked done
    statusSince: 'YYYY-MM-DD',           // day the status last changed (by hand or automatically); '' in older data
    closeReason,                          // why a rejected/withdrawn/closed process ended
    logo,                                 // image URL
    glassdoorUrl, linkedinUrl, crunchbaseUrl, levelsUrl, blindUrl, comparablyUrl,
    // (older data may still hold indeedUrl / finderUrl: those fields were removed from the UI, values left alone)
    contacts: [{ id, name, role, phone, linkedin }],   // phone in international format
    status: 'interested'|'approached'|'active'|'rejected'|'withdrawn'|'cold',   // 'active' = "In process", 'cold' = "Gone cold"
    order: [stageId...],                  // this company's own stage order
    stages: { [stageId]: { enabled, done, comment, meeting: 'YYYY-MM-DDTHH:mm' } },   // enabled = applies to this company
    notes: [{ id, title, body }],
    action: { text, url, since },          // pending action ('' when none); since = day it was written
    actionLog: [{ id, text, url, since, done }],   // finished actions, newest first
    cv,                                    // id in `cvs` of the CV sent with the application ('' when none)
    jobText,                               // a pasted job post ('' when none); wins over careersUrl for the AI lookup
    ai,                                    // read-only AI notes or null: the result schema in "AI lookup — spec" +
                                           // basis: { careersUrl, jobHash } = the job post they analyzed
  }],
  bookmarks: [{ id, title, url }],
  cvs: [{ id, file, name, size, type, addedAt }],   // CV library: file = stored name in user-data/cvs/, name = original
  updatedAt, stageDefaultsV2: true,
}
```

### Upgrades in `normalize()` (keep them all)

- **Locked Application stage (owner's rule, `lockApplicationStage()`):** exactly one stage has `locked: true` — the
  first time, the stage named like "Applied"/"Application", else a new "Application" stage (one-time,
  `migrated: true`). Every load keeps it first in the shared list and in every company's `order`, `defaultOn` and
  `enabled` for every company. It can't be renamed, switched off, moved or deleted (`deleteStage()` refuses;
  `moveBy`/`moveTo` take the fixed id), and it never counts for Next up (`nextMeeting(c, day, skip)`): its "when?"
  is the day he applied. Its ✓, "when?", comment and CV still work. The CV slot sits on it (`applicationStageId()`).

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
  - Movable columns: Progress (bar · % · "x/y · <last done stage> - done. next: <stage>", relevant stages only), Next up (earliest
    upcoming meeting on a relevant stage; amber for today/tomorrow, plain/unbolded once today's meeting time has
    passed — `meetingPassed()`), Last interaction (date + "x days ago", amber
    after 7 days) and Status. Drag a header to reorder them (both tables; remembered per browser).
  - Status select hugs the chosen option (`field-sizing: content`; column `width:1%`).
  - 🗑 (bin) deletes: `views/deleteDialog.js` asks Move to Rejected / Move to Withdrew (the current one hidden; never Gone cold, which is only automatic) or
    Delete for good. The company page's "Delete company" uses the same dialog. Website, position and comments live on the company page only. Up to 1600px wide.
- **Statuses:** Interested (thinking of applying, grey stripe) · Approached me (they reached out, blue stripe) · In
  process · Rejected · Withdrew · Gone cold (light-blue stripe). Offer and "Closed / done" were dropped by the owner.
- **Three tables, top to bottom** (owner, 2026-11-01): **In process** · **Interested & approached me**
  (collapsible) · **Rejected, withdrew & gone cold** (collapsible, an editable Reason column in place of Next
  up). Changing the status moves the row; empty collapsible tables are hidden.
- **Automatic statuses** (`model/autoStatus.js`, owner's rules):
  - Progress → In process: ticking a stage done or scheduling a meeting moves Interested / Approached me / Gone cold
    to In process. Rejected and Withdrew are never changed automatically. Moving a row while the progress popover
    is open waits until it closes.
  - Gone cold: an In process company with no upcoming meeting (the locked Application stage never counts as upcoming) whose last move is more than 7 full days ago (last
    move on day 0 → cold on day 8). Last move = latest of last interaction, `statusSince`, a meeting that has taken
    place, and the day it was added. Checked on page load (saves once if anything moved) and hourly while the tab
    is open. Picking a status by hand sets `statusSince`, so reviving a cold company gives it another 7 days.
- **Sorting:** click a header; again to flip. Each of the three tables keeps its own sort (owner, 2026-11-01). Empty values always go last. Last interaction and Progress start
  descending. Ties always fall back (owner's rule, fixed direction): next meeting (soonest first) → last interaction
  (most recent first) → status (Interested → Approached me → In process) → company name (A–Z).
- **Last interaction:** ticking a stage or finishing a pending action sets it to today; adding a company does not (owner's rule).
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
  the badge doesn't open the company. Done sets Last interaction to today (owner's rule). Rows without an action show a faint
  "+ Action" on hover that opens the card with fields (Enter/Save or a click outside saves, Esc/Cancel discards);
  the card's Edit uses the same fields. Searchable.
- **Notes** (`views/notes.js`): titled free-text sections; titles suggest stage names.
- **CV sent** (`views/cv.js`, `views/cvPreview.js`, `model/cvs.js`): a slot on the application stage row — the first
  stage whose name starts with "appl" (owner's is "Application"), else the first stage — in both the stage list and
  the progress popover. "📎 CV" opens a menu: upload a file, or reuse one from the library (newest first, "sent to …",
  👁 preview, ✕ forgets an unused entry — the file stays on disk), or remove it from this company. Dropping a file on
  the row uploads it; while a file is dragged over the page, the slot gets a dashed outline, and a file dropped
  anywhere else is swallowed so the browser doesn't navigate away. With a CV the slot is a chip; clicking it opens a
  **Quick Look–style preview** (owner asked for macOS-Space feel): PDFs in an iframe, images inline, other types
  get a Download fallback. Space / Esc / backdrop click closes and returns focus to the chip, so Space toggles it.
  Its keydown listener is on `window` in the capture phase so it runs before the popover's and the company page's Esc.
  (Once the user clicks into the PDF iframe, keys go to the PDF viewer — Esc/Space won't close until focus is back.)

### Keys
`/` search · `B` bookmarks · `Esc` closes the popover, drawer or dialog, or leaves the company page.

### Saving
Every edit autosaves (350ms debounce); the top-right status says where. Without the server the page falls back to
`localStorage['jobTracker']` and says so in red.

### Saved in the browser only (`localStorage`)
`jobTrackerSort` (sort per table: `{ active, open, closed }`; an older single `{ key, dir }` applies to all), `jobHuntCols` (column order), `jobHuntDrawer` (drawer open), `jobTracker` (data fallback
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

## AI lookup — spec (planned, not built yet)

Agreed with the owner on 2026-10-26. Goal: an AI-assisted company lookup that fills the links, writes a short
description of what the company does, judges how it fits the owner's experience and needs, and analyzes the job
post (requirements vs. the owner's profile). The user brings his
own API key for whichever AI provider he wants; **the key stays local and safe**. Build it step by step, one step
per commit, each with tests; the app must keep working exactly as now when no key is set.

**Security rules (non-negotiable):**
- **The key never reaches the browser.** The page sends it to the server once; the server never returns it (only
  `hasKey` and the last 4 characters). Never in `localStorage`, never in `data.json` (so never in backups), never
  in a log line or an error message (scrub provider errors before printing or returning them).
- **Key storage, first match wins:** `JOB_HUNT_AI_KEY` env var → macOS Keychain via the built-in `security` CLI
  (service `job-hunt`, account = provider) → `user-data/secrets.json` written with mode `0600`. Not in `data.json`,
  so the existing backups (which copy only `data.json`) never include it. **The key is never a command-line
  argument** (any local process can read argv with `ps`): `set` feeds `add-generic-password -U -s … -a … -w "<key>"`
  to `security -i` over stdin, quoted with `\` escapes, then reads it back to confirm (`-i` can exit 0 after a
  failed command). Reads use `find-generic-password … -w` (no secret in argv); exit 44 = not found. Keys must be
  printable ASCII without spaces, 8–1024 chars. If the Keychain refuses, the key goes to the file and a warning
  (no key in it) is logged. Saving to the Keychain removes any older copy from the file. Reads are cached in memory.
- **AI output is untrusted data.** Pages the model reads can contain prompt injection. The model gets no tools that
  write anything; it returns JSON against a fixed schema; the server validates it; the client fills only empty
  fields (`fillEmpty`) and renders everything through `esc()`.
- **Every URL the model returns is verified:** `https:` only, must match that site's regex in `research.js`
  (`SITES[].re`), and the site's own website must answer. Models invent LinkedIn/Glassdoor URLs confidently.
- Zero dependencies still holds: Node 18's global `fetch`, `child_process.execFile` for the Keychain.

**Providers — free tiers only** (owner's decision: anyone using the app must be able to get a key
without paying or adding a card). The table in `server/ai/providers.js` is the only list; there is no custom base
URL. Each entry has a short "how to get a free key" guide that the ⚙ dialog shows when the provider is picked
(what's free, 3 steps, a link to the key page opening in a new tab, a privacy note where the free tier has one).
Checked against the providers' pages on 2026-10-28 — free tiers change, re-check when touching this:

| Provider | Free tier | Key page | Default model |
|---|---|---|---|
| Google Gemini | Google account, no card; daily limits per model (Flash-Lite highest). Free-tier prompts may be used by Google outside the EU/UK. | aistudio.google.com/apikey | `gemini-3.5-flash-lite` |
| Groq | No card, ~1,000 requests/day | console.groq.com/keys | `openai/gpt-oss-120b` |
| OpenRouter | No card, 50 requests/day on free models. `openrouter/free` routes **only** to free models, so it can't cost money. Some free hosts may log prompts. | openrouter.ai/settings/keys | `openrouter/free` |
| Mistral | "Experiment" plan: no card, verified phone; requests may be used for training. | via Mistral's "activate and generate API key" guide | `mistral-small-latest` |
| Ollama | Runs locally, no key, nothing leaves the Mac | ollama.com/download | none (user types e.g. `llama3.1:8b`) |

Left out on purpose: Anthropic and OpenAI (paid only); Cerebras (a $5/30-day trial that needs a card); GitHub
Models (retired 2026-07-30); a custom base URL (could point at a paid or unknown endpoint).
All listed providers speak OpenAI-style Chat Completions, so there is one adapter, `openaiCompatible.js` (at the
preset `baseURL`), exporting `complete({ key, model, system, user, schema, signal }) → object`. A saved provider
that isn't listed reads as "none".

**Flow — keep the fetching, let the AI do the thinking** (not a pure replacement of the current lookup):
1. *Gather* (existing code): website, logo, Wikidata, plus the plain text of the homepage, `/about`, `/careers`
   (a few KB each, HTML stripped), **and the job post**: the text of `careersUrl` when it points at a specific
   posting, or the text the user pasted into `jobText` (see **Job post**).
2. *Analyze*: one request with that text + the owner's profile → summary, what they do, stage/size if stated, fit,
   proposed research links, sources. Works with every provider, including local models; cheap (one small request).
3. *Optional web search* (toggle, only for providers that offer it natively): to fill gaps. Costs more.
No key → behave exactly as today.

**Job post:** analyzed in the same single request as the company (no extra cost). Source, first match wins: the
`jobText` field (a "Paste job post" textarea on the company page; needed because LinkedIn needs a login and many ATS
pages — Comeet, Workday — render in JS) → the text fetched from `careersUrl`. If neither yields real text, `job` is
`null` and the UI says "Paste the job post to analyze it". Job post text is untrusted like any page. The text that
was analyzed is kept as `ai.job.snapshot` (capped ~20 KB) because postings disappear before interviews. If `position`
is empty, it's filled from `job.title`.

**Profile:** `user-data/profile.md`, edited in settings: CV highlights + what the user is looking for. The
settings screen says plainly that it's sent to the chosen provider. Keeps the app portable for colleagues.

**Result schema** (stored on the company as `ai`, added in `normalize()` with an empty default — no migration):
`{ summary, whatTheyDo, stage, fit: { matches[], gaps[], flags[] }, job, links: {<field>: url}, sources[], model, at }`
where `job` is `null` or `{ title, seniority, location, workMode, stack[], mustHave[], niceToHave[], matches[],
gaps[], prep[], flags[], source: 'pasted'|'url', snapshot }` — `prep` = topics to study for this role's interviews,
`flags` = red flags or unclear points worth asking about. `jobText` is a new company field ('' default in
`normalize()`).
Shown as an "AI notes" section on the company page with "↻ Re-analyze"; `at` + `model` say who wrote it and when.

**How results land on the company (owner's decisions 2026-10-28):**
- **Empty fields are filled** (website, logo, research links, `position` from `job.title`), as before.
- **Filled fields are never changed silently.** When a lookup has a *reliable* value that differs from what's there,
  a **suggestions dialog** opens after the lookup: one row per field, "old → new", a checkbox each (unticked), and
  "Apply selected". Reliable = website; links from Wikidata, the company's own site, a probe, the Glassdoor search,
  or a *checked* AI link; `position` from an analyzed job post. Never suggested: naive guessed addresses and
  unchecked AI links (they only fill empty fields). Same dialog for the plain lookup (no AI).
- **AI notes are read-only** (text, not inputs) and live only in `c.ai`, replaced on each re-analyze. **Comments and
  every other field the user writes are never touched** by a re-analyze.
- **Job post:** the Add Company dialog has an optional job-post link and a "paste the text instead" box, so the
  first lookup already analyzes the role. On the company page, adding/changing the job post doesn't re-run
  anything by itself: an **"Analyze this job post"** button appears (owner chose a button over auto-run — each run
  is one free-tier request).
- **If the AI call fails**, the lookup still returns the plain results plus `aiError` (shown in the loader and the
  AI notes); the previous `c.ai` is kept. A lookup never does worse than without AI.
- The loader allows 150 s for an AI lookup (60 s plain).

**API (all under `/api/`, so the guard covers them):**
- `GET /api/settings` → `{ provider, model, hasKey, keyHint, keySource, webSearch, keys, providers }`.
- `PUT /api/settings` → saves provider/model/webSearch; `apiKey` if present (empty string removes it).
- `POST /api/settings/test` → one tiny request to check the key works → `{ ok, error }`.
- `GET|PUT /api/profile` → `user-data/profile.md`.
- `POST /api/ai/lookup` `{ name, website?, careersUrl?, jobText? }` (the page sends the company's current fields; the server never reads data.json for this) → `{ website, logo, links, log, source, ai }`; the current lookup stays at `/api/lookup`.

**Steps:**
0. ✅ Request guard (`server/guard.js`) — done 2026-10-26.
1. ✅ Secret store (`server/ai/secrets.js`) — done 2026-10-26. `createSecrets({ file, env, platform, run, log })`
   → `get(provider)` (server use only), `info(provider)` → `{ hasKey, keyHint, keySource }`, `set` → `'keychain'|'file'`,
   `remove`. Not wired into the app yet (step 2 does that, with `file = <dataDir>/secrets.json`). Tests
   (`test/server/secrets.test.js`) use a fake `security` that tokenizes the `-i` line like the real one. **Not yet
   run against the real Keychain** — check on the Mac once step 2 exposes it. Step 2 must also assert the key never
   appears in an HTTP response.
2. ✅ Settings + profile endpoints and the ⚙ dialog — done 2026-10-28. Settings live in `user-data/settings.json`,
   **not `data.json`**: the page rewrites `data.json` wholesale on every save, so a server-side field there would be
   overwritten. `GET /api/settings` also returns `keys` (status per provider, so switching providers in the dialog
   shows the right key state) and `providers` (so the page doesn't keep its own copy of the table). Provider
   presets have **no default models yet** (step 3 adds them after checking the docs); the model is free text.
   Each provider shows its free-key guide (see **Providers**). Page: `views/aiSettings.js`, `css/ai.css`, dialog
   `#aiDlg` in `index.html`, `api.getSettings/putSettings/getProfile/putProfile`. The key field is write-only:
   never filled in, cleared when the dialog closes; empty on Save = keep the saved key. **Tests never touch the real
   Keychain**: `test/helpers.js` `startApp()` injects a file-only `createSecrets` (and returns `deps`).
3. ✅ Provider adapters + `POST /api/settings/test` + **Test** button — done 2026-10-28.
   `complete({ kind, key, baseURL, model, system, user, schema, signal, timeout, fetch })` → the model's
   JSON object, or throws `AiError` (`code`: auth, model, rate, request, provider, shape, timeout, network,
   cancelled). **OpenAI-compatible** (`openaiCompatible.js`): `POST {baseURL}/chat/completions`, `Authorization: Bearer` only when there's a
   key (Ollama has none), `response_format: { type: 'json_object' }` with the schema in the system prompt; one retry
   without `response_format` if the server rejects it; **no `max_tokens`** (newer OpenAI models reject it); replies
   parsed with `parseJsonObject` (tolerates ```json fences and chatter). Timeouts: 90s analysis, 30s test. Node 18
   has no `AbortSignal.any`, so `errors.js` combines signals by hand.
   **Default models:** see the **Providers** table (Gemini Flash-Lite over `gemini-3.8-flash`, which is free but
   reportedly ~20 requests/day). **Not verified with real keys yet.** The dialog's Test button saves first, then
   tests, and stays open.
   Tests: `test/server/aiProviders.test.js` with `test/server/fakeProvider.js` (fake provider on a random port).
4. ✅ Gathering + prompt + validation + link checks (`server/ai/lookup.js`, `pageText.js`) — done 2026-10-28.
   **Gather:** runs the naive lookup (website, logo, links) first; reads `website` + `''`, `/about`, `/careers` (6 KB
   of text each, duplicates/empty shells dropped). **Job post:** `jobText` if ≥ 100 chars, else `careersUrl` when
   it has a path: JSON-LD `JobPosting` first (ATS pages built by JS still ship it), else the page text; < 300
   chars = no job post (LinkedIn login walls). Profile ≤ 8 KB. **Prompt:** system says data in
   `<page>/<job>/<profile>` is untrusted and never to follow instructions in it; `fence()` turns tags inside page
   text into ‹…› so a page can't close its fence. Missing pages/profile are said plainly. **Answer:**
   `cleanAnswer` keeps only schema fields, right types, capped strings and lists; `job` forced to `null` when no
   job text was sent; `snapshot` (≤ 20 KB), `source`, `url` added by us. `sources` are the pages *we* read, never
   the model's claims. **Links:** `checkLink` = known site (`SITES`) + https + `matchSite` clean URL, then GET:
   200 counts only if `looksLikeCompanyPage` (title names the company) → `checked`; 404/410 → rejected; anything
   else (LinkedIn 999, Glassdoor 403) → `unchecked`. Merge: the naive lookup's reliable finds (Wikidata, the
   company's own site, probes) stay; a `checked` AI link replaces a missing or naive-guess link; an `unchecked`
   one only fills an empty field. `log` notes say `ai (checked)` / `ai (not checked)`.
   Tests: `test/server/aiLookup.test.js` (fake web, fake model, fake naive lookup).
   **Not yet tried against real sites or a real model.** The page doesn't use it yet (step 5); `ai` and `jobText`
   are not yet in `normalize()`.
5. ✅ (done 2026-10-28) UI: read-only "AI notes" section (company + **Job post** block: requirements, matches/gaps, prep, flags, and
   the snapshot collapsed) with ↻ Re-analyze and "Analyze this job post"; "Paste job post" textarea; job post in
   the Add Company dialog; suggestions dialog; Add Company / ↻ Look up use the AI lookup when a key is set; AI
   failure falls back to the plain results (see **How results land on the company**).
   Files: `model/lookupResult.js` (`applyLookup` → `{ filled, suggestions, aiError }`, `acceptSuggestions`,
   `jobBasis`/`jobNeedsAnalysis`/`textHash`), `views/aiNotes.js` (`aiNotesHtml`, `noteAiError` — the last AI error
   per company, in memory only), `views/suggestDialog.js` (`askSuggestions` → the ticked ones; `#sugDlg`),
   `api.aiLookup` (→ `{ off }` on 409/404 so `runLookup` falls back to `api.lookup`). `runLookup` in
   `views/addCompany.js` does it all: AI lookup (150 s) or plain (60 s) → `applyLookup` → loader message (lingers
   2.5 s with the AI error) → suggestions dialog. Company page: "Paste job post" (`<details>`, `data-f="jobText"`)
   under the job post link; AI notes between Stages and Research; editing `careersUrl`/`jobText` re-renders only
   the AI notes so "Analyze this job post" appears. Add Company dialog: `#newJob` link + `#newPaste` text.
   "Reliable" for suggestions = the server's `log` note doesn't say naive/not checked/not found (probe finds say
   "guessed address" but are verified). Tests: `test/model/lookupResult.test.js` (8). Checked in headless Chromium
   with a fake plain lookup and a fake model on Ollama's port (add with pasted job, position filled, read-only and
   escaped notes, suggestions unticked → only the ticked one applied, comments untouched, Analyze button after
   editing the job post, AI failure keeps old notes + shows the error, AI off → plain lookup). **Not yet run with
   a real model.**
6. Optional native web search per provider.

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

- **2026-11-01 15:40:** Merged the local AI/CV/delete-dialog work with the three-table sheet from `main`. Beyond the
  textual conflicts: `deleteDialog.js` looped over `CLOSED`, which now includes `cold` and has no button (crash on
  delete), so it has its own `MOVE_TO`, and it uses `setStatus()`; `isGoingCold` skips the locked Application stage.

- **2026-11-01 13:25:** Each sheet table sorts on its own (`jobTrackerSort` holds one sort per table).

- **2026-11-01 13:15:** Sheet split into three tables (In process · Interested & approached me · Rejected, withdrew
  & gone cold). New status `cold` ("Gone cold") and field `statusSince`; automatic status rules in
  `model/autoStatus.js`. Front-end only: refresh the tab. Existing In process companies already past 7 days go cold
  on the first load.

- **2026-10-28 12:00:** AI lookup step 5 (UI) + owner's decisions: filled fields change only through a suggestions
  dialog (unticked checkboxes, links shown without `https://www.`), AI notes read-only, comments never touched, job
  post in the Add Company dialog, "Analyze this job post" button (not auto), AI failure falls back to the plain
  results (`aiError`). New `ai`, `jobText` company fields (defaults in `normalize()`, no migration). 128 tests.
  Needs a server restart + tab refresh. Known, not from this change: the stage table overflows at phone width.

- **2026-10-28 10:40:** AI lookup step 4: `server/ai/lookup.js`, `server/ai/pageText.js`, `POST /api/ai/lookup`
  (body = the company's current fields, not an id: spec updated). 11 new tests (120 total). Server only; the page
  doesn't call it yet. Needs a server restart (no visible change).

- **2026-10-28 10:10:** AI lookup step 3: provider adapters (`server/ai/providers/`), default models per provider,
  `POST /api/settings/test`, a Test button in ⚙ AI settings (model field shows "Default: …"). 11 new tests (109
  total). Checked in headless Chromium on demo data against a fake OpenAI-compatible server (no provider, no key,
  wrong key → scrubbed error, good key → ✓). Needs a server restart + tab refresh.

- **2026-10-28 09:40:** AI lookup step 2: settings + profile endpoints and the ⚙ AI settings dialog
  (`server/ai/providers.js`, `settings.js`, `routes.js`, `views/aiSettings.js`, `css/ai.css`), 8 tests in
  `test/server/aiSettings.test.js` (incl. the key never appearing in any response, error, settings.json or
  data.json). Checked in headless Chromium on demo data (save, reopen, provider switching, bad base URL, remove key,
  key never in the DOM, phone width). Needs a server restart + tab refresh.

- **2026-10-26 14:30:** AI lookup step 1: `server/ai/secrets.js` + 11 tests (key off argv via `security -i`
  over stdin, 0600 file fallback, per-provider keys, env override, `hint`, `scrub`). Spec now also covers analyzing
  the job post (`jobText` field, `ai.job`). Not wired into the server yet, so no restart needed.

- **2026-10-26 14:20:** Locked Application stage (see Upgrades). 🔒 instead of the drag handle, no Relevant switch or
  ↑↓ on it in the stage list; read-only "🔒 Always first" row in Hiring Stages; dropping above it lands after it.
  Tests in `stages.test.js`, `sort.test.js`, `cvs.test.js`. Checked in headless Chromium on demo data. Front-end
  only: refresh the tab (the page saves the upgrade once).

- **2026-10-26 14:05:** Owner's tweaks: Status select hugs its text; bin icon (`BIN` in `views/common.js`) instead of
  ✕; delete opens `views/deleteDialog.js` (move to Rejected / Withdrew, or delete for good — sheet and company page);
  "Next meeting" header renamed "Next up", and a meeting whose time already passed today is no longer bold/amber
  (`meetingPassed()` in `model/meetings.js`, `nowStamp()` in `util.js`, test `test/model/meetings.test.js`). Checked
  in headless Chromium on demo data. Front-end only: refresh the tab.

- **2026-10-26 13:45:** CV per application (owner's request): drop or pick a CV on the application stage row, reuse
  earlier ones, Quick Look preview. New `server/cvs.js` (+ `cvDir` in config), `data.cvs`, `c.cv` (both defaulted by
  `normalize()`, no migration), `model/cvs.js`, `views/cv.js`, `views/cvPreview.js`, `css/cv.css`, tests
  `test/server/cvs.test.js`, `test/model/cvs.test.js`. `http.js` gained `readBuffer`. Checked in headless Chromium on
  demo data (upload, drop, reuse, preview, Space/Esc/backdrop close, popover). Needs a server restart + tab refresh.

- **2026-10-26 12:10:** Request guard (`server/guard.js`): 403 unless the Host is local, `/api/` calls carry
  `X-Job-Hunt: 1`, and Origin/Sec-Fetch-Site (if sent) are this page. Client and tests send the header. Wrote the
  **AI lookup — spec** section (planned feature, step 0 = this guard). Needs a server restart and a tab refresh.

- **2026-10-26 10:15:** Add/edit the pending action from the sheet ("+ Action" on row hover, Edit in the card).
  Done now also sets Last interaction to today.
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
