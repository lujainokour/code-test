if (!window.learningUnavailable) {
let requiredLessons = [
    { id: "variables", title: "Variables and values" },
    { id: "data-types", title: "Data types" },
    { id: "input-output", title: "Input and output" },
    { id: "numbers", title: "Working with numbers" }
];

let requiredTasks = [
    { id: "student-profile", title: "Create a student profile" },
    { id: "receipt", title: "Build a simple receipt" }
];

const message = document.getElementById("workspace-message");
const activitiesList = document.getElementById("completed-activities");

const nextDescription = document.getElementById("next-step-description");
const nextLink = document.getElementById("next-step-link");

function readProgress() {
    const saved = window.cmStorage.getItem("codementor-demo-learning");

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
        throw new Error("Invalid progress");
    }

    return progress;
}

function addActivity(type, title, href) {
    const item = document.createElement("li");

    const label = document.createElement("span");
    label.className = "activity-type";
    label.textContent = type;

    const link = document.createElement("a");
    link.textContent = title;
    link.href = href;

    item.append(label, link);
    activitiesList.append(item);
}

function updateProgress() {
    let progress;
    const course = window.pythonCurriculum;

    try {
        progress = readProgress();
    } catch {
        message.textContent =
            "Saved progress could not be loaded. Your records have not been changed.";

        message.classList.add("is-error");

        nextDescription.textContent =
            "Return to your level to check your saved progress.";

        return;
    }

    const level = course.current(progress);
    requiredLessons = level.lessons;
    requiredTasks = level.tasks.map(id => ({id, title: id.replaceAll("-", " ")}));
    document.querySelector(".workspace-intro").textContent = `${course.levels.filter(item => course.completed(item, progress)).length} of ${course.levels.length} levels completed. Current level: ${level.title}. Saved on this device.`;
    document.querySelectorAll(".dashboard-stat > p").forEach((element, index) => element.textContent = ["LESSONS / CURRENT LEVEL", "TASKS / CURRENT LEVEL", "CURRENT LEVEL STATUS"][index]);
    document.querySelector(".dashboard-grid .dashboard-card h2").textContent = level.title;
    document.querySelector(".dashboard-grid .dashboard-card > p").textContent = "Complete the lessons and pass the quiz with at least 70%. Coding tasks provide extra practice.";
    document.querySelector('.dashboard-grid a[href*="module.html"]').href = `module.html?level=${level.id}`;
    const completedLessons = requiredLessons.filter(function (lesson) {
        return progress.lessons.includes(lesson.id);
    });

    const completedTasks = requiredTasks.filter(function (task) {
        return progress.tasks.includes(task.id);
    });

    const lessonsDone = completedLessons.length;
    const tasksDone = completedTasks.length;

    const assessment = progress.assessments[level.id];

    const hasAssessment = (
        typeof assessment?.score === "number" &&
        Number.isFinite(assessment.score) &&
        assessment.score >= 0 &&
        assessment.score <= 100
    );

    const activitiesComplete = (
        lessonsDone === requiredLessons.length
    );

    const levelComplete = (
        activitiesComplete &&
        hasAssessment &&
        assessment.score >= 70
    );

    document.getElementById("completed-lessons").textContent =
        `${lessonsDone} / ${requiredLessons.length}`;

    document.getElementById("completed-tasks").textContent =
        `${tasksDone} / ${requiredTasks.length}`;

    document.getElementById("level-status").textContent = levelComplete
        ? "Completed"
        : lessonsDone || tasksDone || hasAssessment
            ? "In progress"
            : "Not started";

    document.getElementById("lesson-count").textContent =
        `${lessonsDone} / ${requiredLessons.length}`;

    document.getElementById("task-count").textContent =
        `${tasksDone} / ${requiredTasks.length}`;

    document.getElementById("lesson-bar").value = lessonsDone;
    document.getElementById("task-bar").value = tasksDone;

    const assessmentStatus = document.getElementById("assessment-status");

    if (hasAssessment) {
        assessmentStatus.textContent =
            `${assessment.score}% · ${
                assessment.score >= 70 ? "Passed" : "Not passed"
            }`;
    } else {
        assessmentStatus.textContent = activitiesComplete
            ? "Available · Pass mark: 70%"
            : "Complete the four lessons to unlock. Coding tasks are optional practice.";
    }

    activitiesList.replaceChildren();

    completedLessons.forEach(function (lesson) {
        addActivity(
            "LESSON COMPLETED",
            lesson.title,
            `../student/lesson.html?lesson=${lesson.id}`
        );
    });

    completedTasks.forEach(function (task) {
        addActivity(
            "TASK PASSED",
            task.title,
            `../student/code-review.html?task=${task.id}`
        );
    });

    if (hasAssessment) {
        addActivity(
            "ASSESSMENT RESULT",
            `Level ${level.id} / ${assessment.score}%`,
            `../student/level-assessment.html?level=${level.id}`
        );
    }

    if (!activitiesList.children.length) {
        const empty = document.createElement("li");
        empty.textContent =
            "No completed activities yet. Start with your first lesson.";
        activitiesList.append(empty);
    }

    const nextLesson = requiredLessons.find(function (lesson) {
        return !progress.lessons.includes(lesson.id);
    });

    const nextTask = requiredTasks.find(function (task) {
        return !progress.tasks.includes(task.id);
    });

    if (nextLesson) {
        nextDescription.textContent =
            `Continue with ${nextLesson.title}.`;

        nextLink.textContent = "Open lesson";
        nextLink.href = `../student/lesson.html?lesson=${nextLesson.id}`;
    } else if (nextTask && levelComplete) {
        nextDescription.textContent =
            `Practise your skills in ${nextTask.title}. ` +
            "Run your solution and submit it to check all test cases.";

        nextLink.textContent = "Open task";
        nextLink.href = `../student/workspace.html?task=${nextTask.id}`;
    } else if (!levelComplete) {
        nextDescription.textContent =
            "Complete your level assessment with at least 70%.";

        nextLink.textContent = "Open assessment";
        nextLink.href = `../student/level-assessment.html?level=${level.id}`;
    } else {
        nextDescription.textContent =
            `You have completed all published ${course.name} levels. Review your roadmap or practise the final project.`;

        nextLink.textContent = "View learning path";
        nextLink.href = "../student/learning-path.html";
    }
}

window.addEventListener("pageshow", updateProgress);

}
