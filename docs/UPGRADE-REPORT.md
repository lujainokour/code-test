# Upgrade report — Parts 0–6 (11 November 2026)

This covers the quality upgrade on branch `main`, after `2428a9c` (Phase 2). The server track (server AI mentor, server grading, real accounts and feature flags) was **not started**. Everything is still browser-local: accounts, community, peer teaching and company records live in this browser's storage. Browser storage is not a security boundary.

## Summary

| Part | Commit(s) | Non-browser result after the part | Files in commit(s) |
|---|---|---|---|
| 0 — Secure the work | `7823333`, `b68b338`, `228f87b`, `1a69295`, `021d495`, `8e83ec3`, `b0273d0` | 183 passed / 0 failed in 10 suites; clean clone 0 missing, 0 untracked | 1 + 11 + 113 + 80 + 36 + 1 + 2 |
| 1 — Account gaps | `bb90ad9` | 205 / 0 in 11 suites | 12 |
| 2 — Community | `fc53bcf` | 231 / 0 in 12 suites | 9 |
| 3 — Peer teaching | `dbb1e99` | 249 / 0 in 13 suites | 6 |
| 4 — Admin companies | `8554f8b` | 264 / 0 in 14 suites | 7 |
| 5 — Premium (real data only) | `9bbf26d` | 275 / 0 in 15 suites | 13 |
| 6 — Verification & report | this commit | see below | report, README, evidence |

"Non-browser result" means `node tools/verify-local.cjs`: every `tests/*.cjs` suite, `node --check` on every file in `js/`, and a static audit of `href/src/action/poster` in every repository HTML page. No test was deleted or weakened. Two test-side changes affect existing checks, and both are explained under Part 0 and Part 1.

## Part 0 — Secure the work

**Classification.** At the start there were 48 modified tracked files and 330 untracked files.

- **Product source (committed):** all of `js/`, `css/`, `pages/` (admin, auth, company and teacher pages), the root redirect pages, `manifest.json`, media in `assets/`, the bundled Pyodide runtime in `vendor/pyodide/` (14 MB), and the 48 pending edits to tracked files.
- **Tests and tools (committed):** `tests/` (Node suites, browser harnesses, HTML suites), `tools/`, `docs/page-routes.json` (read by the verify tools) and `docs/check-progress.ps1`.
- **Documentation (committed):** untracked `docs/*.md`, `docs/database/` (atlas page) and `database/`. `database/reports/` is kept because `database/README.md` and `FINAL-VERIFICATION.md` link to those files as evidence.
- **Generated reports and screenshots (ignored, left on disk):** 140 files. These are `docs/*-results.json`, `*-js-errors.json`, `*-reference-results.json` and `docs/*.png`. Some older dated docs link to them, so those links do not resolve in a clean clone. Evidence that is meant to be committed now lives in `docs/evidence/`.
- **Temporary files deleted:** none. No file was clearly safe to delete.

`.gitignore` covers generated reports, local browser profiles, `node_modules/` and `.env`. Nothing was staged with `git add -A`.

**Two problems the clean clone found, and their fixes:**

1. With `core.autocrlf=true`, a fresh clone checked out CRLF line endings. That broke the byte-exact generated-docs check in `tests/phase0-honesty.cjs`. **Fix:** `.gitattributes` sets `eol=lf` and marks binaries as binary. The test was not changed.
2. `docs/phase2-protected-baseline.json` held SHA-256 hashes of CRLF or mixed-ending working files, so a clean LF checkout failed `placement-store.cjs`. **Fix:** each entry gained `sha256Lf`, the hash of the same content with CRLF converted to LF. It was computed only after the original raw hash matched. The check still fails on any content change.

**Proof.** A fresh `git clone` into a temporary folder ran `node tools/verify-local.cjs --tracked`. Result: 183/183, then 275/275 at the end; 108 JS files syntax-clean; 84 pages; 173 unique references; **0 missing; 0 referenced files untracked**. The final run is recorded in [evidence/upgrade-clean-clone.json](evidence/upgrade-clean-clone.json).

## Part 1 — Account gaps

