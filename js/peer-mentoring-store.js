/* Local peer mentoring workflow. Server authentication and payments are not connected. */
(() => {
    "use strict";
    const key = "codementor-peer-mentoring-v1";
    const clone = value => JSON.parse(JSON.stringify(value));
    const text = (value, min, max) => typeof value === "string" && value.trim().length >= min && value.length <= max;
    const email = value => String(value || "").trim().toLowerCase();
    const now = () => Date.now();
    const active = booking => ["Requested", "Confirmed"].includes(booking.status);
    function user(expected) {
        const account = JSON.parse(window.cmStorage.getItem("codementor-demo-session") || "null");
        if (account?.role !== "student" || account.isDemo !== true || !text(account.name, 1, 160) || !text(account.email, 3, 254)) throw Error("Sign in as a student to continue.");
        account.email = email(account.email);
        if (expected !== undefined && account.email !== email(expected)) throw Error("Your account changed. Reload before continuing. No changes were saved.");
        window.platformStore?.assertAccess(account.email);
        return account;
    }
    function admin() {
        const account = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null");
        if (account?.role !== "admin" || account.isDemo !== true || !Number.isFinite(account.signedInAt) || account.signedInAt > now() || now() - account.signedInAt > 8 * 3600000) throw Error("Sign in through Admin Login to review mentor applications.");
        return account;
    }
    function url(value, required = true) {
        if (!value && !required) return "";
        if (!text(value, 8, 700)) throw Error("Enter a valid HTTPS link.");
        let parsed; try { parsed = new URL(value.trim()); } catch { throw Error("Enter a valid HTTPS link."); }
        if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname.includes(".")) throw Error("Use a complete HTTPS link without embedded credentials.");
        return parsed.href;
    }
    function read() {
        const raw = localStorage.getItem(key);
        if (raw === null) return { version: 1, applications: [], sessions: [], bookings: [], reviews: [] };
        let data; try { data = JSON.parse(raw); } catch { throw Error("Mentoring records could not be read. Existing data was kept."); }
        const record = item => item && typeof item.id === "string" && Number.isFinite(item.revision) && item.revision >= 1;
        if (data?.version !== 1 || !["applications", "sessions", "bookings", "reviews"].every(name => Array.isArray(data[name]) && data[name].every(record) && new Set(data[name].map(item => item.id)).size === data[name].length) ||
            !data.applications.every(a => text(a.owner, 3, 254) && text(a.name, 1, 160) && ["Pending", "Approved", "Changes requested"].includes(a.status)) ||
            !data.sessions.every(s => text(s.owner, 3, 254) && text(s.title, 5, 100) && ["Draft", "Published"].includes(s.status) && Array.isArray(s.slots) && s.slots.every(slot => text(slot.id, 1, 100) && Number.isFinite(Date.parse(slot.startAt))) && [30, 45, 60].includes(s.duration) && Number.isFinite(s.price)) ||
            !data.bookings.every(b => text(b.student, 3, 254) && text(b.mentor, 3, 254) && ["Requested", "Confirmed", "Declined", "Cancelled", "Completed"].includes(b.status) && Number.isFinite(Date.parse(b.startAt)) && [30, 45, 60].includes(b.duration)) ||
            !data.reviews.every(r => Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5)) throw Error("Mentoring records are invalid. Existing data was kept.");
        const validLink = value => { try { return url(value) === value; } catch { return false; } };
        if (new Set(data.applications.map(a => a.owner)).size !== data.applications.length ||
            !data.applications.every(a => validLink(a.portfolio)) ||
            !data.sessions.every(s => data.applications.some(a => a.owner === s.owner) && new Set(s.slots.map(slot => slot.id)).size === s.slots.length) ||
            !data.bookings.every(b => data.sessions.some(s => s.id === b.sessionId && s.owner === b.mentor) && b.student !== b.mentor && text(b.notes, 15, 1000) && (!["Confirmed", "Completed"].includes(b.status) || validLink(b.meetingUrl))) ||
            !data.reviews.every(r => data.bookings.some(b => b.id === r.bookingId && b.status === "Completed" && b.student === r.owner)) ||
            new Set(data.reviews.map(r => r.bookingId)).size !== data.reviews.length) throw Error("Mentoring record relationships are invalid. Existing data was kept.");
        return data;
    }
    async function transaction(check, change) {
        check();
        if (!navigator.locks?.request) throw Error("Safe mentoring updates require a supported browser on localhost or HTTPS.");
        return navigator.locks.request(key, async () => {
            check(); const data = read(); const result = change(data); check();
            localStorage.setItem(key, JSON.stringify(data));
            window.dispatchEvent(new CustomEvent("peer-mentoring-changed"));
            return clone(result);
        });
    }
    const find = (items, id, label) => { const item = items.find(value => value.id === id); if (!item) throw Error(`${label} was not found. Refresh this page.`); return item; };
    const revision = (item, expected) => { if (expected !== item.revision) throw Error("This record changed. Refresh before trying again."); };
    const approved = (data, owner) => data.applications.find(a => a.owner === owner && a.status === "Approved");
    const stamp = () => new Date().toISOString();
    const id = prefix => `${prefix}-${crypto.randomUUID()}`;
    const overlaps = (a, ad, b, bd) => Date.parse(a) < Date.parse(b) + bd * 60000 && Date.parse(b) < Date.parse(a) + ad * 60000;
    function application() { const account = user(); return clone(read().applications.find(a => a.owner === account.email) || null); }
    async function apply(values, expectedOwner, expectedRevision) {
        return transaction(() => user(expectedOwner), data => {
            const account = user(expectedOwner), previous = data.applications.find(a => a.owner === account.email);
            if (previous) { revision(previous, expectedRevision); if (previous.status !== "Changes requested") throw Error("Your application is already pending or approved."); }
            if (!text(values.bio, 40, 1000) || !text(values.experience, 40, 1500) || !text(values.topics, 5, 300) || !text(values.outline, 40, 1500) || !window.languageCatalog.names.includes(values.language) || values.agreement !== true) throw Error("Complete your experience, teaching topics, sample lesson plan and mentoring agreement.");
            const record = { id: previous?.id || id("mentor"), owner: account.email, name: account.name.trim(), language: values.language, bio: values.bio.trim(), experience: values.experience.trim(), topics: values.topics.trim(), outline: values.outline.trim(), portfolio: url(values.portfolio), status: "Pending", revision: (previous?.revision || 0) + 1, createdAt: previous?.createdAt || stamp(), updatedAt: stamp(), feedback: "" };
            if (previous) Object.assign(previous, record); else data.applications.push(record); return record;
        });
    }
    function applications() { admin(); return clone(read().applications); }
    async function prepareSampleApplication() {
        return transaction(admin, data => {
            // Only prepare an empty queue. Never replace a student's submission or review.
            if (data.applications.length) return null;
            const createdAt = stamp();
            const sample = {
                id: "mentor-sample-student", owner: "student@example.com", name: "Lujain Okour",
                language: "Python", topics: "Python variables, loops and functions",
                bio: "I am a student who enjoys explaining Python basics through small examples and guided practice.",
                experience: "I have practiced Python functions and loops and helped classmates debug beginner exercises.",
                outline: "Explain a simple function, trace its inputs and output together, then guide the learner through an independent exercise.",
                portfolio: "https://example.com/student-portfolio", status: "Pending", revision: 1,
                createdAt, updatedAt: createdAt, feedback: "", sample: true
            };
            data.applications.push(sample);
            return sample;
        });
    }
    async function reviewApplication(applicationId, decision, feedback, expectedRevision) {
        return transaction(admin, data => {
            const item = find(data.applications, applicationId, "Application"); revision(item, expectedRevision);
            if (!["Approved", "Changes requested"].includes(decision) || (decision === "Approved" && item.status !== "Pending")) throw Error("That review action is not available.");
            if (!text(feedback, 10, 1000)) throw Error("Add a review note explaining the decision (10-1000 characters).");
            item.status = decision; item.feedback = feedback.trim(); item.updatedAt = stamp(); item.revision++; return item;
        });
    }
    function ownSessions() { const account = user(); return clone(read().sessions.filter(s => s.owner === account.email)); }
    async function saveSession(values, expectedOwner, sessionId = null, expectedRevision) {
        return transaction(() => user(expectedOwner), data => {
            const account = user(expectedOwner), approval = approved(data, account.email); if (!approval) throw Error("Your teaching application must be approved before creating sessions.");
            if (values.language !== approval.language) throw Error("Sessions must use the language covered by your reviewed application.");
            const previous = sessionId ? find(data.sessions, sessionId, "Session") : null;
            if (previous) { if (previous.owner !== account.email) throw Error("You can only edit your own sessions."); revision(previous, expectedRevision); if (previous.status !== "Draft") throw Error("Pause the session before editing its details."); }
            if (!text(values.title, 5, 100) || !text(values.description, 30, 1500) || !text(values.outcome, 15, 500) || !text(values.requirements, 5, 500) || !["Beginner", "Intermediate"].includes(values.level) || ![30, 45, 60].includes(values.duration) || !Number.isFinite(values.price) || values.price < 0 || values.price > 250 || !window.languageCatalog.names.includes(values.language)) throw Error("Check the session details, duration and price (0-250 JOD).");
            if (previous && previous.duration !== values.duration && data.bookings.some(b => b.sessionId === previous.id && active(b))) throw Error("Duration cannot change while this session has active bookings.");
            if (previous && previous.duration !== values.duration && previous.slots.length) throw Error("Remove the existing appointments before changing duration.");
            const record = { id: previous?.id || id("peer"), owner: account.email, mentorName: account.name.trim(), title: values.title.trim(), language: values.language, description: values.description.trim(), outcome: values.outcome.trim(), requirements: values.requirements.trim(), level: values.level, duration: values.duration, price: values.price, currency: "JOD", slots: previous?.slots || [], status: "Draft", revision: (previous?.revision || 0) + 1, createdAt: previous?.createdAt || stamp(), updatedAt: stamp() };
            if (previous) Object.assign(previous, record); else data.sessions.push(record); return record;
        });
    }
    async function addSlot(sessionId, startAt, expectedOwner) {
        return transaction(() => user(expectedOwner), data => {
            const account = user(expectedOwner), session = find(data.sessions, sessionId, "Session");
            if (session.owner !== account.email || !approved(data, account.email)) throw Error("Only the approved session owner can add appointments.");
            if (!Number.isFinite(Date.parse(startAt)) || Date.parse(startAt) < now() + 15 * 60000) throw Error("Choose an appointment at least 15 minutes in the future.");
            const iso = new Date(startAt).toISOString();
            if (data.sessions.filter(s => s.owner === account.email).some(s => s.slots.some(slot => overlaps(iso, session.duration, slot.startAt, s.duration)))) throw Error("This appointment overlaps another appointment you offer.");
            if (data.bookings.some(b => active(b) && [b.mentor, b.student].includes(account.email) && overlaps(iso, session.duration, b.startAt, b.duration))) throw Error("This time conflicts with one of your bookings.");
            session.slots.push({ id: id("slot"), startAt: iso }); session.revision++; return session;
        });
    }
    async function removeSlot(sessionId, slotId, expectedOwner) {
        return transaction(() => user(expectedOwner), data => {
            const session = find(data.sessions, sessionId, "Session");
            if (session.owner !== user(expectedOwner).email) throw Error("Only the session owner can remove appointments.");
            if (data.bookings.some(b => b.slotId === slotId && active(b))) throw Error("Cancel the active booking before removing its appointment.");
            find(session.slots, slotId, "Appointment"); session.slots = session.slots.filter(slot => slot.id !== slotId); session.revision++; return session;
        });
    }
    async function publish(sessionId, publish, expectedOwner, expectedRevision) {
        return transaction(() => user(expectedOwner), data => {
            const session = find(data.sessions, sessionId, "Session"), account = user(expectedOwner); revision(session, expectedRevision);
            if (session.owner !== account.email) throw Error("Only the session owner can change its visibility.");
            if (publish && session.adminHold) throw Error("An administrator paused this session: " + session.adminHold);
            if (publish && (!approved(data, account.email) || !session.slots.some(s => Date.parse(s.startAt) > now()))) throw Error("Approval and at least one future appointment are required before publishing.");
            session.status = publish ? "Published" : "Draft"; session.revision++; return session;
        });
    }
    function publicSessions() {
        const data = read();
        return data.sessions.filter(s => s.status === "Published" && approved(data, s.owner)).map(s => {
            const ratings = data.reviews.filter(r => data.bookings.some(b => b.id === r.bookingId && b.mentor === s.owner));
            return { id: s.id, mentorName: s.mentorName, title: s.title, language: s.language, description: s.description, outcome: s.outcome, requirements: s.requirements, level: s.level, duration: s.duration, price: s.price, currency: s.currency, rating: ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null, reviewCount: ratings.length,
                slots: s.slots.filter(slot => Date.parse(slot.startAt) > now()).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).map(slot => ({ id: slot.id, startAt: slot.startAt, available: !data.bookings.some(b => b.slotId === slot.id && active(b)) })) };
        });
    }
    function mine() { const account = user(), data = read(); return clone(data.bookings.filter(b => [b.student, b.mentor].includes(account.email)).map(b => ({ ...b, viewer: b.student === account.email ? "student" : "mentor", review: data.reviews.find(r => r.bookingId === b.id) || null }))); }
    async function book(sessionId, slotId, notes, expectedOwner) {
        return transaction(() => user(expectedOwner), data => {
            const student = user(expectedOwner), session = find(data.sessions, sessionId, "Session");
            if (session.owner === student.email) throw Error("You cannot book your own session.");
            if (session.status !== "Published" || !approved(data, session.owner)) throw Error("This session is no longer available for booking.");
            const slot = find(session.slots, slotId, "Appointment");
            if (Date.parse(slot.startAt) <= now()) throw Error("This appointment has passed. Choose a future time.");
            if (!text(notes, 15, 1000)) throw Error("Describe what you need help with (15-1000 characters).");
            if (data.bookings.some(b => active(b) && (b.slotId === slotId || ([b.mentor, b.student].includes(student.email) && overlaps(slot.startAt, session.duration, b.startAt, b.duration))))) throw Error("The appointment is reserved or conflicts with another booking. Choose another time.");
            const booking = { id: id("peer-booking"), revision: 1, sessionId, slotId, student: student.email, studentName: student.name.trim(), mentor: session.owner, mentorName: session.mentorName, title: session.title, startAt: slot.startAt, duration: session.duration, price: session.price, currency: session.currency, notes: notes.trim(), status: "Requested", meetingUrl: "", reason: "", createdAt: stamp(), updatedAt: stamp() };
            data.bookings.push(booking); return booking;
        });
    }
    async function updateBooking(bookingId, status, values, expectedOwner, expectedRevision) {
        return transaction(() => user(expectedOwner), data => {
            const account = user(expectedOwner), booking = find(data.bookings, bookingId, "Booking"); revision(booking, expectedRevision);
            const mentor = booking.mentor === account.email, learner = booking.student === account.email;
            if (!mentor && !learner) throw Error("This booking belongs to another account.");
            if (status === "Confirmed") {
                if (!mentor || booking.status !== "Requested" || !approved(data, account.email) || Date.parse(booking.startAt) <= now()) throw Error("Only the approved mentor can confirm a future requested booking.");
                booking.meetingUrl = url(values.meetingUrl);
            } else if (status === "Declined") {
                if (!mentor || booking.status !== "Requested") throw Error("Only the mentor can decline a requested booking.");
                if (!text(values.reason, 5, 500)) throw Error("Add a short explanation for declining."); booking.reason = values.reason.trim();
            } else if (status === "Cancelled") {
                if (!active(booking) || (booking.status === "Confirmed" && Date.parse(booking.startAt) <= now())) throw Error("Only requested appointments or future confirmed bookings can be cancelled.");
                if (!text(values.reason, 5, 500)) throw Error("Add a short cancellation reason."); booking.reason = values.reason.trim(); booking.meetingUrl = "";
            } else if (status === "Completed") {
                if (booking.status !== "Confirmed" || now() < Date.parse(booking.startAt) + booking.duration * 60000) throw Error("A confirmed session can be completed only after its scheduled end.");
            } else throw Error("That booking action is not available.");
            booking.status = status; booking.updatedAt = stamp(); booking.revision++; return booking;
        });
    }
    async function rate(bookingId, rating, comment, expectedOwner) {
        return transaction(() => user(expectedOwner), data => {
            const account = user(expectedOwner), booking = find(data.bookings, bookingId, "Booking");
            if (booking.student !== account.email || booking.status !== "Completed") throw Error("Only the learner can review their completed session.");
            if (data.reviews.some(r => r.bookingId === bookingId)) throw Error("This session has already been reviewed.");
            if (!Number.isInteger(rating) || rating < 1 || rating > 5 || typeof comment !== "string" || comment.length > 1000) throw Error("Choose a rating from 1 to 5 and keep feedback under 1000 characters.");
            const review = { id: id("review"), revision: 1, bookingId, owner: account.email, rating, comment: comment.trim(), createdAt: stamp() }; data.reviews.push(review); return review;
        });
    }
    function adminSnapshot() { admin(); return clone(read()); }
    async function adminPauseSession(sessionId, reason, expectedRevision) {
        return transaction(admin, data => {
            const session = find(data.sessions, sessionId, "Session"); revision(session, expectedRevision);
            if (session.status !== "Published" || !text(reason, 5, 500)) throw Error("Choose a published session and explain why it is being paused (5-500 characters).");
            session.status = "Draft"; session.adminHold = reason.trim(); session.updatedAt = stamp(); session.revision++; return session;
        });
    }
    async function adminReleaseSession(sessionId, expectedRevision) {
        return transaction(admin, data => {
            const session = find(data.sessions, sessionId, "Session"); revision(session, expectedRevision);
            if (!session.adminHold) throw Error("This session has no administrator hold.");
            session.adminHold = ""; session.updatedAt = stamp(); session.revision++; return session;
        });
    }
    async function adminCancelBooking(bookingId, reason, expectedRevision) {
        return transaction(admin, data => {
            const booking = find(data.bookings, bookingId, "Booking"); revision(booking, expectedRevision);
            if (!active(booking) || !text(reason, 5, 500)) throw Error("Choose an active booking and explain the cancellation (5-500 characters).");
            booking.status = "Cancelled"; booking.reason = "Administrator: " + reason.trim(); booking.meetingUrl = ""; booking.updatedAt = stamp(); booking.revision++; return booking;
        });
    }
    window.peerMentoringStore = Object.freeze({ user, admin, application, apply, applications, prepareSampleApplication, reviewApplication, ownSessions, saveSession, addSlot, removeSlot, publish, publicSessions, mine, book, updateBooking, rate, adminSnapshot, adminPauseSession, adminReleaseSession, adminCancelBooking });
})();
