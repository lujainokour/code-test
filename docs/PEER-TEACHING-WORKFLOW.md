# Student-led teaching sessions

This feature connects a student who can teach a topic with a student who wants
help. It is separate from the AI study assistant, instructor-led sessions and
freelance deliverables. The public entry page offers two choices: **Browse student
sessions** and **Offer a teaching session**.

## Complete cycle

1. A student creates a local account and opens **Offer a session / My teaching**.
2. They submit teaching topics, experience, an HTTPS portfolio, a sample teaching
   plan and agreement to guide learners rather than complete assessed work.
3. An admin signs in through Admin Login and opens **Student tutor reviews**.
   Approval requires an explanatory note. Changes requested are visible to the
   applicant, who can revise and resubmit. Approval is a human review rather than
   an automatic consequence of completing a course.
4. An approved student saves a session draft: title, description, reviewed language,
   learning outcome, requirements, audience, duration and listed price. They add
   non-overlapping future appointments and explicitly publish the session.
5. The beginner discovers the listing, selects an available appointment and sends
   a booking request with a learning question. Requested appointments are reserved.
6. The teaching student confirms with an HTTPS meeting link or declines with an
   explanation. Only participants can see booking notes and the meeting link.
7. Both parties track the same booking. Requested bookings can be withdrawn;
   confirmed bookings can be cancelled before they start. Either participant can
   mark a confirmed session complete after its scheduled end.
8. Only the learner can review a completed session, once. The public listing shows
   average rating and count; written feedback remains with the private booking.

## Storage and limitations

The workflow uses `codementor-peer-mentoring-v1` in localStorage with Web Locks
around mutations. Existing sample peer bookings are preserved in their original
store and remain readable in My bookings. New student credentials are salted
PBKDF2 hashes in `codementor-student-accounts-v1`; plaintext passwords and password
hashes do not enter active profile or public session records. Returning registered
students can sign in on the same browser. Existing sample credentials still work.
Password recovery remains an explicitly labelled demonstration, not a reset of
these local credentials.

**This is a browser-local prototype.** Accounts in the same browser share its
workflow records. It does not provide server authorization, device-to-device
coordination, email notifications, automatic video rooms, payment collection,
refunds or independently verified attendance. Client-side admin checks can be
forged by someone controlling browser storage; deployment to real users requires
a backend enforcing these rules and persistent server-side identities.

Admin review sessions expire after eight hours and clear on Exit admin preview.
Old data is not overwritten when stored records are unreadable or invalid.

## Verification

- `node tests/peer-mentoring-store.cjs`: ownership, approval, stale revisions,
  schedule conflicts, concurrent slot reservation, state transitions, cancellation,
  completion, review privacy and corrupt-store preservation.
- `tests/peer-mentoring-browser.ps1`: two actual registrations, admin sign-in and
  approval, return sign-in, session draft, appointment, publication, discovery,
  booking, confirmation, tracker, review and mobile layout. The scheduled end is
  simulated by advancing the test page's clock; no real appointment is held.
- `node tests/service-access.cjs`: existing route access regression checks.

Browser tests use disposable profiles and do not alter the user's live records.
