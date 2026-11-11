(() => {
if (window.learningUnavailable) return;
const tasks = window.pythonCurriculum.tasks;
window.pythonWorkspaceTasks = tasks;
const taskId = new URLSearchParams(
    window.location.search
).get("task") || "student-profile";

try {
    const taskLevel = window.pythonCurriculum?.levels.find(level => level.tasks.includes(taskId));
    if (taskLevel && !window.subscriptionStore.canAccessLevel(taskLevel.id)) {
        window.location.replace("subscription.html");
        return;
    }
} catch {
    window.location.replace("subscription.html?access=unavailable");
    return;
}

const task = tasks[taskId];

const editor = document.getElementById("code-editor");
const programInput = document.getElementById("program-input");
const draftStatus = document.getElementById("draft-status");
const message = document.getElementById("workspace-message");

const saveButton = document.getElementById("save-draft");
const runButton = document.getElementById("run-code");
const submitButton = document.getElementById("submit-code");
const resetButton = document.getElementById("reset-code");

const resetDialog = document.getElementById("reset-dialog");
const cancelReset = document.getElementById("cancel-reset");
const confirmReset = document.getElementById("confirm-reset");

const draftKey = `codementor-demo-code-${taskId}`;

let saveTimer;
let hasUnsavedChanges = false;
let tabCanLeaveEditor = false;
let draftLoaded = false;
let workspaceOwner;
let accountChanged = false;
function currentOwner() {
    const raw = window.cmStorage.getItem("codementor-demo-session");
    if (raw === null) return "guest";
    const account = JSON.parse(raw);
    if (account?.role !== "student" || !account.email?.trim()) throw new Error("Your student profile is unavailable.");
    return account.email.trim().toLowerCase() + ":" + window.cmStorage.activeLanguage();
}
try { workspaceOwner = currentOwner(); } catch { accountChanged = true; }
function assertWorkspaceOwner() {
    let activeOwner; try { activeOwner = currentOwner(); } catch { activeOwner = null; }
    if (accountChanged || activeOwner !== workspaceOwner) {
        accountChanged = true;
        clearTimeout(saveTimer);
        hasUnsavedChanges = false;
        draftLoaded = false;
        window.learningRunner?.stop();
        editor.value = "";
        programInput.value = "";
        document.getElementById("program-output").textContent = "";
        document.getElementById("submission-completion").hidden = true;
        [editor, programInput, saveButton, runButton, submitButton, resetButton].forEach(node => node.disabled = true);
        draftStatus.textContent = "Account changed — reload required";
        throw new Error("Your account changed. Reload this page before editing or submitting. The previous account's records were kept.");
    }
    const level = window.pythonCurriculum?.levels.find(level => level.tasks.includes(taskId));
    if (level && !window.subscriptionStore.canAccessLevel(level.id)) throw new Error("Premium access is required for this task. Your saved code was kept.");
}
function checkWorkspaceOwner() {
    try { assertWorkspaceOwner(); } catch (error) { showMessage(error.message, true); }
}
window.addEventListener("storage", event => { if (["codementor-profile-v1", "codementor-platform-v1", null].includes(event.key) || event.key?.includes("codementor-demo-language")) checkWorkspaceOwner(); });
window.addEventListener("student-account-changed", checkWorkspaceOwner);
window.addEventListener("focus", checkWorkspaceOwner);
window.addEventListener("pageshow", checkWorkspaceOwner);

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
}

function saveDraft(showConfirmation = false) {
    if (!task || !draftLoaded) {
        return false;
    }

    clearTimeout(saveTimer);

    try {
        assertWorkspaceOwner();
        window.cmStorage.setItem(
            draftKey,
            JSON.stringify({
                version: 1,
                taskId: taskId,
                code: editor.value,
                input: programInput.value,
                updatedAt: new Date().toISOString()
            })
        );

        hasUnsavedChanges = false;
        draftStatus.textContent = "Draft saved";

        if (showConfirmation) {
            showMessage("Your code and input are saved on this device.");
        }

        return true;
    } catch {
        draftStatus.textContent = "Draft not saved";

        showMessage(
            "Couldn’t save your draft. Keep this page open and try Save draft again.",
            true
        );

        return false;
    }
}

function scheduleSave() {
    hasUnsavedChanges = true;
    draftStatus.textContent = "Saving…";
    showMessage("");

    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
        saveDraft();
    }, 500);
}

