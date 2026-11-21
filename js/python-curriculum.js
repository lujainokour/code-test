/* Compatibility API for existing pages; content comes from the active schema. */
(() => {
"use strict";
const activeId = window.cmStorage.activeLanguage();
const schema = window.curriculumRegistry.get(activeId);
if (!schema) { window.learningUnavailable = true; window.showLanguageUnavailable?.(); return; }
const { levels } = schema;
if (schema.id === "javascript") {
    document.querySelectorAll("[data-curriculum-summary]").forEach(node => {
        node.textContent = `${levels.length} JavaScript levels are available. Complete the four lessons and pass the quiz with at least 70% in each level. Coding tasks provide additional practice. All published JavaScript levels are free.`;
    });
    document.querySelectorAll("[data-curriculum-access]").forEach(node => { node.textContent = "All published JavaScript levels are included in Free. The Python Premium preview does not gate this path."; });
}
const allLessons = levels.flatMap(level => level.lessons);
window.pythonLessonSources = schema.sources;
    // Rules live in js/domain/learning.js and storage access in js/data/learning-repository.js (Slice 1); this file keeps its public API.
    const learning = window.cmDomain.learning, repository = window.cmData.learning;
    function read() { return repository.read({ strict: true }).progress; }
    const completed = (level, progress) => learning.isLevelCompleted(level, progress);
    const placementChoice = () => window.placementStore?.choice() || null;
    const placedOut = (level, progress) => learning.isPlacedOut(level, progress, placementChoice());
    const available = (level, progress) => learning.isLevelAvailable(levels, level, progress, placementChoice());
    const current = progress => learning.currentLevel(levels, progress, placementChoice());
    // Slice 3: one summary of a level (lessons with evidence kinds, quiz best/last/attempts, tasks) shared by every page.
    // task.topics lists the lesson ids a coding task covers; a passed task is then "task_passed" evidence for those lessons.
    const taskTopics = Object.fromEntries(Object.values(schema.tasks || {}).map(task => [task.id, Array.isArray(task.topics) ? task.topics : []]));
    const summarize = (level, progress) => learning.summarizeLevel(level, progress, { taskTopics });
    const params = new URLSearchParams(location.search);
    const requestedLesson = params.get("lesson");
    let selected = levels.find(level => level.lessons.some(item => item.id === requestedLesson)) || levels.find(level => level.id === Number(params.get("level"))) || levels[0];
    if (location.pathname.endsWith("/dashboard.html")) { try { selected = current(read()); } catch { /* Dashboard reports unreadable data. */ } }
    window.pythonLessons = selected.lessons;
    window.pythonCurriculum = Object.freeze({ ...schema, levels, allLessons, selected, read, completed, available, current, placedOut, placementChoice, summarize, taskTopics });
    window.activeCurriculum = window.pythonCurriculum;
    window.learningRunner = schema.runner === "javascript" ? window.javascriptRunner : window.pythonRunner;
    const protectedView = /\/(lesson|module|level-assessment)\.html$/.test(location.pathname);
    if (protectedView && selected.id > 5 && (!window.subscriptionStore || !window.subscriptionStore.canAccessLevel(selected.id))) {
        window.learningUnavailable = true;
        const main = document.querySelector("main");
        if (main) {
            const heading = document.createElement("h1"); heading.textContent = "Premium access required";
            const text = document.createElement("p"); text.textContent = "Levels 1 through 5 are included in Free. This advanced level requires Premium.";
            const plans = document.createElement("a"); plans.href = "subscription.html"; plans.className = "button button-primary"; plans.textContent = "Compare plans";
            main.replaceChildren(heading, text, plans);
        }
        return;
    }
    if (!params.has("course") && params.has("level") && !levels.some(level => String(level.id) === params.get("level")) && /\/(lesson|module|level-assessment)\.html$/.test(location.pathname)) {
        window.learningUnavailable = true;
        const main = document.querySelector("main");
        const title = document.createElement("h1"); title.textContent = "Level not available yet";
        const text = document.createElement("p"); text.textContent = "Choose an existing Python level from your learning path. Your progress has not been changed.";
        const back = document.createElement("a"); back.href = "learning-path.html"; back.textContent = "Return to your learning path";
        main.replaceChildren(title, text, back);
        return;
    }
    if (schema.id === "python") {
    // Documentation is a stable fallback when no curated video is available.
    const references = { conditions: "tutorial/controlflow.html#if-statements", "boolean-logic": "library/stdtypes.html#boolean-operations-and-or-not", "for-loops": "tutorial/controlflow.html#for-statements", "while-loops": "reference/compound_stmts.html#while", functions: "tutorial/controlflow.html#defining-functions", lists: "tutorial/datastructures.html#more-on-lists", dictionaries: "tutorial/datastructures.html#dictionaries", "problem-solving": "tutorial/datastructures.html#looping-techniques" };
    for (const [id, path] of Object.entries(references)) window.pythonLessonSources[id] = [{ title: "Python documentation: " + allLessons.find(item => item.id === id).title, url: "https://docs.python.org/3/" + path, type: "Documentation", language: "English" }];
    const videos = {
        conditions: "https://www.youtube.com/watch?v=v8ZehXS3XF0",
        "boolean-logic": "https://elzero.org/python-boolean-operators/",
        "for-loops": "https://www.youtube.com/watch?v=4YolrVX6f1Q",
        "while-loops": "https://elzero.org/python-loop-while-and-else/",
        functions: "https://www.youtube.com/watch?v=Izwd_n-Ufqo",
        lists: "https://elzero.org/python-lists/",
        dictionaries: "https://elzero.org/python-dictionary/",
        "problem-solving": "https://www.youtube.com/watch?v=Izwd_n-Ufqo"
    };
    for (const [id, url] of Object.entries(videos)) window.pythonLessonSources[id].unshift({ title: id === "problem-solving" ? "Elzero: Functions refresher for your project" : `Elzero: ${allLessons.find(lesson => lesson.id === id).title}`, url, type: "Video", language: "Arabic" });
    }
    if (selected.id > 1 && !params.has("course") && /\/(lesson|module|level-assessment)\.html$/.test(location.pathname)) {
        try {
            if (available(selected, read())) return;
            throw new Error("Complete the earlier level's lessons and pass its quiz with at least 70% first.");
        } catch (error) {
            window.learningUnavailable = true;
            const main = document.querySelector("main"); main.replaceChildren();
            const title = document.createElement("h1"); title.textContent = "Level not available yet";
            const text = document.createElement("p"); text.textContent = error.message;
            const back = document.createElement("a"); back.href = "learning-path.html"; back.textContent = "Return to your learning path";
            main.append(title, text, back);
        }
    }
})();
