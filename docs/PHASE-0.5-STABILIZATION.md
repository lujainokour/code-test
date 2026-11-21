# Phase 0.5 — Stabilization and architecture decisions

Date: 2026-11-21. Scope: baseline integrity, test infrastructure, static-file security, backend design. **No migrations, no new features, no commits.** The approved decisions (extend Node + SQLite; keep demo and server modes strictly separate; verified companies publish publicly; keep the Admin redesign; operator-created admins) are the inputs.

## 1. Baseline integrity (task A)

Both protected files were byte-identical to the recorded baseline at `HEAD`, so every difference is from the Admin redesign.

| File | Diff vs HEAD | What changed | Removed lines |
|---|---|---|---|
| `js/admin-mentoring-monitor.js` | +13 / −4 | 4 summary tiles with icons (same `adminSnapshot()` data plus read-only `store.applications().length`), `id`s on two sections for tab anchors, tab highlight | 4 lines, each replaced by an equivalent line (stats container, two `<details>` that now also get an id) |
| `js/admin-sessions-workspace.js` | +89 / −1 | Summary tiles, status chart, list filters (sessions, bookings), tab counts, schedule tiles. New code is wrapped in `try/catch`, uses only read-only `getSessions/getBookings/getSchedule`, and does not change create, pause, delete, accept, decline or schedule handlers | 1 line (the bookings `filtered` computation), replaced by status filter + search/session filter + sort |

Behaviour change to disclose: the bookings list default order is now newest requested date first (it was store order). No store write, permission check, confirm/prompt flow or storage key changed. Verified with the greps for `store.*`, `localStorage`, `fetch`, `confirm`, `prompt` among added lines (only two read-only store calls).

Fix: `docs/evidence/authorized-baseline-changes.json` gained two entries (`Part 7`, accurate reasons including the sort change). The guard test and the baseline were **not** edited. `node tests/placement-store.cjs`: **29 checks pass** (was failing).

## 2. Community tests (task B)

Cause, verified: **the test harness, triggered by my own earlier UI change — not an application defect.** `js/community.js:616` registers `document.addEventListener("keydown", …)` (Escape closes the New Post dialog, added in the student redesign). `git show HEAD:js/community.js` has **0** such calls. The fake `document` in `tests/helpers/community-harness.cjs` and in `tests/community-store.cjs` had no `addEventListener`, so the script crashed at load, hiding every later check. (My earlier note that this was "pre-existing" was wrong; I am correcting it here.)

