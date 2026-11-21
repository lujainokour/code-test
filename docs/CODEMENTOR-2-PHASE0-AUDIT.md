# CodeMentor AI 2.0 — Phase 0 audit (read-only)

Date: 2026-11-21. Method: repository inspection, targeted reading of source, safe read-only diagnostics (test runs). Nothing was migrated, reset, committed or deleted. Labels: **IMPLEMENTED**, **PARTIAL**, **SIMULATED**, **LOCAL-ONLY**, **MISSING**.

## A. Executive summary

**Reality.** CodeMentor AI is a large, careful *browser-local* application (17k lines of JS, 80 pages, 31 Node test files + 39 PowerShell browser tests) with a **small server that does authentication only**. Every learning, company, admin and community record lives in `localStorage` / `sessionStorage` of one browser. The Express + SQLite server (`server/app.mjs`, 433 lines, 14 routes, all under `/api/auth` and `/api/passkeys`) stores users, passkeys, sessions, WebAuthn challenges and an auth audit log — nothing else. The SQL Server educational database (`database/`, 23 tables) is a **standalone deliverable that no code connects to** (`database/README.md`: "not connected"; no `mssql`/`tedious` anywhere in `server/`, `js/`, `package.json`).

**Strengths.** Honest labelling (SAMPLE/DEMO everywhere); strict stores with validation, ownership keys (`codementor-learning-v1:<email>:<key>`) and stale-write guards; good server auth (scrypt, CSRF, rate limits, CSP, sessions, WebAuthn, reversible migration, 16/16 server tests pass); deterministic "one next action" already exists on the student dashboard (`js/student-overview.js`); real in-browser code execution (Pyodide worker for Python, sandboxed worker for JavaScript); company → student → company loop (apply → accept → 4-task training → submission → review) really works locally (`js/company-store.js`).

**Highest risks (evidence-based).**
1. **No server-side authorization of any data.** Role gates for Student/Admin/Company pages are client JS (`js/access-guard.js`). In static mode a hand-written `sessionStorage` JSON grants the admin UI (I used exactly this to test). In server mode `verifyServer()` clears unconfirmed identities, but there is still no API that guards data, because no data API exists.
2. **No cross-device or cross-user truth.** Progress, applications, verification, memberships do not sync; two browsers show two realities.
3. **"Verified" has no evidence behind it.** Portfolio skills are a free-text field (`js/portfolio-publishing.js`: `public-skills` input). Progress counters are plain arrays in storage that a user can edit.
4. **AI Mentor is regex-rule based** (`js/mentor.js: getDemoReply`, comment "Later, replace this function with a backend request"), and `js/attempt-assistant.js` is a pure rule engine.
5. **A repo guard test now fails because of my earlier UI work** (see H-1).

## B. Implemented (verified in source)

| Capability | Evidence |
|---|---|
| Password auth, sessions, CSRF, reauth, rate limits | `server/app.mjs` routes `auth/*`; `server/security.mjs`; `server/passwords.mjs` (scrypt) |
| Passkeys (register/login/list/rename/delete) | `server/app.mjs:229-397`, `js/security-settings.js`, `docs/PASSKEYS.md` |
| Role column + reserved demo emails + operator-only admin creation | `001_auth.up.sql` (`role IN student/company/admin`), `server/app.mjs:151,156`, `server/cli.mjs create-admin` |
| Static server hides `server/ data/ node_modules package*.json` | `server/app.mjs:423-429`; test "static server never exposes server files or the database" passes |
| Python + JavaScript executable curricula (6+3 levels, 24+12 lessons, 12+6 tasks) | `docs/CURRENT-IMPLEMENTATION.md`, `js/python-worker.js`, `js/javascript-worker.js`, `js/language-catalog.js` (`status: ready` only for builtInContent) |
| Task grading by test cases (client) | `js/workspace.js execute(submit)` compares normalised output per test |
| Level quiz gate (≥70%) and unlock rules | `js/student-overview.js` (`unlock`), `js/level-assessment.js` |
| Placement banks, engine, store; optional placement + recommendation | `js/placement-banks.js`, `placement-engine.js`, `placement-store.js`, `docs/PLACEMENT-RULES.md` |
| One deterministic next action on dashboard | `js/student-overview.js` ("The ONE next action") |
| Company: opportunities CRUD, applications, status pipeline, chat, training (4 tasks), submission, review | `js/company-store.js` (`applyToOpportunity`, `updateStudentTraining`, `reviewStudentTraining`, `updateApplicationStatus`, messages) |
| Admin: company verification with history; suspend/restore need ≥5-char reason; flags | `js/company-store.js:107-254`, `js/admin-companies.js` |
| Admin: student account status | `js/platform-store.js setStatus` + `assertAccess` (blocks suspended students) |
| Admin: tutor review, sessions, bookings, community moderation + audit log | `js/peer-mentoring-store.js`, `js/admin-sessions-store.js`, `js/community-store.js`, `js/community-membership.js` |
| Local portfolio publish with explicit consent → showcase + company talent directory | `js/portfolio-publishing.js`, `docs/CONNECTED-WORKFLOWS.md` |

