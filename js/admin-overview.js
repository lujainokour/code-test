(() => {
    "use strict";
    const root = document.getElementById("admin-overview-content");
    if (!root) return;
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const link = (text, href, cls = "button button-outline") => { const a = node("a", text, cls); a.href = href; return a; };
    let range = 7, counted = false; // range tabs state; count-up runs on the first render only
    function section(title) { const n = node("section", undefined, "overview-panel"); n.append(node("h2", title)); return n; }
    function render() {
        root.replaceChildren();
        try { window.peerMentoringStore.admin(); } catch (error) { root.append(node("p", error.message, "services-notice"), link("Admin sign in", "../auth/admin-login.html")); return; }
        const issues = [];
        function read(label, action) { try { return action(); } catch (error) { issues.push(`${label}: ${error.message}`); return null; } }
        const students = read("Student accounts", () => window.platformStore.getStudents());
        const applications = read("Teaching applications", () => window.peerMentoringStore.applications());
        const content = read("Saved content", () => window.courseContentStore.readContent());
        const company = read("Company profiles", () => window.companyStore.getAdminSnapshot());
        const lessons = content ? Object.values(content.courses).flatMap(course => course.levels.flatMap(level => level.lessons || [])) : null;
        const platformBookings = read("Platform bookings", () => window.adminSessionsStore.getBookings().filter(b => b.linkedStudent));
        const platformSessions = read("Platform sessions", () => window.adminSessionsStore.getSessions());
        const pendingBookings = platformBookings?.filter(b => b.status === "Pending");
        const pending = applications?.filter(a => a.status === "Pending");
        const drafts = lessons?.filter(l => (l.status || "draft") === "draft");
        const intro = node("div", undefined, "overview-top-actions"); intro.append(link("Review student tutors", "admin-peer-mentoring.html", "button button-primary"), link("Create a learning path", "admin-course-create.html")); root.append(intro);
        root.append(node("p", "Live counts from records saved in this browser. Example student rows and the built-in curriculum are not counted as newly registered users or authored lessons.", "overview-source-note"));
        const stats = node("div", undefined, "overview-stats");
        [["sessions", "Published platform sessions", platformSessions?.filter(s => s.status === "Active" && !s.sample).length, "admin-sessions.html"], ["bookings", "Platform bookings awaiting review", pendingBookings?.length, "admin-bookings.html"], ["students", "Registered students", students?.length, "admin-students.html"], ["enabled", "Enabled accounts", students?.filter(s => s.status === "enabled").length, "admin-students.html"], ["pending", "Awaiting tutor review", pending?.length, "admin-peer-mentoring.html"], ["approved", "Approved student tutors", applications?.filter(a => a.status === "Approved").length, "admin-peer-mentoring.html"], ["published", "Published authored lessons", lessons?.filter(l => l.status === "published").length, "admin-courses.html"], ["drafts", "Draft lessons", drafts?.length, "admin-courses.html"]].forEach(([id, label, value, href]) => {
            const a = link("", href, "overview-stat"); a.append(node("span", label), node("strong", value === undefined ? "Unavailable" : String(value))); a.dataset.stat = id; stats.append(a);
        }); root.append(stats);
        const kit = window.interactionKit, ai = window.adminInsights;
        if (kit && !counted) stats.querySelectorAll("strong").forEach(s => { const v = Number(s.textContent); if (Number.isInteger(v)) kit.countUp(s, v); });
        counted = true;
        const realApps = (applications || []).filter(a => !a.sample);
        const studentDates = (students || []).map(s => s.createdAt), appDates = realApps.map(a => a.createdAt);
        // Range tabs and trends only when real timestamped records support them.
        if (ai && ai.supportsRanges(studentDates, appDates)) {
            const activity = section("New activity");
            const tabs = node("div", undefined, "overview-range"); tabs.setAttribute("role", "group"); tabs.setAttribute("aria-label", "Time range");
            [7, 30].forEach(days => {
                const b = node("button", `${days} days`, "overview-range-tab"); b.type = "button"; b.dataset.days = String(days); b.setAttribute("aria-pressed", String(range === days));
                b.addEventListener("click", () => { range = days; render(); root.querySelector(`.overview-range-tab[data-days="${days}"]`)?.focus(); });
                tabs.append(b);
            });
            const grid = node("div", undefined, "overview-trends");
            [["registrations", "New student registrations", studentDates], ["applications", "Teaching applications submitted", appDates]].forEach(([id, label, dates]) => {
                const c = ai.windowCounts(dates, range);
                const tile = node("div", undefined, "overview-stat overview-trend"); tile.dataset.trend = id;
                tile.append(node("span", `${label} · last ${range} days`), node("strong", String(c.current)));
                const delta = c.delta === null ? node("small", "No earlier history to compare yet", "overview-delta")
                    : node("small", c.delta === 0 ? `Same as the previous ${range} days` : `${c.delta > 0 ? "▲ +" : "▼ "}${c.delta} vs the previous ${range} days`, "overview-delta");
                delta.dataset.direction = c.delta === null ? "none" : c.delta > 0 ? "up" : c.delta < 0 ? "down" : "flat";
                tile.append(delta); grid.append(tile);
            });
            activity.append(tabs, grid, node("p", "Counts use the saved creation time of each record. Sample records are not counted.", "overview-source-note"));
            root.append(activity);
        }
        const dist = section("Teaching applications by status");
        if (applications === null) dist.append(node("p", "Application data is unavailable. Existing records have been kept."));
        else {
            const d = ai ? ai.distribution(realApps, "status", ["Pending", "Approved", "Changes requested", "Rejected"]) : { total: 0, rows: [] };
            if (!d.total) dist.append(node("p", "No real teaching applications yet. Sample applications are not counted.", "overview-source-note"));
            else {
                const list = node("ul", undefined, "overview-bars"); list.setAttribute("aria-label", `${d.total} teaching applications by status`);
                d.rows.forEach(r => { const li = node("li"); li.dataset.status = r.label; li.append(node("span", r.label), node("span", `${r.count} · ${r.percent}%`, "overview-bar-value")); const bar = node("span", undefined, "overview-bar"); bar.style.setProperty("--w", `${r.percent}%`); bar.setAttribute("aria-hidden", "true"); li.append(bar); list.append(li); });
                dist.append(list, node("p", "Real applications only; sample applications are not counted.", "overview-source-note"));
            }
        }
        root.append(dist);
        const attention = section("Needs your attention"); const queue = node("div", undefined, "overview-queue");
        [[pendingBookings?.length, "platform booking requests awaiting an administrator decision", "Manage bookings", "admin-bookings.html"], [pending?.length, "teaching applications awaiting review", "Review applications", "admin-peer-mentoring.html"], [students?.filter(s => s.status === "suspended").length, "student accounts currently suspended", "Review account access", "admin-students.html"], [drafts?.length, "lesson drafts to prepare for publication", "Continue content editing", "admin-courses.html"]].forEach(([count, label, action, href]) => { const row = node("div", undefined, "overview-queue-row"); row.append(node("p", `${count === undefined ? "Unavailable" : count} ${label}`), link(action, href, "overview-text-link")); queue.append(row); }); attention.append(queue); root.append(attention);
        const companies = section("Companies & opportunities");
        companies.append(node("p", company ? `${company.profile.name} · ${company.sample ? "Sample company" : "Saved company profile"} · ${company.opportunities.filter(job => job.status === "Active").length} active opportunities` : issues.some(issue => issue.startsWith("Company profiles:")) ? "Company data is unavailable. Existing records were kept." : "No company profile is saved in this browser yet."), link("View company directory", "admin-companies.html")); root.append(companies);
        const columns = node("div", undefined, "overview-columns"); const reviews = section("Latest teaching applications");
        if (applications === null) reviews.append(node("p", "Application data is unavailable. Existing records have been kept."));
        else if (!applications.length) reviews.append(node("p", "No student teaching applications yet. Submitted applications will appear here."));
        else applications.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 4).forEach(a => { const row = node("article", undefined, "overview-list-row"); row.append(node("h3", a.name), node("p", `${a.language} · ${a.status}`), link("Open review", "admin-peer-mentoring.html", "overview-text-link")); reviews.append(row); });
        const registrations = section("Recent registrations");
        if (students === null) registrations.append(node("p", "Registered account data is unavailable."));
        else if (!students.length) registrations.append(node("p", "No registered profiles are saved in this browser yet."));
        else students.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5).forEach(s => { const row = node("article", undefined, "overview-list-row"); row.append(node("h3", s.name), node("p", `${s.status === "enabled" ? "Enabled" : "Suspended"} · ${new Date(s.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}`), link("View student", `admin-student-details.html?id=${encodeURIComponent(s.id)}`, "overview-text-link")); registrations.append(row); }); columns.append(reviews, registrations); root.append(columns);
        const management = section("Quick management"); const actions = node("div", undefined, "overview-shortcuts");
        [["Platform sessions", "Create or pause sessions and set prices.", "admin-sessions.html"], ["Availability", "Manage the weekly calendar and meeting platform.", "admin-schedule.html"], ["Bookings", "Confirm with a meeting link, decline with a reason, and track completion.", "admin-bookings.html"], ["Session follow-up", "View enrolled students and keep progress notes.", "admin-session-students.html"], ["Students & access", "Review student profiles and account status.", "admin-students.html"], ["Learning content", "Manage learning paths, levels and lessons.", "admin-courses.html"], ["Tutor applications", "Review experience and teaching plans.", "admin-peer-mentoring.html"], ["Learning analytics", "Open the existing learning analytics view.", "admin-analytics.html"]].forEach(([title, text, href]) => { const card = link("", href, "overview-shortcut"); card.append(node("h3", title), node("p", text), node("span", "Open →")); actions.append(card); }); management.append(actions); root.append(management);
        if (issues.length) { const notice = node("p", issues.join(" "), "services-notice"); notice.setAttribute("role", "status"); root.prepend(notice); }
    }
    render(); window.addEventListener("pageshow", render); window.addEventListener("storage", render); window.addEventListener("platform-changed", render); window.addEventListener("peer-mentoring-changed", render);
})();