- `signup.html` now states the truth: the account lives only in this browser, survives restarts, is not synced, and only a salt plus a PBKDF2 hash is stored.
- **Change password** checks the current password and enforces 12–256 characters. It re-derives the hash with a new random salt under a Web Lock and keeps all data, because data is keyed by email. It aborts without writing if the signed-in account changes during the operation, or if another tab changed the credential. The sample account's password cannot be changed.
- **Recovery:** no email exists, so `forgot-password.html` says so plainly. It offers "Reset this browser's account", which requires typing `RESET <email>`. This removes only that account and its `codementor-learning-v1:<email>:*` records, and clears the active profile only if it is that account. The sample account cannot be reset. `reset-password.html` explains that no links are sent.
- **Tests:** `tests/account-recovery.cjs` has 21 checks, using real WebCrypto and Web Locks. They cover a wrong current password, an account switch mid-operation (store and page) and a two-tab race.
- **Test-side change:** the Phase 2 guard "account files remain untouched" still checks every protected file. It now skips a file only if [evidence/authorized-baseline-changes.json](evidence/authorized-baseline-changes.json) lists it with a part and a reason. After Parts 1, 3 and 4, nine files are listed.
- **Browser test change:** the browser HTML suite `tests/original-pages-phase.js` asserted the removed reset simulation, so it now asserts the new flow.
- **Node quirk:** Node's Web Locks do not release a lock whose callback throws synchronously. Lock callbacks in the touched stores are now `async`, which behaves the same in browsers.

## Part 2 — Community

- **Data model:** a new `js/community-store.js`. The existing membership model is kept, with five channels: Python, JavaScript, General, Projects and Help. Old topic channels migrate on read: questions→help, notes and resources→general, projects→projects. Reading never rewrites storage.
- **Posts:** title, body, a code block with a language label and copy button, up to 5 tags, solved (author only), replies, Helpful/Thanks reactions, and edit (marked "edited") or delete of your own posts.
- **Finding posts:** search covers title, body, code and tags. Filters are tag, solved, not solved and unanswered. Sorting is latest, most helpful or most replies. Results are paged 10 at a time. The active language channel is highlighted.
- **Moderation:** members report posts. The admin queue offers hide, restore, remove and dismiss, each with a required reason. Removal erases the content and leaves a tombstone. Member removal requires a reason. Every action goes to an audit log shown on `admin-community.html`.
- **Safety:** all text is stored and rendered as plain text. No community script uses HTML parsing, and a test enforces this. Control characters are stripped. Limits are a 140-character title, 5,000-character body, 4,000-character code block and 2,000-character reply. The local rate limit is 3 posts and 10 replies per 5 minutes. There are no DMs, and `contactPolicy` never allows private contact (minors and unknown ages are always refused).
- **Notifications:** a badge counts replies to my posts and membership decisions, with "mark all as read".
- **Starter posts:** the old auto-shown "Community guide" starter posts are no longer created. Any already saved are migrated as removable SAMPLE posts.
- **Tests:** `tests/community-store.cjs` has 26 checks. They include rendering by the real page script into a fake DOM (XSS payloads stay text) and the admin page. `tests/community-browser.ps1` was updated for the new channels and the reason required for removal.

## Part 3 — Peer teaching

- **Decisions:** a pending application can be Approved, sent back with Changes requested, or Rejected with a reason. An approved one can be sent back with Changes requested. Rejected students can reapply, and their resubmission is no longer marked as sample data.
- **Studio:** `mentor-studio.html` shows the student's own status, the reviewer's note or reason, and next steps. It re-renders immediately on changes from other tabs. If the student is typing, it shows a refresh prompt instead, so the text is kept.
- **Seeding:** the admin page **no longer seeds on load**. "Load sample data" adds the set described under SAMPLE data below, idempotently. Sample sessions cannot be booked. "Remove sample data" deletes only SAMPLE records. If real records were built on top of them, it asks first, for example a session created after approving the sample application.
- **Tests:** `tests/peer-teaching.cjs` has 18 checks, plus the reusable `tests/helpers/fake-dom.cjs`. The existing 51 peer checks still pass. The `tests/admin-role-browser.ps1` check for automatic seeding was changed to the explicit button.

## Part 4 — Admin companies

- **Directory:** `company-store.js` has a new admin directory with its own storage key. It combines the live portal company (read-only, whitelisted fields) with SAMPLE companies. For each company it shows:
  - profile and contact person
  - created date (shown as "Not recorded" for the portal company, which does not store one) and last activity
  - verification status (Unverified / Under review / Verified / Suspended) with notes and history
  - review flags
  - opportunities with a funnel (applied / interview / accepted / rejected / completed)
  - candidates with **message counts only**
  - published talent profiles viewed (a counter added in the portal)
  - a timeline
