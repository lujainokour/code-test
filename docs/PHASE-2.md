# Phase 2 — placement sets the starting level

## Scope

Placement now recommends and, after explicit application, selects a starting level separately for each student and language. The documented rule in [PLACEMENT-RULES.md](PLACEMENT-RULES.md) requires at least 75% in every topic of each consecutive skipped level and caps skipping at two levels. Python retains its ten-question order; JavaScript has twelve questions across its three levels.

Earlier unfinished levels are labelled **placed out — not completed**, remain open for review, and award no lesson, quiz, task, badge or certificate progress. Results include topic evidence, Start here, a confirmed Level 1 override and retakes. A retake updates the recommendation while preserving the applied choice until explicit reapplication, every completed lesson, real scores, task results and code drafts. Real completion keeps its earned progression frontier.

The path, dashboard, module and report explain placed-out status. New placement storage keys use the existing student/language namespace. Account/language capture and stale-snapshot checks reject writes from outdated attempts; malformed data is preserved.

Mentor, backend execution/grading, account/authentication and certificate code were not changed by this phase. A 40-file baseline in `phase2-protected-baseline.json` verifies the protected existing sources, including real lesson and assessment completion code. Shared placement dependencies are loaded on student pages.

## Verification

`node tools/verify-phase2-local.cjs` completed successfully. [phase2-results.json](phase2-results.json) records **183 passed assertions, 0 failures in 10 Node/VM suites**: the eight existing browser-free suites (139 assertions) and two new placement suites (16 policy + 28 store/UI assertions). These are separate from the ten browser suites, which did not run. All **103 production JavaScript files** passed syntax checks. The narrower static HTML audit found **161 unique references across 79 routes, 0 missing**. The runner stops at the first non-browser failure; none occurred.

Tests cover exact 75%, one percentage point below, every-topic thresholds, all unsure, all correct and the two-level cap, language/account changes during attempts, stale-tab writes, Python/JavaScript isolation, explicit application and confirmed/cancelled override, retake preservation, legacy Python records and unchanged certificate enforcement. VM assertions exercise actual storage, curriculum and certificate scripts, but do not replace browser verification.

## Not done / pending manual verification

The single normal-permission browser attempt during Phase 1 closure failed before test assertions because Chrome never created `DevToolsActivePort`. No browser retry, alternate permission or reviewer bypass was used. The ten existing browser suites and dynamic CDP reference audit have **not** been rerun. Historical results are not current passes.

The following remain **pending manual verification**:

- Python and JavaScript at 1440px and 390px: real active-language level counts and dashboard / learning-path **My language** selectors.
- Browser back/forward, focus and real cross-tab account/language-change guards.
- The complete placement UI in both languages at both widths: twelve-question JavaScript navigation, review/submission, topic reasons, Start here, native override confirmation/cancel, retakes and placed-out review links.
- Real browser certificate locking, language/account isolation and preservation of earned progress during retakes. Node/VM evidence is recorded separately.
- Fresh screenshots replacing the archived pre-copy-fix screenshots; none were fabricated.

The exact Phase 2 file inventory and hashes are in [phase2-files.json](phase2-files.json); precommit working-tree status and diff statistics are saved in `phase2-git-status.txt` and `phase2-git-diff-stat.txt`. The tree contains unrelated pre-existing modifications, which remain unstaged. The commit uses explicit file paths, never `git add -A`.

Phases 3 onward have not started. No backend connection, trusted server grading, new mentor functionality or account redesign is included. Phase 2 is committed separately and work stops for review.