## C. Partially implemented

| Feature | Exists | Missing |
|---|---|---|
| Onboarding | 3 questions (language, experience, goal) saved per owner: `js/onboarding.js` | No completion flag/resume logic, no routing by experience/goal, `goal` and `experience` are stored but nothing reads them; server never sees it |
| Placement | optional attempt, result, recommended start level | Not required, not tied to onboarding answers; JS has no placement bank (`student-overview.js`: "No placement bank") |
| Next-best-action | one action on dashboard | Only learning/placement inputs; ignores applications, portfolio, projects, weak topics; no dismiss/defer; no reasons list |
| Weak-topic detection | `js/skill-analysis.js` from placement answers only | Not fed by quizzes/tasks |
| Final project | Task-manager project via code-review (`project-evaluation.js` just redirects) | No portfolio artifact link, no rubric beyond test pass |
| Certificates | "Completion badge (local demo)" (`js/certificates.js`) | Local-only, no issuer, no verification endpoint |
| Opportunity discovery | `js/student-career.js` lists Active opportunities | No requirement fields, no matching, no search by skill |
| Company verification | Admin sets status | Does **not** change visibility or gate publishing (only `Suspended` blocks posting/applying) |
| Student account suspension | blocks learning pages | **No reason, history or audit** (`setStatus` has none; `admin-account-access.js:141`) |

## D. Simulated / local-only

- **Everything outside `/api/auth` and `/api/passkeys`** is LOCAL-ONLY: keys `codementor-demo-*`, `codementor-learning-v1:<email>:*`, `codementor-platform-v1`, `codementor-company-store-v1`, `codementor-peer-mentoring-v1`, `codementor-community-v1`, `codementor-community-memberships-v1`, `codementor-student-accounts-v1`, `codementor-profile-v1`, etc.
- **One company workspace per browser** (`codementor-company-store-v1`); "multiple companies" exist only as labelled SAMPLE directory records (`admin-companies`). There is no multi-company isolation to audit because there is no multi-company data.
- **AI Mentor**: SIMULATED (regex answers in English/Arabic; JS curriculum returns `hints[0]`).
- **Payments, meeting links, e-mail**: not connected (stated in UI).
- **SQL Server database**: standalone; the app does not read or write it. Curriculum differs (SQL fixture: 3 levels; browser: 6).
- **In static mode** (`start-server.ps1`) the demo credential flow is the authority; `/api/auth/status` 404 is expected.

## E. Student journey (target 20 steps)

| # | Step | Entry / code | Data | State | Connected next? | Persist cross-device |
|---|---|---|---|---|---|---|
| 1 | Registration | `pages/auth/signup.html`, `js/signup.js`, `/api/auth/signup` (server) or local profile + `platformStore.registerStudent` | SQLite user (server mode) + browser profile | — | → dashboard/onboarding (`server-auth.js` redirect) | Account yes (server mode); learning data no |
| 2 | Login | `js/login.js`, `/api/auth/login`, passkeys | server session + `codementor-demo-session` | role mismatch rejected like bad password | yes | session only |
| 3-5 | Onboarding / goal / track | `pages/student/onboarding.html`, `js/onboarding.js` | `codementor-demo-onboarding` (owner-keyed) | none (no "completed" flag) | button → dashboard; skipping is possible | no |
| 6 | Placement | `placement-intro → question → review → results` | `placementStore` | in-progress / submitted | dashboard shows resume/result | no |
| 7 | Dashboard | `js/student-overview.js`, `js/dashboard.js` | derived read-only | current level, ring, one next action | yes | no |
| 8-9 | Path / lessons | `learning-path.html`, `lesson.html`, `js/lesson.js` | `lessons[]` in owner-keyed progress | completion by user action | → next lesson/quiz | no |
| 10-11 | Coding + execution | `workspace.html`, `js/workspace.js`, workers | `tasks[]`, `taskResults`, `submissions` | pass = all tests | → code review | no; **grading is client-side, editable** |
| 12 | Quizzes | `level-assessment.html` | best score | ≥70% unlocks next level | yes | no |
| 13 | Progress | `progress.html`, `js/progress-insights.js` | derived | achievements from real records | yes | no |
| 14 | AI Mentor | `mentor.html`, `js/mentor.js` | owner-scoped chat in storage | — | dead end (no link back to the lesson that triggered it except prefill) | no |
| 15 | Final project | `project.html`, `js/project.js` | task result | pass/fail | → certificates / virtual internship | no |
| 16 | Portfolio | `local-portfolio.html`, `js/portfolio-publishing.js` | projects + **free-text skills** | explicit consent | → showcase / company talent | no |
| 17-18 | Opportunities / apply | `career.html`, `js/student-career.js`, `companyStore.applyToOpportunity` | company store | Under Review → Interview/Accepted/Rejected | needs only a cover note: no skills/readiness check | no (same browser as company) |
| 19 | Training / delivery | `updateStudentTraining`, GitHub URL + notes | company store | To Do/In Progress/Done → Submitted → Changes requested/Completed | yes | no |
| 20 | Feedback / achievements | company review text; `progress-insights` achievements; certificates | stores | read-only after Completed | yes | no |