- **Actions:** verify; start review; suspend and restore, each with a reason **and** an explicit confirmation (restore returns to the status before suspension); flag and clear flag.
- **Enforcement in `company-store.js`:** a suspended company cannot create, edit or reopen opportunities, and cannot open or send messages. It can still close a listing. Students cannot apply to it. A corrupt admin directory pauses posting (fails closed). The portal UI now shows these errors instead of failing silently.
- **Privacy:** the page never shows passwords or hashes, message text, cover notes, GPA or university. Unpublished student identities appear as "Private applicant".
- **Tests:** `tests/admin-companies.cjs` has 15 checks.

## Part 5 — Premium, real data only

- **Dashboard:**
  - **Continue where you left off**, with language and level.
  - **This week:** a 7-bar chart with a text list, plus a streak.
  - **Achievements:** first lesson, first passed task, each level really completed, and placement taken.
  - Activity comes **only** from timestamps already saved with lesson checks, task runs, quiz attempts and placement. Lesson completions have no saved time, so they are not counted, and the page says so. Placed-out levels never grant achievements; this is tested through the real placement flow. The insights code never writes storage.
- **Workspace:** "Explain the error", "Give me a hint" and "Review my code" prefill the mentor question with the current code and the last saved failing test, capped at 2,000 characters. The hand-off uses a 10-minute same-tab `sessionStorage` entry. Nothing is sent anywhere. The mentor's "Prepared responses · No live AI connection" badge is kept, and the same notice sits next to the buttons.
- **Demo tour:** `pages/admin/admin-demo-tour.html` is admin-guarded and linked from the admin dashboard. It lists the ordered walkthrough only when all three SAMPLE sets are loaded, and it never seeds.
- **Polish (limited):** focus-visible styles and empty states in the new components, `dir="auto"` on user-written community text, and responsive rules for 390 px. No new visual identity.
- **Tests:** `tests/progress-insights.cjs` has 11 checks.

## Part 6 — Verification

**Non-browser (final):** 275 passed, 0 failed, in 15 suites. All 108 JS files pass the syntax check. The static audit found 84 pages, 173 references, 0 missing. The same results came from a clean clone with `--tracked`: 0 untracked references.

| Suite | Checks | Suite | Checks |
|---|---|---|---|
| account-recovery (new) | 21 | peer-mentoring-store | 51 |
| admin-companies (new) | 15 | peer-teaching (new) | 18 |
| admin-sessions-store | 25 | phase0-honesty | 5 |
| community-store (new) | 26 | placement-policy | 16 |
| curriculum-migration | 8 | placement-store | 29 |
| language-page-guards | 8 | progress-insights (new) | 11 |
| language-publishing | 6 | service-access | 23 |
| language-storage | 13 | | |

**Browser (headless Chrome, normal permissions).** The first launch was not blocked, so the harnesses covering changed areas were run once each:

| Harness | Result |
|---|---|
| `tests/community-browser.ps1` | completed with every check passing, including two tabs and 390/1440 × light/dark with no horizontal overflow |
| `tests/admin-companies-browser.ps1` | 12 PASS, exit 0 |
| `tests/admin-role-browser.ps1` | 39 PASS, exit 0 (includes clicking the new peer "Load sample data") |
| `tests/peer-mentoring-browser.ps1` | 22 PASS, exit 0 |
| `tests/verify-structure.ps1 -HarnessFilter original-pages-phase.html` | **failed**, see below |

The `verify-structure` attempt failed twice:

- **Run 1** stopped before any check: this runner needs a server already listening on port 8765.
- **Run 2,** with `start-server.ps1 -Port 8765` running, completed the **dynamic reference audit: 240 page visits across guest, student and admin roles; 284 references; 0 missing; 0 JS exceptions**. The HTML suite itself scored 1/2: it stopped at its existing admin-analytics check ("Cannot read properties of undefined"). This failure is **pre-existing**: `docs/cleanup-2026-11-11-harness-results.json`, recorded before this work, shows the identical 1/2. So the new recovery-flow checks in that suite **did not run**. It was not retried.

## SAMPLE data versus real data

| Area | SAMPLE (explicit admin button, idempotent, removable) | Real |
|---|---|---|
| Community | 7 posts and 5 replies in Python, JavaScript and Help. Titles start with `[SAMPLE]`, authors are "Sample Learner N (SAMPLE)" at `@sample.invalid`. Migrated legacy guide posts are labelled SAMPLE. | Everything students post |
| Peer teaching | Pending application for `student@example.com` ("Demo Student (SAMPLE)"); approved fictional tutor with a published `[SAMPLE]` session, a confirmed booking and a completed booking with a 5★ review; rejected application with the reviewer's reason. Sample sessions are not bookable. | Real applications, sessions and bookings |
| Companies | 6 fictional "(SAMPLE)" companies on `.example` / `.sample.invalid` addresses, in every verification state, one flagged, with sample opportunities, applicants and counts | The company saved in the portal; verification decisions the admin makes |
| Dashboard / achievements | none | Computed only from the signed-in account's saved records |

