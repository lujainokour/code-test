# Student Cycle — improvement plan (workflow-first, backend-ready)

Date: 2026-11-21. Status: **plan for review. Nothing in this plan is implemented.** No backend phase, no migration, no commit.
Scope of this document: the Student cycle (Register → Onboarding → Placement → Learn → Quiz → Practice → Progress → Mentor → Project → Portfolio → Opportunities → Training handoff). Company and Admin cycles get their own plans after this one is approved; their touch points are listed where they matter.

Evidence labels: **[code]** read in the repository, **[inferred]** concluded from code but not exercised in a browser, **[test]** from a test run.

---

## 0. Ground rules for every change (backend-ready)

1. **Three layers, no exceptions for new work**
   - `js/domain/*.js` — pure functions and state machines. No DOM, no storage, no `fetch`. Input: plain objects. Output: plain objects or typed errors. Node-testable.
   - `js/data/*.js` — repositories with one interface per aggregate (`LearningRepository`, `PlacementRepository`, `PortfolioRepository`, …). First adapter: **demo adapter** over the existing `cmStorage` facade. Later adapter: **API adapter** with the same method names. Pages never call `localStorage`/`cmStorage` directly.
   - `js/ui/*` (existing page scripts, thinned) — read from a repository, call domain functions, render. No business rules.
2. **Explicit demo storage.** Demo records keep their current owner-scoped keys (`codementor-learning-v1:<email>:*`) and are exposed only through the demo adapter. Every page that reads demo data shows the existing "demo / saved in this browser" wording. Server mode (later) never reads demo keys (decision approved in Phase 0.5).
3. **Every write carries an expected `revision`** (the pattern `placementStore` and `updateStudentTraining` already use). Mismatch → typed error `conflict`, UI says "reload". This makes the later `If-Match`/409 contract free.
4. **One error shape everywhere:** `{ code, message, details? }` with codes `validation | not_found | forbidden | conflict | unavailable | locked`. Pages show `message` and never fake success.
5. **No evidence, no claim.** Any label such as "verified", "passed", "completed" is derived from stored evidence records, never from a button alone. Self-reported items stay labelled self-reported.
6. **Nothing is deleted or rewritten silently.** Migration of existing local blobs is read-only normalisation on read (v1 → v2 view), with the original kept.

---

## 1. Current-state snapshot (actual code)

| Aspect | Reality | Evidence |
|---|---|---|
| Student pages | 31 pages in `pages/student/` + community, career, requests | `pages/student/*.html` |
| Progress record | One JSON blob per owner and language: `{version:1, lessons:[id], tasks:[id], assessments:{levelId:{score,lastScore,answers,bestAnswers,kind,submittedAt…}}, taskResults:{taskId:{passed,total,cases,code,submittedAt}}, submissions:{…}}` — **no revision field** | `js/student-overview.js validLearning`, `js/level-assessment.js:63`, `js/workspace.js:264` |
| Who writes the blob | At least four page scripts read-modify-write it whole: `lesson.js`, `level-assessment.js`, `workspace.js`, `workspace-support.js` | [code] |
| Level rules | Level complete = every lesson id present **and** quiz best score ≥ 70; level unlock = previous complete (or placement start level); placed-out is never counted as completed | `js/python-curriculum.js:22-40` |
| Lesson completion | Two ways: the "mark complete" button (no evidence) or passing the lesson exercise (`topic-exercise-run`) | `js/lesson.js:238, 263-277` |
| Quiz | Answer key lives in the page data; only best score + last score + answers are stored (no attempt list); labelled "local demo" | `js/level-assessment.js:61-66` |
| Coding grading | Client runs code in a worker (Pyodide for Python, sandboxed worker for JavaScript), compares normalised output with test cases, stores per-case results | `js/workspace.js:269-303`, `docs/CURRENT-IMPLEMENTATION.md` |
| Next action | Pure-ish function in `student-overview.js` (one primary action, premium-aware); getting-started checklist in `getting-started.js`; review plan from failures in `learning-support.js reviewPlan` | [code] |
| Subscription | Demo plan: free Levels 1–5, premium demo above; enforced in lesson/dashboard code | `js/subscription-store.js`, `lesson.js:276` |
| Mentor | Regex rules (EN/AR keywords); for JavaScript returns the first stored hint; separate rule-based attempt assistant for the coding workspace | `js/mentor.js getDemoReply`, `js/attempt-assistant.js` |
| Project | "Study Task Manager" (Python) passes via the same task grading; **not connected to the portfolio** | `js/project.js`, `learning-report.js:61` |
| Portfolio | Local portfolio lists (a) a fictional **C#** "School Management System" virtual internship (self-reported) and (b) submitted company training projects; skills are free text | `js/portfolio-publishing.js:5-14`, `js/virtual-internship-store.js` |
| Opportunities | Student applies with a cover note only; application stores no skills or evidence | `js/company-store.js:499-509`, `js/student-career.js` |
| Certificates | "Completion badge (local demo)" from lessons + quizzes + tasks of the foundation levels | `js/certificates.js:14-22` |
| Tests | 28 Node files (stores, policies, some UI via fake DOM) and 39 browser (PowerShell) tests | `tests/` |

