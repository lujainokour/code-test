(() => {
    const root = document.getElementById("analytics-content"), message = document.getElementById("analytics-message");
    const node = (tag, text, cls) => { const element = document.createElement(tag); element.textContent = text; if (cls) element.className = cls; return element; };
    // Presentation helpers (icons only; no data is added or estimated).
    const ICONS = {
        students: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
        enabled: "M12 2l9 5-9 5-9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
        levels: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14",
        lessons: "M2 4h7a3 3 0 013 3v14a2 2 0 00-2-2H2z M22 4h-7a3 3 0 00-3 3v14a2 2 0 012-2h8z",
        chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
        stack: "M12 2l9 5-9 5-9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
        info: "M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v5 M12 8h.01",
        hidden: "M3 3l18 18 M10.6 10.6a2 2 0 002.8 2.8 M9.9 5.1A10 10 0 0112 5c5 0 9 4 10 7a11 11 0 01-3.2 4.4 M6.1 6.1A11 11 0 002 12c1 3 5 7 10 7a10 10 0 004-.8"
    };
    const ico = (key, cls = "analytics-ico") => {
        const wrap = node("span", "", cls); wrap.setAttribute("aria-hidden", "true");
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(svg.namespaceURI, "path"); path.setAttribute("d", ICONS[key]); svg.append(path); wrap.append(svg); return wrap;
    };
    const heading = (key, text) => { const h = node("h2", ""); h.append(ico(key, "analytics-ico analytics-ico-title"), document.createTextNode(text)); return h; };
    try {
        if (window.adminStudentStore.loadError) throw new Error(window.adminStudentStore.loadError);
        const students = window.adminStudentData, courses = window.courseContentStore.readCourses(), content = window.courseContentStore.readContent();
        const levels = Object.values(content.courses).flatMap(course => course.levels);
        const lessons = levels.flatMap(level => level.lessons || []);
        const stats = node("div", "", "dashboard-stats analytics-stats");
        [["students", "Fictional sample students", students.length], ["enabled", "Enabled sample accounts", students.filter(student => student.status === "enabled").length], ["levels", "Saved local levels", levels.length], ["lessons", "Saved local lessons", lessons.length]].forEach(([key, label, count]) => {
            const card = node("article", "", "dashboard-stat analytics-stat"); card.append(ico(key), node("p", label), node("h2", String(count))); stats.append(card);
        });
        root.append(stats);
        // Rows per language (same numbers as before).
        const rows = [];
        window.languageCatalog.entries.forEach(language => {
            const matching = courses.filter(course => (course.language || course.languageId) === language.id);
            if (!matching.length) return;
            rows.push({ name: language.name, sample: matching.filter(course => course.languageId).length, drafts: matching.filter(course => course.language).length, all: matching.length });
        });
        const grid = node("div", "", "analytics-grid");
        const card = node("section", "", "dashboard-card analytics-chart-card");
        const head = node("div", "", "analytics-card-head"); head.append(heading("chart", "Course records by language"));
        const toggle = node("div", "", "analytics-toggle"); toggle.setAttribute("role", "group"); toggle.setAttribute("aria-label", "Series");
        const chart = node("div", "", "analytics-bars");
        let series = "sample";
        const renderChart = () => {
            chart.replaceChildren();
            const max = Math.max(1, ...rows.map(r => r[series]));
            const ticks = node("div", "", "analytics-ticks"); ticks.setAttribute("aria-hidden", "true");
            const steps = Math.min(max, 4); for (let i = steps; i >= 0; i--) ticks.append(node("span", String(Math.round((max * i / steps) * 10) / 10)));
            const plot = node("div", "", "analytics-plot"); plot.setAttribute("role", "img");
            plot.setAttribute("aria-label", `${series === "sample" ? "Sample records" : "Local drafts"} by language: ${rows.map(r => `${r.name} ${r[series]}`).join(", ")}`);
            rows.forEach(r => { const col = node("div", "", "analytics-col"); const bar = node("span", "", "analytics-bar"); bar.style.setProperty("--h", `${(r[series] / max) * 100}%`); bar.append(node("b", String(r[series]))); col.append(bar, node("span", r.name, "analytics-col-label")); plot.append(col); });
            chart.append(ticks, plot);
        };
        [["sample", "Sample records"], ["drafts", "Local drafts"]].forEach(([id, label]) => {
            const button = node("button", label, "analytics-toggle-btn"); button.type = "button"; button.setAttribute("aria-pressed", String(series === id));
            button.addEventListener("click", () => { series = id; toggle.querySelectorAll("button").forEach(other => other.setAttribute("aria-pressed", String(other === button))); renderChart(); });
            toggle.append(button);
        });
        head.append(toggle); card.append(head);
        if (rows.length) { renderChart(); card.append(chart); } else card.append(node("p", "No course records are saved yet.", "overview-source-note"));
        // The original table stays available as an accessible view of the same numbers.
        const details = node("details", "", "analytics-table-details"); details.append(node("summary", "View as table"));
        const tableWrap = node("div", "", "analytics-table-wrap"), table = node("table", "", "analytics-table");
        table.append(node("caption", "Sample course records and saved local course drafts. These are not platform-wide enrolments."));
        const thead = node("thead", ""), headRow = node("tr", ""); ["Language", "Sample records", "Local drafts"].forEach(text => { const th = node("th", text); th.scope = "col"; headRow.append(th); }); thead.append(headRow); table.append(thead);
        const body = node("tbody", "");
        rows.forEach(r => { const tr = node("tr", ""); tr.append(node("th", r.name), node("td", String(r.sample)), node("td", String(r.drafts))); tr.firstElementChild.scope = "row"; body.append(tr); });
        table.append(body); tableWrap.append(table); details.append(tableWrap); card.append(details);
        const summary = node("section", "", "dashboard-card analytics-summary-card"); summary.append(heading("stack", "Records summary"));
        const total = rows.reduce((sum, r) => sum + r.all, 0), wrap = node("div", "", "analytics-summary");
        if (total) {
            const shades = ["var(--ax-action)", "var(--ax-tint-300)", "var(--ax-tint-200)", "var(--ax-line-strong)"]; let acc = 0;
            const stops = rows.map((r, i) => { const from = acc; acc += (r.all / total) * 100; return `${shades[i % shades.length]} ${from}% ${acc}%`; });
            const donut = node("div", "", "overview-donut analytics-donut"); donut.setAttribute("aria-hidden", "true"); donut.style.setProperty("--donut", `conic-gradient(${stops.join(", ")})`); donut.append(node("strong", String(total)), node("span", "Total records"));
            const legend = node("ul", "", "analytics-legend");
            rows.forEach((r, i) => { const li = node("li", ""); const dot = node("i", ""); dot.style.background = shades[i % shades.length]; li.append(dot, node("span", r.name), node("b", `${r.all} (${Math.round((r.all / total) * 1000) / 10}%)`)); legend.append(li); });
            wrap.append(donut, legend);
        } else wrap.append(node("p", "No course records are saved yet.", "overview-source-note"));
        summary.append(wrap); grid.append(card, summary); root.append(grid);
        const notice = node("p", "", "services-notice analytics-notice"); notice.append(ico("info"), document.createTextNode(`${lessons.filter(lesson => lesson.status === "published").length} saved lessons are marked available for local preview. This is not a server publication count.`)); root.append(notice);
        const scope = node("section", "", "dashboard-card analytics-unavailable"); const copy = node("div", ""); copy.append(heading("hidden", "What is unavailable"), node("p", "Real account totals, attendance, revenue, learner engagement, verified completions and certificate issuance are not connected. No numbers are estimated for them.")); scope.append(copy); root.append(scope);
    } catch (error) {
        root.replaceChildren(); message.textContent = `Analytics could not read the saved demo data. ${error.message} No records were deleted or replaced.`; message.classList.add("is-error");
    }
})();
