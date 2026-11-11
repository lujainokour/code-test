(() => {
    "use strict";
    const store = window.peerMentoringStore;
    const app = new URL("../", document.currentScript.src);
    const href = path => new URL("pages/" + path, app).href;
    const date = value => new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const n = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
    function link(text, path, cls = "button button-outline") { const node = n("a", text, cls); node.href = href(path); return node; }
    function external(text, url) { const node = n("a", text, "button button-outline"); node.href = url; node.target = "_blank"; node.rel = "noopener noreferrer"; return node; }
    function field(form, label, name, type = "text", value = "", options = []) {
        const wrap = n("div", undefined, "form-field"); const caption = n("label", label); caption.htmlFor = name;
        const input = n(type === "textarea" ? "textarea" : type === "select" ? "select" : "input"); input.id = name; input.name = name;
        if (input.tagName === "INPUT") input.type = type;
        if (type === "select") options.forEach(option => { const item = n("option", typeof option === "string" ? option : option.label); item.value = typeof option === "string" ? option : option.value; input.append(item); });
        input.value = value; input.required = true;
        if (type === "textarea") { input.rows = 4; input.maxLength = 1500; }
        wrap.append(caption, input); form.append(wrap); return input;
    }
    function message(host) { const node = n("p", "", "form-message"); node.setAttribute("role", "status"); node.setAttribute("aria-live", "polite"); host.append(node); return node; }
    function formAction(form, label, callback, done) {
        const button = n("button", label, "button button-primary"); button.type = "submit"; form.append(button); const status = message(form);
        form.addEventListener("submit", async event => {
            event.preventDefault(); if (button.disabled || !form.reportValidity()) return;
            button.disabled = true; status.textContent = "Saving..."; status.classList.remove("is-error");
            try { const result = await callback(); done?.(result); if (form.isConnected) status.textContent = "Saved."; }
            catch (error) { status.textContent = error.message; status.classList.add("is-error"); }
            finally { button.disabled = false; }
        }); return button;
    }
    function button(host, label, callback, done) {
        const node = n("button", label, "button button-outline"); node.type = "button"; host.append(node);
        node.addEventListener("click", async () => { if (node.disabled) return; node.disabled = true;
            try { await callback(); done?.(); } catch (error) { let status = host.querySelector(".form-message"); if (!status) status = message(host); status.textContent = error.message; status.classList.add("is-error"); }
            finally { node.disabled = false; }
        }); return node;
    }
    function panel(title, intro) { const section = n("section", undefined, "services-panel peer-panel"); section.append(n("h2", title)); if (intro) section.append(n("p", intro, "peer-muted")); return section; }
    function badge(text) { return n("span", text, "services-tag peer-status"); }
    function empty(host, title, text) { const block = n("div", undefined, "peer-empty"); block.append(n("h3", title), n("p", text)); host.append(block); }
    function note(host) { host.append(n("p", "Local workspace: this cycle is shared between accounts in this browser. Cross-device accounts, automatic meeting creation and payments are not connected.", "peer-local-note")); }
    function sessionCard(session) {
        const card = n("article", undefined, "services-card peer-session-card");
        card.append(badge("Reviewed student tutor"), n("h3", session.title), n("p", `${session.mentorName} · ${session.language} · ${session.level}`, "peer-muted"), n("p", session.description), n("p", session.outcome, "peer-outcome"));
        const available = session.slots.filter(slot => slot.available);
        card.append(n("p", `${session.duration} minutes · ${session.price === 0 ? "Free" : `${session.price} JOD (no payment collected)`}`, "peer-price"), n("p", session.reviewCount ? `${session.rating.toFixed(1)} / 5 from ${session.reviewCount} completed-session reviews` : "New student tutor · no completed-session reviews yet", "peer-muted"), n("p", available.length ? `Next available: ${date(available[0].startAt)}` : "No appointments currently available", "peer-muted"), link("View session & appointments", `services/mentoring-details.html?id=${encodeURIComponent(session.id)}`, "button button-primary"));
        return card;
    }
    function catalogue(root, platformSessions = []) {
        root.replaceChildren();
        const entry = n("div", undefined, "peer-entry-points");
        const learn = n("article"); learn.append(n("p", "I WANT TO LEARN", "eyebrow"), n("h2", "Find a student who can explain it."), n("p", "Browse focused sessions, choose a time and request a booking with another student."));
        const browse = n("a", "Browse student sessions", "button button-primary"); browse.href = "#peer-published-sessions"; learn.append(browse);
        const teach = n("article"); teach.append(n("p", "I WANT TO TEACH", "eyebrow"), n("h2", "Good at a topic? Offer a session."), n("p", "Apply to teach, get admin approval, then publish your session and available times."), link("Offer a teaching session", "student/mentor-studio.html", "button button-outline")); entry.append(learn, teach); root.append(entry);
        const intro = n("div", undefined, "peer-toolbar"); intro.append(n("p", "These are student-to-student teaching sessions, separate from the AI study assistant. Your tutor is a fellow student who guides your understanding."), link("My bookings", "student/requests.html#booking-history")); root.append(intro);
        const form = n("form", undefined, "peer-filters"); form.setAttribute("role", "search");
        const search = field(form, "Find a topic or student tutor", "peer-search", "search"); search.required = false;
        const language = field(form, "Language", "peer-language", "select", "All languages", ["All languages", ...window.languageCatalog.names]);
        const results = n("p", "", "peer-muted"); results.setAttribute("role", "status"); const grid = n("div", undefined, "peer-grid"); grid.id = "peer-published-sessions";
        function render() {
            try {
                const query = search.value.trim().toLowerCase();
                const sessions = store.publicSessions().filter(s => (language.value === "All languages" || s.language === language.value) && [s.title, s.mentorName, s.description, s.outcome].join(" ").toLowerCase().includes(query));
                results.textContent = `${sessions.length} published student ${sessions.length === 1 ? "session" : "sessions"} · appointments shown in ${timezone}`;
                grid.replaceChildren(...sessions.map(sessionCard));
                if (!sessions.length) empty(grid, "No matching student sessions yet", "Try another search, or apply to share your knowledge as a student tutor.");
            } catch (error) { grid.replaceChildren(n("p", error.message, "services-notice")); }
        }
        form.addEventListener("submit", event => { event.preventDefault(); render(); }); form.addEventListener("input", render); form.addEventListener("change", render); root.append(form, results, grid); render();
        if (platformSessions.length) {
            const section = n("details", undefined, "services-panel peer-panel peer-instructors"); section.append(n("summary", "Platform sessions (a separate service)"), n("p", "Platform sessions are scheduled and managed by administrators, alongside sessions offered by approved student tutors.", "peer-muted")); const list = n("div", undefined, "peer-grid");
            platformSessions.forEach(item => { const card = n("article", undefined, "services-card"); card.append(badge("Platform session"), n("h3", item.topic), n("p", item.providerName), n("p", `${item.duration} minutes · ${item.price} ${item.currency}`), link("View platform session", `services/mentoring-details.html?id=${encodeURIComponent(item.id)}`)); list.append(card); }); section.append(list); root.append(section);
        }
        note(root); window.addEventListener("storage", event => { if (event.key === "codementor-peer-mentoring-v1") render(); });
    }
    function details(root, id) {
        let success = "";
        function render() {
            root.replaceChildren();
            try {
                const session = store.publicSessions().find(s => s.id === id);
                if (!session) { empty(root, "This session is not currently available", "The mentor may have paused this listing. Existing bookings are kept in My bookings."); root.append(link("Browse student sessions", "services/peer-mentoring.html"), link("My bookings", "student/requests.html#booking-history")); return; }
                root.append(link("Back to student sessions", "services/peer-mentoring.html"), sessionCard(session));
                // The current listing does not need a link back to itself.
                root.querySelector(".peer-session-card > a:last-child")?.remove();
                const info = panel("Before you book", session.requirements); info.append(n("p", `Appointments use your browser time zone: ${timezone}. Your request reserves a slot while the mentor reviews it. A meeting link appears only after confirmation.`)); root.append(info);
                if (success) { const status = n("p", success, "peer-success"); status.setAttribute("role", "status"); root.append(status, link("Track my booking", "student/requests.html#booking-history", "button button-primary")); }
                const owner = store.user().email;
                if (store.ownSessions().some(s => s.id === id)) { root.append(link("Manage my teaching session", "student/mentor-studio.html")); return; }
                const section = panel("Request an appointment"); const slots = session.slots.filter(slot => slot.available).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
                if (!slots.length) { empty(section, "All current appointments are reserved", "Check back for more times or explore another mentor."); root.append(section); return; }
                const form = n("form", undefined, "peer-form"); const slot = field(form, "Available appointment", "peer-slot", "select", "", [{ value: "", label: "Choose an appointment" }, ...slots.map(s => ({ value: s.id, label: date(s.startAt) }))]);
                const notes = field(form, "What would you like help with?", "peer-booking-notes", "textarea"); notes.minLength = 15; notes.maxLength = 1000;
                form.append(n("p", "Booking records stay in this browser. No payment is collected. Cancellation is available before the appointment starts.", "peer-muted"));
                formAction(form, "Request this appointment", () => store.book(id, slot.value, notes.value, owner), () => { success = "Request saved. The student tutor must confirm it and add a meeting link before the session is confirmed."; render(); }); section.append(form); root.append(section); note(root);
            } catch (error) { root.append(n("p", error.message, "services-notice")); }
        }
        render();
    }
    function bookingCard(booking, owner, refresh) {
        const card = n("article", undefined, "services-card request-record peer-booking-card"); card.id = booking.id;
        card.append(badge(booking.status), n("h3", booking.title), n("p", `${booking.viewer === "mentor" ? "Learner: " + booking.studentName : "Student tutor: " + booking.mentorName}`, "peer-muted"), n("p", `${date(booking.startAt)} · ${booking.duration} minutes · ${timezone}`), n("p", `${booking.price === 0 ? "Free session" : booking.price + " JOD · no payment collected"}`, "peer-muted"), n("p", booking.notes, "request-text"));
        if (booking.reason) card.append(n("p", "Reason: " + booking.reason, "peer-muted"));
        if (booking.status === "Confirmed" && booking.meetingUrl) card.append(external("Join confirmed session (new tab)", booking.meetingUrl));
        if (booking.status === "Requested" && booking.viewer === "mentor") {
            const confirm = n("form", undefined, "peer-form peer-action-form"); const meeting = field(confirm, "Meeting link (HTTPS, shared only with this learner)", "meeting-" + booking.id, "url");
            formAction(confirm, "Confirm appointment", () => store.updateBooking(booking.id, "Confirmed", { meetingUrl: meeting.value }, owner, booking.revision), refresh); card.append(confirm);
            const decline = n("details", undefined, "peer-secondary-action"); decline.append(n("summary", "Decline this request")); const form = n("form", undefined, "peer-form"); const reason = field(form, "Reason for declining", "decline-" + booking.id, "textarea"); reason.minLength = 5; reason.maxLength = 500;
            formAction(form, "Decline request", () => store.updateBooking(booking.id, "Declined", { reason: reason.value }, owner, booking.revision), refresh); decline.append(form); card.append(decline);
        }
        if (booking.status === "Requested" || (booking.status === "Confirmed" && Date.parse(booking.startAt) > Date.now())) {
            const cancel = n("details", undefined, "peer-secondary-action"); cancel.append(n("summary", "Cancel this booking")); const form = n("form", undefined, "peer-form"); const reason = field(form, "Cancellation reason", "cancel-" + booking.id, "textarea"); reason.minLength = 5; reason.maxLength = 500;
            formAction(form, "Cancel booking", () => store.updateBooking(booking.id, "Cancelled", { reason: reason.value }, owner, booking.revision), refresh); cancel.append(form); card.append(cancel);
        }
        if (booking.status === "Confirmed" && Date.now() >= Date.parse(booking.startAt) + booking.duration * 60000) button(card, "Mark session completed", () => store.updateBooking(booking.id, "Completed", {}, owner, booking.revision), refresh);
        if (booking.status === "Completed" && booking.viewer === "student" && !booking.review) {
            const form = n("form", undefined, "peer-form"); const rating = field(form, "Rate this completed session", "rating-" + booking.id, "select", "", [{ value: "", label: "Choose a rating" }, ...[5, 4, 3, 2, 1].map(value => ({ value: String(value), label: `${value} / 5` }))]);
            const comment = field(form, "Private feedback for the student tutor (optional)", "review-" + booking.id, "textarea"); comment.required = false; comment.maxLength = 1000;
            form.append(n("p", "Only the average rating and review count appear on the public listing. Your written feedback stays with this booking.", "peer-muted"));
            formAction(form, "Submit session review", () => store.rate(booking.id, Number(rating.value), comment.value, owner), refresh); card.append(form);
        }
        if (booking.review) card.append(n("p", `Session review: ${booking.review.rating} / 5${booking.review.comment ? " · " + booking.review.comment : ""}`, "peer-outcome"));
        return card;
    }
    function learnerBookings(section) {
        try {
            const owner = store.user().email, bookings = store.mine().filter(b => b.viewer === "student").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            bookings.forEach(b => section.append(bookingCard(b, owner, () => window.dispatchEvent(new CustomEvent("peer-mentoring-refresh"))))); return bookings.length;
        } catch (error) { section.append(n("p", error.message, "services-notice")); return 0; }
    }
    function studio(root) {
        const owner = store.user().email; let editing = null;
        const status = message(root), content = n("div"); root.append(content);
        function render() {
            content.replaceChildren();
            try {
                store.user(owner); const application = store.application();
                const intro = n("div", undefined, "peer-toolbar"); intro.append(link("Browse student sessions", "services/peer-mentoring.html"), link("My learner bookings", "student/requests.html#booking-history"));
                const incoming = store.mine().filter(b => b.viewer === "mentor");
                if (application?.status === "Approved" || incoming.length) { const shortcut = n("a", `Learner requests (${incoming.filter(b => b.status === "Requested").length} new)`, "button button-outline"); shortcut.href = "#teaching-bookings"; intro.append(shortcut); }
                content.append(intro);
                const steps = n("ol", undefined, "peer-process"); ["Apply to teach", "Admin review", "Publish appointments", "Confirm & teach", "Complete & review"].forEach(text => steps.append(n("li", text))); content.append(steps);
                if (!application || application.status === "Changes requested") {
                    const section = panel(application ? "Update your teaching application" : "Apply to teach other students", "Show what you know and how you explain it. Admin approval is required before you can publish sessions.");
                    if (application?.feedback) section.append(n("p", "Review feedback: " + application.feedback, "services-notice"));
                    const form = n("form", undefined, "peer-form"); const language = field(form, "Main teaching language", "mentor-language", "select", application?.language || "Python", window.languageCatalog.names);
                    const topics = field(form, "Topics you can explain", "mentor-topics", "text", application?.topics || ""); topics.maxLength = 300;
                    const bio = field(form, "Introduce yourself to learners", "mentor-bio", "textarea", application?.bio || ""); bio.minLength = 40; bio.maxLength = 1000;
                    const experience = field(form, "Relevant experience and why you are ready to mentor", "mentor-experience", "textarea", application?.experience || ""); experience.minLength = 40;
                    const portfolio = field(form, "Public project or portfolio link (HTTPS)", "mentor-portfolio", "url", application?.portfolio || "");
                    const outline = field(form, "Sample lesson plan: how would you help a beginner?", "mentor-outline", "textarea", application?.outline || ""); outline.minLength = 40;
                    const agreement = n("label", undefined, "peer-agreement"); const check = n("input"); check.type = "checkbox"; check.required = true; check.id = "mentor-agreement";
                    agreement.append(check, document.createTextNode("I will guide learners, respect their privacy and explain concepts instead of completing assessed work for them.")); form.append(agreement);
                    formAction(form, application ? "Resubmit for review" : "Submit mentor application", () => store.apply({ language: language.value, topics: topics.value, bio: bio.value, experience: experience.value, portfolio: portfolio.value, outline: outline.value, agreement: check.checked }, owner, application?.revision), () => { status.textContent = "Application submitted. You can follow its review here."; render(); }); section.append(form); content.append(section);
                } else {
                    const section = panel("Your teaching application"); section.append(badge(application.status), n("p", application.status === "Approved" ? "Your application has been reviewed. Create a session draft, add appointments, then publish it." : "Your application is awaiting admin review. Sessions stay unpublished until approval."));
                    if (application.feedback) section.append(n("p", application.feedback, "peer-outcome")); content.append(section);
                }
                if (application?.status === "Approved") {
                    const sessions = store.ownSessions(), existing = sessions.find(s => s.id === editing);
                    const section = panel(existing ? "Edit session draft" : "Create a session draft", "Be specific about who the session is for and what the learner will understand by the end."); const form = n("form", undefined, "peer-form");
                    const title = field(form, "Session title", "peer-title", "text", existing?.title || ""); title.minLength = 5; title.maxLength = 100;
                    const language = field(form, "Reviewed teaching language", "session-language", "select", existing?.language || application.language, [application.language]);
                    const level = field(form, "Who is it for?", "peer-level", "select", existing?.level || "Beginner", ["Beginner", "Intermediate"]);
                    const description = field(form, "What will you cover?", "peer-description", "textarea", existing?.description || ""); description.minLength = 30;
                    const outcome = field(form, "Learning outcome", "peer-outcome", "textarea", existing?.outcome || ""); outcome.minLength = 15; outcome.maxLength = 500;
                    const requirements = field(form, "What should the learner know or bring?", "peer-requirements", "text", existing?.requirements || ""); requirements.minLength = 5; requirements.maxLength = 500;
                    const duration = field(form, "Duration in minutes", "peer-duration", "select", String(existing?.duration || 45), ["30", "45", "60"]);
                    const price = field(form, "Listed price in JOD (0 for free; payments are not enabled)", "peer-price", "number", String(existing?.price || 0)); price.min = "0"; price.max = "250"; price.step = "0.5";
                    formAction(form, "Save session draft", () => store.saveSession({ title: title.value, language: language.value, level: level.value, description: description.value, outcome: outcome.value, requirements: requirements.value, duration: Number(duration.value), price: Number(price.value) }, owner, existing?.id, existing?.revision), () => { editing = null; status.textContent = "Draft saved. Add at least one future appointment, then publish your session."; render(); }); section.append(form);
                    if (sessions.length) { const builder = n("details", undefined, "peer-builder"); builder.open = Boolean(existing); builder.append(n("summary", existing ? "Edit teaching session" : "Create another teaching session"), section); content.append(builder); } else content.append(section);
                    const list = panel("My sessions & appointments", `Times are shown in ${timezone}. Pausing a listing stops new requests; existing bookings stay in your inbox.`);
                    list.id = "my-teaching-sessions";
                    if (!sessions.length) empty(list, "Your first session starts with a draft", "Save your session details above, then add the times you can teach.");
                    sessions.forEach(session => {
                        const card = n("article", undefined, "services-card peer-manage-card"); card.append(badge(session.status), n("h3", session.title), n("p", `${session.duration} minutes · ${session.price} JOD`, "peer-muted"));
                        const slots = n("ul", undefined, "peer-slots");
                        session.slots.forEach(slot => { const row = n("li"); const reserved = store.mine().some(b => b.slotId === slot.id && ["Requested", "Confirmed"].includes(b.status)); row.append(n("span", `${date(slot.startAt)}${reserved ? " · Reserved" : ""}`)); if (!reserved) button(row, "Remove time", () => store.removeSlot(session.id, slot.id, owner), () => { status.textContent = "Appointment removed. Existing booking records were kept."; render(); }); slots.append(row); }); card.append(slots);
                        if (session.adminHold) card.append(n("p", "Administrator hold: " + session.adminHold, "services-notice"));
                        const slotForm = n("form", undefined, "peer-form peer-slot-form"); const time = field(slotForm, `Add appointment (${timezone})`, "time-" + session.id, "datetime-local");
                        formAction(slotForm, "Add appointment", () => store.addSlot(session.id, new Date(time.value).toISOString(), owner), () => { status.textContent = session.status === "Published" ? "Appointment added to your published session." : "Appointment added. Publish your session when you are ready for learners to book."; render(); }); card.append(slotForm);
                        const actions = n("div", undefined, "peer-actions");
                        button(actions, session.status === "Published" ? "Pause listing" : "Publish session", () => store.publish(session.id, session.status !== "Published", owner, session.revision), () => { status.textContent = session.status === "Published" ? "Listing paused. Existing bookings remain in your inbox." : "Session published. Other students can now find it and request your available appointments."; render(); });
                        if (session.status === "Draft") button(actions, "Edit draft", () => { editing = session.id; }, () => { render(); document.getElementById("peer-title")?.focus(); });
                        if (session.status === "Published") actions.append(link("View listing", `services/mentoring-details.html?id=${encodeURIComponent(session.id)}`)); card.append(actions); list.append(card);
                    }); content.append(list);
                }
                const inbox = panel("Learner booking requests", "Confirm a requested session with your meeting link, or decline with an explanation. Either participant can mark it completed after the scheduled end.");
                inbox.id = "teaching-bookings";
                const bookings = store.mine().filter(b => b.viewer === "mentor").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
                if (!bookings.length) empty(inbox, "No learner requests yet", "Requests for your published sessions will appear here.");
                bookings.forEach(b => inbox.append(bookingCard(b, owner, render))); if (application?.status === "Approved" || bookings.length) content.append(inbox); note(content);
            } catch (error) { content.append(n("p", error.message, "services-notice")); }
        }
        render();
        window.addEventListener("storage", event => { if (event.key === "codementor-peer-mentoring-v1") { status.textContent = "Mentoring records changed in another tab. Refresh the lists to see the latest status."; if (!root.querySelector("#peer-refresh")) { const refresh = button(root, "Refresh lists", async () => {}, () => { status.textContent = ""; render(); refresh.remove(); }); refresh.id = "peer-refresh"; } } });
        window.addEventListener("student-account-changed", () => { content.replaceChildren(); status.textContent = "Your account changed. Reload before continuing."; });
    }
    function adminPage(root) {
        const status = message(root), content = n("div"); root.append(content);
        function render() {
            content.replaceChildren();
            try {
                const applications = store.applications().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
                const stats = n("div", undefined, "peer-review-stats"); ["Pending", "Approved", "Changes requested"].forEach(value => stats.append(n("p", `${value}: ${applications.filter(a => a.status === value).length}`))); content.append(stats);
                if (!applications.length) empty(content, "No mentor applications yet", "Student applications will appear here with their experience, portfolio and sample teaching plan.");
                applications.forEach(application => {
                    const card = panel(application.name); card.dataset.applicationId = application.id;
                    if (application.sample) card.append(n("p", "SAMPLE STUDENT APPLICATION · Demonstration data", "eyebrow"), n("p", "This pending example belongs to the sample student account (student@example.com). Use the demo-only details on the student login screen. Its portfolio is a placeholder, not evidence of verified work.", "peer-muted"));
                    card.append(badge(application.status), n("p", `${application.owner} · ${application.language}`, "peer-muted"), n("h3", "Topics & introduction"), n("p", application.topics), n("p", application.bio), n("h3", "Experience"), n("p", application.experience), n("h3", "Sample teaching plan"), n("p", application.outline), external("Open portfolio (new tab)", application.portfolio));
                    if (application.feedback) card.append(n("p", "Last review: " + application.feedback, "peer-outcome"));
                    if (["Pending", "Approved"].includes(application.status)) {
                        const form = n("form", undefined, "peer-form"); const decision = field(form, "Decision", "decision-" + application.id, "select", application.status === "Pending" ? "Approved" : "Changes requested", application.status === "Pending" ? ["Approved", "Changes requested"] : ["Changes requested"]);
                        const feedback = field(form, "Review note: explain the approval or the changes needed", "feedback-" + application.id, "textarea"); feedback.minLength = 10; feedback.maxLength = 1000;
                        form.append(n("p", "Review the project and teaching plan yourself. Approval does not follow automatically from a course score. Requesting changes hides the mentor's listings until reapproval.", "peer-muted"));
                        formAction(form, "Save review decision", () => store.reviewApplication(application.id, decision.value, feedback.value, application.revision), () => { status.textContent = "Review saved. The student can see the decision in My teaching sessions."; render(); }); card.append(form);
                    } content.append(card);
                }); note(content);
            } catch (error) { content.append(n("p", error.message, "services-notice"), link("Admin sign in", "auth/admin-login.html")); }
        }
        render();
        // Keep unsaved review notes intact when another tab submits or updates an application.
        window.addEventListener("storage", event => {
            if (event.key !== "codementor-peer-mentoring-v1" && event.key !== null) return;
            status.textContent = "Teaching applications changed in another tab. Refresh the list to see the latest requests; your unsaved notes are kept until you refresh.";
            if (!root.querySelector("#admin-peer-refresh")) {
                const refresh = button(root, "Refresh applications", async () => {}, () => { status.textContent = ""; render(); refresh.remove(); });
                refresh.id = "admin-peer-refresh";
            }
        });
        store.prepareSampleApplication().then(result => { if (result) render(); }).catch(error => { status.textContent = error.message; });
    }
    window.peerMentoringUI = Object.freeze({ catalogue, details, learnerBookings, studio, adminPage });
    const pageRoot = document.getElementById("peer-workspace");
    if (pageRoot) { try { (document.body.dataset.peerPage === "admin" ? adminPage : studio)(pageRoot); } catch (error) { pageRoot.append(n("p", error.message, "services-notice")); } }
})();