**Dead ends / confusing transitions:** onboarding answers (`experience`, `goal`) change nothing downstream; placement is never recommended from onboarding; Mentor has no handoff to hints for the exact failing test; portfolio → opportunities has no "which opportunity fits my evidence"; coming-soon languages can be chosen at onboarding (labelled, but no path).

## F. Company journey

| Step | Status | Evidence |
|---|---|---|
| Registration | PARTIAL — account via server (`role: company`) or local session; profile defaults | `server/app.mjs:147-163`, `js/server-auth.js:129` |
| Profile completion | IMPLEMENTED form; **no completeness rule** | `company-profile.html`, `companyStore.updateProfile` |
| Verification | IMPLEMENTED as admin decision + history; **no effect on what the company may do** except Suspended | `company-store.js:236-254`, `assertNotSuspended` |
| Opportunity create/publish/pause/close | IMPLEMENTED; suspended company cannot create/edit/republish but may close/pause (`:470`) | `addOpportunity`, `updateOpportunity` |
| Receive applications | IMPLEMENTED; duplicate and inactive-opportunity guards (`:499-509`) | |
| Review → interview → decision | IMPLEMENTED status pipeline (`updateApplicationStatus`) | |
| Training tasks / deliverables / review | IMPLEMENTED, state-guarded (`:516-524`, "read-only after Completed") | |
| Feedback to student | IMPLEMENTED (review text) | |
| Multi-company isolation | **N/A / MISSING** — single workspace per browser | `codementor-company-store-v1` |
| Server enforcement of any transition | **MISSING** | no company API |

Opportunities carry `skills` arrays (sample data) but applications do not compare them with the student.

## G. Admin journey and cross-role effects

| Action | Effect on affected user | Audit |
|---|---|---|
| Student suspend/enable (`admin-account-access.js`) | Student blocked by `assertAccess` | **None** |
| Company verification / suspend / restore / flag | Suspension blocks posting and applications; verification label has no student-visible effect | History per company (who: "admin", note) |
| Tutor application review | Student sees status in My teaching sessions | Stored on application (feedback) |
| Sessions / bookings | Student sees booking status | Booking reason fields; no unified log |
| Community access / moderation | Student gains/loses channel access immediately | Dedicated audit log (`community-membership.js`, `community-store.js`) |
| Learning content | Local drafts only; browser curriculum is built-in | None |

Disconnected: verification ↔ student experience; student suspension ↔ audit; admin decisions are not visible to the company/student as a unified timeline.

## H. Architecture & security risks (ranked)

- **H-1 (P1, caused by my work — fix needs your approval).** `tests/placement-store.cjs` fails: the *protected-baseline* guard (`docs/phase2-protected-baseline.json`) reports `js/admin-mentoring-monitor.js` and `js/admin-sessions-workspace.js` as changed without an entry in `docs/evidence/authorized-baseline-changes.json`. They changed because of the Admin UI redesign requested in this session (tiles, filters, icons). Fix: add authorised entries with reasons (or revert), not weaken the test.
- **H-2 (P0 for production, P2 for the current local demo).** All authorization is client-side; storage is not a security boundary (the repo says so). Any hosted deployment must not treat current role checks as security.
- **H-3 (P1).** No canonical identity across server and local stores: server `users.public_id` vs local records keyed by lower-cased e-mail. Rename/e-mail change or a second device orphans data.
- **H-4 (P1).** Learning progress/grades are client-written; "verified" labels (certificates, portfolio skills, talent directory) have no tamper-resistant evidence.
- **H-5 (P2).** Static server serves `database/`, `docs/`, `tests/`, `tools/`, README (no secrets found in what I read, but unnecessary exposure) and the `_backup_ui_redesign/` folder I created (540 KB of old copies). Block or remove for production.
- **H-6 (P2).** Rate limiter is in-memory, single process (`server/security.mjs`, noted in its own comment).
- **H-7 (P2).** Duplicated/competing data models: SQL Server schema vs browser stores vs SQLite auth; browser curriculum has 6 Python levels, SQL fixture 3.
- **H-8 (P2).** 3 community test files fail under the fake-DOM harness (`document.addEventListener is not a function`); they were already failing before my community change (same error on the backup copy) but they leave community logic partly untested.
- **H-9 (P3).** Admin sessions in static mode are `sessionStorage` JSON with `isDemo: true`; fine for a demo, misleading if hosted.

