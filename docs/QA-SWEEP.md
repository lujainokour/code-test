# QA sweep: every page, every role

**Audience:** the project owner and whoever checks the frontend before a demo.
**Scope:** layout, visual, access and robustness defects only. No backend, storage, grading, mentor or placement-rule changes. The company access guard was added at the owner's request.

## How it was checked

### Sweep 1 — every page

- **Harness:** [tests/qa-sweep-browser.ps1](../tests/qa-sweep-browser.ps1), run once in headless Chrome with normal permissions.
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
- **Screenshots:** `docs/evidence/qa-sweep/`, full page at 1440 and 390.
- **Clean across all 93 visits:**
  - no horizontal scroll at any width;
  - no uncaught JavaScript exceptions;
  - no broken images or videos;
  - no unstyled page.

### Sweep 2 — only what was fixed afterwards

- **Harness:** [tests/qa-sweep-2-browser.ps1](../tests/qa-sweep-2-browser.ps1), run once with normal permissions.
- **Result:** `SUMMARY passed=50 failed=0 skipped=0`, and no uncaught JavaScript exceptions.
- **Screenshots:** `docs/evidence/qa-sweep-2/`.
- **What it re-checked:**
  - **Company guard.** A guest is sent to company sign-in with `?next=`, including from the root company-dashboard link. A newly registered test company opens the dashboard, with empty states and accurate wording. After sign-out the guard applies again. Signing in returns to the requested page.
  - **Touch targets at 390 px:**
    - the video and password toggles on login, signup, company-login and admin-login;
    - company buttons, chat input, skill filter and filter pills;
    - admin remove-slot (44 × 44) and booking filters;
    - the coding workspace toolbar;
    - placement answer cards and question chips.
  - **Onboarding at 1440 and 390:** the left column is not one unpadded card, the note card is padded, and the content is clear of the sidebar and the screen edges.
  - **Placement flow at 1440 and 390:**
    - intro, question, review and results all clear the sidebar and screen edges;
    - the question and its answers render;
    - results show the score ring and the recommended-level badge;
    - no horizontal scroll.

## Defects

Severity: **High** = a page is broken or unusable. **Medium** = a real usability, accessibility or honesty problem. **Low** = polish.

| # | Page(s) | Viewport | Defect | Severity | Status |
|---|---|---|---|---|---|
| 1 | student/placement-question, student/placement-results | all | Page stopped with "Cannot set properties of null (setting 'textContent')" for signed-in students. No question or results appeared. | High | **Fixed** (c8a2519) with a regression test. Verified in sweeps 1 and 2. |
| 2 | student/onboarding and the 4 placement pages | all | Inside the shell, content was flush to the sidebar, and at 390 px to the screen edges. | Medium | **Fixed** (a222554). Verified in sweep 2. |
| 3 | student/onboarding, placement-intro, placement-review | all | The left column was drawn as one unpadded card. Regression from student batch 6. | Medium | **Fixed** (a222554). Verified in sweep 2. |
| 4 | All auth pages, plus guest redirects | 390 | Video toggle 37 px and password toggle 41 px tall. | Medium | **Fixed** (fcfa298). Verified in sweep 2 on login, signup, company-login and admin-login. |
| 5 | student/dashboard, company dashboard and company-profile | 390 | Buttons 42 px. | Medium | **Fixed** (fcfa298). Company dashboard verified in sweep 2. |
| 6 | admin-bookings, company-applications, company-jobs | 390 | Filter pills 41 px. | Medium | **Fixed** (fcfa298). admin-bookings and company-applications verified in sweep 2. |
| 7 | admin-schedule | 390 | Remove-slot × buttons 27 px. | Medium | **Fixed** (fcfa298, 44 × 44). Verified in sweep 2. |
| 8 | company-messages, company-talent, company-signup, services/community | 390 | Chat input 21 px; selects 19 px; community buttons 39 px. | Medium | **Fixed** (fcfa298). Chat input and skill filter verified in sweep 2. |
| 9 | student/workspace | 390 | Run / Submit toolbar buttons 42 px. | Medium | **Fixed** (cd9a568). Verified in sweep 2. |
| 10 | 55 pages, plus a `/favicon.ico` 404 | — | No favicon link. | Low | **Fixed on all pages.** 64 in fcfa298 / fd5a351 / 9400193 / a222554. The 4 protected sign-in pages followed in 5546bf3 with owner approval, and a test proves they changed only by that link. |
| 11 | admin-account-access, admin-student-details, admin-level-content | all | "Not found" message when opened without an `?id` / course parameter. | — | **Not a defect.** This is the intended error state; check it manually with a real record. |
| 12 | Company workspace (guest) | all | A guest could open the company pages. The greeting could end in a bare comma. Empty sections had no message. Copy claimed "Verified university learners", "verified university student portfolios" and "All Verified Skills". | Medium | **Fixed** (78e4db1), in four parts: the guard redirects guests to company sign-in with a return target; empty states added; greeting fixed; wording made accurate. Covered by `tests/company-guard.cjs` and sweep 2. |
| 13 | auth/signup, student/placement-question | all | No h1; the main heading is an h2. | Low | **Left.** Changing the heading level restyles it, and tests select these headings. Recommend a follow-up. |
| 14 | student/progress | 390–1024 | Earned badge cards report overflowing content, probably the decorative shine. | Low | **Left.** Not visible in screenshots; check manually. |
| 15 | Placement pages | all | Brand header ("CodeMentor AI" + Save and exit) repeats inside the shell. | Low | **Left.** The shell keeps this header on purpose because it carries the page's exit action. |
| 16 | index | all | Language carousel track extends past the viewport. | — | **Not a defect.** Horizontal carousel; the page does not scroll. |
| 17 | admin-students | 390–1024 | Table wider than the viewport. | — | **Not a defect.** It sits inside `.student-table-scroll`. |
| 18 | student/project-evaluation | 390 | Redirects to code-review?task=task-manager; the code is wider than the screen. | — | **Not a defect.** The code block scrolls. |
| 19 | Pages with visually-hidden labels and headings | all | Reported as "clipped text". | — | **Not a defect.** They are clipped on purpose for screen readers. |

**Totals:** 19 grouped items.
- Fixed and browser-verified: 11 (items 1–10 and 12)
- Left (Low): 3
- Not a defect: 5

## Pending manual verification

Start the site with `powershell -File start-server.ps1 -Port 8080`, then open http://127.0.0.1:8080/.

1. **Keyboard and screen reader.** Tab through:
   - `pages/student/placement-question.html`;
   - `pages/student/workspace.html?task=receipt`;
   - `pages/student/onboarding.html`;
   - `pages/auth/company-login.html`.

   Focus rings should be visible and the order logical. Check one page with NVDA or Narrator.
2. **Real phone.** On a phone, open the auth pages, the coding workspace and the company pages. Tap the password toggle, the remove-slot × (`pages/admin/admin-schedule.html`) and the company filters.
3. **Company return target with the sample company.**
   - As admin, use "Load sample company data" (`pages/admin/admin-companies.html`).
   - As a guest, open `pages/company/company-applications.html`.
   - Sign in with "Fill sample details".
   - Expect to land back on applications.
4. **Admin detail pages with real records.** Open a student and their account access from the student directory, and a level from the course list.
5. **Arabic and long names.** Use a long display name, and Arabic where offered. Check the learning report, profile and dashboards for overflow.
6. **Low items 13–15** above, if you want them addressed.

**Not covered by either sweep:** pages at 1024 and 768 px after the fixes (sweep 2 checked 1440 and 390), and the sample-company sign-in path (sweep 2 used a newly registered test company).
