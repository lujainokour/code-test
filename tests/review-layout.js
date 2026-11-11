(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    const longLine = "unchanged_long_code_".repeat(80), code = `print("${longLine}")\n# Keep code whitespace\n    # indented`;
    let doc, win;
    function check(name, value) {
        checks.push({ name, passed: Boolean(value) });
        output.textContent = JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, checks }, null, 2);
    }
    function load(file) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Review navigation timed out")), 8000);
            frame.onload = () => {
                if (frame.contentWindow.location.pathname.endsWith("project-evaluation.html")) return;
                clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 80);
            };
            frame.src = testPageUrl(file);
        });
    }
    try {
        localStorage.clear(); sessionStorage.clear();
        cmStorage.setItem("codementor-demo-session", JSON.stringify({ name: "Layout Owner", email: "layout-owner@example.com", role: "student", isDemo: true }));
        cmStorage.setItem("codementor-demo-onboarding", JSON.stringify({ language: "python", experience: "beginner", goal: "foundations" }));
        localStorage.setItem("codementor-guide-v1:student:layout-owner%40example.com", JSON.stringify({ version: 1, dismissed: true }));
        for (const route of ["code-review.html?task=receipt", "project-evaluation.html"]) {
            const task = route.startsWith("project-") ? "task-manager" : "receipt";
            for (const state of ["empty", "draft", "failed-results"]) {
                cmStorage.removeItem(`codementor-demo-code-${task}`);
                const progress = { version: 1, lessons: [], tasks: [], assessments: {} };
                if (state !== "empty") cmStorage.setItem(`codementor-demo-code-${task}`, JSON.stringify({ version: 1, taskId: task, code }));
                if (state === "failed-results") progress.taskResults = { [task]: { code, passed: 0, total: 1, cases: [{ passed: false, input: longLine, expected: longLine, output: longLine, error: "Expected test failure" }] } };
                cmStorage.setItem("codementor-demo-learning", JSON.stringify(progress));
                for (const theme of ["light", "dark"]) for (const width of [1366, 768, 390]) {
                    frame.style.width = width + "px";
                    localStorage.setItem("codementor-ui-theme", theme);
                    await load(route);
                    const label = `${route} ${state} ${theme} ${width}px`;
                    check(label + ": correct review route and task", win.location.pathname.endsWith("/code-review.html") && new URLSearchParams(win.location.search).get("task") === task);
                    check(label + ": no document horizontal overflow", doc.documentElement.scrollWidth <= win.innerWidth + 1 && doc.body.scrollWidth <= win.innerWidth + 1);
                    check(label + ": cards stay within the viewport", [...doc.querySelectorAll("#review-main .dashboard-card")].every(card => { const r = card.getBoundingClientRect(); return r.left >= 0 && r.right <= win.innerWidth + 1; }));
                    check(label + ": code viewport stays inside its card", (() => { const pre = doc.querySelector(".review-code"), card = pre.closest(".dashboard-card"); return pre.getBoundingClientRect().right <= card.getBoundingClientRect().right && ["auto", "scroll"].includes(win.getComputedStyle(pre).overflowX); })());
                    if (state !== "empty") {
                        const pre = doc.querySelector(".review-code");
                        check(label + ": long code and indentation are not truncated or wrapped", doc.getElementById("review-code").textContent === code && pre.scrollWidth > pre.clientWidth && win.getComputedStyle(pre).whiteSpace === "pre");
                    }
                    if (state === "failed-results") check(label + ": full failure details remain available", doc.querySelector(".review-empty-state").textContent.includes(longLine) && doc.querySelector(".review-empty-state").textContent.includes("Expected test failure"));
                }
            }
        }
    } catch (error) { check("Unexpected layout harness failure: " + error.message, false); }
    output.dataset.done = "true";
})();
