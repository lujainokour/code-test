# Current implementation — generated from code

Regenerate with: `node tools/curriculum-summary.cjs --markdown`. This describes the current browser-local implementation, not planned phases.

The catalog contains **13 languages**. Python and JavaScript have built-in executable learning paths. Other catalog entries are coming soon and may show locally authored admin previews; they have no built-in runners or complete paths.

Python: **6 levels, 24 lessons, 12 tasks**, runner: python.

JavaScript: **3 levels, 12 lessons, 6 tasks**, runner: javascript.

Python: **6 levels, 24 lessons, 12 coding tasks**. Each level has four lessons and a four-question quiz.

| Level | Title | Lessons | Tasks | Quiz questions |
|---|---|---|---|---|
| 1 | Python Foundations | 4 | 2 | 4 |
| 2 | Logic and Control Flow | 4 | 2 | 4 |
| 3 | Functions and Collections | 4 | 2 | 4 |
| 4 | Reliable Programs and Files | 4 | 2 | 4 |
| 5 | Objects, Modules and Testing | 4 | 2 | 4 |
| 6 | Efficient Problem Solving | 4 | 2 | 4 |

The Foundations milestone covers Levels 1–3: **12 lessons and 6 tasks**, including the Study Task Manager. It does not require the advanced levels. Lessons and a best quiz score of at least 70% unlock the next level; an explicitly applied placement choice can open a later starting level without completion credit; coding tasks are additional practice for progression and required for the Foundations milestone. Levels 1–5 are free; Level 6 uses a local Premium preview without payment.

Python executes with the bundled Pyodide worker. JavaScript executes in a worker inside an opaque-origin sandbox with a five-second limit and network access blocked by CSP. Language choices, progress, drafts and placement are isolated per account and language; existing Python progress keys are preserved. Python has a 10-question placement bank and JavaScript has 12 questions across its three levels. Placement requires at least 75% in every topic of a consecutive level, skips at most two levels, and saves the starting choice only after explicit application. Placed-out levels stay reviewable and award no completion or certificate progress. Retakes preserve all real learning records. See [placement rules](PLACEMENT-RULES.md). Coming-soon choices show an honest availability page and an optional local interest flag. Mentor replies are prepared hints; no LLM endpoint is connected. Awards use local browser records, not trusted server grading. Accounts, progress, community and service workflows remain browser-local; SQL Server is separate from the frontend.

Platform sessions are administered through the admin portal. Student-led teaching has a separate application, review and booking workflow. Old teacher URLs redirect to administration; there is no independent teacher login role. Demo credentials are displayed only on the relevant demo login screens.