function loadTask() {
    document.title = `${task.title} | CodeMentor AI`;
    const level = window.pythonCurriculum.levels.find(level => level.tasks.includes(taskId));
    if (level) {
        document.querySelector(".coding-task-panel > .eyebrow").textContent = `LEVEL ${level.id} / PRACTICE TASK`;
        const back = document.getElementById("task-level-back");
        back.href = `module.html?level=${level.id}`; back.textContent = `Back to ${level.title}`;
    }
    const needsInput = task.tests.some(test => Boolean(test.input));
    programInput.hidden = !needsInput;
    document.querySelector('label[for="program-input"]').hidden = !needsInput;
    document.getElementById("task-title").textContent = task.title;
    document.getElementById("task-description").textContent =
        task.description;

    const requirements = document.getElementById("task-requirements");

    task.requirements.forEach(function (text) {
        const item = document.createElement("li");
        item.textContent = text;
        requirements.append(item);
    });

    document.getElementById("example-input").textContent =
        task.input || "No input required.";

    document.getElementById("expected-output").textContent =
        task.output;

    document.getElementById("mentor-link").href =
        `../student/mentor.html?task=${encodeURIComponent(taskId)}`;

    editor.value = task.starter;
    programInput.value = task.input;

    try {
        const saved = window.cmStorage.getItem(draftKey);

        if (saved) {
            const draft = JSON.parse(saved);

            if (
                draft?.version !== 1 ||
                draft.taskId !== taskId ||
                typeof draft.code !== "string" ||
                typeof draft.input !== "string"
            ) {
                throw new Error("Invalid draft");
            }

            editor.value = draft.code;
            programInput.value = draft.input;
            draftStatus.textContent = "Saved draft loaded";
        } else {
            draftStatus.textContent = "Starter code loaded";
        }

        draftLoaded = true;
    } catch {
        draftStatus.textContent = "Draft unavailable";

        editor.disabled = true;
        programInput.disabled = true;
        saveButton.disabled = true;
        runButton.disabled = true;
        submitButton.disabled = true;

        showMessage(
            "Your saved draft could not be loaded. It has not been overwritten. " +
            "Use Reset code only if you want to replace it.",
            true
        );
    }
}

editor.addEventListener("input", scheduleSave);
programInput.addEventListener("input", scheduleSave);

editor.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        tabCanLeaveEditor = true;
        return;
    }

    if (event.key === "Tab") {
        if (tabCanLeaveEditor || event.shiftKey) {
            tabCanLeaveEditor = false;
            return;
        }

        event.preventDefault();

        editor.setRangeText(
            "    ",
            editor.selectionStart,
            editor.selectionEnd,
            "end"
        );

        scheduleSave();
        return;
    }

    tabCanLeaveEditor = false;
});

editor.addEventListener("blur", function () {
    tabCanLeaveEditor = false;
});

saveButton.addEventListener("click", function () {
    saveDraft(true);
});

