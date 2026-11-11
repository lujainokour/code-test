(() => {
if (window.learningUnavailable) return;
const taskNames = {
    "student-profile": "Create a student profile",
    receipt: "Build a simple receipt",
    "grade-checker": "Check a grade", "sum-numbers": "Sum a range", "list-summary": "Summarise a list", "task-manager": "Build a Study Task Manager"
};
Object.assign(taskNames, Object.fromEntries(Object.values(window.pythonCurriculum.tasks).map(task => [task.id, task.title])));

const taskId = new URLSearchParams(
    window.location.search
).get("task") || "student-profile";

const taskName = document.getElementById("review-task-name");
const codeElement = document.getElementById("review-code");
const mentorLink = document.getElementById("review-mentor-link");
const workspaceLink = document.getElementById("review-workspace-link");
const message = document.getElementById("workspace-message");

function loadDraft() {
    if (!Object.hasOwn(taskNames, taskId)) {
        taskName.textContent = "Task not found.";
        codeElement.textContent = "Choose a task from Python Foundations.";

        workspaceLink.href = "../student/module.html?level=1";
        workspaceLink.textContent = "Choose a task";
        mentorLink.href = "../student/mentor.html";

        return;
    }

    taskName.textContent = taskNames[taskId];

    workspaceLink.href =
        `../student/workspace.html?task=${encodeURIComponent(taskId)}`;

    mentorLink.href =
        `../student/mentor.html?task=${encodeURIComponent(taskId)}`;

    try {
        const saved = window.cmStorage.getItem(
            `codementor-demo-code-${taskId}`
        );

        if (!saved) {
            codeElement.textContent =
                "No saved draft yet. Open the workspace to write your solution.";
            return;
        }

        const draft = JSON.parse(saved);

        if (
            draft?.version !== 1 ||
            draft.taskId !== taskId ||
            typeof draft.code !== "string"
        ) {
            throw new Error("Invalid draft");
        }

        codeElement.textContent = draft.code || "# Your draft is empty";
        const progressText = window.cmStorage.getItem("codementor-demo-learning");
        const progress = progressText === null ? null : JSON.parse(progressText);
        const last = progress?.taskResults?.[taskId];
        const banner = document.querySelector(".review-status-banner");
        const results = document.querySelector(".review-empty-state"); results.replaceChildren();
        if (!last || !Array.isArray(last.cases)) {
            document.getElementById("evaluation-title").textContent = "Ready to test your solution";
            banner.querySelector("p").textContent = "Open the coding workspace and submit your solution to run the automated checks.";
            results.textContent = "No test results saved yet.";
        } else {
            document.getElementById("evaluation-title").textContent = `${last.passed} / ${last.total} checks passed`;
            banner.querySelector("p").textContent = last.code === draft.code ? "Results from your latest checked solution on this device." : "These results are from an earlier solution. Your current draft has changed; submit it again to check the changes.";
            last.cases.forEach((test, index) => {
                const title = document.createElement("h3"); title.textContent = `Test ${index + 1}: ${test.passed ? "Passed" : "Needs work"}`;
                const detail = document.createElement("pre"); detail.className = "lesson-output";
                detail.textContent = `Input: ${test.input || "(none)"}\nExpected:\n${test.expected}\nYour output:\n${test.output || "(empty)"}${test.error ? "\n" + test.error : ""}`;
                results.append(title, detail);
            });
            if (last.cases.length < last.total) {
                const note = document.createElement("p"); note.textContent = "Remaining checks were not run after the first failure. Fix the issue and submit again."; results.append(note);
            }
        }
    } catch {
        codeElement.textContent = "Saved draft unavailable.";

        message.textContent =
            "Your draft could not be loaded. It has not been changed.";

        message.classList.add("is-error");
    }
}

window.addEventListener("pageshow", loadDraft);
})();
