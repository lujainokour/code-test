# Student Dashboard and My progress redesign (12 November 2026)

The dashboard now answers "where am I and what do I do now". **My progress** (`pages/student/progress.html`, extended rather than duplicated) answers "everything I achieved and where to improve". Both pages render one shared, read-only model: `js/student-overview.js`.

Screenshots are in `docs/evidence/`: `dashboard-before-*`, `dashboard-after-*`, `progress-before-*` and `progress-after-*` at 1440 and 390 px, plus `dashboard-after-1440-javascript.png` showing the language-switch toast.

## Information architecture

**Dashboard (`pages/student/dashboard.html`, `js/dashboard.js`)**

- **A. Top bar.** The shell's breadcrumb, the compact language switcher and the account menu (Profile settings, Log out).
- **B. Hero.** A greeting, one sentence computed from real progress, and **one** next-action card: title, language and level, a real progress bar for the current level, and one primary button. The button reads "Continue" in the normal learning states; other states use their own label, such as "Choose preferences". The coding-task state also offers a "Go to level quiz" text link.
- **C. KPI tiles.** Lessons completed, Coding tasks passed, Current streak and Active days this month. Each tile has an icon, a large tabular number, a label and a tooltip (hover or focus).
- **D. Two cards.** The level progress ring, and the weekly activity chart.
- **E. Recent activity.** The last 5 real events, plus one line labelled **System suggestion**.
- **F. Links.** My progress, Learning path, Practice and Community.

**Removed from the dashboard and moved, still reachable:**

| Item | New home |
|---|---|
| Journey tabs | No longer injected on the dashboard; still shown on the learning pages |
| Full-width language card | Top-bar switcher |
| Duplicate "Continue" card | Removed |
| Selected-path text list | Visual roadmap on My progress |
| Topics to revisit | My progress (`#dashboard-review` id kept) |
| Placement panel | My progress (`#placement-score`, `#skill-snapshot`, `#placement-link` ids kept) |
| Bookings and service requests | My progress (`#booking-count`, `#request-count`, `#draft-count` ids kept) |
| Achievements | Badge gallery on My progress |

**My progress (`js/progress-overview.js`, plus the existing `js/progress.js`)**

- A badge gallery with inline SVG artwork, Earned or Locked state, the exact unlock rule, the earned date when known, and an encouraging hint.
- Learning insights and topics to revisit.
- A visual level roadmap.
- A placement panel: take or retake, recommended start and why.
- The existing current-level details, the learning report link and the bookings/requests counts.

## Component → data source map

| Component | Source (real data only) |
|---|---|
| Greeting | `studentServicesStore.session()` (signed-in profile) |
| Hero sentence | `studentOverview.headline()`: lesson totals, current level and streak, all as below |
| Next action | Same routing as the previous dashboard: preferences (`cmStorage` onboarding/language), `pythonCurriculum.current()`, progress lessons/tasks/assessments, `subscriptionStore.canAccessLevel` |
| Level progress bar | Current level lessons done + quiz passed / (lessons + 1) |
| Lessons completed | Lesson ids in `codementor-demo-learning` that belong to the active curriculum |
| Coding tasks passed | `progress.tasks` ∩ curriculum tasks. "+N in 7 days" counts `taskResults[].submittedAt` of passed tasks; hidden when no timestamps exist |
| Current streak | `progressInsights.streak()` over dated events |
| Active days this month | Distinct local days with events. The month-over-month comparison appears only when dated history predates this month |
| Ring | Lessons completed / all lessons of the active language. Placement never writes lessons |
| What unlocks next | Remaining lessons in the current level + 70% quiz rule (curriculum) |
| Weekly chart | `progressInsights.weekly()`. Empty days show a baseline; a new student gets an empty state |
| Recent activity | `progressInsights.events()`: `checks[].checkedAt`, `taskResults[].submittedAt`, `assessments[].submittedAt`, placement `submittedAt` |
| System suggestion | `learningSupport.reviewPlan()` (saved answers / failing tests); otherwise placement or practice. Never shares the primary action's target; never presented as AI |
| Badges | `progressInsights.ACHIEVEMENT_RULES` and `achievements()` (single documented list in code) |
| Insights | Lesson checks + latest quiz answers per lesson; dated quizzes; placement topic scores |
| Roadmap | `course.completed / placedOut / available` + current level |
| Placement panel | `placementStore.read()`, `recommendation()`, `pythonCurriculum.placementChoice()` |
| Request counts | `studentServicesStore.ownRecords()` for the signed-in owner |

