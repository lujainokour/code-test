(() => {
    if (window.learningUnavailable) return;
    const form = document.getElementById("level-assessment-form"), result = document.getElementById("assessment-result"), notice = document.getElementById("assessment-message");
    const questions = window.pythonCurriculum.selected.quiz, key = "codementor-demo-learning";
    window.levelQuizQuestions = questions;
    const levelId = String(window.pythonCurriculum.selected.id);
    let assessmentOwner; try { assessmentOwner = window.cmStorage.captureOwner(); } catch { /* Saving remains blocked. */ }
    const object = value => value && typeof value === "object" && !Array.isArray(value);
    const node = (tag, text, cls) => { const element = document.createElement(tag); if (text) element.textContent = text; if (cls) element.className = cls; return element; };
    function read() {
        const raw = window.cmStorage.getItem(key);
        const value = raw === null ? { version: 1, lessons: [], tasks: [], assessments: {} } : JSON.parse(raw);
        if (!object(value) || value.version !== 1 || !Array.isArray(value.lessons) || !value.lessons.every(item => typeof item === "string") || !Array.isArray(value.tasks) || !value.tasks.every(item => typeof item === "string") || !object(value.assessments) || !Object.values(value.assessments).every(item => object(item) && typeof item.score === "number" && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100)) throw new Error("Saved progress could not be read. Existing records have not been changed.");
        return value;
    }
    function unlocked(progress) { return window.pythonLessons.every(question => progress.lessons.includes(question.id)); }
    function showNextStep(progress) {
        document.getElementById("assessment-next-step")?.remove();
        const course = window.pythonCurriculum;
        if (!course.completed(course.selected, progress)) return;
        const next = course.levels.find(level => level.id > course.selected.id);
        if (next && !course.available(next, progress)) return;
        const actions = node("div", "", "assessment-next-step"); actions.id = "assessment-next-step";
        actions.append(node("p", next ? `Level completed! Next: ${next.title}.` : "All available levels completed! Put your skills into practice."));
        const link = node("a", next ? `Continue to Level ${next.id} →` : "Start the final project →", "button button-primary");
        link.href = next ? `module.html?level=${next.id}` : "project.html";
        if (next && !window.subscriptionStore.canAccessLevel(next.id)) { link.href = "subscription.html"; link.textContent = "View Premium access →"; }
        actions.append(link); result.parentElement.append(actions);
    }
    function showResult(score) { result.textContent = `Saved local demo result: ${score}% · ${score >= 70 ? "Pass mark reached" : "Below the 70% pass mark"}. This is a browser quiz result, not server-verified assessment or code evaluation.`; }
    function prepare() {
        form.hidden = true;
        try {
            document.querySelector("h1").textContent = `${window.pythonCurriculum.selected.title}: level quiz`;
            document.querySelector(".module-back").href = `module.html?level=${levelId}`;
            document.querySelector(".module-back").textContent = "Back to this level";
            document.querySelector("main > .eyebrow").textContent = `LEVEL ${levelId} / KNOWLEDGE QUIZ`;
            document.querySelector(".dashboard-card h2").textContent = window.pythonCurriculum.selected.title;
            const progress = read();
            if (!unlocked(progress)) { notice.textContent = `Complete the four ${window.pythonCurriculum.name} lessons to unlock this quiz. A correct lesson answer automatically records that lesson. Coding tasks provide additional practice.`; return; }
            notice.textContent = `Prepared ${window.pythonCurriculum.name} demo questions. Answers are checked locally only. No code is executed and no official result or certificate is issued.`;
            if (progress.assessments[levelId]) showResult(progress.assessments[levelId].score);
            showNextStep(progress);
            form.replaceChildren();
            questions.forEach((question, index) => {
                const fieldset = node("fieldset", "", "question-options"); fieldset.append(node("legend", `${index + 1}. ${question.question}`));
                const example = node("pre", "", "question-code"); example.append(node("code", question.code)); fieldset.append(example);
                question.options.forEach((answer, position) => {
                    const label = node("label", "", "answer-option"), input = node("input"); input.type = "radio"; input.name = `question-${index}`; input.value = position; input.required = true;
                    label.append(input, node("span", answer)); fieldset.append(label);
                }); form.append(fieldset);
            });
            const submit = node("button", "Save local demo result", "button button-primary"); submit.type = "submit"; form.append(submit); form.hidden = false;
        } catch (error) { notice.textContent = error.message; notice.classList.add("is-error"); }
    }
    form.addEventListener("submit", event => {
        event.preventDefault(); if (!form.reportValidity()) return;
        try {
            const progress = read(); if (!unlocked(progress)) throw new Error("Required activity records changed. The assessment remains locked.");
            const answers = questions.map((question, index) => Number(new FormData(form).get(`question-${index}`)));
            const score = Math.round(answers.filter((answer, index) => answer === questions[index].correct).length / questions.length * 100);
            const previous = progress.assessments[levelId] || {};
            const updated = { ...progress, assessments: { ...progress.assessments, [levelId]: { ...previous, score: Math.max(previous.score || 0, score), lastScore: score, answers, bestAnswers: score >= (previous.score || 0) ? answers : previous.bestAnswers || previous.answers, kind: "local-quiz-demo", submittedAt: new Date().toISOString() } } };
            window.cmStorage.assertOwner(assessmentOwner);
            if (!window.subscriptionStore.canAccessLevel(Number(levelId))) throw new Error("Premium access is required for this level.");
            window.cmStorage.setItem(key, JSON.stringify(updated)); showResult(score); notice.textContent = `Latest attempt: ${score}%. Best score: ${updated.assessments[levelId].score}%. Your higher scores and completed activities are kept.`;
            let review = document.getElementById("quiz-answer-review");
            if (!review) { review = node("div"); review.id = "quiz-answer-review"; result.after(review); }
            review.replaceChildren(node("h3", "Learn from this attempt"));
            questions.forEach((question, index) => {
                const feedback = node("p", `${index + 1}. ${answers[index] === question.correct ? "Correct." : "Review this answer."} ${question.explanation}`); review.append(feedback);
            });
            showNextStep(updated);
        } catch (error) { notice.textContent = `${error.message} Nothing was overwritten.`; notice.classList.add("is-error"); }
    });
    prepare();
})();
