# QA sweep: every page, every role

**Audience:** the project owner and whoever checks the frontend before a demo.
**Scope:** layout, visual and robustness defects only. No backend, storage, guard, grading, mentor or placement-rule changes.

## How the sweep ran

- **Harness:** [tests/qa-sweep-browser.ps1](../tests/qa-sweep-browser.ps1), run **once** in headless Chrome with normal permissions.
- **Coverage:** 93 page visits.

  | Role | Pages visited |
  |---|---|
  | Guest | Root pages, `pages/public`, `pages/auth`, `pages/services` |
  | Student | All of `pages/student` (seeded with SAMPLE progress), `pages/services`, root dashboard |
  | Admin | `pages/admin`, plus `pages/teacher` (those pages redirect to admin) |
  | Company | `pages/company`, root company dashboard |

- **Widths checked:** 1440, 1024, 768 and 390 px.
- **What was checked at each width:**
  - horizontal scroll, and elements that extend past the viewport;
  - touch targets under 44 px (at 390 px);
  - broken images and videos;
  - text clipped inside its box;
  - visible error messages;
  - pages with no stylesheet or an empty main area;
  - favicon and h1;
  - JavaScript exceptions, `console.error` calls and failed resource loads.
- **Raw data:** [docs/evidence/qa-sweep/results.json](evidence/qa-sweep/results.json). Regenerate the defect list with `node tools/qa-sweep-report.cjs --table`.
- **Screenshots:** `docs/evidence/qa-sweep/<role>-<path>-<1440|390>.jpg`, full page. Student pages are also copied to `docs/evidence/student-pages/<page>-after-<1440|390>.jpg`.
- **Clean across all 93 visits:**
  - no horizontal scroll at any width;
  - no uncaught JavaScript exceptions;
  - no broken images or videos;
  - no unstyled page.
- **Not re-run after fixing:** the fixes below were made after the single run. They are covered by Node checks ([tests/qa-sweep.cjs](../tests/qa-sweep.cjs), [tests/shell-safe-scripts.cjs](../tests/shell-safe-scripts.cjs)) but have **not** been re-checked in a browser. See *Pending manual verification*.

## Defects

Severity: **High** = a page is broken or unusable. **Medium** = a real usability or accessibility problem. **Low** = polish.