Fixes (no coverage removed):
1. `tests/helpers/community-harness.cjs`: fake `document` records `addEventListener` and has `fire()` (same shape as `fake-dom.cjs`). `community-store.cjs` got a no-op `addEventListener` on its inline document.
2. Once the crash was gone, the hidden checks failed for a **second, genuine reason**: the approved "own language group is open by default" behaviour (`js/community-store.js modeOf`) contradicts old test premises ("every group needs approval", test student's language defaults to Python).
   - `community-store.cjs`: the harness' default language is now a coming-soon language (`swift`), so the approval model it tests is unchanged.
   - `community-groups.cjs`: new test "own-language group is open without any request" (tab with its own language), then the approval-flow tests start from an **explicit administrator "approval required"** setting, which is the documented override. Two further approval scenarios (declined state, non-member prefill) set the same explicit setting for Python.
3. Real defect found while doing this (not fixed, needs approval, see §8): `setGroupMode(id, "approval")` is a **no-op** on an untouched language group, because the admin view reports the stored default as "approval" (`current === mode`). Consequence: an admin cannot opt a language group out of auto-open from the Admin page unless they open it first and then require approval. The test works around it and says so.

## 3. Static-file security (task C)

**Finding (P1 for any hosted use).** The Node server blocked only `server/ node_modules/ data/ package*.json` and dotfiles; everything else in the project folder was public: `docs/` (676 files, including the protected-baseline JSON and audit notes), `database/` (SQL, schema JSON, reports), `tests/`, `tools/`, `README.md`, `SOURCES.md`, `start-server.ps1`, and the `_backup_ui_redesign/` copies I created. No secrets were found in them, but they disclose the architecture, test fixtures, internal protections and old code. The loopback PowerShell dev server `start-server.ps1` was worse: it served *any* file under the root, including `data/codementor.db` and `.git`.

**Fix (allowlist).**
- `server/app.mjs` exports `isPublicPath(path)`; public = `/` , the root files `index.html dashboard.html company-dashboard.html teacher-dashboard.html manifest.json`, and anything under `assets/ css/ js/ pages/ vendor/`. Dot-segments, `..`, backslashes, double slashes, case variants (`/DOCS`), trailing dots (`/docs.`), encoded separators are all denied or fall outside the list.
- `start-server.ps1` applies the same allowlist.
- Not changed: `tests/serve.ps1` (test-only loopback server that must serve `tests/*.html` fixtures), and VS Code *Live Server* (third-party; it serves everything and is for development only).

**Verification.**
- New test `static files use an explicit allowlist…` (`tests/auth-server.test.mjs`): 29 denied paths (docs, database, tests, tools, backups, README, scripts, package files, db and WAL, `.git`, `.claude`, traversal and encoding variants) must not return 200; 8 permitted paths must return 200. The earlier test was kept.
- Compatibility crawl: **1885** local references in `pages/`, `css/`, `js/` and the four root pages were resolved against the allowlist, **0 blocked** (12 references point to files that were already missing on disk).
- Real run of `start-server.ps1`: permitted paths 200 (`/`, `/pages/auth/login.html`, `/css/style.css`, `/js/access-guard.js`, `/vendor/pyodide/pyodide.asm.wasm`, `/manifest.json`); denied 404 (`/docs/…`, `/database/…`, `/tests/…`, `/server/…`, `/data/codementor.db`, `/package.json`, `/README.md`, `/.git/config`, backups, `/start-server.ps1`, traversal).
- Deployment note: `_backup_ui_redesign/` should be deleted before release (it is no longer served, but it should not ship).

## 4. Demo / server separation (task E)

Current behaviour (`js/access-guard.js`): `serverStatus()` treats a **404 that is not JSON** as "no server" and silently uses browser-local demo behaviour; with a server present, `verifyServer()` already fails closed (network error → sign-in page; unconfirmed identity → cleared). The remaining silent fallback is: any deployment whose `/api` is unreachable *by routing mistake* looks like demo mode.

Strategy:
1. **One explicit mode, declared by the host, never inferred:** the Node server serves `GET /api/config` (and an `X-CM-Mode: server` header on pages) → `{mode:"server"}`. Static demo hosting serves a `config.js` stating `demo`. No marker = treated as server (fail closed).
2. **Server mode:** all persistence calls go through one client module (`js/api.js`). A failed request shows a visible error with Retry; it never writes to `localStorage` as a substitute and never reports success. Local demo stores are not even loaded.
3. **Demo mode:** current behaviour, but every page shows a persistent "Demo data — saved only in this browser" badge, demo records keep `sample:true` / `isDemo` labels, and demo keys are namespaced `cm-demo:*` so they can never be read by server-mode code.
4. **Never mixed:** switching modes in one browser profile ignores the other's keys; a one-time import of demo data into a server account is an explicit, user-confirmed action.
5. Production config (`NODE_ENV=production`) refuses to start without `ORIGINS` and `RP_ID` (already true in `server/config.mjs`) and will also set mode to `server` unconditionally.

## 5. Proposed backend architecture (task D) — proposal only, nothing implemented

**Identity.** `users.public_id` (UUID, already in SQLite and in `/api/auth/status`) is the canonical identity. Every new table references `users.id`; the browser only sees `public_id`. In server mode the local e-mail key (`codementor-learning-v1:<email>:*`) is replaced by the server user; in demo mode e-mail stays the key.

**Authorization (server-side, per route).** `requireAuth` + `requireCsrf` (existing). Roles from the session user, never from the request. Ownership rule: student rows are filtered by `user_id = session.user.id`. Company rows by `company_id` of the session user's company membership. Admin routes require `role='admin'` and write an audit row. Reads of other users' data return 404, not 403.

**Schema (SQLite, new migration `002_learning.up.sql` + `.down.sql`, additive).**
- `student_profiles(user_id PK→users, goal, experience, language, onboarding_completed_at, updated_at)`
- `enrollments(id, user_id, language, started_at, status)` UNIQUE(user_id, language)
- `lesson_completions(id, user_id, language, lesson_id, completed_at)` UNIQUE(user_id, language, lesson_id)
- `assessment_attempts(id, user_id, language, kind CHECK(placement|quiz), level, answers JSON, score, started_at, submitted_at)`
- `task_submissions(id, user_id, language, task_id, code, passed, total, results JSON, submitted_at, runner CHECK(client|server))`
- `project_submissions(id, user_id, task_id, repo_url, notes, status, submitted_at)`
- `companies(id, owner_user_id→users, name, industry, location, verification_status CHECK(unverified|under_review|verified|suspended), …)`
- `company_verification_events(id, company_id, from_status, to_status, reason, actor_user_id, at)`
- `opportunities(id, company_id, title, description, requirements JSON, status CHECK(draft|published|paused|closed), published_at)`
- `applications(id, opportunity_id, student_user_id, cover_note, status, created_at)` UNIQUE(opportunity_id, student_user_id)
- `training_tasks(id, application_id, key, status)` and `training_submissions(id, application_id, repo_url, notes, review_status, review_note, reviewed_at)`
- `audit_events(id, actor_user_id, action, subject_type, subject_id, reason, created_at)` (extends the existing auth `audit_log` pattern; admin decisions get rows here).

**API contracts (JSON, `/api/v1`, all `requireAuth`+CSRF on writes).**
`GET/PUT /me/profile` · `POST /me/onboarding/complete` · `GET /me/progress` · `POST /me/lessons/:id/complete` · `POST /me/assessments` and `POST /me/assessments/:id/submit` · `POST /me/tasks/:id/submissions` · `POST /me/projects/:id/submission` · `GET /opportunities` (published, verified companies only) · `POST /opportunities/:id/applications` · `GET /company/applications` · `PATCH /company/applications/:id` · `POST /company/opportunities` (draft) · `POST /company/opportunities/:id/publish` (**403 unless `verification_status='verified'`**) · `PATCH /admin/companies/:id/verification` (reason required for suspend/restore, writes both tables). Errors always `{error:{code,message}}`; the client shows the message.

**Migration.** Additive migrations only. A student's existing local progress is offered for import once after first server login (explicit button; server validates every item against the curriculum registry before storing; rejected items are reported). Demo data is never imported silently. Rollback: `002_learning.down.sql` drops only the new tables; auth tables untouched; the local stores keep working in demo mode.

**Grading integrity.** Initial slice stores client results with `runner='client'` (not tamper-proof, labelled). Later: server-side re-execution of submitted code in a sandbox before awarding evidence.

## 6. SQLite vs SQL Server for this repository

| | SQLite (`node:sqlite`, already used) | SQL Server (`database/`, 23 tables) |
|---|---|---|
| Fit now | Same process, same migration runner (`server/db.mjs`), WAL, FKs on, zero infrastructure | No Node driver or connection code; needs `mssql` dependency, credentials, network |
| Existing assets | Auth schema, 17 passing server tests | Rich, verified educational model (levels, lessons, quizzes) but a **3-level fixture vs 6 levels in the browser** and no code uses it |
| Data volume | Per-student rows are small; thousands of students are fine; single-writer limit is acceptable at this size | Overkill for the pilot; right if multi-instance or reporting grows |
| Operations | One file; backup = copy with WAL checkpoint; no HA | Backup, HA, roles, much stronger concurrency |
| Risk | Single node; rate limiter is in-memory | Two databases to keep consistent; identity split with SQLite auth |

Recommendation (decision 1 already approved): **SQLite for the first phases**, with the repository layer kept behind small data-access functions and SQL written in portable form (no SQLite-only features in business queries) so a later move to SQL Server (or Postgres) maps table-to-table. Use the SQL Server design as the long-term reference for curriculum entities; do not run two live schemas.

## 7. Proposed first end-to-end server-backed student workflow

**"Onboarding + lesson completion persist across devices" — one vertical slice.**
1. Sign up/in (existing) → `GET /me/profile` returns `onboarding_completed_at: null`.
2. Onboarding form (existing page) → `PUT /me/profile` + `POST /me/onboarding/complete`; the page reloads from the server, not from `localStorage`.
3. Dashboard calls `GET /me/progress`; opening a lesson and pressing complete calls `POST /me/lessons/:id/complete` (server validates the lesson id against the curriculum, rejects unknown ids, idempotent).
4. Sign in on a second browser: same profile, same progress. Another account sees nothing of it (test: 404 on foreign ids).
Acceptance: server tests for ownership and idempotency; browser test of two profiles; demo mode unchanged and visibly labelled; a forced API failure shows an error and writes nothing locally.

## 8. Decisions that still need approval

1. **Language-group auto-open vs admin control** — fix `setGroupMode` and the Admin page so an admin can explicitly require approval on any language group (today impossible without opening first), and show "Open for students of this language (default)" instead of "Approval required"? (Recommended: yes.)
2. **Company verification gate** — enforce "published opportunities require Verified" in server mode only (recommended), and in demo mode only warn?
3. **Where the mode flag lives** (`/api/config` header + `config.js`) — approve the strategy in §4.
4. **Import of existing local progress** into server accounts — one-time and explicit (recommended) or none?
5. **Delete `_backup_ui_redesign/`** and the stray `.claude/launch.json` files before release?
6. **Live Server** (port 5500) serves the whole folder: acceptable for development only?

## 9. Verification summary

See the final report for exact counts. Not run: the 39 PowerShell browser tests and `tests/passkey-browser.mjs` (need a browser driver / WebAuthn authenticator).
