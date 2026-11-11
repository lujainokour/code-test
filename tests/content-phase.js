(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    const key = "codementor-demo-admin-course-content";
    let win, doc;
    function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(value => value.passed).length, total: checks.length, checks }, null, 2); }
    function load(file) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(file)), 8000); frame.onload = () => { clearTimeout(timer); win = frame.contentWindow; doc = win.document; setTimeout(resolve, 20); }; frame.src = testPageUrl(file); }); }
    function fill(id, value) { doc.getElementById(id).value = value; }
    function submit(id) { doc.getElementById(id).dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); }
    const saved = () => JSON.parse(testStorage.getItem(key));
    const lesson = () => saved().courses["python-foundations"].levels[0].lessons[0];
    try {
        testStorage.clear();
        testStorage.setItem(key, JSON.stringify({ version: 1, custom: "keep-envelope", courses: { "python-foundations": { custom: "keep-course", levels: [{ id: "test-level", title: "Test level", custom: "keep-level" }] }, untouched: { levels: [], custom: "keep-other" } } }));
        await load("admin-course-content.html?id=python-foundations");
        const href = doc.querySelector('#course-level-list a[href*="admin-level-content"]')?.getAttribute("href");
        check("Level link carries course and level IDs", href?.includes("course=python-foundations") && href?.includes("level=test-level"));
        await load(href);
        check("Legacy level without lessons opens with empty state", !doc.getElementById("level-content-view").hidden && !doc.getElementById("lesson-empty").hidden);
        fill("edit-lesson-title", "A local lesson"); fill("edit-lesson-content", "Platform explanation to keep."); fill("edit-lesson-code", "print('kept')"); fill("edit-lesson-status", "published"); fill("edit-lesson-builtin", "variables"); submit("lesson-editor");
        check("Lesson creation keeps all version-1 content around it", saved().version === 1 && saved().custom === "keep-envelope" && saved().courses["python-foundations"].custom === "keep-course" && saved().courses["python-foundations"].levels[0].custom === "keep-level" && saved().courses.untouched.custom === "keep-other");
        check("Lesson and visibility saved", lesson().title === "A local lesson" && lesson().status === "published");
        fill("source-title", "Python documentation"); fill("source-url", "https://docs.python.org/3/"); submit("source-editor");
        fill("source-title", "Python website"); fill("source-url", "http://www.python.org/"); submit("source-editor");
        check("More than one HTTP/HTTPS source saved", lesson().resources.length === 2);
        const previousContent = lesson().content, previousCode = lesson().code;
        doc.querySelector("#lesson-sources button").click(); fill("source-title", "Python documentation revised"); submit("source-editor");
        check("Source edit preserves other source and lesson fields", lesson().resources[0].title === "Python documentation revised" && lesson().resources[1].title === "Python website" && lesson().content === previousContent && lesson().code === previousCode);
        doc.querySelectorAll("#lesson-sources button")[3].click();
        check("Source deletion preserves remaining source and content", lesson().resources.length === 1 && lesson().content === previousContent);
        fill("source-title", "Unsafe source"); fill("source-url", "javascript:alert(1)"); submit("source-editor");
        check("JavaScript URL rejected without data change", lesson().resources.length === 1 && doc.getElementById("level-content-message").textContent.includes("HTTP or HTTPS"));
        fill("source-url", "data:text/html,unsafe"); submit("source-editor"); check("Data URL rejected", lesson().resources.length === 1);
        fill("source-url", "https://user:password@docs.python.org/3/"); submit("source-editor"); check("Embedded credentials rejected", lesson().resources.length === 1);
        const a = doc.querySelector("#lesson-sources a"); check("External links open safely", a.target === "_blank" && a.rel.includes("noopener") && a.rel.includes("noreferrer"));
        fill("edit-lesson-title", "Edited local title"); submit("lesson-editor");
        check("Lesson edit keeps sources", lesson().title === "Edited local title" && lesson().resources.length === 1);
        const lessonId = lesson().id;
        await load(`lesson.html?course=python-foundations&level=test-level&lesson=${lessonId}`);
        check("Student saved lesson renders platform content and sources", doc.getElementById("lesson-title").textContent === "Edited local title" && doc.getElementById("lesson-explanation").textContent.includes("Platform explanation to keep") && doc.getElementById("lesson-external-sources").textContent.includes("Python documentation revised"));
        check("Saved lesson does not add Python completion credit", doc.getElementById("complete-lesson").hidden && testStorage.getItem("codementor-demo-learning") === null);
        check("Student lesson mobile layout fits", doc.documentElement.scrollWidth <= win.innerWidth + 1);
        await load("lesson.html?lesson=variables");
        check("Original lesson content and knowledge check survive", doc.getElementById("lesson-title").textContent === "Variables and values" && doc.querySelectorAll("#knowledge-options input").length === 3 && doc.getElementById("lesson-external-sources").textContent.includes("Python documentation revised"));
        await load("admin-level-content.html?course=python-foundations&level=test-level"); doc.querySelector("#level-lessons button").click();
        const mutated = saved(); mutated.courses["python-foundations"].levels[0].lessons[0].summary = "Changed in another editor"; testStorage.setItem(key, JSON.stringify(mutated));
        fill("edit-lesson-title", "Stale title"); submit("lesson-editor");
        check("Stale editor cannot overwrite a newer saved lesson", lesson().title === "Edited local title" && doc.getElementById("level-content-message").textContent.includes("changed after"));
        testStorage.setItem(key, "corrupt-content"); await load("admin-level-content.html?course=python-foundations&level=test-level");
        check("Corrupt content disables editor and remains intact", doc.getElementById("level-content-view").hidden && testStorage.getItem(key) === "corrupt-content");
        await load("lesson.html?lesson=variables"); check("Corrupt external sources do not disable original lesson", doc.getElementById("lesson-title").textContent === "Variables and values" && doc.getElementById("workspace-message").textContent.includes("could not be read") && testStorage.getItem(key) === "corrupt-content");
        testStorage.removeItem(key); await load("admin-level-content.html?course=missing&level=missing"); check("Unknown context handled without creating records", doc.getElementById("level-content-message").textContent.includes("not found") && testStorage.getItem(key) === null);
    } catch (error) { check(`Harness failure: ${error.message}`, false); }
    output.dataset.done = "true"; document.title = checks.every(value => value.passed) ? "PASS: Content phase" : "FAIL: Content phase";
})();
