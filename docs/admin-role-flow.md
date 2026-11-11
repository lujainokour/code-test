# Administration and sessions

The standalone teacher account is retired. Old teacher page URLs redirect to the corresponding administrator page and require an administrator session. Teacher login and registration now redirect to admin login; a stored teacher identity grants no access.

Administrators manage learning content and student account access, platform sessions, weekly availability and default prices, platform bookings, and student follow-up notes. Their dashboard shows pending platform bookings alongside tutor applications, account status and authored lesson counts. Built-in sample sessions and booking records are labeled separately.

Platform booking cycle:

1. Admin publishes a session and configures weekly availability.
2. A signed-in student chooses an available appointment and submits a learning goal.
3. Admin confirms with a scheduled HTTPS meeting link, or declines with an explanation.
4. The student sees the status, meeting link or decision note in My bookings & requests.
5. Confirmation connects the student to administrative follow-up. Existing notes are retained.
6. Completion is allowed after the scheduled end and increments completed-session progress once.

Approved student tutors retain their own sessions and booking inbox. Administration reviews applications and oversees all student sessions, bookings and learner reviews. A reasoned administrator hold prevents a session from being republished until released. A release leaves the session as a draft. Administrative cancellation includes a reason visible to both participants and releases the reserved appointment.

The `codementor-teacher-store-v1` storage key and historical public session IDs are retained for compatibility. No existing records are reset or silently overwritten. Mutations use the same Web Lock as student reservations. Malformed saved data is preserved and reported.

This remains a browser-local prototype. Production authentication, server authorization, cross-device synchronization, payments and external notifications are not connected.

Validation: `node tests/admin-sessions-store.cjs`, `node tests/peer-mentoring-store.cjs`, `node tests/service-access.cjs`, and `tests/admin-role-browser.ps1`.
