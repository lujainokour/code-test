/**
 * CodeMentor AI - Admin Sessions Controller
 * Controls interactivity across all admin sessions views.
 */
(() => {
    "use strict";

    const store = window.adminSessionsStore;
    if (!store) return;


    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    const safeMeeting = value => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; } catch { return ""; } };
    const handlers = new WeakMap();
    function listen(node, type, action) {
        const previous = handlers.get(node) || {};
        if (previous[type]) node.removeEventListener(type, previous[type]);
        const handler = async event => {
            try {
                if (type === "submit" && !node.reportValidity()) { event.preventDefault(); return; }
                await action(event);
            } catch (error) {
                event.preventDefault();
                let status = document.getElementById("workspace-action-error");
                if (!status) { status = document.createElement("p"); status.id = "workspace-action-error"; status.className = "form-message is-error"; status.setAttribute("role", "alert"); (node.closest?.("dialog") || document.querySelector("main") || document.body).prepend(status); }
                status.textContent = error.message || "This action could not be completed. Your saved records were kept.";
                status.tabIndex = -1; status.focus();
            }
        };
        previous[type] = handler; handlers.set(node, previous);
        node.addEventListener(type, handler);
    }

    // Helper utilities
    function el(tag, text, cls) {
        const node = document.createElement(tag);
        if (text !== undefined && text !== null) node.textContent = text;
        if (cls) node.className = cls;
        return node;
    }

    function formatCurrency(amount) {
        return `$${amount}`;
    }

    function formatDate(dateStr) {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch {
            return dateStr;
        }
    }

    // Platform sessions management
    function initSessions() {
        const listRoot = document.getElementById("teacher-sessions-list");
        const modal = document.getElementById("create-session-modal");
        const openBtn = document.getElementById("open-create-modal");
        const closeBtn = document.getElementById("close-create-modal");
        const form = document.getElementById("create-session-form");

        function renderSessions() {
            if (!listRoot) return;
            const sessions = store.getSessions();
            listRoot.innerHTML = "";

            if (sessions.length === 0) {
                listRoot.innerHTML = `<p class="workspace-empty">No tutoring sessions created yet. Click "Create New Session" to offer a platform learning session.</p>`;
                return;
            }

            sessions.forEach(session => {
                const card = el("article", null, "teacher-session-card");
                card.innerHTML = `
                    <div class="teacher-session-main">
                        <div class="teacher-session-badges">
                            <span class="teacher-badge badge-active">${escapeHTML(session.status)}</span>${session.sample ? `<span class="teacher-badge badge-tag">Sample session</span>` : ""}
                            <span class="teacher-badge badge-tag">${escapeHTML(session.subject)}</span>
                            <span class="teacher-badge badge-tag">${escapeHTML(session.level)}</span>
                            <span class="teacher-badge badge-tag">${escapeHTML(session.type)}</span>
                        </div>
                        <h2 class="teacher-session-title">${escapeHTML(session.title)}</h2>
                        <p class="teacher-session-desc">${escapeHTML(session.description)}</p>
                        <div class="teacher-session-details">
                            <span><strong>Duration:</strong> ${escapeHTML(session.duration)} mins</span>
                            <span><strong>Fee:</strong> ${escapeHTML(formatCurrency(session.price))} / session</span>
                            <span><strong>Students enrolled:</strong> ${escapeHTML(session.enrolledCount)}</span>
                        </div>
                    </div>
                    <div class="teacher-session-actions">
                        <button type="button" class="button button-outline btn-toggle-session" data-id="${escapeHTML(session.id)}">
                            ${escapeHTML(session.status === 'Active' ? 'Pause session' : 'Activate')}
                        </button>
                        <button type="button" class="button button-outline btn-delete-session" data-id="${escapeHTML(session.id)}" style="color: #9c2738; border-color: #9c2738;">
                            Delete
                        </button>
                    </div>
                `;
                listRoot.appendChild(card);
            });
        }

        renderSessions();

        if (openBtn && modal) {
            listen(openBtn, "click", () => { document.getElementById("sess-price").value = store.getSchedule().defaultRate; modal.showModal(); });
        }
        if (closeBtn && modal) {
            listen(closeBtn, "click", () => modal.close());
        }

        if (form && modal) {
            listen(form, "submit", async (e) => {
                e.preventDefault();
                const title = document.getElementById("sess-title").value;
                const subject = document.getElementById("sess-subject").value;
                const level = document.getElementById("sess-level").value;
                const duration = document.getElementById("sess-duration").value;
                const type = document.getElementById("sess-type").value;
                const price = document.getElementById("sess-price").value;
                const description = document.getElementById("sess-description").value;

                await store.addSession({
                    title, subject, level, duration, type, price, description
                });

                form.reset();
                modal.close();
                renderSessions();
            });
        }

        // Delegation for delete / toggle
        if (listRoot) {
            listen(listRoot, "click", async (e) => {
                const deleteBtn = e.target.closest(".btn-delete-session");
                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    if (confirm("Are you sure you want to remove this tutoring session?")) {
                        await store.deleteSession(id);
                        renderSessions();
                    }
                    return;
                }

                const toggleBtn = e.target.closest(".btn-toggle-session");
                if (toggleBtn) {
                    const id = toggleBtn.dataset.id;
                    const session = store.getSessions().find(s => s.id === id);
                    if (session) {
                        const newStatus = session.status === "Active" ? "Paused" : "Active";
                        await store.updateSession(id, { status: newStatus });
                        renderSessions();
                    }
                }
            });
        }
    }

    // --- 3. Schedule & Pricing View ---
    function initSchedule() {
        const scheduleForm = document.getElementById("teacher-schedule-form");
        const statusMsg = document.getElementById("schedule-status");
        if (!scheduleForm) return;

        const currentSchedule = store.getSchedule();

        // Populate base rate
        const rateInput = document.getElementById("default-rate");
        if (rateInput && currentSchedule.defaultRate !== undefined) {
            rateInput.value = currentSchedule.defaultRate;
        }

        const instantBookingInput = document.getElementById("instant-booking");
        if (instantBookingInput) {
            instantBookingInput.checked = Boolean(currentSchedule.instantBooking);
        }

        const platformInput = document.getElementById("meeting-platform");
        if (platformInput && currentSchedule.meetingPlatform) {
            platformInput.value = currentSchedule.meetingPlatform;
        }

        // Render days
        const daysRoot = document.getElementById("schedule-days-container");
        if (daysRoot && currentSchedule.availability) {
            daysRoot.innerHTML = "";
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

            days.forEach(day => {
                const info = currentSchedule.availability[day] || { active: false, slots: [] };
                const dayCard = el("div", null, "teacher-day-row");
                dayCard.innerHTML = `
                    <div class="teacher-day-header">
                        <label class="teacher-checkbox-label">
                            <input type="checkbox" class="day-toggle" data-day="${escapeHTML(day)}" ${escapeHTML(info.active ? 'checked' : '')}>
                            <strong>${escapeHTML(day)}</strong>
                        </label>
                        <span class="teacher-slot-count">${escapeHTML(info.slots.length)} time slot(s)</span>
                    </div>
                    <div class="teacher-day-slots ${escapeHTML(info.active ? '' : 'day-disabled')}" id="slots-${escapeHTML(day)}">
                        ${info.slots.map(s => `<span class="slot-badge">${escapeHTML(s)} <button type="button" class="btn-remove-slot" data-day="${escapeHTML(day)}" data-slot="${escapeHTML(s)}" aria-label="Remove ${escapeHTML(day)} ${escapeHTML(s)}">Remove</button></span>`).join(" ")}
                        <button type="button" class="button button-outline btn-add-slot" data-day="${escapeHTML(day)}" ${escapeHTML(info.active ? '' : 'disabled')}>+ Add slot</button>
                    </div>
                `;
                daysRoot.appendChild(dayCard);
            });
        }

        // Slot adding prompt
        if (daysRoot) {
            listen(daysRoot, "click", async (e) => {
                const remove = e.target.closest(".btn-remove-slot");
                if (remove) { const sched = store.getSchedule(); sched.availability[remove.dataset.day].slots = sched.availability[remove.dataset.day].slots.filter(slot => slot !== remove.dataset.slot); await store.updateSchedule(sched); initSchedule(); return; }
                const addBtn = e.target.closest(".btn-add-slot");
                if (addBtn) {
                    const day = addBtn.dataset.day;
                    const newSlot = prompt(`Enter time slot for ${day} (e.g. 03:00 PM - 04:30 PM):`, "03:00 PM - 04:30 PM");
                    if (newSlot && newSlot.trim()) {
                        const sched = store.getSchedule();
                        if (!sched.availability[day]) sched.availability[day] = { active: true, slots: [] };
                        if (sched.availability[day].slots.includes(newSlot.trim())) throw new Error("That time slot is already listed for this day.");
                        sched.availability[day].slots.push(newSlot.trim());
                        await store.updateSchedule(sched);
                        initSchedule(); // Re-render
                    }
                    return;
                }

                const toggle = e.target.closest(".day-toggle");
                if (toggle) {
                    const day = toggle.dataset.day;
                    const sched = store.getSchedule();
                    if (!sched.availability[day]) sched.availability[day] = { active: false, slots: [] };
                    sched.availability[day].active = toggle.checked;
                    await store.updateSchedule(sched);
                    const slotContainer = document.getElementById(`slots-${day}`);
                    if (slotContainer) slotContainer.classList.toggle("day-disabled", !toggle.checked);
                    const btn = slotContainer?.querySelector(".btn-add-slot");
                    if (btn) btn.disabled = !toggle.checked;
                }
            });
        }

        listen(scheduleForm, "submit", async (e) => {
            e.preventDefault();
            const sched = store.getSchedule();
            if (rateInput) sched.defaultRate = Number(rateInput.value);
            if (instantBookingInput) sched.instantBooking = instantBookingInput.checked;
            if (platformInput) sched.meetingPlatform = platformInput.value;

            await store.updateSchedule(sched);

            if (statusMsg) {
                statusMsg.textContent = "Schedule and pricing updated successfully.";
                statusMsg.classList.remove("is-error");
                setTimeout(() => { statusMsg.textContent = ""; }, 4000);
            }
        });
    }

    // --- 4. Bookings Management View ---
    function initBookings() {
        const root = document.getElementById("teacher-bookings-list");
        const filterBtns = document.querySelectorAll("[data-booking-filter]");
        if (!root) return;

        let currentFilter = "all";

        function render() {
            const bookings = store.getBookings();
            const filtered = currentFilter === "all" ? bookings : bookings.filter(b => b.status.toLowerCase() === currentFilter.toLowerCase());

            root.innerHTML = "";

            if (filtered.length === 0) {
                root.innerHTML = `<p class="workspace-empty">No ${escapeHTML(currentFilter === 'all' ? '' : currentFilter)} bookings found.</p>`;
                return;
            }

            filtered.forEach(booking => {
                const card = el("article", null, "teacher-card");
                const badgeClass = booking.status === "Confirmed" ? "badge-confirmed" : booking.status === "Pending" ? "badge-pending" : booking.status === "Completed" ? "badge-active" : "badge-tag";

                card.innerHTML = `
                    <div class="teacher-card-header">
                        <div class="teacher-booking-student">
                            <span class="teacher-avatar">${escapeHTML(booking.studentInitials)}</span>
                            <div>
                                <h3 class="teacher-card-title">${escapeHTML(booking.studentName)}</h3>
                                <p class="teacher-meta">${escapeHTML(booking.studentEmail)}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="teacher-badge ${escapeHTML(badgeClass)}">${escapeHTML(booking.status)}</span>
                            ${!booking.linkedStudent ? `<span class="teacher-badge badge-tag">Sample record</span>` : ""}
                            <div class="teacher-price">${escapeHTML(formatCurrency(booking.price))}</div>
                        </div>
                    </div>
                    <div class="teacher-booking-body">
                        <p><strong>Session:</strong> ${escapeHTML(booking.sessionTitle)}</p>
                        <p><strong>Appointment:</strong> ${escapeHTML(formatDate(booking.requestedDate))} · ${escapeHTML(booking.requestedTime)}</p>
                        ${booking.notes ? `<p class="teacher-notes"><strong>Learner’s goal:</strong> “${escapeHTML(booking.notes)}”</p>` : ''}
                    </div>
                    <div class="teacher-card-actions">
                        ${booking.status === "Pending" ? `
                            <button type="button" class="button button-primary btn-approve" data-id="${escapeHTML(booking.id)}">Accept booking</button>
                            <button type="button" class="button button-outline btn-decline" data-id="${escapeHTML(booking.id)}">Decline</button>
                        ` : booking.status === "Confirmed" ? `
                            ${safeMeeting(booking.meetingUrl) ? `<a href="${escapeHTML(safeMeeting(booking.meetingUrl))}" target="_blank" rel="noopener" class="button button-primary">Open scheduled meeting</a>` : ""}
                            <button type="button" class="button button-outline btn-decline" data-id="${escapeHTML(booking.id)}">Cancel booking</button>
                            <button type="button" class="button button-outline btn-complete" data-id="${escapeHTML(booking.id)}">Mark session completed</button>
                        ` : `
                            <span class="teacher-meta">Session finished on ${escapeHTML(formatDate(booking.requestedDate))}</span>
                        `}
                    </div>
                `;
                root.appendChild(card);
            });
        }

        render();

        filterBtns.forEach(btn => {
            listen(btn, "click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentFilter = btn.dataset.bookingFilter;
                render();
            });
        });
    }

    // --- 5. Students & Progress Tracking View ---
    function initStudents() {
        const root = document.getElementById("teacher-students-list");
        const modal = document.getElementById("add-note-modal");
        const closeBtn = document.getElementById("close-note-modal");
        const noteForm = document.getElementById("add-note-form");
        const targetStudentName = document.getElementById("note-student-name");
        let activeStudentId = null;

        function render() {
            if (!root) return;
            const students = store.getStudents();
            root.innerHTML = "";

            if (students.length === 0) {
                root.innerHTML = `<p class="workspace-empty">No students registered yet. Students who book platform sessions will appear here.</p>`;
                return;
            }

            students.forEach(student => {
                const card = el("article", null, "teacher-student-card");
                card.innerHTML = `
                    <div class="teacher-student-header">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span class="teacher-avatar">${escapeHTML(student.initials)}</span>
                            <div>
                                <h3 style="margin: 0; font-size: 18px;">${escapeHTML(student.name)}</h3>
                                <p class="teacher-meta">${escapeHTML(student.email)} · Course: ${escapeHTML(student.enrolledCourse)}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="teacher-badge badge-active">${escapeHTML(student.status)}</span>${!student.linkedStudent ? `<span class="teacher-badge badge-tag">Sample record</span>` : ""}
                            <p class="teacher-meta" style="margin-top: 4px;"><strong>${escapeHTML(student.sessionsCompleted)}</strong> session(s) completed</p>
                        </div>
                    </div>
                    <div class="teacher-student-notes">
                        <h4 style="margin: 12px 0 6px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Progress & Mentorship Notes</h4>
                        ${(student.progressNotes && student.progressNotes.length > 0) ? `
                            <div class="teacher-notes-list">
                                ${student.progressNotes.map(n => `
                                    <div class="teacher-note-item">
                                        <span class="teacher-note-date">${escapeHTML(formatDate(n.date))}</span>
                                        <p class="teacher-note-text">${escapeHTML(n.text)}</p>
                                    </div>
                                `).join("")}
                            </div>
                        ` : `<p class="workspace-empty" style="padding: 10px 0;">No notes logged yet.</p>`}
                    </div>
                    <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
                        <button type="button" class="button button-outline btn-open-note" data-id="${escapeHTML(student.id)}" data-name="${escapeHTML(student.name)}">
                            + Add progress note
                        </button>
                    </div>
                `;
                root.appendChild(card);
            });
        }

        render();

        if (root) {
            listen(root, "click", async (e) => {
                const btn = e.target.closest(".btn-open-note");
                if (btn && modal) {
                    activeStudentId = btn.dataset.id;
                    if (targetStudentName) targetStudentName.textContent = btn.dataset.name;
                    modal.showModal();
                }
            });
        }

        if (closeBtn && modal) {
            listen(closeBtn, "click", () => modal.close());
        }

        if (noteForm && modal) {
            listen(noteForm, "submit", async (e) => {
                e.preventDefault();
                const text = document.getElementById("note-text").value;
                if (activeStudentId && text && text.trim()) {
                    await store.addStudentNote(activeStudentId, text.trim());
                    noteForm.reset();
                    modal.close();
                    render();
                }
            });
        }
    }

    // Global action handler for booking approvals (works across dashboard & bookings page)
    listen(document, "click", async (e) => {
        const approveBtn = e.target.closest(".btn-approve, .btn-approve-sm");
        if (approveBtn) {
            const id = approveBtn.dataset.id;
            const meetingUrl = prompt("Paste the scheduled meeting HTTPS link (shared with the student):");
            if (!meetingUrl) return;
            await store.updateBookingStatus(id, "Confirmed", { meetingUrl });

            if (document.getElementById("teacher-bookings-list")) initBookings();
            return;
        }

        const declineBtn = e.target.closest(".btn-decline, .btn-decline-sm");
        if (declineBtn) {
            const id = declineBtn.dataset.id;
            const reason = prompt("Explain why this booking is being declined or cancelled:");
            if (reason) {
                await store.updateBookingStatus(id, "Declined", { reason });
    
                if (document.getElementById("teacher-bookings-list")) initBookings();
            }
            return;
        }

        const completeBtn = e.target.closest(".btn-complete");
        if (completeBtn) {
            const id = completeBtn.dataset.id;
            await store.updateBookingStatus(id, "Completed");

            if (document.getElementById("teacher-bookings-list")) initBookings();
        }
    });

    // Router on DOMContentLoaded
    listen(document, "DOMContentLoaded", () => {
        const filename = location.pathname.split("/").pop();
        if (filename === "admin-sessions.html") initSessions();
        else if (filename === "admin-schedule.html") initSchedule();
        else if (filename === "admin-bookings.html") initBookings();
        else if (filename === "admin-session-students.html") initStudents();

        listen(window, "storage", event => {
            if (event.key !== "codementor-teacher-store-v1") return;
            if (filename === "admin-bookings.html") initBookings();

            else if (filename === "admin-session-students.html") initStudents();
        });
    });
})();