## Diagnostics actually run (read-only)

- `node --test tests/auth-server.test.mjs`: **16 pass, 0 fail.**
- All `tests/*.cjs` (28 files): **24 pass, 4 fail** — `community-store.cjs`, `community-groups.cjs`, `community-v2.cjs` (harness: `document.addEventListener is not a function`), `placement-store.cjs` (H-1).
- Not run: 39 PowerShell/Chrome browser tests and `passkey-browser.mjs` (need a browser driver/WebAuthn authenticator).
- `git status`: 125 modified paths pre-exist this audit (untracked/modified work from earlier sessions); nothing was changed by this audit except this document.

## I. Roadmap (dependencies → acceptance → priority)

1. **Repair guards (P1).** Resolve H-1 transparently. *Done when* `tests/placement-store.cjs` passes without edits to its assertions.
2. **Canonical identity + owner link (P1).** Use server `public_id` as the key for server-mode users; keep email-key fallback for static mode. *Done when* the same user on two browsers resolves the same id.
3. **Server-backed learning state, minimal slice (P1).** SQLite table(s) for `onboarding`, `lesson_completion`, `quiz_attempts`, `task_submissions` behind `requireAuth` + `requireCsrf`, owner = session user; browser store becomes cache. *Done when* progress survives clearing localStorage and a second user cannot read/write the first user's rows (test).
4. **Onboarding v2 (P2).** Completed flag + resume; route by experience (beginner → Level 1; otherwise offer placement); show only `ready` tracks as startable.
5. **Next-best-action v2 (P2).** Pure function `recommend(state) → {primary, secondary[], reasons[]}` with a rule table and unit tests; dismiss/defer state; reuse `student-overview.js` outputs.
6. **Skill evidence (P2).** Evidence rows (skill, source = quiz/task/project, timestamp, status) written only by graders; portfolio shows derived skills, free text stays labelled "self-reported".
7. **Opportunity requirements + transparent match (P2).** Optional `requirements[]` on opportunities; show matched / missing items with links; never auto-reject.
8. **Cross-role audit (P2).** Unified audit rows (actor, action, subject, reason) for student suspension, company verification, application decisions.
9. **Real AI Mentor (P3 until 3 is done).** Server route with secrets, retrieval from approved lessons, hint-first prompts, rate/cost limits; fall back to current rules when unavailable.
10. **E2E validation (continuous).** Add multi-user isolation tests at the API level.

## J. Recommended first implementation slice

**"Make the repository's own guards honest" — no new feature.**
- Files: `docs/evidence/authorized-baseline-changes.json` (add 2 entries, part + reason, for `js/admin-mentoring-monitor.js` and `js/admin-sessions-workspace.js`: *UI-only presentation hooks for the Admin redesign; no store/permission change*), optionally tests for the new presentation helpers.
- Expected behaviour: `node tests/placement-store.cjs` passes unmodified; the guard keeps protecting the other 38 files.
- Security impact: none; it restores an integrity control rather than loosening it (alternative: revert the two files).
- Tests: `placement-store.cjs`, `peer-teaching.cjs`, `admin-sessions-store.cjs`, `auth-server.test.mjs`.
- Rollback: revert the JSON file (single commit).
- Definition of done: 0 unexplained failures other than the 3 known fake-DOM community files; documented in `docs/`.
- Next slice after approval: roadmap item 3, starting with `onboarding` + `lesson_completion` only.

## K. Decisions needing product approval

1. **Source of truth for learning data:** extend the SQLite auth DB (recommended, smallest change) vs connect the SQL Server schema (heavy, different engine, curriculum mismatch).
2. **Do static/demo mode and server mode both stay supported?** (affects how much of the local-first behaviour must be kept.)
3. **Should company verification gate anything** (e.g., unverified companies cannot publish) or stay informational?
4. **Authorising the two protected-file changes** (H-1) vs reverting the Admin UI hooks.
5. **Admin account model in production:** operator-created only (current) or an invitation flow.
