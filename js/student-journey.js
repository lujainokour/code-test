/* Context links for the existing learning pages; progress remains in its original store. */
(() => {
    "use strict";
    const root = new URL("../", document.currentScript.src);
    const filename = location.pathname.split("/").pop();
    const stages = {
        "dashboard.html": 0, "learning-path.html": 0, "module.html": 1, "lesson.html": 1,
        "practice.html": 2, "workspace.html": 2, "level-assessment.html": 3, "progress.html": 3
    };
    if (!(filename in stages) || new URLSearchParams(location.search).has("course")) return;
    function render() {
        if (window.learningUnavailable) return;
        const course = window.pythonCurriculum, main = document.querySelector("main");
        if (!course || !main) return;
        try {
            const preferences = JSON.parse(window.cmStorage.getItem("codementor-demo-onboarding") || "null");
            if (!window.languageCatalog.get(window.cmStorage.activeLanguage())?.builtInContent) return;
            const progress = course.read(), params = new URLSearchParams(location.search);
            const taskId = params.get("task") || (filename === "workspace.html" ? "student-profile" : null);
            const taskLevel = course.levels.find(level => level.tasks.includes(taskId));
            const level = taskLevel || (["module.html", "lesson.html", "level-assessment.html"].includes(filename) ? course.selected : course.current(progress));
            const lesson = level.lessons.find(item => !progress.lessons.includes(item.id)) || level.lessons[0];
            const task = level.tasks.find(id => !progress.tasks.includes(id)) || level.tasks[0];
            const wrapper = document.createElement("section"); wrapper.className = "student-journey";
            wrapper.setAttribute("aria-label", "Your learning journey");
            const context = document.createElement("p"); context.className = "student-journey-context";
            context.textContent = `YOUR LEARNING JOURNEY · ${course.name} · Level ${level.id}: ${level.title}`;
            const nav = document.createElement("nav"); nav.setAttribute("aria-label", "Learning steps");
            const steps = [
                ["My path", "learning-path.html"], ["Learn", `lesson.html?lesson=${encodeURIComponent(lesson.id)}`],
                ["Practise", task ? `workspace.html?task=${encodeURIComponent(task)}` : "practice.html"],
                ["Quiz & progress", filename === "level-assessment.html" ? `level-assessment.html?level=${level.id}` : "progress.html"]
            ];
            steps.forEach(([label, href], index) => {
                const link = document.createElement("a"); link.href = new URL("pages/student/" + href, root).href;
                const number = document.createElement("span"); number.textContent = String(index + 1).padStart(2, "0"); number.setAttribute("aria-hidden", "true");
                link.append(number, document.createTextNode(label));
                if (index === stages[filename]) link.setAttribute("aria-current", "step");
                nav.append(link);
            });
            const help = document.createElement("p"); help.className = "student-journey-help";
            const back = document.createElement("a"); back.href = new URL(`pages/student/module.html?level=${level.id}`, root).href; back.textContent = "Level overview & quiz";
            const mentor = document.createElement("a"); mentor.href = new URL(`pages/student/mentor.html?level=${level.id}&lesson=${encodeURIComponent(params.get("lesson") || lesson.id)}`, root).href; mentor.textContent = "Get help with this topic";
            help.append(back, document.createTextNode(" · "), mentor);
            wrapper.append(context, nav, help);
            const existing = main.querySelector(".student-journey");
            if (existing) existing.replaceChildren(...wrapper.childNodes);
            else main.prepend(wrapper);
        } catch { /* Existing page readers report storage problems; never infer or replace progress. */ }
    }
    const styles = document.createElement("link"); styles.rel = "stylesheet"; styles.href = new URL("css/student-journey.css", root).href; document.head.append(styles);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true }); else render();
    window.addEventListener("learning-progress-changed", render);
    window.addEventListener("pageshow", render);
})();
