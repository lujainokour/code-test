# Student Community v2

**Audience:** the project owner and future maintainers of the community pages.

**What changed:** the community is organised as **groups**: one per programming language plus General, Help and Show your project. Every group needs an administrator's approval, and your own language's group is pinned first. Everything is still saved only in this browser, and every number on the page is computed from saved data. (An earlier v2 step made channels open to everyone; the owner replaced that with approval-required groups.)

## Model

| Space | Who can read and post | How to get in |
|---|---|---|
| **Language groups:** one per language in the catalog (Python, JavaScript, C#, C++, TypeScript, Java, C, Go, Rust, PHP, Ruby, Swift, Kotlin; all but Python and JavaScript are marked "coming soon") | Approved members | A request with a short reason, then administrator approval |
| **Topic groups:** General, Help, Show your project | Approved members | Same |
| **Study groups:** Python study group, JavaScript study group, General study group, Project builders, Help circle | Approved members | Same; study groups can never be opened |

- **Approval required by default.** An administrator can switch a language or topic group to **Open** (any signed-in, enabled student reads and posts). Opening is an explicit action: it needs a reason, asks for confirmation and is written to the audit log.
- **Switching back to Approval required** keeps everyone who already posted or replied in that group as an approved member (audited as "Member kept"). Anyone else must request.
- **Your language first.** The group for your selected language appears automatically, pinned first and marked "Your language". Groups for other languages are behind "Browse other languages". Changing your language never removes a membership; those groups stay reachable from Browse, and their posts still appear in All discussions.
- **Non-members** see the group's header and description, their state with the next step (Not a member, Pending, Approved, Declined or Removed, with the administrator's note), and one **Request to join** action with a short reason. They never see posts. The state updates live when an administrator decides in another tab.
- **First visit** lands on your language group, with one sentence explaining that groups open after approval.
- **Guests** are sent to sign-in by the existing guard. A suspended account can neither read nor post.
- **Under-18 rules are unchanged.** The community has no private messages, and learners under 18 are never contacted privately. No view exposes an email address or a member list.

### Why study groups stay separate

The five private study groups keep their own memberships. Merging them into the language groups would turn a study-group member into a member of the whole language group (or the reverse), which changes who can see what. Keeping them separate means nobody silently gains or loses access.

### Migration rules

Applied once, on first read in the browser, and saved in the new form on the next write.

1. **Community data, version 3 to 4.** Former open channels (General, Help, Show your project, Python, JavaScript, C#, C++) that already have posts **stay Open**, so nobody loses access to existing discussions. Each one gets a system audit entry, "Group kept open (migration)", and the admin table labels it. Former open channels with no posts, and every new group, need approval.
2. **Membership records, version 1 to 2.** In version 1, ids such as `python` and `help` meant the old private channels, which became study groups. They are mapped once to the matching study group, so existing study-group members keep access. In version 2, ids are literal: `python` is the Python language group. Nobody gains a language-group membership from old records.
3. **Old v2 data** (posts and approvals in the former private channels) still moves one-to-one into the matching study group, as before.

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
- **Left column:** All discussions; your language group pinned first ("Your language"); General, Help and Show your project; "Browse other languages"; Saved posts; then Study groups. Each group shows its state (Member, Pending, Declined, Removed, Approval required or Open) and unread badges for groups you can read.
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

- **Ask the community** appears on `lesson.html`, `workspace.html` and `code-review.html`. It comes from a separate script, `js/community-ask.js`; the protected lesson, workspace and review scripts are untouched. It opens your active language group: a member gets the prefilled draft; anyone else gets that group's Request to join screen with a friendly message, and the draft is not kept.
- **What it fills in:** the community composer, with the lesson or task title, your language, a related link, and for the workspace your current code (for code review, your saved draft).
- **How the draft travels:** once, in this tab's sessionStorage, tied to your account. It is ignored if it belongs to another account or is older than 30 minutes.
- **Nothing is posted automatically.** You can edit or remove anything, including the code, before you press Publish.
- **Related link:** a post can carry a "Related lesson/task" link, which is validated.

## Admin (`pages/admin/admin-community.html`)

- **Unchanged:** per-request approve and decline with a note, member removal with a required reason, the moderation queue and the audit log.
- **Groups and access table:** every group with its type, access mode, a pending-count badge, members, posts, replies, solved, hidden, pinned and locked. All counts are computed from saved data. Groups kept open by the migration are labelled.
- **Access switch:** "Open group" or "Require approval" per language and topic group. It asks for confirmation, uses the shared reason field (required to open) and is written to the audit log.
- **Bulk decisions:** tick pending requests (or "Select all shown"), add one optional note, then Approve selected or Decline selected. All or nothing, with one audit entry per request.
- **Pin and lock:** pinned posts show first in Latest. Locking closes new replies and needs a reason. Both are audited.
- **Sample data:** *Load sample data* adds 30 SAMPLE posts across the groups (2 in the Python study group), 8 fictional members, 19 replies, 9 accepted answers and Helpful reactions. It also adds SAMPLE memberships: each sample member is approved in the groups they post in, plus demo requests that are pending (C#, Java), declined (Go) and removed (Rust). Loading twice adds nothing. *Remove sample data* deletes only sample posts, replies and memberships.

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
- `tests/community-groups.cjs` (14) and `tests/community-groups-admin.cjs` (1): the groups access model, covering catalog parity, approval by default, the pinned language group and Browse, the gate and welcome, no content for non-members, live Pending to Approved, Declined and Removed with notes, a language switch keeping memberships, bulk decisions, the audited access switch, migration, account switch, under-18 rules, the Ask flow, SAMPLE memberships and the admin page.
- `tests/community-v2.cjs`: its feature checks run with the original groups opened by an administrator. This change is intentional, so they test features rather than access.
- `tests/community-store.cjs`: the 26 Part 2 checks, using study-group ids and requesting membership where needed. This change is intentional.
- `tests/community-browser.ps1`: the browser flow, with screenshots in `docs/evidence/community-v2/`.
