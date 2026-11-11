(() => {
if (window.learningUnavailable) return;
(() => {
if (window.savedLessonMode) return;
const lessons = window.pythonLessons;
const level = window.pythonCurriculum.selected;
document.querySelector(".module-back").href = `module.html?level=${level.id}`;
document.querySelector(".module-back").textContent = `Back to ${level.title}`;
const progressKey = "codementor-demo-learning";
let lessonOwner; try { lessonOwner = window.cmStorage.captureOwner(); } catch { /* Saving remains blocked. */ }

const title = document.getElementById("lesson-title");
const intro = document.getElementById("lesson-intro");
const position = document.getElementById("lesson-position");
const conceptTitle = document.getElementById("concept-title");
const explanation = document.getElementById("lesson-explanation");
const code = document.getElementById("lesson-code");
const output = document.getElementById("lesson-output");

const navigation = document.getElementById("lesson-navigation");
const mentorLink = document.getElementById("lesson-mentor-link");
const nextActivity = document.getElementById("next-activity");

const knowledgeForm = document.getElementById("knowledge-form");
const knowledgeQuestion = document.getElementById("knowledge-question");
const knowledgeOptions = document.getElementById("knowledge-options");
const knowledgeFeedback = document.getElementById("knowledge-feedback");

const completeButton = document.getElementById("complete-lesson");
const completionStatus = document.getElementById("completion-status");
const workspaceMessage = document.getElementById("workspace-message");

const requestedLesson = new URLSearchParams(
    window.location.search
).get("lesson") || "variables";

const lessonIndex = lessons.findIndex(function (lesson) {
    return lesson.id === requestedLesson;
});

const currentLesson = lessons[lessonIndex];

function showError(message) {
    workspaceMessage.textContent = message;
    workspaceMessage.classList.add("is-error");
}

function readProgress() {
    const saved = window.cmStorage.getItem(progressKey);

    if (!saved) {
        return {
            version: 1,
            lessons: [],
            tasks: [],
            assessments: {}
        };
    }

    const progress = JSON.parse(saved);

    if (
        progress?.version !== 1 ||
        !Array.isArray(progress.lessons) ||
        !Array.isArray(progress.tasks) ||
        !progress.assessments ||
        typeof progress.assessments !== "object" ||
        Array.isArray(progress.assessments)
    ) {
        throw new Error("Invalid learning progress");
    }

    return progress;
}

function updateCompletion() {
    try {
        const progress = readProgress();
        const completed = progress.lessons.includes(currentLesson.id);

        completeButton.disabled = completed;
        completeButton.hidden = completed;
        document.getElementById("lesson-next-description").textContent = completed
            ? "Your lesson progress is saved. Continue to the next activity when you are ready."
            : "Review the explanation and example, then mark this lesson complete or check your answer above.";
        completeButton.textContent = completed
            ? "Lesson completed ✓"
            : "Complete lesson";

        completionStatus.textContent = completed
            ? "Completed"
            : "Not completed yet";

        navigation.querySelectorAll("[data-lesson-id]").forEach(
            function (link) {
                const status = link.querySelector(".lesson-nav-status");

                status.textContent = progress.lessons.includes(
                    link.dataset.lessonId
                ) ? "Done" : "";
            }
        );
    } catch {
        completeButton.disabled = true;
        completionStatus.textContent = "Progress unavailable.";

        showError(
            "Your saved progress could not be loaded. It has not been overwritten."
        );
    }
}

function renderLesson() {
    document.title = `${currentLesson.title} | CodeMentor AI`;

    title.textContent = currentLesson.title;
    intro.textContent = currentLesson.intro;

    position.textContent =
        `LESSON ${lessonIndex + 1} / ${lessons.length} · ` +
        `ABOUT ${currentLesson.minutes} MINUTES`;

    conceptTitle.textContent = currentLesson.conceptTitle;
    explanation.replaceChildren();

    currentLesson.paragraphs.forEach(function (text) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        explanation.append(paragraph);
    });

    const objectiveList = document.getElementById("topic-objectives");
    objectiveList.replaceChildren();
    (currentLesson.objectives || []).forEach(function (objective) {
        const item = document.createElement("li"); item.textContent = objective; objectiveList.append(item);
    });
    const exercise = document.getElementById("topic-exercise");
    if (currentLesson.exercise) {
        exercise.hidden = false;
        document.getElementById("topic-exercise-prompt").textContent = currentLesson.exercise.title + ". Replace the comments or pass statements with your solution, then run it here.";
        document.getElementById("topic-exercise-code").value = currentLesson.exercise.starter;
        document.getElementById("topic-exercise-input").value = currentLesson.exercise.input;
    } else exercise.hidden = true;

    code.textContent = currentLesson.code;
    output.textContent = currentLesson.output;

    mentorLink.href =
        `../student/mentor.html?level=${level.id}&lesson=${encodeURIComponent(currentLesson.id)}`;

    const nextLesson = lessons[lessonIndex + 1];

    if (nextLesson) {
        nextActivity.href = `../student/lesson.html?lesson=${nextLesson.id}`;
        nextActivity.textContent = "Next lesson →";
    } else {
        nextActivity.href = `../student/module.html?level=${level.id}`;
        nextActivity.textContent = "Continue to practice & quiz →";
    }

    navigation.replaceChildren();

    lessons.forEach(function (lesson, index) {
        const link = document.createElement("a");
        link.href = `../student/lesson.html?lesson=${lesson.id}`;
        link.dataset.lessonId = lesson.id;

        if (lesson.id === currentLesson.id) {
            link.setAttribute("aria-current", "page");
        }

        const label = document.createElement("span");
        label.textContent = `${index + 1}. ${lesson.title}`;

        const status = document.createElement("span");
        status.className = "lesson-nav-status";

        link.append(label, status);
        navigation.append(link);
    });

    knowledgeQuestion.textContent = currentLesson.question;
    knowledgeOptions.replaceChildren();

    currentLesson.options.forEach(function (option, index) {
        const label = document.createElement("label");
        label.className = "answer-option";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = "knowledge-answer";
        input.value = index;
        input.required = true;

        const text = document.createElement("span");
        text.textContent = option;

        label.append(input, text);
        knowledgeOptions.append(label);
    });
}

document.getElementById("topic-exercise-run").addEventListener("click", async function () {
    const button = this, result = document.getElementById("topic-exercise-output");
    button.disabled = true; result.textContent = `Running ${window.pythonCurriculum.name}…`;
    try {
        const response = await window.learningRunner.execute(document.getElementById("topic-exercise-code").value, document.getElementById("topic-exercise-input").value);
        result.textContent = response.error ? `Error: ${response.error}` : response.output || "Program finished with no output.";
    } catch (error) { result.textContent = error.message; }
    finally { button.disabled = false; }
});

knowledgeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!currentLesson) {
        return;
    }

    const selected = knowledgeForm.querySelector(
        'input[name="knowledge-answer"]:checked'
    );

    if (!selected) {
        return;
    }

    const correct = Number(selected.value) === currentLesson.correct;

    knowledgeFeedback.textContent =
        `${correct ? "Correct!" : "Take another look."} ` +
        currentLesson.explanation;

    knowledgeFeedback.classList.toggle("is-error", !correct);
    try {
        const progress = readProgress();
        progress.checks = { ...progress.checks, [currentLesson.id]: { correct, answer: Number(selected.value), checkedAt: new Date().toISOString() } };
        if (correct && !progress.lessons.includes(currentLesson.id)) progress.lessons.push(currentLesson.id);
        window.cmStorage.assertOwner(lessonOwner);
        if (!window.subscriptionStore.canAccessLevel(level.id)) throw new Error("Premium access is required for this level.");
        window.cmStorage.setItem(progressKey, JSON.stringify(progress));
        updateCompletion();
        workspaceMessage.textContent = correct ? "Correct answer saved. Your lesson progress has been updated." : "Answer saved. Review the explanation or video and try again.";
        workspaceMessage.classList.remove("is-error");
    } catch {
        showError("Your answer could not be saved. Existing progress was kept. Try again.");
    }
});

