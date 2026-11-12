# Student Community v2

**Audience:** the project owner and future maintainers of the community pages.

**What changed:** the community no longer opens on a locked gate. Students read and post straight away in open channels. Private study groups keep the old request-and-approval flow. Everything is still saved only in this browser, and every number on the page is computed from saved posts.

## Model

| Space | Who can read and post | Approval |
|---|---|---|
| **Open channels:** General, Help, Show your project, Python, JavaScript, C# and C++ | Any signed-in, enabled student. C# and C++ show "path coming soon" because there is no learning path for them yet; posting is allowed. | None |
| **Study groups:** Python study group, JavaScript study group, General study group, Project builders, Help circle | Approved members only | A request with a reason, then administrator approval. This flow and its rules are unchanged. |

- **Guests** are sent to sign-in by the existing guard. A suspended account can neither read nor post.
- **Under-18 rules are unchanged.** The community has no private messages, and learners under 18 are never contacted privately. No view exposes an email address.

### What happened to the old private channels

Before v2, the five channels (`python`, `javascript`, `general`, `projects`, `help`) were themselves private. On first read, the store migrates from version 2 to version 3:
- each old channel's posts move to the matching study group, one to one;
- each old approval becomes an approval for that study group.

So nothing that was private became public. Old v1 topic channels are mapped the same way.

## Safety, kept from Part 2

- All user text is stored and rendered as plain text. No community script parses HTML, and a test enforces this.
- Code is never run. Syntax highlighting turns code into text tokens, so joining the tokens always gives back the exact code.
- The usual limits still apply: title, body, code and reply lengths, and at most 5 tags.
- Rate limits are unchanged: 3 posts and 10 replies per 5 minutes.
- Reports, hidden and removed states, the moderation queue and the audit log all work as before.
- Each account's data is kept separate. A tab whose account changed cannot write as the old account.
- Corrupt study-group membership records lock the study groups only and are never overwritten. Open channels keep working.

## Page

- **Header:** compact, with Ask a question, Notifications and one small "saved in this browser only" note.
- **Layout:** three columns on desktop, two on tablet, and Channels / Feed / Highlights tabs on phones.
- **Left column:** channels with icons and unread badges, your active language pinned first, then Study groups and Saved posts.
- **Centre column:**
  - the composer, with channel, title, details, an optional code block (Python, JavaScript, C#, C++ or plain text) and tags;
  - "Similar questions", found by matching words and tags and labelled as a system suggestion, not AI;
  - the tabs Latest, Unanswered, Solved, Top and My posts;
  - search and a tag filter;
  - the feed.
- **Right column:**
  - your community profile;
  - Unanswered — can you help? (3 questions);
  - Solved today;
  - Top helpers this week;
  - Trending tags;
  - Weekly challenge: a real level 1–5 practice task in your active language, picked by ISO week;
  - Community guidelines, collapsed.
- **Post view:** a drawer (modal dialog). Focus moves to the title, Esc or Close returns focus to the card, and `?post=<id>` links straight to a post. It includes:
  - code highlighting with a Copy button;
  - threaded replies, one level deep;
  - editing your own reply, marked "edited";
  - Helpful on replies;
  - the post's author choosing an accepted answer;
  - locked and related-link states.
- **Toasts and Undo:** a toast confirms each post, reply and accepted answer. Undo is offered only where the action can really be reversed: delete the new post or reply, restore the previous accepted answer, or restore a deleted post.
- **Reduced motion:** the drawer slides in and the celebration plays only when the system does not ask for reduced motion.

## Reputation (computed, never stored)

- **Points:** 10 for an accepted answer, 2 for each Helpful on your reply, 1 for each Helpful on your post. Reactions or replies on your own posts never count.
- **Scope:** only posts the viewer can read are counted, so study-group activity stays invisible to non-members. Hidden posts never count.
- **Badges:**
  - First answer: replied to another member's question.
  - Helper: replied to 5 posts by other members.
  - Problem solver: had an answer accepted.
  - Welcome wagon: replied to the first post of 3 different members.
- **Top helpers this week** uses points from the last 7 days.
- **Celebration:** a small toast and confetti the first time each of your answers is accepted, once per answer.

## Learning integration

- **Ask the community** appears on `lesson.html`, `workspace.html` and `code-review.html`. It comes from a separate script, `js/community-ask.js`; the protected lesson, workspace and review scripts are untouched.
- **What it fills in:** the community composer, with the lesson or task title, your language, a related link, and for the workspace your current code (for code review, your saved draft).
- **How the draft travels:** once, in this tab's sessionStorage, tied to your account. It is ignored if it belongs to another account or is older than 30 minutes.
- **Nothing is posted automatically.** You can edit or remove anything, including the code, before you press Publish.
- **Related link:** a post can carry a "Related lesson/task" link, which is validated.

## Admin (`pages/admin/admin-community.html`)

- **Unchanged:** the study-group membership queue, the moderation queue and the audit log.
- **New "Open channels and study groups" table:** posts, replies, solved, hidden, pinned and locked counts, plus member counts for study groups. All are computed from saved posts.
- **Pin and lock:** pinned posts show first in Latest. Locking closes new replies and needs a reason. Both are written to the audit log.
- **Sample data:**
  - *Load sample data* adds 30 posts across the open channels, 2 of them in the Python study group, from 8 fictional members, with 19 replies, 9 accepted answers and Helpful reactions.
  - Titles start with `[SAMPLE]`, authors are "Sample Learner N (SAMPLE)", and owners use `@sample.invalid` addresses.
  - Loading twice adds nothing. *Remove sample data* deletes only sample posts and replies, and asks first if real replies are attached to them.

## What is real and what is SAMPLE

- **Real:** every post, reply, reaction and count that students create in this browser.
- **SAMPLE:** only content loaded by the administrator's button, always labelled SAMPLE. Sample members' points and badges are computed from those sample threads in the same way, and show with SAMPLE names.
- **Never stored:** no number is estimated or kept separately.

## Tests

- `tests/community-v2.cjs`: 35 checks, covering:
  - the feed, highlights and weekly challenge;
  - highlighting and XSS;
  - threads, accepted answers and Undo;
  - the reply rate limit;
  - similar questions;
  - open-channel permissions, suspended accounts and guests;
  - study-group privacy in every view;
  - the v2→v3 migration and unread counts;
  - account-switch isolation;
  - under-18 rules and that no email is exposed;
  - corrupt membership records;
  - layout CSS;
  - reputation and badges;
  - learning drafts;
  - related links;
  - sample-data idempotency;
  - channel statistics;
  - pin and lock;
  - the admin page.
- `tests/community-store.cjs`: the 26 Part 2 checks, now using study-group ids. This change is intentional.
- `tests/community-browser.ps1`: the browser flow, with screenshots in `docs/evidence/community-v2/`.