**Test coverage by step (from `grep` of the test tree):**

| Step | Node tests | Browser tests | Verdict |
|---|---|---|---|
| Onboarding | language-storage, language-page-guards | dashboard/layout | thin (no rule coverage: there are no rules) |
| Placement | placement-store (29), placement-policy | several | good |
| Lesson completion | only indirectly (attempt-assistant, delight) | lesson-next-browser, learning-upgrade | **logic is DOM-bound, not unit-testable** |
| Quiz scoring / unlock | indirect (progress-insights, language-storage) | certificates, dashboard | **no direct test of 70% gate** |
| Coding grading | attempt-assistant (engine), company-guard | learning-support, qa-sweep | grading itself not unit-tested |
| Project | curriculum-migration | submission-completion | thin |
| Virtual internship store | **none** | student-pages-browser | gap |
| Portfolio publish | service-access | connected-flows | partial |
| Apply / training | admin-companies | connected-flows | partial |
| Certificates | delight, phase0-honesty | certificates.ps1 | partial |

---

## 2. Cross-cutting design (needed by every workflow)

### 2.1 Unified state machines (domain layer)

| Aggregate | States (→ transitions) | Today | Change |
|---|---|---|---|
| Onboarding | `not_started → in_progress → completed` (editable later) | no completed flag | add `completedAt`, `skippedAt` |
| Placement attempt | `in_progress → submitted → superseded` | `in-progress/submitted` exists | add `superseded`, keep revision |
| Lesson | `not_started → completed(evidence: exercise_passed \| self_marked)` | boolean in an array | store evidence kind + timestamp |
| Level | `locked → available → in_progress → completed \| placed_out` | derived, correct | move to domain module unchanged |
| Quiz | list of attempts `{n, score, passed, answers, at}` | best + last only | keep best/last as derived |
| Coding task | `not_started → attempted → passed` | `taskResults` + `tasks[]` | same data, accessed through repository |
| Project | `locked → available → attempted → passed → in_portfolio` | stops at passed | add `in_portfolio` link |
| Portfolio item | `draft → included(consent) → published → unpublished` | partly (local publish) | unify sources |
| Application (student view) | `Under Review → Interview → Accepted \| Rejected`, training `To Do/In Progress/Done → Submitted → Changes requested/Completed` | exists | read via repository; matching info added |

### 2.2 Data contracts (future API, also used now by the demo adapter)

All timestamps ISO-8601 UTC. `revision` integer starting at 1. Language ids from `languageCatalog`; only `ready` languages accept learning writes.

