(() => {
if (window.learningUnavailable) return;
const practiceTasks = Object.values(window.pythonCurriculum.tasks);
const filtersForm = document.getElementById("practice-filters");

const searchInput = document.getElementById("task-search");
const topicFilter = document.getElementById("topic-filter");
topicFilter.replaceChildren();
for (const [value, label] of [["all", "All topics"], ...[...new Set(practiceTasks.map(task => task.topic || task.topics[0]))].map(id => [id, id.replaceAll("-", " ")])]) { const option = document.createElement("option"); option.value = value; option.textContent = label; topicFilter.append(option); }
const statusFilter = document.getElementById("status-filter");

const tasksList = document.getElementById("practice-list");
const countElement = document.getElementById("task-count");
const emptyState = document.getElementById("practice-empty");
const message = document.getElementById("workspace-message");

let taskStates = [];

const statusLabels = {
    "not-started": "Not started",
    draft: "Draft saved",
    passed: "Passed",
    unavailable: "Status unavailable"
};

function loadTaskStates() {
    let passedTasks = [];
    const issues = [];

    try {
        const savedProgress = window.cmStorage.getItem(
            "codementor-demo-learning"
        );

        if (savedProgress) {
            const progress = JSON.parse(savedProgress);

            if (
                progress?.version !== 1 ||
                !Array.isArray(progress.tasks)
            ) {
                throw new Error("Invalid progress");
            }

            passedTasks = progress.tasks;
        }
    } catch {
        issues.push(
            "Saved completion records could not be loaded."
        );
    }

    taskStates = practiceTasks.map(function (task) {
        let status = passedTasks.includes(task.id)
            ? "passed"
            : "not-started";

        if (status !== "passed") {
            try {
                const savedDraft = window.cmStorage.getItem(
                    `codementor-demo-code-${task.id}`
                );

                if (savedDraft) {
                    const draft = JSON.parse(savedDraft);

                    if (
                        draft?.version !== 1 ||
                        draft.taskId !== task.id ||
                        typeof draft.code !== "string"
                    ) {
                        throw new Error("Invalid draft");
                    }

                    status = "draft";
                }
            } catch {
                status = "unavailable";
                issues.push(
                    `The draft status for ${task.title} could not be loaded.`
                );
            }
        }

        return { ...task, status: status };
    });

    if (issues.length) {
        message.textContent = issues.join(" ");
        message.classList.add("is-error");
    }
}

function createTaskCard(task) {
    const article = document.createElement("article");
    article.className = "practice-task-card";

    const top = document.createElement("div");
    top.className = "practice-card-top";

    const category = document.createElement("p");
    category.className = "eyebrow";
    const level = window.pythonCurriculum.levels.find(level => level.tasks.includes(task.id));
    category.textContent = `OPTIONAL PRACTICE · LEVEL ${String(level?.id || 1).padStart(2, "0")}${level?.id > 5 ? ' · PREMIUM' : ''}`;

    const status = document.createElement("span");
    status.className = "practice-status";
    status.textContent = statusLabels[task.status];

    top.append(category, status);

    const title = document.createElement("h2");
    title.textContent = task.title;

    const description = document.createElement("p");
    description.textContent = task.description;

    const meta = document.createElement("div");
    meta.className = "practice-task-meta";
    meta.textContent = `${task.topicLabel || task.topics[0]} · ${window.pythonCurriculum.name}`;

    const actions = document.createElement("div");
    actions.className = "practice-task-actions";

    const startLink = document.createElement("a");
    startLink.className = "button button-primary";
    startLink.href = `../student/workspace.html?task=${task.id}`;

    startLink.textContent = task.status === "passed"
        ? "Review task"
        : task.status === "draft"
            ? "Continue task"
            : "Open task";

    const mentorLink = document.createElement("a");
    mentorLink.className = "dashboard-text-link";
    mentorLink.href = `../student/mentor.html?task=${task.id}`;
    mentorLink.textContent = "Ask mentor";

    actions.append(startLink, mentorLink);
    article.append(top, title, description, meta, actions);

    return article;
}

function renderTasks() {
    const search = searchInput.value.trim().toLowerCase();
    const topic = topicFilter.value;
    const status = statusFilter.value;

    const matches = taskStates.filter(function (task) {
        const matchesSearch = (
            `${task.title} ${task.description} ${task.topicLabel}`
                .toLowerCase()
                .includes(search)
        );

        const matchesTopic = topic === "all" || task.topic === topic;
        const matchesStatus = status === "all" || task.status === status;

        return matchesSearch && matchesTopic && matchesStatus;
    });

    tasksList.replaceChildren();

    matches.forEach(function (task) {
        tasksList.append(createTaskCard(task));
    });

    countElement.textContent =
        `${matches.length} of ${practiceTasks.length} tasks shown · ${window.pythonCurriculum.name}`;

    emptyState.hidden = matches.length > 0;
}

function resetFilters() {
    filtersForm.reset();
    renderTasks();
    searchInput.focus();
}

filtersForm.addEventListener("submit", function (event) {
    event.preventDefault();
});

searchInput.addEventListener("input", renderTasks);
topicFilter.addEventListener("change", renderTasks);
statusFilter.addEventListener("change", renderTasks);

document.getElementById("reset-filters")
    .addEventListener("click", resetFilters);

document.getElementById("empty-reset")
    .addEventListener("click", resetFilters);

window.addEventListener("pageshow", function () {
    loadTaskStates();
    renderTasks();
});
})();
