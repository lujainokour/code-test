/* Workspace → mentor quick actions. Prefills a question with the current code and the last saved
   test failure. Nothing is sent anywhere: the mentor still gives prepared replies (no live AI). The
   hand-off lives in this tab's sessionStorage for ten minutes and is removed once used. */
(() => {
    "use strict";
    const KEY = "codementor-mentor-prefill", LIMIT = 2000, TTL = 10 * 60 * 1000;
    const kinds = {
        explain: { label: "Explain the error", intro: "Please explain this error and what causes it. Don't give me the full solution." },
        hint: { label: "Give me a hint", intro: "Give me one hint for the next step. Don't give me the full solution." },
        review: { label: "Review my code", intro: "Please review my code: what is good, what is unclear, and one thing to improve." }
    };
    function failureText(result) {
        const failed = Array.isArray(result?.cases) ? result.cases.find(c => c && c.passed === false) : null;
        if (!failed) return "";
        const lines = [`Last test run: ${result.passed}/${result.total} passed.`];
        if (failed.input) lines.push(`Input: ${String(failed.input).slice(0, 200)}`);
        if (failed.error) lines.push(`Error: ${String(failed.error).slice(0, 400)}`);
        else { lines.push(`Expected: ${String(failed.expected ?? "").slice(0, 200)}`); lines.push(`Got: ${String(failed.output ?? "").slice(0, 200)}`); }
        return lines.join("\n");
    }
    // Pure: builds a question that always fits the mentor's 2,000-character limit.
    function buildQuestion(kind, { code = "", failure = "", taskTitle = "", language = "Python" } = {}) {
        if (!Object.hasOwn(kinds, kind)) throw new Error("Unknown quick action.");
        const head = [kinds[kind].intro, taskTitle ? `Task: ${taskTitle}` : ""].filter(Boolean).join("\n");
        const fail = kind === "review" ? "" : failure || (kind === "explain" ? "No failed test is saved yet. Run the tests first to include the error." : "");
        const fixed = [head, fail].filter(Boolean).join("\n\n");
        const room = LIMIT - fixed.length - `\n\nMy ${language} code:\n`.length - 40;
        let body = String(code).replace(/\r\n/g, "\n").trimEnd();
        if (body.length > room) body = body.slice(0, Math.max(0, room)) + "\n… (code shortened to fit)";
        return (body ? `${fixed}\n\nMy ${language} code:\n${body}` : fixed).slice(0, LIMIT);
    }
    window.mentorQuickActions = Object.freeze({ buildQuestion, failureText, KEY, kinds });

    const params = new URLSearchParams(location.search);
    const editor = document.getElementById("code-editor"), link = document.getElementById("mentor-link");
    if (editor && link) {
        const taskId = params.get("task") || "student-profile";
        const box = document.createElement("div"); box.className = "mentor-quick-actions"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Ask the study assistant about this task");
        const note = document.createElement("p"); note.className = "mentor-quick-note";
        note.textContent = "Prepared replies · no live AI. Your code is copied into the question; nothing is sent anywhere.";
        Object.entries(kinds).forEach(([kind, { label }]) => {
            const button = document.createElement("button"); button.type = "button"; button.className = "button button-outline"; button.textContent = label; button.dataset.quickAction = kind;
            button.addEventListener("click", () => {
                let result = null;
                try { result = JSON.parse(window.cmStorage.getItem("codementor-demo-learning") || "null")?.taskResults?.[taskId] || null; } catch { result = null; }
                let language = "Python";
                try { language = window.languageCatalog.get(window.cmStorage.activeLanguage())?.name || language; } catch { /* keep default */ }
                const question = buildQuestion(kind, { code: editor.value, failure: failureText(result), taskTitle: document.getElementById("task-title")?.textContent?.trim() || taskId, language });
                try { sessionStorage.setItem(KEY, JSON.stringify({ task: taskId, question, createdAt: Date.now() })); } catch { /* Mentor opens without a prefill. */ }
                location.href = link.href;
            });
            box.append(button);
        });
        link.after(box, note);
    }
    const input = document.getElementById("chat-input");
    if (input && document.getElementById("chat-form")) {
        let prefill = null;
        try { prefill = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { prefill = null; }
        try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
        if (prefill && typeof prefill.question === "string" && prefill.task === params.get("task") && Date.now() - prefill.createdAt < TTL) {
            input.value = prefill.question.slice(0, LIMIT);
            const status = document.getElementById("chat-status");
            if (status) status.textContent = "Question prepared from your workspace. Review it, then send. Replies are prepared hints, not live AI.";
            input.focus();
        }
    }
})();