```jsonc
// StudentProfile  GET/PUT /me/profile
{ "language": "python", "experience": "beginner|basics|practising", "goal": "foundations|problem-solving|...",
  "onboarding": { "status": "not_started|in_progress|completed", "completedAt": null }, "revision": 3 }

// LearningProgress  GET /me/progress?language=python   (read model)
{ "language": "python", "revision": 12,
  "lessons": [ { "id": "l1-1", "completedAt": "...", "evidence": "exercise_passed|self_marked" } ],
  "quizAttempts": [ { "levelId": 1, "attempt": 2, "score": 75, "passed": true, "answers": [..], "submittedAt": "..." } ],
  "taskResults": [ { "taskId": "receipt", "passed": 3, "total": 3, "submittedAt": "...", "runner": "client", "code": "..." } ],
  "placement": { "attemptId": "...", "status": "submitted", "recommendedStartLevel": 3 } }

// Commands (each returns the new progress.revision; 409 conflict if stale)
POST /me/lessons/{lessonId}/complete        { "evidence": "exercise_passed|self_marked", "expectedRevision": 12 }
POST /me/quizzes/{levelId}/attempts         { "answers": [..], "expectedRevision": 12 }     -> { "score": 75, "passed": true }
POST /me/tasks/{taskId}/results             { "passed": 3, "total": 3, "cases": [...], "code": "...", "runner": "client", "expectedRevision": 12 }

// Placement
POST /me/placement/attempts  ·  PUT /me/placement/attempts/{id} (answers, expectedRevision)  ·  POST .../{id}/submit

// Portfolio
GET /me/portfolio  -> [ { "id", "source": "learning_project|virtual_internship|company_training", "title", "url", "verification": "automated_checks|self_reported|company_reviewed", "visibility": "private|public" } ]
PUT /me/portfolio/{id}  { "visibility": "public", "consent": true, "expectedRevision": 2 }

// Opportunities (student side)
GET /opportunities?status=published            -> opportunities incl. requirements[]
GET /opportunities/{id}/match                   -> { "met": [..], "missing": [ {"requirement","howToFix":{"href","label"}} ] }
POST /opportunities/{id}/applications           { "coverNote": "...", "portfolioItemIds": [..] }
```

Errors: `{ "error": { "code": "conflict", "message": "...", "details": {...} } }` (HTTP 400/403/404/409/423/503).

### 2.3 Demo-storage isolation
- Add `js/data/demo-adapter.js` as the only module allowed to touch `cmStorage`/`localStorage` for student aggregates.
- Add a lint-style test (`tests/layering.cjs`) that fails if a file under `js/ui` or page scripts references `localStorage|sessionStorage|cmStorage` for the migrated aggregates. Introduce this *after* each aggregate is migrated, not before.
- Visible "Demo data — saved only in this browser" strip on student pages (reuse the existing demo notice style).

### 2.4 Error handling convention
One `js/ui/errors.js` helper: `showError(region, err)` maps codes to messages and focus behaviour (the pattern already used by `lesson.js showError`). Pages stop swallowing errors with generic "Try again" texts where a typed message exists.

---

## 3. Workflow plans

Each section: **Current → Missing → UX problems → Improvements → Files → API → Acceptance → Tests.**

### S1. Account and onboarding
- **Current:** local signup (`js/signup.js`, PBKDF2 profile) or server signup (`/api/auth/signup`); onboarding saves `{language, experience, goal}` (`js/onboarding.js`) to `codementor-demo-onboarding`; no completion state; the form autosaves on every change.
- **Missing:** `experience` and `goal` change nothing downstream; no resume/completed flag; no routing by experience; `Save & exit` goes to the home page, not back to a resumable step.
- **UX problems [inferred]:** a student can pick a coming-soon language and get a different button label ("View content availability") but no guided alternative; autosave-on-change with no "Saved" state per field; no explanation why questions are asked.
- **Improvements:** (1) domain `onboarding.js`: `status`, `completedAt`, `recommendStart({language, experience})` → `{ startLevel, suggestPlacement }` (beginner → Level 1 with placement optional; practising → placement recommended). (2) Explicit "Finish setup" button sets `completed`; edit later from Profile. (3) Coming-soon languages: list the two ready languages as alternatives; store the wish as `notifyMe` (already exists in `learning-language.js`). (4) Dashboard redirects to onboarding only when `not_started` and never again after `completed`.
- **Files:** `js/onboarding.js`, new `js/domain/onboarding.js`, `js/data/demo-adapter.js`, `pages/student/onboarding.html`, `js/getting-started.js`, `js/student-overview.js`, `js/profile.js`.
- **API:** `GET/PUT /me/profile`, `POST /me/onboarding/complete`.
- **Acceptance:** completing onboarding persists `completedAt`; reload never re-asks; beginner and practising produce different recommendations; coming-soon choice offers ready alternatives; no data written for another owner.
- **Tests:** new `tests/onboarding-domain.cjs` (rules table), extend `language-storage.cjs`; browser: signup → onboarding → dashboard (extend `student-journey-browser.ps1`).

