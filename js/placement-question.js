(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const store = window.placementStore, context = store.capture(), questions = store.bank(context).questions;
    const byId = id => document.getElementById(id);
    let attempt = null, snapshot = "null", saved = true;
    function message(text, error = false) { byId("question-message").textContent = text; byId("question-message").classList.toggle("is-error", error); }
    function persist() {
        try {
            attempt = store.save({ answers: attempt.answers, currentQuestion: attempt.currentQuestion }, snapshot, context);
            snapshot = JSON.stringify(attempt); saved = true; byId("save-status").textContent = "Answers saved on this device."; message(""); return true;
        } catch (error) { saved = false; byId("save-status").textContent = "Changes not saved."; message(error.message, true); return false; }
    }
    function navigation() {
        const host = byId("question-navigation"); host.replaceChildren();
        questions.forEach((question, index) => {
            const button = document.createElement("button"); button.type = "button"; button.className = "question-number"; button.textContent = String(index + 1);
            const answered = attempt.answers[index] !== null;
            button.classList.toggle("is-answered", answered); button.setAttribute("aria-label", `Question ${index + 1}, ${answered ? "answered" : "unanswered"}`);
            if (index === attempt.currentQuestion) button.setAttribute("aria-current", "step");
            button.addEventListener("click", () => go(index)); host.append(button);
        });
        const answered = attempt.answers.filter(answer => answer !== null).length;
        byId("answer-count").textContent = `${answered} answered · ${questions.length - answered} unanswered`;
        byId("review-answers").disabled = answered !== questions.length || !saved;
    }
    function render(focus = false) {
        const index = attempt.currentQuestion, question = questions[index];
        byId("question-title").textContent = question.title; byId("question-position").textContent = `QUESTION ${index + 1} OF ${questions.length}`;
        byId("question-topic").textContent = `Level ${question.level} · ${question.topic}`; byId("code-content").textContent = question.code;
        byId("question-progress").max = questions.length; byId("question-progress").value = index + 1;
        const host = byId("answer-options"); host.replaceChildren();
        const choices = [...question.options.map((text, value) => ({ text, value })), { text: "I’m not sure", value: "unsure" }];
        choices.forEach((choice, position) => {
            const label = document.createElement("label"), input = document.createElement("input"), text = document.createElement("span");
            label.className = "answer-option"; input.type = "radio"; input.name = "answer"; input.value = String(choice.value); input.checked = attempt.answers[index] === choice.value;
            text.textContent = choice.value === "unsure" ? choice.text : `${String.fromCharCode(65 + position)} · ${choice.text}`;
            label.classList.toggle("is-selected", input.checked);
            input.addEventListener("change", () => { attempt.answers[index] = choice.value; persist(); host.querySelectorAll(".answer-option").forEach(option => option.classList.toggle("is-selected", option.querySelector("input").checked)); navigation(); });
            label.append(input, text); host.append(label);
        });
        byId("previous-question").disabled = index === 0; byId("next-question").disabled = false;
        byId("next-question").textContent = index === questions.length - 1 ? "Review answers →" : "Next question →";
        navigation(); if (focus) byId("question-title").focus();
    }
    function go(index) { if (!attempt || index < 0 || index >= questions.length) return; attempt.currentQuestion = index; persist(); render(true); }
    function review() {
        if (!attempt || attempt.answers.some(answer => answer === null)) { message("Answer every question or choose unsure before reviewing.", true); return; }
        if (persist()) location.href = "placement-review.html";
    }
    function load() {
        try {
            attempt = store.read(context);
            if (!attempt) { location.replace("placement-intro.html"); return; }
            if (attempt.status === "submitted") { location.replace("placement-results.html"); return; }
            snapshot = JSON.stringify(attempt); saved = true; byId("save-status").textContent = "Answers loaded.";
            document.querySelector(".eyebrow").textContent = `${window.languageCatalog.get(context.language).name.toUpperCase()} PLACEMENT`;
            document.title = `${window.languageCatalog.get(context.language).name} placement | CodeMentor AI`;
            document.querySelector(".onboarding-footer").textContent = `CodeMentor AI · Frontend demo · ${window.languageCatalog.get(context.language).name} placement`;
            render();
        } catch (error) { message(error.message, true); ["previous-question", "next-question", "review-answers"].forEach(id => { byId(id).disabled = true; }); }
    }
    byId("previous-question").addEventListener("click", () => go(attempt?.currentQuestion - 1));
    byId("next-question").addEventListener("click", () => { if (!attempt) return; if (attempt.currentQuestion === questions.length - 1) review(); else go(attempt.currentQuestion + 1); });
    byId("review-answers").addEventListener("click", review);
    window.addEventListener("pageshow", load); load();
})();
