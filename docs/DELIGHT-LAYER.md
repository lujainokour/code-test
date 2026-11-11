# Delight layer (12 November 2026)

The delight layer adds tactile interactions and celebration moments on the existing light-blue and burgundy brand. It uses static CSS and JS with no dependencies. All motion is disabled under `prefers-reduced-motion`, and no information is conveyed by motion alone: every celebration also has text in an `aria-live` region. Every number comes from real saved state.

| # | Commit | What | Data source |
|---|---|---|---|
| 1 | `04b69a9` | **Interaction kit** (`css/interaction-kit.css`, `js/interaction-kit.js`): tactile buttons, ~4px card lift, staggered entrance once per container, count-up on first render only (the real value goes into `aria-label` at once), skeleton, aria-live toasts with an optional Undo, confetti/rocket helpers, per-account seen store. **Undo** applies only to deleting your own community post. `communityStore.undoDelete` restores the exact snapshot kept in memory, for the same author and tab, within 6 s, and only if the id wasn't re-created. | Community store; new key `codementor-delight-v1:<owner>` |
| 2 | `ccc1885` | **Getting-started checklist** on the Dashboard: language, placement (optional), first lesson, first test run, first passed task, community membership. Steps show done, current or locked, with a progress bar. The celebration (rocket + confetti, under 2 s) plays once per account, then the card collapses to "Setup complete". | `studentOverview` model (active language), `taskResults[].submittedAt`, community memberships |
| 3 | `7a6c232` | **Achievement unlock moments**: a seen list per account and language. The first visit records existing badges silently; a new unlock gets one toast and a one-time shine in My progress. | `progressInsights.achievements()` |
| 4 | `77f80ef` | **Lesson and level completion moments** on `lesson.html` and `level-assessment.html`. They diff progress on the existing `learning-progress-changed` event and reuse each page's own next link as the single primary action. | `pythonCurriculum.read()/completed()` |
| 5 | `54e772b` | **Admin dashboard**: glass cards with a solid fallback, stat count-up on first render, 7/30-day tabs only when dated records exist, a trend only when history predates the period, an application-status bar chart, and a grouped sidebar. | `platformStore.getStudents()[].createdAt`, `peerMentoringStore.applications()` (sample rows excluded) |
| 6 | `9e4d19c` | **Completion badge (local demo) printing reveal** (page `certificates.html`), triggered when `certificates.js` removes `body.certificate-locked`. The locked state is never animated. | Existing eligibility rules (unchanged) |

## Undo scope

Undo is offered only where restoring is real. It is **not** offered for:

- **Cancelling a booking or request:** the freed slot can be taken by another student.
- **Removing sample data:** removal may also delete real records built on top of the samples.

Both keep their existing confirmations.

## What was not changed

- Data models, existing storage keys, grading, placement rules, guards and mentor logic.
- `lesson.js`, `level-assessment.js` and `certificates.js`. The new modules only observe them.
- The admin sidebar regrouping is the one change to a protected file (`js/workspace-shell.js`). It's recorded in `docs/evidence/authorized-baseline-changes.json`.

Follow-up: student-facing wording now says "Completion badge (local demo)" everywhere and states that it is not a verifiable credential and is not issued by a server (see UPGRADE-REPORT.md).

## Verification

**Node:** `tests/delight.cjs` has 33 checks covering:

- the kit: toasts, Undo, count-up, reduced motion, seen store
- Undo correctness against the real community store
- checklist state, including placed-out and language isolation
- celebration once per account, with an account-switch guard
- unlock seen lists
- completion moments
- admin ranges and trends
- the completion badge (local demo) reveal

**Browser:** `tests/delight-browser.ps1` (headless Chrome, normal permissions) passed 17 of 17 checks with 0 uncaught JavaScript exceptions on its third run:

- **Run 1** failed because the harness wrote test data while the dashboard was open (fixed in the harness).
- **Run 2** exposed a real bug: My progress re-renders on `pageshow` and wiped the one-time shine. Fixed in `achievement-moments.js`, with a new Node check.

**Screenshots:** `docs/evidence/delight-dashboard-checklist-1440.png`, `delight-dashboard-complete-390.png`, `delight-admin-dashboard-1440.png`.

**Pending manual verification:**

1. Screen-reader announcement of toasts and completion moments.
2. Visual quality of the confetti, rocket and completion badge (local demo) print-in in a headed browser.
3. Lesson and level moments on the real lesson and quiz pages (covered in Node only).
4. The glass blur on browsers without `backdrop-filter` (solid fallback; untested).
