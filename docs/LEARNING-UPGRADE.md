# Python learning implementation

The active-language selector also supports a complete JavaScript path (3 levels,
12 lessons and 6 tasks). See [the code-derived inventory](CURRENT-IMPLEMENTATION.md)
and [Phase 1 implementation and verification](PHASE-1.md). The Python-specific
details below remain the Python path contract.

The student path includes six levels (24 lessons), independent four-question
level quizzes, twelve executable coding tasks, and a task-manager Foundations project.
Levels 1–5 are free; Level 6 uses the local Premium preview without collecting payments.
The Foundations certificate retains its Levels 1–3 requirements (12 lessons and six tasks).
Each lesson includes an explanation, example, question, and a related Arabic
video link. Some video buttons link to the instructor's lesson page containing
the video rather than directly to YouTube.

Correct lesson answers record completion. Reading a lesson and selecting
Complete lesson also records completion. A level is complete when its lessons
are complete and its best quiz score is at least 70%. Earlier levels must be
complete before opening later lessons or quizzes. Coding tasks are additional
practice and do not block the level quizzes. Quiz feedback explains each answer.

Python runs in disposable Web Workers using the bundled Pyodide 0.27.3 runtime
(Python 3.12.7). The runtime files and upstream license are in `vendor/pyodide`.
No student code runs on the server. Each execution has a five-second time limit
after initialization, a Stop button, and an output limit. Each task checks several
inputs where applicable, including boundary cases. Task completion is awarded
only after all checks pass. Saved results distinguish checked code from a later
edited draft. These are learning checks, not a tamper-proof grading system.

Learning progress, placement, preferences and code drafts persist in localStorage
under the current demo profile's email, or under a separate guest namespace.
Legacy tab data is copied only for its first owner; source records are kept.
Shared service records persist in localStorage; the administrator session uses sessionStorage. Signing out
keeps learning data; signing in with the same demo profile restores it on this
browser and origin. This is local profile separation, not authentication.

My progress shows the current level, completed activities and a learning report.
Backup import and export have been removed from the student interface.
Automatic saving and existing learning records remain unchanged.

## Run and verify

From the project root, start the development server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/serve.ps1 -Port 8879
```

Then, in another terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/learning-upgrade.ps1
```

The browser checks run in a separate temporary Chrome profile, execute real
Python, verify level transitions and saved results, verify automatic progress persistence,
check profile isolation, and capture desktop and phone dashboard screenshots.
Results are written to `docs/learning-upgrade-results.json`.

When using another static server, serve `.wasm` as `application/wasm`. Open the
site over HTTP or HTTPS; workers do not work from a `file://` page.

## Remaining production work

Real authentication, a server database, cross-device sync, secure administrative
roles, live AI mentoring, and trusted certificates are not connected. Browser
records can be changed by the user. Connected services and real student testing
are required before describing the entire product as production-ready.

## Hints and personal review

Each coding task now has two progressive hints and an explained reference
solution. Hints are available immediately; a real run or submission unlocks the
solution. Revealing guidance does not edit code or award completion. Hint usage
and solution access persist under the current demo profile, but the solution is
collapsed again on each visit so it is not exposed accidentally.

The dashboard builds a review plan from incorrect lesson answers, mistakes in
the latest level quiz (even when a previous best score passed), and failed coding
checks. Recommendations link to available lessons and relevant task retries.
A newer correct lesson answer resolves an older quiz flag; a passing task retry
removes flags originating from that failed task. Locked lessons are excluded.
These are prepared learning rules and explanations, not live AI-generated advice.

Verify with the same development server used above:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/learning-support.ps1
```

Results are saved to `docs/learning-support-results.json`. The checks exercise
hint persistence, solution gating, review recommendations, mobile layout and all
six reference solutions through the real Python runtime.
