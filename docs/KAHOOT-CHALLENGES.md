# Optional Kahoot assignments

Implemented only in the development workspace:
`C:/Users/user/Desktop/CodeMentor-AI`.
The separate Git repository at `delivery/CodeMentor-AI` was not modified.

## Configure the real assignment

Edit `js/level-challenges.js`, under `levels.python["1"]`, and replace
`assignmentUrl: null` with the real HTTPS Assignment link copied from Kahoot.
Keep the URL in this data file only, never in page markup.

The validator accepts the exact participant hostname `kahoot.it` and a direct
`/challenge/<assignment-id>` path. It rejects HTTP, credentials, nonstandard
ports, lookalike domains, the homepage, and public quiz/share links. Validation
checks URL structure; it does not verify the assignment's existence, deadline
or availability. Confirm the actual assignment opens after adding its real link.

Missing or rejected URLs show **Challenge coming soon** without a clickable
control. A valid configured URL displays **Play on Kahoot!**, opens a new tab,
and uses `rel="noopener noreferrer"`.

Only Level 01 has a data entry. To add a future level, add another record under
`levels.python` using its level ID, title, description and assignmentUrl.
Unconfigured levels do not display a challenge card.

This optional activity does not write storage, record completion, award scores,
pass tasks or affect assessments or level unlocking. No Kahoot results are synced.

## Browser checks

Start `tests/serve.ps1 -Port 8897`, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/kahoot-challenge.ps1
```

The test uses a separate temporary Chrome profile. It injects a synthetic link
only into the running test page, and maps `kahoot.it` to loopback for that browser
process. It opens a real new tab without contacting a real Kahoot assignment and
checks that opener and referrer are absent. Production configuration stays null.
Storage snapshots verify that rendering and clicking leave all saved records
unchanged. The suite also checks missing/invalid URLs, mobile layout and quiz
independence. Results: `docs/kahoot-challenge-results.json`.

Kahoot's official assignment instructions:
https://support.kahoot.com/hc/en-us/articles/360039411334-How-to-assign-a-kahoot-in-web-platform