Everything is computed for the **active language** of the **signed-in student**. `learning-storage.js` already scopes storage keys by owner and language, and the stale-page guards in `learning-language.js` are unchanged. No storage keys or saved data formats changed.

## Achievement rules

The rules live in one list in `js/progress-insights.js`:

- **First steps:** 1 lesson completed.
- **Steady learner:** 5 lessons completed.
- **First passing code:** 1 coding task with every test passing.
- **Problem solver:** 3 coding tasks with every test passing.
- **Three-day streak:** saved activity on 3 consecutive days.
- **Know your start:** placement check submitted.
- **Level N complete:** all Level N lessons done and a best quiz score of at least 70%. A placed-out level is never complete; its badge says the student placed out.
- **Path complete:** every level completed.

Dates are shown only when a real timestamp exists. Lesson completions carry no time, so their date reads "date not recorded".

## Language switcher

The switcher is in the top bar on Dashboard, Learning path and My progress, and the same component appears in the sidebar drawer at ≤ 900 px. It uses the listbox pattern:

- `aria-expanded`, `aria-controls` and `aria-activedescendant`.
- Keyboard: ↑ ↓ Home End, type-ahead, Enter or Space to choose, Escape closes and returns focus, Tab closes.

Picking a **Ready** language calls the existing `learningLanguage.select()` with the account guard, reloads, and shows "Switched to JavaScript. Your Python progress is saved." A **Coming soon** language is never made active. It opens the honest availability dialog with the local "Notify me on this device" flag.

## Visual system

All tokens are in section 1 of `css/student-premium.css`:

- **Colours:** burgundy for primary actions and key numbers, light blue for accents and chart fills, one success green and one amber.
- **Shape:** radii, two shadows and an 8 px spacing scale.
- **Typography:** a clear type scale, with tabular numbers for statistics.

Motion is limited to the ring, bars and badge shine on first render, plus a hover lift. All of it is disabled under `prefers-reduced-motion`. The pages use the light theme only.

## Sample vs real

**No sample data was added for these pages.** Every number comes from the signed-in student's saved records. The browser screenshots use a test learner whose progress was written by the harness `tests/dashboard-redesign-browser.ps1`: 4 lessons, 1 passed task, a 75% quiz and dated checks.

## Missing dependencies (shown honestly, not invented)

- **Learning hours.** The project does not track time, so active days are shown instead; the tooltip says hours are not tracked.
- **Lesson completion times.** Lessons store no timestamp, so they are not in the weekly chart or timeline, and lesson badges show "date not recorded".
- **Preview language status.** The catalog has no language in a "Preview" state today. The switcher supports the chip, but every non-Python/JavaScript language shows "Coming soon".
- **AI.** There is no AI service, so suggestions are labelled "System suggestion".

## Verification

**Node:** `node tools/verify-local.cjs` passed 301 assertions in 16 suites. The new `tests/dashboard-redesign.cjs` has 18 checks covering:

- KPI values and ring percentage
- achievement rules
- the empty state
- language and account isolation
- placed-out exclusion
- exactly one "Continue"
- the switcher's keyboard, ARIA, toast and availability behaviour, and a stale-account guard

**Browser (headless Chrome, normal permissions):** `tests/dashboard-redesign-browser.ps1 -Phase after` passed all 21 checks:

- no horizontal scroll at 1440, 1024, 768 and 390 px on both pages
- one Continue
- KPI tiles, ring, weekly tooltips and timeline
- keyboard open, Escape and focus return
- switch to JavaScript with the toast
- JavaScript shows no Python numbers
- coming-soon opens availability
- badges, roadmap and request counts on My progress

**Browser:** `tests/language-switch-browser.ps1` passed 121 checks and failed 1. The failure, "Missing JavaScript placement bank…", predates this work: Phase 2 added a JavaScript placement bank, so that expectation is stale.

**Pending manual verification:**

1. Screen-reader announcement of the switcher and of the toast.
2. Real touch interaction with the drawer switcher at 390 px.
3. Hover tooltips with a mouse.
4. Visual review at 1024 and 768 px. Only overflow was checked automatically; screenshots exist for 1440 and 390.
5. The HTML suites `requests-dashboard.html` and `learning-support` were updated for the moved IDs but not rerun. The README notes several historical HTML suites already fail.