let running = false;
const stopButton = document.getElementById("stop-code");
const outputPanel = document.getElementById("program-output");
function busy(value) {
    running = value;
    [runButton, submitButton, resetButton, saveButton, editor, programInput].forEach(element => element.disabled = value || accountChanged);
    stopButton.hidden = !value;
}
function normalize(text) { return text.replace(/\r\n/g, "\n").trimEnd(); }
function saveTestResult(passed, cases, solution) {
    assertWorkspaceOwner();
    const raw = window.cmStorage.getItem("codementor-demo-learning");
    const progress = raw === null ? { version: 1, lessons: [], tasks: [], assessments: {} } : JSON.parse(raw);
    if (progress?.version !== 1 || !Array.isArray(progress.lessons) || !Array.isArray(progress.tasks) || !progress.assessments || typeof progress.assessments !== "object" || Array.isArray(progress.assessments)) throw new Error("Saved progress is unavailable. Your solution was kept, but results could not be recorded.");
    if (passed === task.tests.length && !progress.tasks.includes(taskId)) progress.tasks.push(taskId);
    progress.taskResults = { ...progress.taskResults, [taskId]: { passed, total: task.tests.length, cases, code: solution, submittedAt: new Date().toISOString() } };
    if (passed === task.tests.length) progress.submissions = { ...progress.submissions, [taskId]: { code: solution, passed, total: task.tests.length, submittedAt: progress.taskResults[taskId].submittedAt } };
    window.cmStorage.setItem("codementor-demo-learning", JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent("task-attempt-recorded", { detail: { taskId } }));
}
async function execute(submit) {
    if (running || !task || !draftLoaded) return;
    if (!editor.value.trim()) {
        showMessage("Write your solution first.", true); editor.focus(); return;
    }
    if (!saveDraft()) return;
    const solution = editor.value;
    let executionStarted = false;
    function executionStatus(text) {
        if (text === `Running ${window.pythonCurriculum.name}...`) executionStarted = true;
        showMessage(text);
    }
    busy(true); outputPanel.textContent = "";
    try {
        if (!submit) {
            const result = await window.learningRunner.execute(solution, programInput.value, executionStatus);
            assertWorkspaceOwner();
            window.dispatchEvent(new CustomEvent("task-attempt-recorded", { detail: { taskId } }));
            outputPanel.textContent = result.output + (result.error ? `\n${result.error}` : "");
            showMessage(result.error ? `${window.pythonCurriculum.name} found an error. Review the details below and try again.` : "Program finished.", Boolean(result.error));
            return;
        }
        let passed = 0;
        const cases = [];
        for (const [index, test] of task.tests.entries()) {
            showMessage(`Checking test ${index + 1} of ${task.tests.length}...`);
            const result = await window.learningRunner.execute(solution + (task.verify || ""), test.input, text => { if (text === `Running ${window.pythonCurriculum.name}...`) executionStarted = true; showMessage(`Test ${index + 1}: ${text}`); });
            assertWorkspaceOwner();
            const correct = !result.error && normalize(result.output) === normalize(test.output);
            cases.push({ passed: correct, input: test.input, expected: test.output, output: result.output, error: result.error });
            outputPanel.textContent += `Test ${index + 1}: ${correct ? "Passed" : "Needs work"}\n`;
            if (!correct) {
                saveTestResult(passed, cases, solution);
                outputPanel.textContent += `Input:\n${test.input || "(none)"}\nExpected:\n${test.output}\nYour output:\n${result.output || "(empty)"}\n${result.error || ""}\n`;
                showMessage("Some checks did not pass. Use the input and expected output above to improve your solution.", true);
                return;
            }
            passed++;
        }
        saveTestResult(passed, cases, solution);
        showMessage(`All ${passed} checks passed! Task completion saved on this device.`);
    } catch (error) {
        if (executionStarted && !accountChanged) window.dispatchEvent(new CustomEvent("task-attempt-recorded", { detail: { taskId } }));
        showMessage(error.message, true);
    } finally {
        busy(false);
    }
}
runButton.addEventListener("click", () => execute(false));
submitButton.addEventListener("click", () => execute(true));
stopButton.addEventListener("click", () => window.learningRunner.stop());

resetButton.addEventListener("click", function () {
    if (task) {
        resetDialog.showModal();
    }
});

cancelReset.addEventListener("click", function () {
    resetDialog.close();
});

confirmReset.addEventListener("click", function () {
    try {
        assertWorkspaceOwner();
        window.cmStorage.setItem(
            draftKey,
            JSON.stringify({
                version: 1,
                taskId: taskId,
                code: task.starter,
                input: task.input,
                updatedAt: new Date().toISOString()
            })
        );
    } catch {
        resetDialog.close();
        showMessage("Couldn’t reset your saved draft. Try again.", true);
        return;
    }

    clearTimeout(saveTimer);

    editor.value = task.starter;
    programInput.value = task.input;
    editor.disabled = false;
    programInput.disabled = false;

    saveButton.disabled = false;
    runButton.disabled = false;
    submitButton.disabled = false;

    draftLoaded = true;
    hasUnsavedChanges = false;
    draftStatus.textContent = "Starter code saved";

    document.getElementById("program-output").textContent =
        "Your program output will appear here after execution.";

    resetDialog.close();
    showMessage("Your code has been reset.");
    editor.focus();
});

window.addEventListener("beforeunload", function (event) {
    if (!hasUnsavedChanges) {
        return;
    }

    if (!saveDraft()) {
        event.preventDefault();
        event.returnValue = "";
    }
});

if (task) {
    loadTask();
    const reviewLink = document.getElementById("open-code-review");
    reviewLink.href = `../student/code-review.html?task=${encodeURIComponent(taskId)}`;
    reviewLink.addEventListener("click", event => { if (!saveDraft()) event.preventDefault(); });
} else {
    document.getElementById("task-title").textContent = "Task not found";
    draftStatus.textContent = "Unknown task";

    editor.disabled = true;
    programInput.disabled = true;

    [saveButton, runButton, submitButton, resetButton].forEach(
        function (button) {
            button.disabled = true;
        }
    );

    showMessage(
        `Return to the ${window.pythonCurriculum.name} learning path and choose an available task.`,
        true
    );
    const reviewLink = document.getElementById("open-code-review");

reviewLink.href =
    `../student/code-review.html?task=${encodeURIComponent(taskId)}`;

reviewLink.addEventListener("click", function (event) {
    if (!saveDraft()) {
        event.preventDefault();
    }
});
}
})();