## Not verified — pending manual verification

Serve the site with `powershell -NoProfile -ExecutionPolicy Bypass -File tests/serve.ps1`, then open <http://127.0.0.1:8765/>. Check each item at 390 px and 1440 px, in light and dark.

1. **Signup and account text.** Open `pages/auth/signup.html` and read the "Where your account is saved" box. Create a local account.
2. **Change password.** Sign in with that account and open `pages/auth/change-password.html`.
   - A wrong current password shows a field error.
   - A valid change shows "Password changed"; sign out and back in with the new password; progress is unchanged.
   - In a second tab, sign in as another account during the change; it must refuse.
3. **Recovery.** Open `pages/auth/forgot-password.html`.
   - A wrong phrase leaves the account in place.
   - `RESET <email>` removes only that account. Other accounts still sign in.
   - Open `pages/auth/reset-password.html?demo=x`; it shows the explanation.
4. **Community, rich posts.** As a student, open `pages/services/community.html`. As admin, approve Python at `pages/admin/admin-community.html`. Then:
   - Post with a code block, use **Copy code** (clipboard is untested anywhere) and tags.
   - Edit the post and see the "edited" mark; mark it solved.
   - Search, filter and sort; page with more than 10 posts.
   - Watch the notifications badge after another account replies.
   - Report a post. On the admin page, hide, restore and remove it, and check the audit log.
5. **Community sample data.** On `admin-community.html#sample-section`, Load twice (nothing is added the second time), then Remove.
6. **Peer teaching.** Load sample data at `pages/admin/admin-peer-mentoring.html`. Then:
   - As the sample student, open `pages/student/mentor-studio.html` and see Pending with next steps.
   - Reject the application in the admin tab; the studio updates without a reload.
   - In `pages/services/peer-mentoring.html`, the SAMPLE session shows and cannot be booked.
   - Remove the sample data.
7. **Admin companies.** At `pages/admin/admin-companies.html`:
   - Load the sample companies and check the summary cards and filters.
   - Open "View details" (funnel, candidates, timeline).
   - Suspend the portal company (confirm dialog). Then in `pages/company/company-jobs.html` posting is refused with the message, and in `company-messages.html` sending is refused.
   - Restore the company. Remove the sample companies.
8. **Dashboard.** At `pages/student/dashboard.html`, with Python and with JavaScript:
   - Continue card, This week chart with tooltip/focus per bar, streak and achievements.
   - After an applied placement, no level achievement appears for placed-out levels.
9. **Workspace quick actions.** Open `pages/student/workspace.html?task=student-profile`. Run failing tests, click "Explain the error", and check that the mentor question box is prefilled and the "No live AI" badge is still shown.
10. **Demo tour.** `pages/admin/admin-demo-tour.html` shows "Load sample data first" until all three sets are loaded, then the four steps.
11. **Earlier pending items.** The pending items from Phase 1 and 2 remain: the language switch and placement UI, back/forward and focus behaviour, and certificate locking in a real browser.
12. **Historical HTML suites.** Running `verify-structure.ps1` without a filter still includes historical suites known to fail (14 of 18 on 11 November, per the README). That includes `original-pages-phase` at its admin-analytics check, which blocks the new recovery checks in that file from running.
13. **Arabic text.** Rendering of Arabic in posts and notes was not checked.

## Decisions for you

- **Unlabelled company-portal demo data.** `js/company-store.js` still auto-loads a company named "CloudPeak Innovations" whenever the portal has no saved data. It comes with plausible student names (for example "Omar Khaled"), a real university name and fabricated GPAs, none labelled SAMPLE. This predates the upgrade and conflicts with the "no fake data presented as real" rule. Changing it affects the company portal and its browser harnesses, so it was left as is pending your decision. The admin directory labels such portal applicants "Portal demo applicant (not a real student)".
- **A real name as the demo identity.** The sample student account's display name in `js/login.js` and several fixtures is a real person's name. The new peer sample uses "Demo Student (SAMPLE)" instead. Changing the login identity touches many files and tests, so it was not done.
- **Data-handling rules for the server track.** Generated reports stay out of Git through `.gitignore`. The server track (Phases 3–6) should reuse the authorised-change list rather than the Phase 2 hashes.

Work stops here for review.
