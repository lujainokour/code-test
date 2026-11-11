# Student learning journey

The dashboard is the starting point after preferences. Placement remains optional.
The four primary links are Dashboard, Learning path, Practice tasks and My progress.
Help, learning tools, projects and services remain available in separate expandable
groups. Existing accounts and stored progress use their original keys and formats.

The dashboard recommends the first unfinished lesson in the current level, then
coding practice, then the level quiz. Students can go directly to the quiz after
the lessons; practice remains recommended rather than a new unlocking requirement.
The existing 70% quiz threshold controls progression. The Foundations project
requires completed lessons and passed quizzes in Levels 1-3. Full path completion
means all six levels, with Level 6 retaining its Premium preview requirement.

Learning pages provide links to the current level, lesson, practice and progress.
Mentor links carry the current level and lesson. Bookings and service activity
remain available in a collapsed dashboard panel.

## Verification

Run `tests/student-journey-browser.ps1` using the same PowerShell execution options
as other browser suites. It uses a disposable Chrome profile and its own local
server; it does not change the user's browser records. It exercises sign-in,
preferences, four lesson answers, two tasks in the real Python runtime, the level
quiz, Level 2 continuation, mentor context, project availability and completion.
It also checks desktop and mobile layouts. Run `node tests/service-access.cjs`
for the existing route access regression checks.

This remains a browser-local demo. These changes do not add server authentication,
multi-device account sync, payments or live AI responses.
