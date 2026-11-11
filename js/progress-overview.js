/* My progress = "everything I achieved and where to improve". Renders js/student-overview.js:
   badge gallery (rules in progress-insights.js), insights, visual roadmap, placement panel and the
   owner-only request counts moved from the dashboard. Never writes storage. */
(() => {
    if (window.learningUnavailable) return;
    "use strict";
    const ui = window.studentPremium, el = ui.el, $ = id => document.getElementById(id);
    const date = iso => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    function link(text, href, cls) { const a = el("a", text, cls); a.href = href; return a; }
    function renderBadges(model) {
        const host = $("badge-gallery"); host.setAttribute("aria-busy", "false");
        if (!model.ready || model.learningError) {
            host.replaceChildren(el("li", model.learningError ? "Saved progress could not be read, so no badges are shown. Your records were kept." : "Choose a ready language to start earning badges.", "sp-empty"));
            $("badges-summary").textContent = ""; return;
        }
        const list = model.achievements, earned = list.filter(a => a.earned).length;
        $("badges-summary").textContent = `${earned} of ${list.length} earned`;
        host.replaceChildren(...list.map(a => {
            const li = el("li", undefined, `badge-card ${a.earned ? "is-earned" : "is-locked"}`); li.dataset.achievement = a.id; li.dataset.earned = String(a.earned);
            li.append(ui.badge(a.art, a.earned, a.title));
            const body = el("div", undefined, "badge-body");
            body.append(el("span", a.earned ? "Earned" : "Locked", "badge-state"), el("h3", a.title, "badge-name"), el("p", a.description, "badge-desc"), el("p", `How to earn: ${a.rule}`, "badge-rule"));
            if (a.earned) body.append(el("p", a.earnedAt ? `Earned ${date(a.earnedAt)}` : "Earned · date not recorded", "badge-date"));
            else if (a.placedOut) body.append(el("p", "You placed out of this level. Complete its lessons and quiz to earn this badge.", "badge-hint"));
            else if (a.hint) body.append(el("p", `Almost there: ${a.hint}.`, "badge-hint"));
            li.append(body); return li;
        }));
    }
    // Evidence per lesson: latest lesson check + answers of the latest quiz attempt of its level.
    function lessonEvidence(model) {
        const evidence = new Map(), p = model.progress, course = model.course;
        const add = (id, ok) => { const lesson = course.allLessons.find(l => l.id === id); if (!lesson) return; const e = evidence.get(id) || { id, title: lesson.title, correct: 0, total: 0 }; e.total++; if (ok) e.correct++; evidence.set(id, e); };
        for (const [id, check] of Object.entries(p.checks || {})) if (typeof check?.correct === "boolean") add(id, check.correct);
        for (const level of course.levels) {
            const attempt = p.assessments?.[level.id];
            if (!Array.isArray(attempt?.answers) || attempt.answers.length !== level.quiz?.length) continue;
            level.quiz.forEach((question, index) => add(level.lessons[index]?.id, attempt.answers[index] === question.correct));
        }
        return [...evidence.values()];
    }
    function renderInsights(model) {
        const host = $("insight-list"); host.replaceChildren();
        const row = (term, value, detail) => { const d = el("div"); d.append(el("dt", term), el("dd", value)); if (detail) d.append(el("dd", detail, "sp-small")); host.append(d); };
        if (!model.ready || model.learningError) { row("Insights", "Not available", "Learn in a ready language to see insights from your saved answers."); }
        else {
            const evidence = lessonEvidence(model).filter(e => e.correct > 0).sort((a, b) => b.correct / b.total - a.correct / a.total || b.total - a.total);
            const strongest = evidence[0];
            row("Strongest topic", strongest ? strongest.title : "Not enough data yet", strongest ? `${strongest.correct} of ${strongest.total} saved answers correct (lesson checks and quizzes)` : "Answer lesson checks or take a level quiz.");
            const quizzes = Object.entries(model.progress.assessments || {}).filter(([, q]) => Number.isFinite(Date.parse(q?.submittedAt))).sort((a, b) => Date.parse(b[1].submittedAt) - Date.parse(a[1].submittedAt));
            if (quizzes.length) { const [level, q] = quizzes[0]; row("Recent quiz", `Level ${level}: ${q.lastScore ?? q.score}%`, `Best ${q.score}% · ${date(q.submittedAt)}${quizzes.length > 1 ? ` · ${quizzes.length} quizzes with a saved date` : ""}`); }
            else row("Recent quiz", "No dated quiz yet", "Level quizzes appear here after you submit one.");
            if (model.placement.topics.length) {
                const best = [...model.placement.topics].sort((a, b) => b.correct / b.total - a.correct / a.total)[0];
                row("Placement strength", best.topic, `${best.correct} of ${best.total} placement answers correct`);
            }
        }
        const review = $("dashboard-review"); review.replaceChildren();
        if (model.learningError) { review.append(el("p", "Saved answers could not be read.")); return; }
        if (!model.ready) { review.append(el("p", "Choose a ready language to start its lessons.")); return; }
        if (!model.reviewPlan.length) { review.append(el("p", "No topics need review right now. Keep going with your next lesson or a practice task.", "sp-empty")); return; }
        const list = el("ol", undefined, "review-plan");
        model.reviewPlan.forEach((topic, index) => {
            const item = el("li", undefined, "review-plan-item");
            item.append(el("h4", topic.title)); topic.reasons.forEach(reason => item.append(el("p", reason, "sp-small")));
            const actions = el("div", undefined, "review-plan-actions");
            actions.append(link(index === 0 ? "Start this review" : "Review lesson", `lesson.html?lesson=${encodeURIComponent(topic.id)}`, "sp-text-link"));
            topic.taskIds.forEach(id => actions.append(link(`Retry ${window.learningSupport.tasks[id]?.title || id}`, `workspace.html?task=${encodeURIComponent(id)}`, "sp-text-link")));
            item.append(actions); list.append(item);
        });
        review.append(list);
    }
    const stateLabel = { completed: "Completed", current: "Current", available: "Available", locked: "Locked", "placed-out": "Placed out — not completed", unavailable: "Unavailable" };
    const stateIcon = { completed: "✓", current: "●", available: "○", locked: "🔒", "placed-out": "↷", unavailable: "!" };
    function renderRoadmap(model) {
        const host = $("level-roadmap");
        if (!model.ready) { host.replaceChildren(el("li", model.language ? `${model.language.name}: the full path is coming soon.` : "No learning language selected.", "sp-empty")); return; }
        host.replaceChildren(...model.levels.map(level => {
            const li = el("li", undefined, "roadmap-node"); li.dataset.state = level.state;
            li.append(el("span", stateIcon[level.state], "roadmap-marker"));
            const body = el("div", undefined, "roadmap-body");
            const title = level.state === "locked" ? el("span", `Level ${level.id} · ${level.title}`, "roadmap-title") : link(`Level ${level.id} · ${level.title}`, `module.html?level=${level.id}`, "roadmap-title");
            body.append(el("span", stateLabel[level.state] + (level.premium ? " · Premium preview" : ""), "roadmap-state"), title,
                el("span", `${level.lessonsDone}/${level.lessonsTotal} lessons${level.quizBest !== null ? ` · quiz best ${level.quizBest}%` : ""}`, "roadmap-meta"));
            li.append(body); return li;
        }));
        const choice = model.placement.choice;
        if (choice) host.after(Object.assign(el("p", `Saved placement start: Level ${choice.startLevel}. Placed-out levels stay open for review and do not count toward completion or badges.`, "sp-small"), { id: "roadmap-choice" }));
    }
    function renderPlacement(model) {
        const pl = model.placement;
        $("placement-score").textContent = pl.score;
        const host = $("skill-snapshot"); host.replaceChildren();
        if (pl.note) host.append(el("p", pl.note, "sp-muted"));
        if (pl.recommendation) {
            const r = pl.recommendation;
            const why = r.recommendedStart > 1 ? `You scored at least 75% in every topic of Level${r.recommendedStart > 2 ? "s" : ""} 1${r.recommendedStart > 2 ? `–${r.recommendedStart - 1}` : ""}.`
                : (() => { const weak = r.topicScores.find(t => t.level === 1 && !t.meetsThreshold); return weak ? `“${weak.topic}” was below 75%, so Level 1 is the best start.` : "Level 1 is the recommended start."; })();
            host.append(el("p", `Recommended start: Level ${r.recommendedStart}. ${why}`, "sp-placement-why"));
        }
        if (pl.topics.length) {
            const list = el("ul", undefined, "sp-topic-bars");
            pl.topics.forEach(t => {
                const li = el("li"); const pct = Math.round(t.correct / t.total * 100);
                li.append(el("span", t.topic), el("span", `${t.correct} / ${t.total}`, "sp-small"));
                const bar = el("span", undefined, "sp-topic-bar"); bar.style.setProperty("--w", `${pct}%`); bar.setAttribute("aria-hidden", "true"); li.append(bar);
                list.append(li);
            });
            host.append(list);
        }
        const a = $("placement-link"); a.href = pl.link.href; a.textContent = pl.state === "submitted" ? "View placement result" : pl.link.label;
        if (pl.state === "submitted" && window.placementBanks?.get(model.course.id)) {
            if (!document.getElementById("placement-retake")?.isConnected) { const retake = link(`Retake ${model.course.name} placement`, "../student/placement-intro.html", "sp-text-link"); retake.id = "placement-retake"; a.after(retake); }
        }
    }
    function renderCounts(model) { for (const type of ["booking", "request", "draft"]) $(`${type}-count`).textContent = model.counts[type]; }
    function render() {
        const model = window.studentOverview.build();
        renderBadges(model); renderInsights(model); renderRoadmap(model); renderPlacement(model); renderCounts(model);
        const m = $("workspace-message"); if (m.dataset.base === undefined) m.dataset.base = m.textContent;
        m.textContent = [m.dataset.base, ...model.issues].filter(Boolean).join(" "); m.classList.toggle("is-error", Boolean(model.issues.length) || m.classList.contains("is-error"));
        window.progressModel = model;
        try { window.achievementMoments?.run(model, { page: "progress" }); } catch { /* moments never block the page */ }
    }
    render();
    window.addEventListener("pageshow", () => { document.getElementById("roadmap-choice")?.remove(); render(); });
})();
