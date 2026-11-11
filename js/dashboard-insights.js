/* Dashboard: continue card, weekly activity, streak and achievements from real saved progress only. */
(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const $ = id => document.getElementById(id);
    const insights = window.progressInsights;
    if (!$("continue-card") || !insights) return;
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const when = iso => new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    function read(key) { const raw = window.cmStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    function hideAll() { ["continue-card", "weekly-activity", "achievements"].forEach(id => { $(id).hidden = true; }); }
    function render() {
        let course, progress, language;
        try {
            course = window.pythonCurriculum; language = window.languageCatalog.get(window.cmStorage.activeLanguage());
            if (!course || !language?.builtInContent) { hideAll(); return; }
            progress = course.read();
        } catch { hideAll(); return; } // dashboard.js already reports unreadable records.
        let placement = null;
        try { placement = read("codementor-demo-placement"); } catch { placement = null; }
        const list = insights.events(progress, placement);
        // Continue where you left off
        const target = insights.continueTarget(progress, course, list);
        const card = $("continue-card"); card.hidden = false;
        $("continue-title").textContent = target.title;
        $("continue-context").textContent = `${course.name} · Level ${target.level.id}: ${target.level.title}` + (target.at ? ` · last activity ${when(target.at)}` : " · no dated activity yet");
        const go = node("a", target.kind === "task" ? "Open the task" : target.kind === "quiz" ? "Start the quiz" : "Open the lesson", "button button-primary"); go.href = target.href;
        $("continue-actions").replaceChildren(go);
        // Weekly activity (single series, so no legend; the list below is the table view)
        const days = insights.weekly(list), max = Math.max(1, ...days.map(d => d.count)), total = days.reduce((n, d) => n + d.count, 0);
        const st = insights.streak(list);
        $("weekly-activity").hidden = false;
        $("streak-summary").textContent = st.current ? `${st.current}-day streak · best ${st.longest}` : st.lastActive ? `No streak today · best ${st.longest} days` : "No dated activity yet";
        const chart = $("week-chart");
        chart.setAttribute("aria-label", `Activity in the last 7 days: ${total} saved activities.`);
        chart.replaceChildren(...days.map((d, i) => {
            const col = node("div", undefined, "week-col"); col.tabIndex = 0;
            const label = `${d.label}: ${d.count} ${d.count === 1 ? "activity" : "activities"}`;
            col.title = label; col.setAttribute("aria-label", label);
            const bar = node("span", undefined, "week-bar"); bar.style.height = `${Math.round(d.count / max * 100)}%`; if (!d.count) bar.classList.add("is-empty");
            const value = node("span", i === 6 || d.count === max && d.count ? String(d.count) : "", "week-value");
            col.append(value, bar, node("span", d.label, "week-day")); return col;
        }));
        $("week-table").replaceChildren(...days.map(d => node("li", `${d.label} ${d.date}: ${d.count}`)));
        // Achievements
        const items = insights.achievements(progress, course, placement);
        $("achievements").hidden = false;
        $("achievement-list").replaceChildren(...items.map(a => {
            const li = node("li", undefined, a.earned ? "is-earned" : "is-locked"); li.dataset.achievement = a.id;
            li.append(node("span", a.earned ? "Earned" : "Not yet", "achievement-state"), node("b", a.title));
            if (a.earned) li.append(node("span", a.earnedAt ? when(a.earnedAt) : "date not recorded", "achievement-date"));
            return li;
        }));
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true }); else render();
    window.addEventListener("learning-progress-changed", render);
    window.addEventListener("storage", render);
    window.addEventListener("pageshow", render);
})();
