# Browser verification — 2026-10-15

> Historical snapshot — not a current implementation inventory. Dated counts and outcomes below describe that snapshot only. See [the code-derived current implementation](CURRENT-IMPLEMENTATION.md) for current curriculum counts, roles and limitations. Sample credential literals in historical excerpts have been redacted.

Final result: **64 / 64 checks passed** in installed Chrome headless, using a separate disposable browser profile and fixture-only sessionStorage.

Verified behavior:

- Community clearly states that a Discord link has not been added.
- Showcase name search, no-result state, language filter and skill filter.
- Public profiles exclude private account name, email and age; unavailable work links are labelled honestly.
- Unknown profile, session and service IDs show a useful empty state.
- Mentoring eligibility is explicitly a demo admin approval, with three future sample appointments.
- Booking requires a student demo session; empty fields, duplicate requests and stale-account forms are rejected.
- Booking and service requests are saved locally with simulation status and clear confirmation text.
- Invalid prices are rejected; service drafts persist privately and are not auto-published or shown to another account.
- Corrupt booking, request and private draft records remain unchanged and produce errors.
- Reports handle empty progress, derive existing counts and scores, omit private identity fields and block printing when records are corrupt.
- The print button calls browser printing.
- Admin course listing includes local drafts, filters both language field shapes and displays base and draft language names.
- Course and level creation retain the existing version-1 contracts; level writes preserve unrelated courses and additional stored fields.
- Corrupt admin drafts and levels are preserved and stop dependent operations.
- Signup validates fractional/zero age, numeric names and password confirmation, preserves malformed existing identity, saves private age without a password and keeps preferences.
- Login retains the local illustration, original form and links, sample autofill and private age for the same sample account.
- Student service links appear in the dashboard; admin navigation remains focused on admin tools.
- Mobile service navigation opens and closes with Escape.
- Eleven new/updated page variants were checked in an actual **390px iframe viewport** for horizontal overflow; all passed.

Additional verification:

- All nine new HTML pages: no duplicate IDs and no missing local file/anchor references.
- Shared stylesheet: balanced CSS braces (after ignoring comments and strings).
- Visual inspection of screenshots: desktop showcase, desktop sign-in, small-screen sign-in and a seeded learning report.
- Chrome print output from a temporary seeded demo report produced a valid `%PDF-1.4` file, **40,060 bytes, 2 pages**. This confirms PDF creation; it is not a certification or a cross-browser print guarantee.

The initial failing empty-search check was corrected to dispatch a bubbling input event, matching browser input behavior. A dashboard-navigation check revealed that the dashboard has its own navigation logic; links were added there directly. The final run passed all checks after these changes.

## Repeating the checks

Open `tests/browser-smoke.html?run=disposable-profile` only in a disposable browser profile. The harness replaces demo storage in its own test tab. Do not run it in a tab containing demo work you want to keep.

For local-file execution Chrome requires `--allow-file-access-from-files`; an HTTP local preview is another option. The verified run used `--headless --disable-gpu --virtual-time-budget=25000 --dump-dom`, a separate temporary `--user-data-dir`, and the opt-in test URL.

Not tested: real payments, real meetings, external message delivery, backend authorization, live AI, code execution, certificate issuance, Safari/Firefox behavior, or manual interaction with the operating-system print dialog. None of those services was connected or claimed.

Existing missing references (`demo.html`, `forgot-password.html`, `js/smoke-intro.js`) are recorded in `IMPLEMENTATION-NOTES.md`; they were preserved outside this feature scope.

## Continuation verification

The final integrated continuation passed **189 / 189** checks: original browser smoke 64, content 20, languages 25, navigation 49, original pages 31. See ../CONTINUATION-NOTES.md and latest-results.json. The earlier 64-check results above describe the previous implementation. Five requested original pages now exist; the original missing smoke-intro.js reference remains unchanged.


## Integration review

The current review passed 52 connected-flow checks plus 189 regression checks (241/241), using separate disposable Chrome profiles. See ../INTEGRATION-REVIEW.md for concrete fixes, unfinished flows and test limitations. The stale smoke-intro.js include was removed; no hero/video visual code was changed. Success does not imply that backend-dependent workflows are complete.


## Requests and dashboard update

40 new checks passed plus 241 existing regression checks: **281/281**. Owner filtering, corrupt-storage preservation, confirmation-to-history navigation, actual dashboard counts and continuation links were verified in isolated Chrome profiles. Screenshots were inspected for desktop/mobile dashboard and mobile request history. See ../REQUESTS-DASHBOARD-NOTES.md. No task passes or assessment unlocks were awarded by the dashboard.