knowledgeForm.addEventListener("change", function () {
    knowledgeFeedback.textContent = "";

    knowledgeOptions.querySelectorAll(".answer-option").forEach(
        function (label) {
            label.classList.toggle(
                "is-selected",
                label.querySelector("input").checked
            );
        }
    );
});

completeButton.addEventListener("click", function () {
    if (!currentLesson || completeButton.disabled) {
        return;
    }

    try {
        const progress = readProgress();

        if (!progress.lessons.includes(currentLesson.id)) {
            progress.lessons.push(currentLesson.id);
        }

        window.cmStorage.assertOwner(lessonOwner);
        if (!window.subscriptionStore.canAccessLevel(level.id)) throw new Error("Premium access is required for this level.");
        window.cmStorage.setItem(progressKey, JSON.stringify(progress));
    } catch {
        showError("Couldn’t save lesson completion. Try again.");
        return;
    }

    workspaceMessage.textContent = "Lesson completion saved.";
    workspaceMessage.classList.remove("is-error");

    updateCompletion();
});

if (currentLesson) {
    renderLesson();
    window.addEventListener("pageshow", updateCompletion);
} else {
    title.textContent = "Lesson not found";
    intro.textContent = `Return to the ${window.pythonCurriculum.name} learning path to choose a lesson.`;

    completeButton.disabled = true;
    knowledgeForm.hidden = true;
    nextActivity.href = "../student/module.html?level=1";
    nextActivity.textContent = "Back to level";
}

})();

})();
