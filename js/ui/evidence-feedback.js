/* Shared student-facing rendering of learning evidence (Slice 3). No rules here: all wording and decisions come from
   js/domain/learning.js (lessonFeedback, quizFeedback, summarizeLevel). This file only turns those plain objects into DOM
   and maps a "next action" target to a page link. Text is always set with textContent. */
(() => {
    "use strict";
    const node = (tag, text, cls) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (cls) element.className = cls; return element; };
    const KIND_LABEL = Object.freeze({ check_passed: "check passed", task_passed: "task passed", self_checked: "self-checked" });
    const KIND_NOTE = Object.freeze({ check_passed: "Assessed: the lesson check was answered correctly.", task_passed: "Assessed: a coding task covering this lesson passed.", self_checked: "Self-reported: marked complete by you, not assessed." });
    const label = kind => KIND_LABEL[kind] || "";

    /** Link for a domain "next action" (null when the action is not a page, e.g. "try the check again"). */
    function linkFor(next) {
        if (!next || next.target === "stay") return null;
        const course = window.pythonCurriculum;
        const premiumNeeded = id => Number(id) > 5 && window.subscriptionStore && !window.subscriptionStore.canAccessLevel(Number(id));
        switch (next.target) {
            case "lesson": return { href: `lesson.html?lesson=${encodeURIComponent(next.lessonId)}`, label: next.label };
            case "quiz": return { href: `level-assessment.html?level=${next.levelId}`, label: next.label };
            case "module": return premiumNeeded(next.levelId) && course ? { href: "subscription.html", label: "View Premium access" } : { href: `module.html?level=${next.levelId}`, label: next.label };
            case "project": return { href: "project.html", label: next.label };
            case "path": return { href: "learning-path.html", label: next.label };
            default: return null;
        }
    }
    const list = (items, cls) => { const ul = node("ul", undefined, cls); items.forEach(text => ul.append(node("li", text))); return ul; };

    /**
     * Fill `host` with: headline, "Completed" list, "To improve" list (or a plain note) and exactly one next action.
     * options.nextAsButton: the next action is shown as a button inside the panel (quiz page); otherwise as one line of text,
     * because the lesson page already owns the single "next" link and is updated by the caller.
     */
    function renderFeedback(host, feedback, { nextAsButton = false } = {}) {
        host.replaceChildren();
        host.dataset.result = feedback.result;
        host.append(node("h3", feedback.headline, "evidence-headline"));
        host.append(node("h4", "Completed", "evidence-subhead"), list(feedback.completed, "evidence-list"));
        host.append(node("h4", "To improve", "evidence-subhead"));
        host.append(feedback.improve.length ? list(feedback.improve, "evidence-list") : node("p", "Nothing to improve here.", "evidence-none"));
        const link = linkFor(feedback.next), next = node("p", undefined, "evidence-next");
        next.append(node("strong", "Next step: "));
        if (link && nextAsButton) { const a = node("a", link.label, "button button-primary"); a.href = link.href; next.append(a); }
        else next.append(document.createTextNode(feedback.next.label));
        host.append(next);
        host.hidden = false;
        return link;
    }

    /** Recorded quiz attempts of one level (quizSummary(...)). Old records without history are said so plainly. */
    function renderHistory(host, summary) {
        host.replaceChildren();
        if (summary.best === null) { host.hidden = true; return; }
        host.append(node("h3", "Your attempts", "evidence-subhead"));
        const facts = [`Best score: ${summary.best}%`, `Last score: ${summary.last}%`, summary.passed ? "Passed (70% needed)" : "Not passed yet (70% needed)"];
        host.append(node("p", facts.join(" · "), "evidence-facts"));
        if (summary.hasHistory) {
            const ol = node("ol", undefined, "evidence-history-list");
            summary.history.slice().reverse().forEach(item => {
                const when = new Date(item.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
                ol.append(node("li", `Attempt ${item.attempt}: ${item.score}% (${item.correct} of ${item.total}) · ${item.passed ? "passed" : "not passed"} · ${when}`));
            });
            host.append(ol);
        }
        if (summary.legacyOnly) host.append(node("p", "These scores were saved before attempt history existed, so individual earlier attempts are not available.", "evidence-note"));
        else if (summary.hasHistory && summary.history.every(item => item.score < summary.best)) host.append(node("p", "Your best score comes from an attempt saved before attempt history existed.", "evidence-note"));
        host.hidden = false;
    }

    /** "2 assessed · 1 self-checked" for a level summary (empty string when nothing is complete). */
    function evidencePhrase(summary) {
        if (!summary.lessonsDone) return "";
        const parts = [];
        if (summary.evidence.assessed) parts.push(`${summary.evidence.assessed} assessed`);
        if (summary.evidence.self_checked) parts.push(`${summary.evidence.self_checked} self-checked`);
        return parts.join(" · ");
    }
    /** One line for module/progress pages: "Quiz best score: 80% / Passed · last 60% · 3 attempts". */
    function quizLine(summary) {
        if (summary.best === null) return "Quiz: not attempted";
        const attempts = summary.hasHistory ? `${summary.attempts} ${summary.attempts === 1 ? "attempt" : "attempts"}` : "earlier attempts not recorded";
        return `Quiz best score: ${summary.best}% / ${summary.passed ? "Passed" : "Try again"} · last ${summary.last}% · ${attempts}`;
    }
    /** "Check passed" / "Task passed" / "Self-checked (not verified)" for one lesson summary row. */
    function lessonStatus(kind) { return kind === "self_checked" ? "Self-checked (not verified)" : kind === "check_passed" ? "Check passed" : kind === "task_passed" ? "Task passed" : ""; }

    window.cmUi = Object.assign(window.cmUi || {}, { evidence: Object.freeze({ KIND_NOTE, label, linkFor, renderFeedback, renderHistory, evidencePhrase, lessonStatus, quizLine }) });
})();
