(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const store = window.placementStore, context = store.capture(), bank = store.bank(context), questions = bank.questions;
    const byId = id => document.getElementById(id), content = byId("results-content"), status = byId("results-message");
    const node = (tag, text, cls) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (cls) value.className = cls; return value; };
    const dialog = node("dialog", undefined, "confirmation-dialog"); dialog.id = "placement-override-dialog"; dialog.setAttribute("aria-labelledby", "placement-override-title");
    const heading = node("h2", "Start from Level 1?"); heading.id = "placement-override-title";
    const cancel = node("button", "Cancel", "button button-outline"), confirm = node("button", "Confirm Level 1", "button button-primary"); cancel.type = confirm.type = "button"; cancel.autofocus = true;
    const dialogStatus = node("p", "", "form-message"); dialogStatus.setAttribute("role", "status");
    dialog.append(heading, node("p", "This changes your starting choice only. Your completed lessons, quiz scores, coding tasks and saved code will be kept."), cancel, confirm, dialogStatus); document.body.append(dialog);
    let snapshot = null;
    function fail(error) { status.textContent = error.message || String(error); status.classList.add("is-error"); }
    cancel.addEventListener("click", () => dialog.close());
    confirm.addEventListener("click", () => {
        try { store.overrideFromOne(snapshot, true, context); dialog.close(); location.href = "learning-path.html"; }
        catch (error) { dialogStatus.textContent = error.message; }
    });
    window.addEventListener("student-account-changed", () => dialog.close());
    window.addEventListener("learning-language-changed", () => dialog.close());
    window.addEventListener("storage", () => { if (dialog.open) dialog.close(); });
    function recommendation(result) {
        const card = document.querySelector(".starting-level"); card.replaceChildren();
        const info = node("div"), title = node("h2", `Recommended start: Level ${result.recommendedStart}`); title.id = "level-title";
        info.append(node("p", "PLACEMENT RECOMMENDATION · NOT COMPLETION", "eyebrow"), title);
        info.append(node("p", `Every topic of a level needs at least ${result.threshold}%. Levels are considered in order; at most ${result.maxSkip} levels can be placed out.`));
        const reasons = node("ul"); reasons.id = "placement-topic-reasons";
        result.topicScores.forEach(score => { reasons.append(node("li", `Level ${score.level} · ${score.topic}: ${score.correct}/${score.total} (${Math.round(score.percentage * 100) / 100}%) — ${score.meetsThreshold ? "meets" : "below"} ${result.threshold}%.${score.level > result.maxSkip ? " Reviewed for guidance; outside the maximum skip allowance." : ""}`)); });
        info.append(reasons, node("p", result.placedOutLevels.length ? `If you choose Start here, Levels ${result.placedOutLevels.join(", ")} become placed out. You may review them at any time; they do not count as completed lessons or certificate progress.` : "Start at Level 1. No levels are placed out and no learning completion is awarded by this result."));
        const current = store.choice(context);
        info.append(node("p", current ? `Current saved starting choice: Level ${current.startLevel}. A retake updates the recommendation only until you apply a new choice.` : "No starting choice has been applied yet. Viewing results alone does not unlock placed-out levels."));
        const actions = node("div"); actions.style.display = "grid"; actions.style.gap = "12px";
        const start = node("button", "Start here", "button button-primary"), override = node("button", "Override and start from level 1", "button button-outline"), retake = node("button", "Retake placement", "button button-outline"); start.type = override.type = retake.type = "button";
        start.id = "apply-placement-start"; override.id = "open-placement-override"; retake.id = "retake-placement";
        start.addEventListener("click", () => { try { store.applyRecommended(snapshot, context); location.href = "learning-path.html"; } catch (error) { fail(error); } });
        override.addEventListener("click", () => { dialogStatus.textContent = ""; dialog.showModal(); });
        retake.addEventListener("click", () => { try { store.begin(context, true); location.href = "placement-question.html"; } catch (error) { fail(error); } });
        const dashboard = node("a", "Go to dashboard", "dashboard-text-link"); dashboard.href = "dashboard.html";
        actions.append(start, override, retake, dashboard); card.append(info, actions);
    }
    function render() {
        content.hidden = true; status.textContent = ""; status.classList.remove("is-error");
        try {
            const attempt = store.read(context);
            if (!attempt) { location.replace("placement-intro.html"); return; }
            if (attempt.status !== "submitted") { location.replace("placement-question.html"); return; }
            snapshot = JSON.stringify(attempt);
            const result = window.placementEngine.evaluate(bank, attempt), name = window.languageCatalog.get(context.language).name;
            document.title = `${name} placement results | CodeMentor AI`;
            document.querySelector(".results-intro").textContent = `Your ${name} assessment recommends a starting level using topic scores. Applying placement does not award course completion.`;
            document.querySelector(".onboarding-footer").textContent = `CodeMentor AI · Frontend demo · ${name} placement results`;
            byId("score-percentage").textContent = `${result.percentage}%`; byId("score-count").textContent = `${result.correct} of ${result.total} correct`;
            byId("response-summary").textContent = `${result.total - result.unsure} options selected · ${result.unsure} marked “I’m not sure”`;
            const topics = byId("topic-results"); topics.replaceChildren();
            result.topicScores.forEach(score => {
                const row = node("div", undefined, "topic-result"), head = node("div", undefined, "topic-result-heading"), bar = node("progress");
                head.append(node("strong", `Level ${score.level} · ${score.topic}`), node("span", `${score.correct} / ${score.total} correct`));
                bar.max = score.total; bar.value = score.correct; bar.setAttribute("aria-label", `${score.topic}: ${score.correct} of ${score.total} correct`); row.append(head, bar); topics.append(row);
            });
            const weakest = Math.min(...result.topicScores.map(score => score.percentage));
            byId("practice-suggestion").textContent = weakest === 100 ? "Every question was correct. The maximum placement skip is still two levels; actual lessons and tasks are required for completion." : "Review " + result.topicScores.filter(score => score.percentage === weakest).map(score => score.topic).join(" and ") + ". Your recommendation never marks these lessons complete.";
            const answers = byId("submitted-answers"); answers.replaceChildren();
            questions.forEach((question, index) => {
                const article = node("article", undefined, "submitted-answer"), code = node("pre", undefined, "question-code"); code.append(node("code", question.code));
                const answer = attempt.answers[index];
                article.append(node("h3", `${index + 1}. ${question.title}`), code, node("p", answer === "unsure" ? "Your response: I’m not sure" : `Your answer: ${question.options[answer]}`), node("p", `Correct answer: ${question.options[question.correct]}`), node("span", answer === question.correct ? "Correct" : answer === "unsure" ? "Not sure · 0 points" : "Incorrect", "answer-result")); answers.append(article);
            });
            recommendation(result); content.hidden = false;
        } catch (error) { fail(error); }
    }
    window.addEventListener("pageshow", render); render();
})();
