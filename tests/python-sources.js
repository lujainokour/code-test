(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    const key = "codementor-demo-admin-course-content";
    let win, doc;
    function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, checks }, null, 2); }
    function load(path) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(path)), 8000); frame.onload = () => { clearTimeout(timer); win = frame.contentWindow; doc = win.document; setTimeout(resolve, 30); }; frame.src = testPageUrl(path); }); }
    const links = () => [...doc.querySelectorAll("#lesson-external-sources a, #lesson-topic-videos a")];
    try {
        testStorage.clear();
        const expected = { variables: 2, "data-types": 3, "input-output": 4, numbers: 6 };
        for (const [id, count] of Object.entries(expected)) {
            await load(`lesson.html?lesson=${id}`);
            check(`${id}: core video and docs visible in clean session`, links().length === count && links().some(a => a.hostname === "www.youtube.com") && links().some(a => a.hostname === "docs.python.org"));
            check(`${id}: safe links, type/language labels`, links().every(a => a.target === "_blank" && a.rel.includes("noopener") && a.rel.includes("noreferrer")) && doc.getElementById("lesson-external-sources").textContent.includes("Documentation | English") && !doc.getElementById("lesson-video-section").hidden && doc.getElementById("lesson-topic-videos").textContent.includes("Arabic"));
            const original = win.pythonLessons.find(l => l.id === id);
            check(`${id}: original code and check retained`, doc.getElementById("lesson-code").textContent === original.code && doc.querySelectorAll("#knowledge-options input").length === original.options.length);
            check(`${id}: mobile fits, content storage untouched`, doc.documentElement.scrollWidth <= win.innerWidth + 1 && testStorage.getItem(key) === null);
        }
        const data = { version: 1, extra: "keep", courses: { "python-foundations": { levels: [{ id: "test", title: "Test", lessons: [
            { id: "linked", title: "Local linked", builtInLessonId: "variables", content: "Keep local explanation", code: "print('local')", status: "published", resources: [
                { id: "dup", title: "My video title", url: "https://youtu.be/hQnZxqp3Q0Y?si=test" },
                { id: "unique", title: "My additional source", url: "https://docs.python.org/3/tutorial/" }
            ] },
            { id: "draft", title: "Private draft", builtInLessonId: "variables", status: "draft", resources: [{ title: "Draft only", url: "https://docs.python.org/3/" }] },
            { id: "custom", title: "Unlinked", status: "published", resources: [] }
        ] }] } } };
        const raw = JSON.stringify(data); testStorage.setItem(key, raw);
        await load("lesson.html?lesson=variables");
        check("Local and core merge without duplicate video", links().length === 3 && links().some(a => a.closest(".lesson-topic-video")?.querySelector("h4").textContent === "My video title"));
        check("Legacy metadata honestly unspecified; draft excluded", doc.getElementById("lesson-external-sources").textContent.includes("Language not specified") && !links().some(a => a.textContent.includes("Draft only")));
        check("Reading merged sources preserves exact storage", testStorage.getItem(key) === raw);
        await load("lesson.html?course=python-foundations&level=test&lesson=linked");
        check("Linked local lesson inherits core sources and retains own content", links().length === 3 && doc.getElementById("lesson-code").textContent === "print('local')" && doc.getElementById("lesson-explanation").textContent.includes("Keep local explanation"));
        await load("lesson.html?course=python-foundations&level=test&lesson=custom");
        check("Unlinked local lesson does not inherit Python sources", links().length === 0);
        testStorage.setItem(key, "{broken");
        await load("lesson.html?lesson=variables");
        check("Corrupt storage retains core references and clear warning", links().length === 2 && doc.getElementById("workspace-message").textContent.includes("could not be read") && testStorage.getItem(key) === "{broken");
    } catch (error) { check(`Unexpected: ${error.message}`, false); }
    document.documentElement.dataset.done = "true";
})();