| # | Page(s) | Viewport | Defect | Severity | Status |
|---|---|---|---|---|---|
| 1 | student/placement-question, student/placement-results | all | Page stopped with "Cannot set properties of null (setting 'textContent')" for signed-in students. No question or results appeared. Cause: the shell removes `.onboarding-footer`, and the page script wrote into it. | High | **Fixed** (c8a2519). Minimal null check plus a regression test. The sweep's after-screenshots show both pages working. |
| 2 | student/onboarding, placement-intro, placement-question, placement-review, placement-results | all | Inside the shell, content sat flush against the sidebar, and at 390 px against the screen edges. Right-hand cards ran to the window edge. | Medium | **Fixed** (CSS 16.5: same padded frame as other workspace pages). Not browser re-verified. |
| 3 | student/onboarding, placement-intro, placement-review | all | The left column was drawn as one card with no padding, so its text touched the border. **Regression from student batch 6.** | Medium | **Fixed** (column no longer a card; note card padded). Not browser re-verified. |
| 4 | All auth pages, plus guest redirects to them | 390 | Video pause toggle 37 px and password show/hide 41 px tall. | Medium | **Fixed** (44 px phone floor in css/style.css). |
| 5 | student/dashboard, company dashboard, company-profile | 390 | Primary and outline buttons 42 px. | Medium | **Fixed** (same floor). |
| 6 | admin-bookings, company-applications, company-jobs (and teacher redirects) | 390 | Filter pills 41 px. | Medium | **Fixed** (same floor). |
| 7 | admin-schedule | 390 | "Remove slot" × buttons 27 px. | Medium | **Fixed** (44 × 44 px; the slot badge becomes inline-flex). |
| 8 | company-messages, company-talent, company-signup, services/community (student) | 390 | Chat input 21 px; native selects 19 px; community action buttons 39 px. | Medium | **Fixed** (same floor). |
| 9 | student/workspace | 390 | Run / Submit toolbar buttons 42 px (found in the student batch-3 run). | Medium | **Fixed** (cd9a568). Not browser re-verified. |
| 10 | 55 pages (admin, company, auth, student) | — | No favicon link. The root redirect page also caused a `/favicon.ico` 404. | Low | **Fixed on 64 pages** (including redirect stubs). **Left on 4:** auth/login, admin-login, teacher-login, teacher-signup are protected account files. |
| 11 | admin-account-access, admin-student-details, admin-level-content | all | "Student not found" / "Level content could not be loaded" when opened without an `?id` / course parameter. | — | **Not a defect.** This is the intended error state; these pages open from directory links. Check them manually with a real record. |
| 12 | company dashboard (guest) | all | A guest can open the company dashboard preview without signing in. The greeting reads "Welcome back," with no name. "Active postings" and "Student talent spotlight" show no empty-state text. Copy says "Verified university learners". | Medium | **Left.** Guard, behaviour and wording changes are outside this task. Owner decision needed. |
| 13 | auth/signup, student/placement-question | all | No h1; the main heading is an h2. | Low | **Left.** Changing the heading level restyles it, and tests select these headings. Recommend a follow-up. |
| 14 | student/progress | 390–1024 | Earned badge cards report overflowing content, probably the decorative shine. | Low | **Left.** Not visible in screenshots; check manually. |
| 15 | Placement pages | all | Brand header ("CodeMentor AI" + Save and exit) repeats inside the shell. | Low | **Left.** The shell keeps this header on purpose because it carries the page's exit action. |
| 16 | index | all | Language carousel track extends past the viewport. | — | **Not a defect.** Horizontal carousel; the page itself does not scroll. |
| 17 | admin-students | 390–1024 | Student table is wider than the viewport. | — | **Not a defect.** It sits inside `.student-table-scroll`. |
| 18 | student/project-evaluation | 390 | Redirects to code-review?task=task-manager; the code is wider than the screen. | — | **Not a defect.** The code block scrolls (`overflow: auto`). |
| 19 | admin/company pages with visually-hidden labels and headings | all | Reported as "clipped text". | — | **Not a defect.** They are clipped on purpose for screen readers. |

**Totals:** 19 grouped items (106 raw rows).
- Fixed: 10
- Left: 5
- Not a defect: 5

## Pending manual verification

Start the site with `powershell -File start-server.ps1 -Port 8080`, then open http://127.0.0.1:8080/. Check in this order:

1. **Placement flow, signed in as the demo student.**
   - Go to `pages/auth/login.html` → "Fill demo details" → Sign in.
   - Then `pages/student/placement-intro.html` → Start assessment.
   - Answer all 10 questions → Review answers → Submit.
   - Expect: questions and answers appear; results show the score ring and the large "Recommended start" badge.
   - At 1440 and 390, nothing touches the sidebar or the screen edge.
2. **Onboarding.** Open `pages/student/onboarding.html` at 1440 and 390. The left column text has padding; the note card has padding.
3. **Phone touch targets.** Use DevTools device mode at 390 px and check:
   - the auth pages' video toggle and password toggle;
   - `pages/student/workspace.html?task=receipt` toolbar;
   - `pages/admin/admin-schedule.html` remove-slot ×;
   - `pages/company/company-messages.html` chat input;
   - `pages/company/company-talent.html` skill filter.

   All should be at least 44 px tall and still lined up.
4. **Admin detail pages with real records.** Sign in as admin, open the student directory, and open a student and their account access. Open a course level from the course list.
5. **Keyboard and screen reader.** Tab through the placement question page, the coding workspace and the onboarding form. Focus rings should be visible and the order logical. Check one page with a screen reader (NVDA or Narrator).
6. **Arabic and long names.** Switch to Arabic where offered, and use a long display name. Check the learning report, profile and dashboard for overflow.
7. **Favicons.** The browser tab shows the burgundy cherry icon on student, admin and company pages.
