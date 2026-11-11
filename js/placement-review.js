(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const store = window.placementStore, context = store.capture(), questions = store.bank(context).questions;
    const byId = id => document.getElementById(id), dialog = byId("submit-dialog");
    let attempt, snapshot;
    function load() {
        try {
            attempt = store.read(context);
            if (!attempt) { location.replace("placement-intro.html"); return false; }
            if (attempt.status === "submitted") { location.replace("placement-results.html"); return false; }
            snapshot = JSON.stringify(attempt); return true;
        } catch (error) { byId("review-message").textContent = error.message; byId("open-submit").disabled = true; return false; }
    }
    function render() {
        const host = byId("review-list"); host.replaceChildren();
        questions.forEach((question, index) => {
            const answer = attempt.answers[index], row = document.createElement("article"), number = document.createElement("span"), content = document.createElement("div");
            row.className = "review-row"; number.className = "review-number"; number.textContent = String(index + 1).padStart(2, "0");
            const heading = document.createElement("h3"); heading.className = "review-question"; heading.textContent = question.title;
            const text = document.createElement("p"); text.className = "review-answer"; text.textContent = answer === null ? "Unanswered" : answer === "unsure" ? "Your response: I’m not sure" : `Your answer: ${String.fromCharCode(65 + answer)} · ${question.options[answer]}`;
            const topic = document.createElement("span"); topic.className = "review-topic"; topic.textContent = `Level ${question.level} · ${question.topic}`;
            const edit = document.createElement("button"); edit.type = "button"; edit.className = "button button-outline review-edit"; edit.textContent = "Edit"; edit.setAttribute("aria-label", `Edit answer to question ${index + 1}`);
            edit.addEventListener("click", () => {
                try { store.save({ answers: attempt.answers, currentQuestion: index }, snapshot, context); location.href = "placement-question.html"; }
                catch (error) { byId("review-message").textContent = error.message; }
            });
            content.append(heading, text, topic); row.append(number, content, edit); host.append(row);
        });
        const unsure = attempt.answers.filter(answer => answer === "unsure").length, missing = attempt.answers.filter(answer => answer === null).length;
        byId("selected-count").textContent = String(questions.length - unsure - missing); byId("unsure-count").textContent = String(unsure); byId("unanswered-count").textContent = String(missing);
        byId("open-submit").disabled = missing > 0; byId("review-message").textContent = missing ? "Answer every question or choose unsure before submitting." : "All questions answered. Your assessment is ready to submit.";
    }
    byId("open-submit").addEventListener("click", () => { if (load()) { render(); if (attempt.answers.every(answer => answer !== null)) { byId("submit-error").textContent = ""; dialog.showModal(); } } });
    byId("cancel-submit").addEventListener("click", () => dialog.close());
    dialog.addEventListener("cancel", event => { if (byId("confirm-submit").disabled) event.preventDefault(); });
    byId("confirm-submit").addEventListener("click", () => {
        if (!attempt || byId("confirm-submit").disabled) return;
        byId("confirm-submit").disabled = true; byId("cancel-submit").disabled = true;
        try { store.submit(snapshot, context); location.href = "placement-results.html"; }
        catch (error) { byId("submit-error").textContent = error.message; byId("confirm-submit").disabled = false; byId("cancel-submit").disabled = false; }
    });
    window.addEventListener("student-account-changed", () => dialog.close());
    function start() { byId("confirm-submit").disabled = false; byId("cancel-submit").disabled = false; dialog.close(); if (load()) render(); }
    window.addEventListener("pageshow", start); start();
})();
