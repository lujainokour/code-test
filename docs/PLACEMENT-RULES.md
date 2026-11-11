# Placement rules — version 1

Placement selects a starting point separately for each student and language. It never awards completion. The implementation is `js/placement-engine.js`; banks are in `js/placement-banks.js`.

1. Score each topic within each curriculum level independently. A correct answer scores one; incorrect and “I'm not sure” score zero. Every question requires an answer, including unsure, before submission.
2. To place out of a level, **every topic in that level must score at least 75%**. Compare integer products (`correct * 100 >= 75 * total`), without rounding. A displayed rounded score cannot change eligibility.
3. Consider levels in order from Level 1. Stop at the first level with a topic below threshold or no evidence. Later strengths cannot compensate for an earlier gap.
4. Place out of **at most two consecutive levels**. The recommendation is the first level after those levels: Level 1, 2 or 3. Never recommend beyond the curriculum. Even a perfect result starts no later than Level 3.
5. Results show every topic's evidence and threshold, the recommendation, and the two-level cap. Viewing results alone changes no access. **Start here** saves the recommendation. **Override and start from level 1** requires a separate confirmation; cancelling changes nothing.

## Banks and curriculum mapping

| Language | Curriculum levels | Placement questions | Level / topic evidence |
|---|---:|---:|---|
| Python | 6 | 10 | L1: Variables and data types (4); L2: Conditions and logic (2), Loops and iteration (2); L3: Functions and code reading (2) |
| JavaScript | 3 | 12 | L1: Values and input (4); L2: Conditions and logic (2), Loops and iteration (2); L3: Functions and collections (4) |

With four questions in a topic, 3/4 passes and 2/4 fails. With two, 2/2 is required: 1/2 fails. Level 3 evidence informs review, but cannot increase the two-level skip allowance. Python Levels 4–6 cannot be placed out. Languages without a bank retain the unavailable page.

## Placed out versus completed

Applying Level N makes earlier unfinished levels **placed out — not completed**. Students can open and review them. The path, dashboard and report label this state separately. Completing real work can subsequently turn a placed-out level into a completed level.

No placement operation writes lesson completion, assessment scores, task results, drafts, badges or completion badge (local demo) progress. Real completion remains the existing lessons plus quiz requirement; existing task requirements for the completion badge (local demo) remain unchanged. All required real work in placed-out levels is still necessary for a certificate.

The selected start opens that level and earlier review levels. Real completed levels preserve the existing progression frontier. The current level is the first unfinished level at or after the saved start, falling back to earlier unfinished work when appropriate. Reviewing an earlier level never awards completion automatically.

## Persistence, retakes and stale attempts

Attempts, the last submitted recommendation and the applied choice use the existing owner-and-language-scoped browser storage. Python's original attempt key and original ten-question order remain compatible; an untagged legacy Python attempt cannot become a JavaScript attempt.

A retake preserves the existing applied choice, the previous submitted recommendation while in progress, and every real learning record. Submission updates the recommendation only. Students explicitly apply a new recommendation or confirm the Level 1 override. A lower retake score never deletes lessons, lowers best quiz scores, removes tasks or relocks the frontier earned by real completion.

Each write validates the captured account and language. Changing accounts or languages during an attempt rejects stale saves, submission and application. Revision/snapshot checking also rejects edits from another stale tab. Malformed records produce an error and are preserved rather than silently reset.

This is a browser-local prototype, without server authentication, cross-device synchronization or trusted grading. The placement policy does not modify accounts, mentor behavior, execution/grading or backend code.

## Verification

Run `node tools/verify-phase2-local.cjs` for browser-free suites, JavaScript syntax and static references. Policy tests include exact 75%, 74%, all unsure, all correct, weak earlier topics, independent topic thresholds and legacy records. Store/UI VM tests cover account changes, stale writes, Python/JavaScript isolation, explicit application, override confirmation, retake preservation, review access and unchanged certificate enforcement.

VM tests do not establish browser layout, native dialog behavior, history/focus behavior or real multi-tab interaction. Those remain **pending manual verification**; see `PHASE-2.md`.
