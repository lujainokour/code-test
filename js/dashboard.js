/* Dashboard = "where am I and what do I do now". Renders js/student-overview.js; never writes storage.
   Exactly one primary action ("Continue" or the state-specific action) lives in #next-actions. */
(() => {
    if (window.learningUnavailable) return;
    "use strict";
    const ui = window.studentPremium, $ = id => document.getElementById(id), el = ui.el;
    function link(text, href, cls) { const a = el("a", text, cls); a.href = href; return a; }
    function renderHero(model) {
        const first = model.account?.name?.trim().split(/\s+/u)[0];
        $("dashboard-greeting").textContent = first ? `Welcome back, ${first}.` : "Your demo workspace.";
        $("hero-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
        $("hero-line").textContent = window.studentOverview.headline(model);
        const next = model.next;
        $("next-title").textContent = next.title;
        $("next-description").textContent = next.description;
        $("next-chip").textContent = next.href.includes("lesson.html") ? "Next lesson" : next.href.includes("workspace.html") ? "Coding task" : next.href.includes("level-assessment") ? "Level quiz" : "Next step";
        const primary = link(next.label, next.href, "button button-primary sp-primary");
        const actions = [primary];
        if (next.secondary) actions.push(link(next.secondary.label, next.secondary.href, "sp-text-link"));
        $("next-actions").replaceChildren(...actions);
        const ready = model.ready && !model.learningError;
        $("current-level").textContent = model.learningError ? "Unavailable" : !ready ? "Choose a path" : model.pathDone ? `${model.course.name} path completed` : `${model.course.name} · Level ${model.currentLevel.id}: ${model.currentLevel.title}`;
        $("level-progress-bar").value = ready ? model.level.completion : 0;
        $("level-progress-bar").setAttribute("aria-label", `${model.course.name} Level ${model.currentLevel.id} completion`);
        $("level-progress-label").textContent = ready ? `${model.level.completion}% of Level ${model.currentLevel.id} · ${model.level.done}/${model.level.total} lessons + quiz` : "";
    }
    function renderKpis(model) {
        const ok = !model.learningError, t = model.totals;
        const kit = window.interactionKit, count = (id, value, format) => { if (kit) kit.countUp($(id), value, { format }); else $(id).textContent = format(value); };
        if (ok) count("recorded-lessons", t.lessonsDone, v => `${v} / ${t.lessonsTotal}`); else $("recorded-lessons").textContent = "Unavailable";
        $("kpi-lessons-sub").textContent = ok ? `${model.course.name} · ${model.overallPercent}% of all lessons` : "Saved progress could not be read";
        if (ok) count("recorded-tasks", t.tasksDone, v => `${v} / ${t.tasksTotal}`); else $("recorded-tasks").textContent = "Unavailable";
        $("kpi-tasks-sub").textContent = !ok ? "Task records unavailable" : model.tasksLast7 === null ? "No dated task runs yet" : model.tasksLast7 ? `+${model.tasksLast7} passed in the last 7 days` : "None passed in the last 7 days";
        count("kpi-streak", model.streak.current, v => `${v} ${v === 1 ? "day" : "days"}`);
        $("kpi-streak-sub").textContent = model.events.length ? `Best: ${model.streak.longest} ${model.streak.longest === 1 ? "day" : "days"}` : "Start today with one lesson check";
        count("kpi-days", model.activeDays.thisMonth, v => String(v));
        // Comparison only when dated history reaches back before this month.
        const d = model.activeDays;
        $("kpi-days-sub").textContent = d.hasHistoryBefore ? (d.thisMonth === d.previousMonth ? `Same as last month (${d.previousMonth})` : `${d.thisMonth > d.previousMonth ? "▲" : "▼"} vs ${d.previousMonth} last month`) : "This calendar month";
        $("kpi-days-sub").dataset.trend = d.hasHistoryBefore ? (d.thisMonth >= d.previousMonth ? "up" : "down") : "none";
    }
    function renderRing(model) {
        const ok = model.ready && !model.learningError;
        ui.ring($("progress-ring"), ok ? model.overallPercent : 0, ok ? `of ${model.course.name}` : "no active path");
        $("ring-level").textContent = ok ? (model.pathDone ? "All levels done" : `Level ${model.currentLevel.id} · ${model.currentLevel.title}`) : "—";
        $("ring-lessons").textContent = ok ? `${model.level.done} of ${model.level.total}` : "—";
        $("ring-levels").textContent = ok ? `${model.totals.levelsDone} of ${model.totals.levelsTotal}` : "—";
        $("ring-unlock").textContent = ok ? model.unlock : "Choose a ready language to see level progress.";
    }
    function renderWeek(model) {
        const days = model.weekly, max = Math.max(1, ...days.map(d => d.count)), total = days.reduce((n, d) => n + d.count, 0);
        $("streak-summary").textContent = total ? `${total} saved ${total === 1 ? "activity" : "activities"} this week` : "";
        $("week-chart").replaceChildren(...days.map((d, i) => {
            const col = el("div", undefined, "week-col"); col.tabIndex = 0;
            const label = `${d.label} ${d.date}: ${d.count} ${d.count === 1 ? "activity" : "activities"}`;
            col.setAttribute("aria-label", label); col.dataset.tip = `${d.label}: ${d.count}`;
            const bar = el("span", undefined, "week-bar" + (d.count ? "" : " is-empty")); bar.style.setProperty("--h", `${Math.round(d.count / max * 100)}%`);
            col.append(el("span", d.count && (i === 6 || d.count === max) ? String(d.count) : "", "week-value"), bar, el("span", d.label, "week-day" + (i === 6 ? " is-today" : "")));
            return col;
        }));
        $("week-table").replaceChildren(...days.map(d => el("li", `${d.label} ${d.date}: ${d.count}`)));
        const empty = $("week-empty");
        empty.hidden = model.events.length > 0;
        empty.textContent = model.ready ? "No dated activity yet. Answer a lesson check or run a coding task and your week appears here." : "Activity appears once you learn in a ready language.";
    }
    function renderRecent(model) {
        const list = model.events.slice(0, 5);
        $("recent-activity").replaceChildren(...list.map(e => {
            const li = el("li", undefined, `sp-event sp-event-${e.type}`);
            li.append(el("span", undefined, "sp-event-dot"), el("span", window.progressInsights.describe(e, model.course), "sp-event-text"));
            const t = el("time", ui.relativeDay(e.at), "sp-event-time"); t.dateTime = e.at; li.append(t);
            return li;
        }));
        $("recent-empty").hidden = list.length > 0;
        $("recent-empty").textContent = "Your saved lesson checks, task runs and quizzes will show up here.";
        // One compact system suggestion; never the same target as the primary action.
        const s = $("suggested-next"); s.replaceChildren();
        if (!model.ready || model.learningError) return;
        const tag = el("span", "System suggestion", "sp-chip sp-chip-soft");
        const topic = model.reviewPlan.find(t => !model.next.href.includes(encodeURIComponent(t.id)));
        if (topic) s.append(tag, el("span", ` Revisit “${topic.title}”: ${topic.reasons[0]} `), link("Review", `lesson.html?lesson=${encodeURIComponent(topic.id)}`, "sp-text-link"));
        else if (model.placement.state === "missing" && window.placementBanks?.get(model.course.id)) s.append(tag, el("span", " Not sure where to start? The placement check suggests a level. "), link(model.placement.link.label, model.placement.link.href, "sp-text-link"));
        else s.append(tag, el("span", " Keep momentum: a short practice task strengthens what you learned. "), link("Open practice", "practice.html", "sp-text-link"));
    }
    // If saved preferences are unreadable the curriculum cannot load. Show a clear error state
    // instead of throwing; nothing is inferred and no record is replaced.
    function unavailable() {
        $("dashboard-greeting").textContent = "Your demo workspace.";
        $("hero-line").textContent = "Saved learning preferences could not be read. Existing records were kept.";
        $("next-chip").textContent = "Action needed";
        $("next-title").textContent = "Preferences unavailable";
        $("next-description").textContent = "Review your profile settings to choose a learning language. No path was selected automatically.";
        $("current-level").textContent = "Unavailable";
        $("next-actions").replaceChildren(link("Review profile settings", "../student/profile.html", "button button-primary sp-primary"));
        for (const id of ["recorded-lessons", "recorded-tasks", "kpi-streak", "kpi-days"]) $(id).textContent = "—";
        $("ring-unlock").textContent = "Progress appears once your preferences can be read.";
        $("week-empty").hidden = false; $("week-empty").textContent = "Activity appears once your preferences can be read.";
        $("recent-empty").hidden = false; $("recent-empty").textContent = "Activity appears once your preferences can be read.";
        $("dashboard-message").textContent = "Saved learning preferences could not be read. They were not replaced."; $("dashboard-message").classList.add("is-error");
        $("dashboard-main").setAttribute("aria-busy", "false");
    }
    function render() {
        if (!window.pythonCurriculum) { unavailable(); return; }
        const model = window.studentOverview.build();
        renderHero(model); renderKpis(model); renderRing(model); renderWeek(model); renderRecent(model);
        $("dashboard-message").textContent = model.issues.join(" "); $("dashboard-message").classList.toggle("is-error", model.issues.length > 0);
        $("dashboard-main").setAttribute("aria-busy", "false");
        document.body.classList.add("sp-ready");
        window.dashboardModel = model;
    }
    render();
    window.addEventListener("pageshow", render);
    window.addEventListener("learning-progress-changed", render);
})();
