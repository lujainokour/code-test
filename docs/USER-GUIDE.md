# Workspace welcome guide

The shared workspace shell loads a five-chapter guide for students and a
separate guide for the admin preview. The guide introduces navigation and
available actions; it does not represent course completion or impose a new
workflow on the user.

Signed-in student profiles see it on their first workspace visit, including
onboarding. The admin preview has its own first-visit preference. Guests can
open the guide manually. Public and authentication pages do not load it.

Users can select any chapter, move back or forward, open its destination,
finish, skip, close, or press Escape. The User guide button in the sidebar
reopens it from any workspace page. Dismissing or following a destination
remembers the choice in `codementor-guide-v1:<role>:<encoded-owner>` in
localStorage, with sessionStorage as a fallback. Student preferences are
separate for each profile email. No learning records or account fields are
changed. With inaccessible preference storage, automatic opening is suppressed
and the manual guide remains available.

The modal uses native dialog focus containment, an accessible title, labelled
chapter buttons, a live chapter announcement, focus restoration, reduced-motion
support, and the current light palette. Historical dark screenshot names do not imply an active dark-mode feature. On small screens the road becomes a compact
chapter selector; the dialog scrolls independently of the page.

Implementation: `js/user-guide.js`, `css/user-guide.css`, and the loader in
`js/workspace-shell.js`.

Run the development server on port 8896, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/user-guide.ps1
```

The test uses an isolated Chrome profile. Results are saved in
`docs/user-guide-results.json`; screenshots are saved in the system temp folder.