### S2. Placement
- **Current:** banks for Python and JavaScript, engine, store with revisions, results, recommended start level, optional (`placement-*`).
- **Missing:** not linked to onboarding answers; "placed-out" levels are not shown with their evidence in the report beyond the roadmap.
- **UX problems [inferred]:** long wait between starting and recommendation context; dashboard wording only says "optional".
- **Improvements:** use `recommendStart` to show a one-line reason ("Because you chose *practising*, we suggest a 10-minute check"); show topic-level result → review plan seeds (already `skill-analysis`).
- **Files:** `js/placement-store.js` (unchanged logic), `placement-intro` page, `student-overview.js`.
- **API:** as in 2.2.
- **Acceptance:** recommendation text comes from domain code with a stated reason; no change to placement scoring or stored attempts (existing 29 checks stay green).
- **Tests:** keep `placement-store.cjs`, `placement-policy.cjs`; add reason-text cases.

### S3. Lessons and the learning path
- **Current:** `learning-path.html` → `module.html` (level) → `lesson.html`; complete via button or exercise; unlock rules in `python-curriculum.js`; premium gate at `canAccessLevel`.
- **Missing:** completion has no evidence; no lesson prerequisites inside a level; the dashboard copy says "answer the lesson check to save your progress" while the button also saves.
- **UX problems [inferred]:** button completion contradicts the copy; position text says "ABOUT n MINUTES" but no time tracking; mentor link carries `?level&lesson` but the mentor page ignores the lesson in rule answers except JavaScript.
- **Improvements:** (1) domain `lessons.js` with `completeLesson(progress, lessonId, evidence)` — idempotent, rejects unknown ids, rejects locked levels. (2) Lessons *with* an exercise require `exercise_passed`; lessons without may use `self_marked`, labelled "self-checked" in the report. (3) Make the dashboard text match the rule. (4) Keep the existing level/unlock functions, moved into domain unchanged.
- **Files:** `js/lesson.js`, `js/module.js`, `js/learning-path.js`, `js/python-curriculum.js` (functions re-exported), new `js/domain/learning.js`, `js/data/learning-repository.js`.
- **API:** `POST /me/lessons/{id}/complete`.
- **Acceptance:** completing twice stores one record; unknown/locked → typed error; evidence recorded; report shows "exercise passed" vs "self-checked"; no existing lesson is un-completed.
- **Tests:** new `tests/learning-domain.cjs` (complete, idempotent, locked, premium, unknown id); keep `lesson-next-browser.ps1`.

### S4. Quizzes (level assessment)
- **Current:** per-level quiz, ≥70% unlocks, best + last score stored; labelled local demo; answer key in page data.
- **Missing:** attempt history, per-topic breakdown stored, retry guidance; answers' correctness is checkable in page source (acceptable for demo, must be flagged).
- **UX problems [inferred]:** after a fail the "Learn from this attempt" panel exists but there is no direct link to the specific lessons for the missed questions (check `level-assessment.js:69`).
- **Improvements:** (1) domain `quiz.js`: `scoreAttempt(questions, answers)` → `{score, passed, perTopic, missedLessonIds}`; (2) store attempts (append-only list) and derive best/last; (3) link missed questions to lessons; (4) in the data contract mark `runner/grader: "client"` so the future server can re-grade.
- **Files:** `js/level-assessment.js`, new `js/domain/quiz.js`, `js/data/learning-repository.js`.
- **API:** `POST /me/quizzes/{levelId}/attempts`.
- **Acceptance:** 69% fails and 70% passes; attempts append; best score never decreases; missed-lesson links resolve to real lessons.
- **Tests:** `tests/quiz-domain.cjs` (boundaries 69/70, retake, per-topic).

### S5. Coding practice and grading
- **Current:** worker execution, per-test comparison, per-case results saved; `practice.html` lists tasks with filters; attempt assistant (rule-based) explains failures.
- **Missing:** grading logic is inside `workspace.js` (DOM-bound); no unit tests; the attempt assistant claims are rule-based (already labelled).
- **UX problems [inferred]:** unclear difference between "Run" and "Submit"; time-limit failure messaging depends on runner.
- **Improvements:** extract `gradeSubmission(task, runnerResults)` and `normalizeOutput` into `js/domain/grading.js` (behaviour identical), keep runners untouched; repository stores `runner: "client"`.
- **Files:** `js/workspace.js`, `js/workspace-support.js`, new `js/domain/grading.js`.
- **API:** `POST /me/tasks/{id}/results` (server later may re-run in a sandbox and set `runner:"server"`).
- **Acceptance:** same pass/fail as today on all 18 tasks (golden test); no change in runner security (CSP/network block untouched).
- **Tests:** `tests/grading-domain.cjs` with golden cases per task; keep `attempt-assistant.cjs`.

