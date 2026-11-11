/* Administrative oversight uses the same records as the student teaching workflow. */
(() => {
    const root = document.getElementById("admin-mentoring-monitor");
    if (!root) return;
    const store = window.peerMentoringStore;
    const node = (tag, text, cls) => {
        const result = document.createElement(tag);
        if (text !== undefined) result.textContent = text;
        if (cls) result.className = cls;
        return result;
    };
    const status = node("p", "", "form-message"); status.setAttribute("role", "status");
    const content = node("div"); root.append(status, content);
    function action(card, label, task) {
        const button = node("button", label, "button button-outline"); button.type = "button";
        button.addEventListener("click", async () => {
            button.disabled = true;
            try { if (await task()) { status.textContent = "Saved. The change is visible in the student's session workspace and booking history."; render(); } }
            catch (error) { status.textContent = error.message; }
            finally { button.disabled = false; }
        }); card.append(button);
    }
    function render() {
        content.replaceChildren();
        try {
            const data = store.adminSnapshot();
            const stats = node("div", undefined, "peer-review-stats");
            stats.append(node("p", `Published student sessions: ${data.sessions.filter(s => s.status === "Published").length}`), node("p", `Requested bookings: ${data.bookings.filter(b => b.status === "Requested").length}`), node("p", `Confirmed bookings: ${data.bookings.filter(b => b.status === "Confirmed").length}`)); content.append(stats);
            const sessions = node("details", undefined, "services-panel peer-panel"); sessions.append(node("summary", "Student sessions & availability"));
            if (!data.sessions.length) sessions.append(node("p", "Student sessions appear here after tutor approval and session creation."));
            data.sessions.forEach(session => {
                const card = node("article", undefined, "services-card");
                card.append(node("h3", session.title), node("p", `${session.mentorName} · ${session.owner} · ${session.language}`), node("p", `${session.status} · ${session.duration} minutes · ${session.price} ${session.currency}`), node("p", session.description));
                session.slots.forEach(slot => card.append(node("p", new Date(slot.startAt).toLocaleString())));
                if (session.adminHold) {
                    card.append(node("p", "Administrator hold: " + session.adminHold));
                    action(card, "Release hold (keep as draft)", async () => { await store.adminReleaseSession(session.id, session.revision); return true; });
                } else if (session.status === "Published") action(card, "Pause listing", async () => {
                    const reason = prompt("Explain why this student session is being paused:"); if (!reason) return false;
                    await store.adminPauseSession(session.id, reason, session.revision); return true;
                });
                sessions.append(card);
            }); content.append(sessions);
            const bookings = node("details", undefined, "services-panel peer-panel"); bookings.append(node("summary", "Student session bookings & outcomes"));
            if (!data.bookings.length) bookings.append(node("p", "No student session bookings yet."));
            data.bookings.slice().sort((a,b) => Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).forEach(booking => {
                const card = node("article", undefined, "services-card");
                card.append(node("h3", booking.title), node("p", `Learner: ${booking.studentName} (${booking.student})`), node("p", `Student tutor: ${booking.mentorName} (${booking.mentor})`), node("p", `${booking.status} · ${new Date(booking.startAt).toLocaleString()} · ${booking.duration} minutes · ${booking.price} ${booking.currency}`), node("p", booking.notes));
                if (booking.reason) card.append(node("p", booking.reason));
                const review = data.reviews.find(r => r.bookingId === booking.id);
                if (review) card.append(node("p", `Learner review: ${review.rating}/5 · ${review.comment}`));
                if (["Requested", "Confirmed"].includes(booking.status)) action(card, "Cancel booking", async () => {
                    const reason = prompt("Explain why this booking is being cancelled:"); if (!reason) return false;
                    await store.adminCancelBooking(booking.id, reason, booking.revision); return true;
                });
                bookings.append(card);
            }); content.append(bookings);
        } catch (error) { status.textContent = error.message; }
    }
    render();
    window.addEventListener("storage", render);
    window.addEventListener("peer-mentoring-changed", render);
})();
