(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(value => value.passed).length, total: checks.length, checks }, null, 2); }
    function load(file) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(file)), 8000); frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 40); }; frame.src = testPageUrl(file); }); }
    function fill(id, value) { doc.getElementById(id).value = value; }
    function submit(id) { doc.getElementById(id).dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); }
    const draftKey = "codementor-demo-admin-course-drafts", contentKey = "codementor-demo-admin-course-content", prefKey = "codementor-demo-onboarding";
    try {
        testStorage.clear();
        await load("languages.html");
        check("Shared catalogue has all 13 languages and stable legacy IDs", win.languageCatalog.entries.length === 13 && ["python", "csharp", "cpp"].every(id => win.languageCatalog.has(id)));
        check("Catalogue renders 13 honest content cards", doc.querySelectorAll(".services-card").length === 13 && doc.querySelectorAll(".services-card button").length === 1);
        fill("language-search", "TypeScript"); doc.getElementById("language-search").dispatchEvent(new win.Event("input")); check("Catalogue search", doc.querySelectorAll(".services-card").length === 1);
        await load("admin-course-create.html"); check("Course builder uses every catalogue language", doc.querySelectorAll("#course-language option").length === 14);
        fill("course-title", "Rust local course"); fill("course-language", "rust"); fill("course-description", "A local draft"); submit("course-create-form");
        const course = JSON.parse(testStorage.getItem(draftKey)).courses[0];
        check("New language draft uses existing contract", course.language === "rust" && course.languageLabel === "Rust");
        await load("admin-courses.html"); check("New draft renders and filters by Rust", [...doc.querySelectorAll("#course-language-filter option")].some(value => value.value === "rust") && doc.body.textContent.includes("Rust local course"));
        await load(`admin-level-create.html?id=${course.id}`); fill("level-title", "Rust introduction"); fill("level-description", "A local explanation"); fill("level-objectives", "Read the local example"); submit("level-create-form");
        const level = JSON.parse(testStorage.getItem(contentKey)).courses[course.id].levels[0];
        await load(`admin-level-content.html?course=${course.id}&level=${level.id}`);
        check("New language level editor does not offer Python lesson mapping", doc.getElementById("edit-lesson-builtin").closest(".form-field").hidden);
        fill("edit-lesson-title", "Rust overview"); fill("edit-lesson-content", "Locally authored Rust overview."); fill("edit-lesson-status", "published"); submit("lesson-editor");
        await load(`course.html?id=${course.id}`); check("Available local content can be viewed without pretending there is a full path", doc.body.textContent.includes("Rust overview") && doc.body.textContent.includes("does not publish"));
        const localLink = doc.querySelector('a[href*="/lesson.html?course="]').getAttribute("href");
        testStorage.setItem(prefKey, JSON.stringify({ language: "rust", experience: "beginner", goal: "projects", custom: "keep" }));
        await load(localLink); check("Namespaced Rust lesson renders its own content", doc.getElementById("lesson-explanation").textContent.includes("Locally authored Rust") && !doc.getElementById("lesson-explanation").textContent.includes("A variable is"));
        for (const file of ["learning-path.html", "module.html?level=1", "lesson.html?lesson=variables", "placement-intro.html", "placement-question.html", "practice.html", "workspace.html", "level-assessment.html?level=1"]) {
            if (file.startsWith("level-assessment")) continue;
            await load(file); check(`Non-Python guard: ${file}`, win.location.pathname.endsWith("languages.html") && doc.body.textContent.includes("Rust"));
        }
        check("Guarded pages did not create Python progress or placement", testStorage.getItem("codementor-demo-learning") === null && testStorage.getItem("codementor-demo-placement") === null);
        await load("dashboard.html"); check("New language dashboard has no Python start card", doc.getElementById("next-title").textContent.includes("Rust") && !doc.querySelector('[aria-labelledby="next-title"] a[href*="/lesson.html"]'));
        testStorage.setItem("codementor-demo-session", JSON.stringify({ name: "Test Student", email: "test@example.com", role: "student", isDemo: true }));
        // These are this student's fixture preferences. Guest preferences no
        // longer become another owner's data when a profile is selected.
        testStorage.setItem(prefKey, JSON.stringify({ language: "rust", experience: "beginner", goal: "projects", custom: "keep" }));
        await load("profile.html"); check("Profile accepts existing new-language preferences", !doc.getElementById("profile-fields").disabled && doc.getElementById("profile-language").value === "rust");
        submit("profile-form"); check("Profile preserves language and extra preference fields", JSON.parse(testStorage.getItem(prefKey)).language === "rust" && JSON.parse(testStorage.getItem(prefKey)).custom === "keep");
        await load("onboarding.html"); check("Onboarding restores expanded language and radio preferences", doc.getElementById("onboarding-language").value === "rust" && doc.querySelectorAll('input[name="experience"]:checked').length === 1 && doc.querySelectorAll('input[name="goal"]:checked').length === 1);
        const nextLoad = new Promise(resolve => { frame.onload = () => { setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 30); }; }); submit("onboarding-form"); await nextLoad;
        check("Onboarding routes Rust to availability instead of Python placement", win.location.pathname.endsWith("languages.html"));
        await load("service-draft.html"); check("Freelance drafts support every catalogue language without changing old label storage", [...doc.querySelectorAll("#draft-language option")].length === 13 && [...doc.querySelectorAll("#draft-language option")].some(option => option.value === "C#"));
        testStorage.setItem(prefKey, "bad-preferences"); await load("onboarding.html"); fill("onboarding-language", "java"); doc.querySelector('input[name="experience"]').checked = true; doc.querySelector('input[name="goal"]').checked = true; submit("onboarding-form");
        check("Corrupt preferences are never overwritten", testStorage.getItem(prefKey) === "bad-preferences" && doc.getElementById("onboarding-message").classList.contains("is-error"));
        check("Expanded catalogue mobile layout fits", doc.documentElement.scrollWidth <= win.innerWidth + 1);
    } catch (error) { check(`Harness failure: ${error.message}`, false); }
    output.dataset.done = "true"; document.title = checks.every(value => value.passed) ? "PASS: Language phase" : "FAIL: Language phase";
})();
