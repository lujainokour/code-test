(() => {
    if (window.learningUnavailable) return;
    const form = document.getElementById("level-assessment-form"), result = document.getElementById("assessment-result"), notice = document.getElementById("assessment-message");
    const questions = window.pythonCurriculum.selected.quiz;
    const repository = window.cmData.learning, learning = window.cmDomain.learning;   // Slice 1: rules in js/domain, storage in js/data
    window.levelQuizQuestions = questions;
    const levelId = String(window.pythonCurriculum.selected.id);
    let assessmentOwner; try { assessmentOwner = window.cmStorage.captureOwner(); } catch { /* Saving remains blocked. */ }
    const node = (tag, text, cls) => { const element = document.createElement(tag); if (text) element.textContent = text; if (cls) element.className = cls; return element; };
    const unreadable = "Saved progress could not be read. Existing records have not been changed.";
    function read() { return repository.read({ strict: true, unreadableMessage: unreadable }).progress; }
    function unlocked(progress) { return learning.quizUnlocked(window.pythonLessons, progress); }
    // Slice 3: attempts, feedback and the single next action come from js/domain/learning.js; js/ui/evidence-feedback.js renders them.
    const course = window.pythonCurriculum, evidenceUi = window.cmUi.evidence, byId = id => document.getElementById(id);
    const nextLevelOf = () => course.levels.find(level => level.id > course.selected.id) || null;
    const nextLocked = progress => { const next = nextLevelOf(); return Boolean(next) && !course.available(next, progress); };
    // On open: attempts so far and, once any result is saved, one panel with the single next action.
    function showSaved(progress) {
        evidenceUi.renderHistory(byId("quiz-history"), learning.quizSummary(progress, Number(levelId)));
        const overview = learning.levelOverviewFeedback({ level: course.selected, progress, taskTopics: course.taskTopics, nextLevel: nextLevelOf(), nextLocked: nextLocked(progress) });
        if (overview) evidenceUi.renderFeedback(byId("quiz-feedback"), overview, { nextAsButton: true }); else byId("quiz-feedback").hidden = true;
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
            showSaved(progress);
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
            const answers = questions.map((question, index) => Number(new FormData(form).get(`question-${index}`)));
            const attempt = learning.scoreQuiz(questions, answers), score = attempt.score;
            let previousBest = null;
            const { progress: updated } = repository.update(progress => {
                if (!unlocked(progress)) throw new Error("Required activity records changed. The assessment remains locked.");
                previousBest = learning.quizSummary(progress, Number(levelId)).best;
                return learning.applyQuizAttempt(progress, levelId, { answers, score, now: new Date().toISOString(), total: attempt.total, correct: attempt.correct, language: course.id });
            }, {
                strict: true, unreadableMessage: unreadable,
                beforeWrite() {
                    window.cmStorage.assertOwner(assessmentOwner);
                    if (!window.subscriptionStore.canAccessLevel(Number(levelId))) throw new Error("Premium access is required for this level.");
                }
            });
            showResult(score); notice.textContent = `Latest attempt: ${score}%. Best score: ${updated.assessments[levelId].score}%. Your higher scores and completed activities are kept.`;
            let review = document.getElementById("quiz-answer-review");
            if (!review) { review = node("div"); review.id = "quiz-answer-review"; result.after(review); }
            review.replaceChildren(node("h3", "Learn from this attempt"));
            questions.forEach((question, index) => {
                const feedback = node("p", `${index + 1}. ${answers[index] === question.correct ? "Correct." : "Review this answer."} ${question.explanation}`); review.append(feedback);
            });
            // One feedback panel (what was completed, whether it passed, what to improve, one next action) and the attempt list.
            evidenceUi.renderFeedback(byId("quiz-feedback"), learning.quizFeedback({ level: course.selected, attempt, answers, questions, previousBest, progress: updated, taskTopics: course.taskTopics, nextLevel: nextLevelOf(), nextLocked: nextLocked(updated) }), { nextAsButton: true });
            evidenceUi.renderHistory(byId("quiz-history"), learning.quizSummary(updated, Number(levelId)));
        } catch (error) { notice.textContent = `${error.message} Nothing was overwritten.`; notice.classList.add("is-error"); }
    });
    prepare();
})();