### S6. Progress, next action, weak topics
- **Current:** `student-overview.js` model; one primary action; review plan from failed tasks/quizzes; achievements derived from real records.
- **Missing:** inputs ignore project/portfolio/applications; no dismiss/defer; no stated reason list.
- **UX problems [inferred]:** the primary action and the getting-started card can show different next steps.
- **Improvements:** move the action decision into `js/domain/next-action.js` as `recommend(state)` → `{ primary, secondary[≤2], reasons[] }` with a rule table and priority order; add project and portfolio steps after path completion; add local `dismissedUntil` per action id. Dashboard and getting-started both read the same function.
- **Files:** `js/student-overview.js`, `js/getting-started.js`, `js/dashboard.js`, new `js/domain/next-action.js`.
- **API:** read-only `GET /me/next-action` (derived server-side later from the same rules).
- **Acceptance:** golden table of states → expected primary; at most one primary and two secondary; dismissed action does not reappear for its window; no random or fabricated values.
- **Tests:** `tests/next-action.cjs` (table-driven).

### S7. AI Mentor (honest scope)
- **Current:** rule-based answers; the page already states it is a demo.
- **Missing:** no real model; no lesson-grounded retrieval.
- **Proposed in this phase:** *no new AI*. Only (1) make the label consistent ("Rule-based helper"), (2) pass lesson/task context through a domain function so that a later server route can use the same input, (3) isolate `getDemoReply` behind `MentorService.reply({context, question})` so the API adapter can replace it. Real LLM work stays after the data foundation.
- **Files:** `js/mentor.js`, `pages/student/mentor.html`.
- **API (future):** `POST /me/mentor/messages { context:{levelId,lessonId,taskId}, question }`.
- **Acceptance:** UI text never claims AI; interface swap requires no page change.
- **Tests:** `tests/mentor-service.cjs` (same replies as today for fixed inputs).

