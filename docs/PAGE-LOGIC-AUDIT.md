# Page logic audit

**Audience:** the project owner and whoever decides the site's structure next.

Every page in the frontend has one row: its purpose, its one primary action, where people arrive from and where they go next, and a verdict for each of the six questions below.

This audit is based on:
- the browser layout measurement (`tests/layout-audit-browser.ps1`, [before results](evidence/layout-audit/before/results.json));
- a review of the screenshots by eye;
- the static link facts from `node tools/page-logic.cjs`.

It covers 103 page visits in five states: guest, new student, student with progress and SAMPLE data, admin with the sample company, and company.

**Verdicts:**

| Code | Question |
|---|---|
| a | Empty-space problem |
| b | Dead end (no clear next step) |
| c | Duplicate or overlap with another page |
| d | Unreachable or orphan page |
| e | Confusing or contradictory wording |
| f | Shows information that is not real or not supported |

**Status of each verdict:**
- **fixed:** changed in this pass.
- **left:** not changed, with the reason given.
- **owner:** listed under [Decisions for the owner](#decisions-for-the-owner).
- **—:** no issue found.

"Sidebar" means the workspace sidebar built by `js/workspace-shell.js`.

## Student area

| Page | Purpose | Primary action | Comes from → goes to | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|
| student/dashboard | See where you are and continue | Continue (next step card) | Sign-in, sidebar → current lesson, path, progress | — | — | — | — | — | — |
| student/learning-path | See every level and its state | Start / Continue level | Sidebar, dashboard → module | — | — | — | — | — | — |
| student/module | One level's lessons, tasks and quiz | Start the next activity | Learning path → lesson, workspace, level assessment | — | — | — | — | — | — |
| student/lesson | Read a lesson and check understanding | Mark as read / next lesson | Module → next lesson, practice, Ask the community | left: the sticky level panel is shorter than the reading column by design | — | — | — | — | — |
| student/level-assessment | Level quiz | Submit quiz | Module → module, progress | left: the automatic "orphan heading" is the empty results card before submitting (by design) | — | — | — | — | — |
| student/practice | List optional practice tasks | Open task | Sidebar → workspace | — | — | — | — | — | — |
| student/workspace | Write, run and submit code | Submit solution | Module, practice → code review, Ask the community | — | — | — | — | — | — |
| student/code-review | Results of the last submission | Back to workspace | Workspace → workspace, level | — | — | owner (project-evaluation redirects here) | — | — | — |
| student/progress | My learning progress | Open current level | Sidebar → level, badge page, report | — | — | owner (overlaps learning report, skill analysis) | — | — | — |
| student/learning-report | Printable progress summary | Print / Save as PDF | Progress → progress | — | — | owner | — | — | — |
| student/skill-analysis | Placement-based strengths | Continue learning | Sidebar → mentor, learning path | — | — | owner | — | — | — |
| student/certificates | Completion badge (local demo) | Print / Save PDF | Sidebar, progress → progress | — | — | — | — | — | — (badge wording fixed earlier) |
| student/project | Level 3 project brief | Open project workspace | Sidebar → workspace | — | — | owner (project-evaluation) | — | — | — |
| student/project-evaluation | Redirects to code review for the project | (redirect) | Old links → code-review?task=task-manager | — | — | owner | owner (no inbound links) | — | — |
| student/onboarding | Choose language, experience and goal | Open my learning dashboard / Continue | Signup → dashboard or placement | fixed: the left column was an unpadded card (earlier pass) | — | — | — | — | — |
| student/placement-intro | Explain the placement test | Start assessment / Complete preferences | Onboarding, learning path → question | fixed: "What to expect" tiles were half-styled (serif, no padding) | — | — | — | — | — |
| student/placement-question | One question at a time | Next question | Intro → review | — | — | — | — | — | — |
| student/placement-review | Check answers before submitting | Submit assessment | Question → results | — | — | — | — | — | — |
| student/placement-results | Recommended start level | Start here | Review → learning path, dashboard | — | — | — | — | — | — |
| student/profile | Name, password and preferences | Save changes | Sidebar → password, portfolio, path | fixed: two topics in one side card ran together | — | — | — | — | — |
| student/subscription | Plans and what is free | Preview Premium access | Sidebar → learning path | — | — | — | — | — | — ("illustrative" price, already labelled) |
| student/career | Opportunities and applications | Apply locally | Sidebar → inbox, portfolio | — | fixed: with no opportunities there was no next step | owner (overlaps services marketplace) | — | fixed: "Choose an open opportunity above" when there was none | — |
| student/messages | Company inbox | Browse opportunities | Sidebar → career, portfolio | fixed: a sentence plus a detached button left most of the page blank | fixed: added "Publish my profile" | — | — | — | — |
| student/virtual-internship | Independent practice project | Save task statuses | Sidebar → local portfolio | fixed: empty board columns stretched to full height | — | owner (overlaps career training) | — | owner (C# internship shown while the C# path is "coming soon") | — |
| student/local-portfolio | Choose what to publish | Publish a student profile | Sidebar, internship → showcase | left: the empty state is short but has a clear next step | — | owner | — | — | — |
| student/requests | Bookings and service requests | Explore mentoring sessions | Sidebar → peer mentoring | — | — | — | — | — | — |
| student/mentor | AI study assistant (prepared replies) | Send | Sidebar, lesson, workspace → current level | fixed: "Your saved code" showed only a heading | — | — | — | — | — (labelled "no live AI") |
| student/mentor-studio | Offer a student-led session | (form) | Sidebar → peer mentoring | — | — | owner (two session systems) | — | — | — |

## Services (signed-in students)

| Page | Purpose | Primary action | Comes from → goes to | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|
| services/community | Ask, help and share in groups | Ask a question / Request to join | Sidebar, Ask the community → groups | fixed: the left column left a tall blank strip; channel labels broke | — | — | — | — | — |
| services/peer-mentoring | Book a student-led session | Book | Sidebar → requests | — | — | owner | — | — | — |
| services/mentoring-details | One session's details | Book | Peer mentoring (script links) | — | — | — | — (reached through script links) | — | — |
| services/freelance-services | Small service listings | Request a service | Sidebar → service details | — | — | owner | — | — | — |
| services/service-details | One service | Request | Freelance services (script links) | — | — | — | — | — | — |
| services/service-draft | Draft a service idea | Save draft | Requests ("My service drafts") | — | — | — | — | — | — |
| services/showcase | Published student profiles | Open a profile | Sidebar → public profile | — | — | owner | — | — | — |
| services/student-public-profile | One published profile | Contact (company only) | Showcase (script links) | — | — | — | — | — | — |

## Admin

| Page | Purpose | Primary action | Comes from → goes to | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|
| admin/admin-dashboard | What needs attention | Review student tutors | Admin sign-in → every admin area | fixed: 8 KPI tiles left an empty slot | — | — | — | — | — |
| admin/admin-analytics | Counts from local records | — (read only) | Sidebar | left: 4 tiles in 3 columns (script-generated grid) | — | — | — | — | — ("not live analytics" stated) |
| admin/admin-students | Student directory | Open a student | Sidebar → details, access | — | — | owner (vs session students) | — | — | — |
| admin/admin-student-details | One student | Manage access | Students (?id) | — | — | — | — (needs ?id) | — | — |
| admin/admin-account-access | Suspend / restore | Manage access | Student details (?id) | — | — | — | — (needs ?id) | — | — |
| admin/admin-companies | Company directory and sample company | Load / remove sample | Sidebar | — | — | — | — | — | — |
| admin/admin-community | Groups, requests, moderation, audit | Approve selected / access switch | Sidebar | — | — | — | — | — | — |
| admin/admin-courses | Learning paths | Create learning path | Sidebar → course content | — | — | — | — | — | — |
| admin/admin-course-create | New course draft | Create draft | Courses | — | — | — | — | — | — |
| admin/admin-course-content | Levels of a course | Add level | Courses (?course) | — | — | — | — | — | — |
| admin/admin-level-create | New level | Create level | Course content | — | — | — | — | — | — |
| admin/admin-level-content | Lessons of a level | Save lesson locally | Course content (?course&level) | — | — | — | — (needs parameters) | — | — |
| admin/admin-peer-mentoring | Student tutors and oversight | Approve tutor | Sidebar | — | — | owner (two session systems) | — | — | — |
| admin/admin-sessions | Platform sessions | Create session | Sidebar | — | — | owner | — | — | — |
| admin/admin-schedule | Availability and pricing | Save availability | Sidebar | — | — | — | — | — | — |
| admin/admin-bookings | Platform bookings | Confirm / decline | Sidebar | — | — | — | — | — | — |
| admin/admin-session-students | Session follow-up notes | Save note | Sidebar | — | — | owner (vs students) | — | — | — |
| admin/admin-demo-tour | Guided demo of SAMPLE data | — | Dashboard "Demo tour" link | — | — | — | owner (not in the sidebar) | — | — |
| All admin pages | — | — | — | fixed: the grouped sidebar style was on only 3 of 18 pages | — | — | — | — | — |

## Company

| Page | Purpose | Primary action | Comes from → goes to | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|
| company/company-dashboard | Hiring overview | Post an opportunity | Company sign-in → jobs, talent, applications | — | — | — | — | — | owner ("Evidence you can trust" panel) |
| company/company-jobs | Postings | Post opportunity | Sidebar | — | — | — | — | — | — |
| company/company-talent | Published student profiles | Send invitation | Sidebar | — | — | — | — | — | — (wording fixed earlier) |
| company/company-applications | Applications and training reviews | Confirm & notify | Sidebar | — | — | — | — | — | — |
| company/company-messages | Candidate threads | Send | Sidebar | fixed: the message field was a tiny box | — | — | — | — | — |
| company/company-profile | Public branding | Save company profile | Sidebar | — | — | — | — | — | — |

## Public, auth and redirects

| Page | Purpose | Primary action | Comes from → goes to | a | b | c | d | e | f |
|---|---|---|---|---|---|---|---|---|---|
| index | Home and sign-up funnel | Start learning | Entry → signup, login, languages | left: an unbalanced row at 1024 px only (section label beside the journey list) | — | — | — | — | — |
| public/demo | What the demo includes | Open demo sign-in | Home → login | — | — | — | — | — | — |
| public/languages | Language catalogue | Choose a language | Home, sidebar | — | — | — | — | — | — |
| public/course | Lessons of a course | Open a lesson | Languages (script links) | — | — | — | — | — | — |
| auth/login, signup, forgot-password, reset-password, change-password | Account screens | Sign in / continue | Home, guards | left: reset-password has a 167 px gap at 1024 to 1440 px (protected account page) | — | — | — | — | — |
| auth/admin-login | Admin preview sign-in | Open admin preview | Admin guard | — | — | — | — | — | — |
| auth/company-login, company-signup | Company sign-in and signup | Sign in / create account | Company guard, home | — | — | — | — | — | fixed: "verified" and "university" talent claims |
| auth/teacher-login, teacher-signup; teacher/* (6); teacher-dashboard.html | Old teacher area | (redirect to admin) | Old links only | — | — | owner | owner | — | — |
| dashboard.html, company-dashboard.html (root) | Short links | (redirect) | Old links | — | — | — | — | — | — |

## Measurements

- **Before:** the first browser run, 103 page visits at 1440, 1024, 768 and 390 px.
  - Horizontal overflow on 0 visits; JavaScript errors on 0.
  - Glass is active on 89 pages, with code blocks and the editor opaque.
  - 10 automatic findings: 6 orphan headings, 3 unbalanced column rows, 1 gap.
  - Screenshot review added the problems the script cannot see: content touching edges, detached actions, contradictory copy, inconsistent sidebars, and a field that was too small.
- **After:** the second browser run, the same 103 visits, in [after results](evidence/layout-audit/after/results.json).
  - Horizontal overflow on 0 visits; JavaScript errors on 0; glass problems on 0 (89 glass pages).
  - Automatic findings: 4 orphan headings (before 6: the mentor card is fixed), 5 unbalanced rows (before 3) and 1 gap.
  - The 2 new unbalanced findings are the virtual internship board. Its empty columns no longer stretch, so the open space under them is now counted. It used to show as two tall empty boxes, which the script did not count.
  - The remaining findings are by design or out of scope, as recorded in the tables above: the lesson's short sticky panel, the quiz's results card, card headings inside their header rows, the company chat header, the reset-password gap, and the home page row at 1024 px.
  - Screenshots are kept only for the pages that changed (44 files); results.json covers every page.

## Decisions for the owner

Nothing below was deleted or restructured. Redirects keep working.

1. **Old teacher area: 8 redirect pages** (`teacher-dashboard.html`, `pages/auth/teacher-login.html`, `teacher-signup.html`, `pages/teacher/*.html`).
   - **Recommendation:** keep them for one release, then remove them, once nothing links to them. They have no inbound links in the site.
   - **Risk:** old bookmarks and external links break.
2. **`student/project-evaluation.html`** only redirects to `code-review.html?task=task-manager` and has no inbound links.
   - **Recommendation:** turn it into a plain redirect stub or remove it, and link the project page straight to code review.
   - **Risk:** low.
3. **Progress overlaps:** My progress, Learning report, Skill analysis and the Completion badge page each summarise progress.
   - **Recommendation:** make My progress the hub, with the report as its "Print" action and skill analysis as a section of it or of placement results.
   - **Risk:** the navigation changes, and tests that reference these pages need updates.
4. **Two session systems:** platform sessions (admin-sessions, schedule, bookings, session students) and student-led sessions (peer mentoring, mentor studio, admin peer mentoring).
   - **Recommendation:** name them clearly as "Staff sessions" and "Student-led sessions" in both sidebars, or merge their booking lists.
   - **Risk:** naming confusion for students and admins until then.
5. **Career overlaps:** career, the virtual internship, the local portfolio, the showcase, the public profile and the freelance services all touch "career and portfolio".
   - **Recommendation:** one "Career & portfolio" group, ordered as portfolio, then opportunities, then inbox.
   - **Risk:** many links and tests change.
6. **The C# virtual internship** is shown to every student, while the C# learning path is "coming soon".
   - **Recommendation:** show it only when C# is the active language, or present it as an optional cross-language exercise. The page already labels it.
   - **Risk:** students may think they need C#.
7. **Admin demo tour** is reachable only from the dashboard link.
   - **Recommendation:** add it under "More" in the admin sidebar.
   - **Risk:** none.
8. **Admin students vs session students:** two student lists.
   - **Recommendation:** link session follow-up from each student's details page.
   - **Risk:** low.
9. **Company dashboard "Evidence you can trust"** promises "a clearer picture of practical skills".
   - **Recommendation:** soften the wording to "self-reported projects and the skills students list", matching the talent page.
   - **Risk:** none.
10. **Community: language groups and study groups** are two kinds of group.
    - **Recommendation:** keep both for now, as chosen earlier. Revisit when there is real usage data.
    - **Risk:** some confusion between "Python group" and "Python study group".
