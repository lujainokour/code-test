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
const ICONS = { sessions: "M2 4h7a3 3 0 013 3v14a2 2 0 00-2-2H2z M22 4h-7a3 3 0 00-3 3v14a2 2 0 012-2h8z", requested: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4", confirmed: "M12 21a9 9 0 100-18 9 9 0 000 18z M8 12l3 3 5-6", apps: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M19 8v6 M22 11h-6", cap: "M12 3l9 4.5-9 4.5-9-4.5z M7 10.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-5.5", bolt: "M13 2L3 14h8l-1 8 10-12h-8z", stack: "M12 2l9 5-9 5-9-5z M3 12l9 5 9-5 M3 17l9 5 9-5" };
    const icon = (key, cls = "admin-tutor-ico") => { const w = document.createElement("span"); w.className = cls; w.setAttribute("aria-hidden", "true"); if (typeof document.createElementNS !== "function") return w; const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 24 24"); const p = document.createElementNS(svg.namespaceURI, "path"); p.setAttribute("d", ICONS[key]); svg.append(p); w.append(svg); return w; };
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
            const stats = node("div", undefined, "peer-review-stats admin-tutor-stats");
            let applicationCount = 0; try { applicationCount = store.applications().length; } catch { /* shown as 0 */ }
            [["sessions", "Published sessions", data.sessions.filter(s => s.status === "Published").length], ["requested", "Requested bookings", data.bookings.filter(b => b.status === "Requested").length], ["confirmed", "Confirmed bookings", data.bookings.filter(b => b.status === "Confirmed").length], ["apps", "Tutor applications", applicationCount]].forEach(([key, label, value]) => {
                const tile = node("article", undefined, "admin-tutor-stat"); tile.append(icon(key, "admin-tutor-ico admin-tutor-ico-lg"), node("h2", label), node("p", String(value))); stats.append(tile);
            }); content.append(stats);
            const sessions = node("details", undefined, "services-panel peer-panel"); sessions.id = "oversight-sessions"; sessions.append(node("summary", "Student sessions & availability"));
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
            const bookings = node("details", undefined, "services-panel peer-panel"); bookings.id = "oversight-bookings"; bookings.append(node("summary", "Student session bookings & outcomes"));
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
    try { // the section tabs are plain in-page links; mark the last one used
        const tabs = [...document.querySelectorAll(".admin-tutor-tabs a")];
        tabs.forEach(tab => tab.addEventListener("click", () => tabs.forEach(other => other.setAttribute("aria-current", String(other === tab)))));
    } catch { /* decoration only */ }
    render();
    window.addEventListener("storage", render);
    window.addEventListener("peer-mentoring-changed", render);
})();