### S8. Final project
- **Current:** Study Task Manager (Python) graded by the normal task pipeline; internship project (C#) separate.
- **Missing:** project is not an artifact; no description/reflection; no link to portfolio; JavaScript path has a task-manager too (`community-challenges.js`) but no project page behavior difference documented.
- **UX problems [inferred]:** after "Project passed" the next step is "Review results or extend your program" — a dead end.
- **Improvements:** on pass, offer **"Add to portfolio"** with title, short description and the saved solution (code) as an artifact; record `portfolio item {source:"learning_project", verification:"automated_checks"}`. Keep the C# internship as a separate, clearly labelled self-reported simulation (it is for a language that is *coming soon*, so label it "simulation").
- **Files:** `js/project.js`, `pages/student/project.html`, `js/portfolio-publishing.js`, new `js/domain/portfolio.js`, `js/data/portfolio-repository.js`.
- **API:** `POST /me/portfolio { source, taskId, title, description }`.
- **Acceptance:** project passed → one-click add; item shows "Automated checks passed on <date>"; cannot add before pass; adding twice updates, not duplicates.
- **Tests:** `tests/portfolio-domain.cjs`; browser flow task pass → portfolio.

### S9. Portfolio and skill evidence
- **Current:** local portfolio from (a) internship (self-reported) and (b) company training submissions; skills typed as free text; explicit consent checkbox; published to showcase + company talent directory.
- **Missing:** skills are not derived from evidence; sources are not unified; no per-item visibility state.
- **Improvements:** (1) unified `PortfolioItem` with `source`, `verification`, `visibility`. (2) **Derived skills list** from evidence (lessons/quizzes/tasks per skill tag defined in curriculum data) shown as "Demonstrated"; the typed list stays and is labelled "Self-reported". (3) Consent remains explicit per item.
- **Files:** `js/portfolio-publishing.js`, `js/student-services-store.js`, new domain/repo above, curriculum skill tags (data addition only).
- **API:** `GET /me/portfolio`, `PUT /me/portfolio/{id}`, `GET /me/skills`.
- **Acceptance:** a skill appears under "Demonstrated" only if at least one evidence record maps to it; self-reported skills never appear there; publishing requires consent per item.
- **Tests:** `tests/skills-evidence.cjs` (mapping, no-evidence → empty), extend `service-access.cjs`.

### S10. Opportunities and applying (student side; company side follows in the Company plan)
- **Current:** list of active opportunities, cover-note application, My applications + training panel, messages.
- **Missing:** opportunities have no `requirements[]`; application stores no evidence; no match explanation.
- **UX problems [inferred]:** a student with no lessons completed can apply; nothing says what the company expects.
- **Improvements:** optional `requirements[]` on opportunities (company authoring is part of the Company plan); `match(opportunity, evidence)` pure function returns `met/missing` with links (never blocks or auto-rejects, shows "You can still apply"); application attaches selected portfolio item ids and a snapshot of demonstrated skills.
- **Files:** `js/student-career.js`, `js/company-store.js` (snapshot field only), new `js/domain/matching.js`.
- **API:** `GET /opportunities/{id}/match`, `POST /opportunities/{id}/applications`.
- **Acceptance:** match output deterministic and explainable; application snapshot immutable after submit; no hidden score; company view shows exactly what the student attached.
- **Tests:** `tests/matching-domain.cjs`; extend `admin-companies.cjs` for the snapshot.

### S11. Certificates and subscription (small)
- Certificate readiness moves to `domain/learning.js` (same rule); wording stays "Completion badge (local demo)". Subscription stays a labelled demo; no change besides reading through the repository.

---

## 4. Delivery slices (each independently verifiable; stop for review after each)

| # | Slice | Contents | Done when |
|---|---|---|---|
| 1 | **Domain extraction, no behaviour change** | `domain/learning.js` (level rules, lesson complete), `domain/grading.js`, `domain/quiz.js` moved from page scripts; demo adapter with revision on the learning blob | existing Node + browser tests green; new domain tests green; golden grading test equals old outputs |
| 2 | **Onboarding v2 + placement reasons (S1, S2)** | completion state, recommendation, redirect rules | acceptance of S1 and S2 |
| 3 | **Lesson evidence + quiz attempts (S3, S4)** | evidence kinds, attempts list, missed-lesson links | acceptance of S3 and S4 |
| 4 | **Next-action v2 (S6)** | single recommend() used by dashboard and checklist | table test green |
| 5 | **Project → portfolio → derived skills (S8, S9)** | unified portfolio items, evidence-derived skills | acceptance of S8 and S9 |
| 6 | **Opportunity match + application snapshot (S10)** | requirements display, match, attach evidence | acceptance of S10 |
| 7 | **Mentor service seam + labels (S7), certificate through domain (S11)** | interface only | UI text audit passes |

Each slice: update or add tests first, run the whole suite (28 Node files + `auth-server.test.mjs`), run the relevant browser tests, update `docs/CURRENT-IMPLEMENTATION.md`, stop.

**Rollback:** each slice is a separate commit or patch set (when you approve committing); the demo adapter reads old blobs through a v1→v2 view, so reverting code never loses data.

## 5. Risks

- **Whole-blob writers** (four scripts): migrating them to the repository one by one must keep the same stored JSON until slice 3; otherwise existing demo accounts lose data. Mitigation: golden fixtures of real blobs in tests.
- **Fake-DOM test harnesses** are brittle (two failures last round came from missing stubs). Domain tests avoid the DOM entirely.
- **Protected-file guard** (`docs/phase2-protected-baseline.json`): several student files may be protected; every touched protected file needs an entry with a reason in `authorized-baseline-changes.json` (never a test change).
- **Scope creep:** Company and Admin changes (requirements authoring, verification gate) are deliberately **not** in this plan.

## 6. Decisions needed before implementation

1. Approve the **layering rule** (`domain/`, `data/`, thin UI) and the new folders, including a layering test that forbids direct `localStorage` use in migrated areas.
2. Lessons with an exercise: **require** `exercise_passed` (stricter) or allow `self_marked` with a visible "self-checked" label (current behaviour, recommended for slice 3 to avoid blocking learners)?
3. Python Study Task Manager → portfolio: **automatically offer** after passing (recommended) or only from the portfolio page?
4. The C# virtual internship: keep as a labelled **simulation** (recommended) or hide it until C# content exists?
5. Quiz answer keys stay client-side in demo mode (documented, labelled) — acceptable until server grading?
6. OK to add `skills` tags to curriculum data for evidence-derived skills (data-only change)?
7. Order of slices: approve as listed, or reprioritise (e.g. portfolio before onboarding)?
