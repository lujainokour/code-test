/* Use a disposable Chrome profile and --allow-file-access-from-files, or a local HTTP preview. */
(async () => {
    const frame = document.getElementById("subject");
    const output = document.getElementById("results");
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") {
        output.textContent = "Not started. Use ?run=disposable-profile only in a separate, disposable browser profile. Tests replace demo data in their own tab.";
        return;
    }
    const checks = [];
    const account = { name: "Test Student", email: "student@example.com", age: 21, role: "student", isDemo: true };
    const sessionKey = "codementor-demo-session";
    const draftKey = "codementor-demo-admin-course-drafts";
    const contentKey = "codementor-demo-admin-course-content";
    const learningKey = "codementor-demo-learning";
    const prefKey = "codementor-demo-onboarding";
    const bookingKey = "codementor-demo-peer-bookings";
    const serviceKey = "codementor-demo-service-requests";
    const ownDraftKey = "codementor-demo-service-drafts";
    let win, doc;
    function check(name, value) {
        checks.push({ name, passed: Boolean(value) });
        output.textContent = JSON.stringify({ passed: checks.filter(value => value.passed).length, total: checks.length, checks }, null, 2);
    }
    function load(file) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timeout: ${file}`)), 8000);
            frame.onload = () => {
                clearTimeout(timer); win = frame.contentWindow; doc = win.document;
                setTimeout(resolve, 30);
            };
            frame.src = testPageUrl(file);
        });
    }
    function set(key, value) { testStorage.setItem(key, JSON.stringify(value)); }
    function get(key) { return JSON.parse(testStorage.getItem(key)); }
    function fill(id, value) { doc.getElementById(id).value = value; }
    function submit(selector) { doc.querySelector(selector).dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); }
    function cards() { return doc.querySelectorAll(".services-grid > .services-card").length; }
    try {
        testStorage.clear();
        await load("community.html");
        check("Community has an internal discussion composer", !!doc.querySelector("#community-composer") && !doc.querySelector('a[href*="discord"]'));
        await load("showcase.html");
        check("Three fictional showcase cards", cards() === 3);
        fill("services-search", "Maya"); doc.getElementById("services-search").dispatchEvent(new win.Event("input", { bubbles: true }));
        check("Showcase search", cards() === 1 && doc.querySelector(".services-grid").textContent.includes("Maya"));
        fill("services-search", "zzzz-no-result"); doc.getElementById("services-search").dispatchEvent(new win.Event("input", { bubbles: true }));
        check("Showcase empty results", cards() === 0 && doc.body.textContent.includes("No matches"));
        fill("services-search", ""); fill("services-language", "C++"); doc.getElementById("services-language").dispatchEvent(new win.Event("change", { bubbles: true }));
        check("Showcase learning-language filter", cards() === 2);
        fill("services-language", "all"); fill("services-skill", "OOP"); doc.getElementById("services-skill").dispatchEvent(new win.Event("change", { bubbles: true }));
        check("Showcase skill filter", cards() === 1 && doc.querySelector(".services-grid").textContent.includes("Omar"));
        set(sessionKey, account);
        await load("student-public-profile.html?id=demo-maya");
        check("Public profile excludes private identity, age and email", doc.getElementById("service-content").textContent.includes("Maya Haddad") && !doc.getElementById("service-content").textContent.includes(account.email) && !doc.getElementById("service-content").textContent.includes(account.name) && !doc.getElementById("service-content").textContent.includes("21"));
        check("Public profile does not invent work links", doc.body.textContent.includes("No public work links"));
        await load("student-public-profile.html?id=missing");
        check("Unknown public profile handled", doc.body.textContent.includes("profile not found"));
        await load("peer-mentoring.html"); check("Three peer mentors plus published instructor sessions", win.studentServicesData.mentors.filter(m => !m.instructor).length === 3 && cards() === win.studentServicesData.mentors.length && doc.body.textContent.includes("sample admin approval"));
        testStorage.removeItem(sessionKey);
        await load("mentoring-details.html?id=demo-python");
        check("Booking requires a student demo session", !doc.querySelector("#booking-slot") && doc.body.textContent.includes("Sign in to a student"));
        set(sessionKey, account);
        await load("mentoring-details.html?id=demo-python");
        check("Three sample future slots", doc.querySelectorAll("#booking-slot option").length === 4);
        submit(".services-panel form"); check("Empty booking rejected", testStorage.getItem(bookingKey) === null);
        doc.getElementById("booking-slot").selectedIndex = 1; fill("booking-notes", "Help with function return values."); submit(".services-panel form");
        check("Booking saved as local simulation", get(bookingKey)?.records?.length === 1 && get(bookingKey).records[0].status === "local-simulation");
        submit(".services-panel form"); check("Duplicate booking rejected", get(bookingKey).records.length === 1 && doc.querySelector("#service-content .form-message").textContent.includes("already"));
        testStorage.setItem(bookingKey, "broken-json"); doc.getElementById("booking-slot").selectedIndex = 2; submit(".services-panel form");
        check("Corrupt bookings preserved and explained", testStorage.getItem(bookingKey) === "broken-json" && doc.querySelector("#service-content .form-message").textContent.includes("not been changed"));
        testStorage.removeItem(bookingKey); set(sessionKey, { ...account, email: "other@example.com" }); submit(".services-panel form");
        check("Session switch blocks stale booking form", testStorage.getItem(bookingKey) === null && doc.querySelector("#service-content .form-message").textContent.includes("account changed"));
        set(sessionKey, account);
        await load("mentoring-details.html?id=missing"); check("Unknown mentor handled", doc.body.textContent.includes("Session not found"));
        await load("freelance-services.html"); check("Three student offers and draft link", cards() === 3 && !!doc.querySelector('a[href$="/service-draft.html"]'));
        await load("service-details.html?id=demo-script");
        fill("service-brief", "Create a simple file sorting utility."); submit(".services-panel form");
        check("Service request stays local and disables duplicate submit", get(serviceKey)?.records?.length === 1 && doc.querySelector('.services-panel button[type="submit"]').disabled && doc.querySelector("#service-content .form-message").textContent.includes("provider can review"));
        testStorage.setItem(serviceKey, '{"version":9}');
        await load("service-details.html?id=demo-script"); fill("service-brief", "Another request."); submit(".services-panel form");
        check("Corrupt service requests preserved", testStorage.getItem(serviceKey) === '{"version":9}' && doc.querySelector("#service-content .form-message").classList.contains("is-error"));
        await load("service-details.html?id=missing"); check("Unknown service handled", doc.body.textContent.includes("Service not found"));
        await load("service-draft.html");
        fill("draft-title", "My Python helper"); fill("draft-description", "A small script for text files."); fill("draft-skills", "Python, Files"); fill("draft-price", "-2"); fill("draft-days", "3"); submit("form.services-panel");
        check("Invalid draft price rejected", testStorage.getItem(ownDraftKey) === null);
        fill("draft-price", "15"); submit("form.services-panel");
        check("Own private draft saved and displayed", get(ownDraftKey)?.records?.length === 1 && doc.body.textContent.includes("My Python helper"));
        await load("freelance-services.html"); check("Private draft not auto-published", cards() === 3 && !doc.querySelector(".services-grid").textContent.includes("My Python helper"));
        set(sessionKey, { ...account, email: "another@example.com" }); await load("service-draft.html");
        check("Another account cannot see own private drafts", !doc.body.textContent.includes("My Python helper"));
        set(sessionKey, account); testStorage.setItem(ownDraftKey, "bad-drafts"); await load("service-draft.html");
        fill("draft-title", "New draft"); fill("draft-description", "A small helper."); fill("draft-skills", "Python"); fill("draft-price", "15"); fill("draft-days", "3"); submit("form.services-panel");
        check("Corrupt private drafts not overwritten", testStorage.getItem(ownDraftKey) === "bad-drafts" && doc.querySelector("#service-content .form-message").classList.contains("is-error"));
        await load("learning-report.html");
        check("Empty report uses real name with no invented progress", doc.body.textContent.includes(account.name) && doc.body.textContent.includes("No learning progress has been saved") && !doc.body.textContent.includes(account.email));
        set(prefKey, { language: "python", experience: "beginner", goal: "projects" });
        set(learningKey, { version: 1, lessons: ["variables", "data-types"], tasks: ["receipt"], assessments: { "1": { score: 75 } } });
        await load("learning-report.html");
        check("Report derives lesson counts and existing score", doc.body.textContent.includes("2 of " + win.pythonCurriculum.allLessons.length) && doc.body.textContent.includes("75%") && doc.body.textContent.includes("not an official certificate"));
        let printed = false; win.print = () => { printed = true; }; doc.getElementById("print-report").click(); check("Print button invokes browser print", printed);
        testStorage.setItem(learningKey, "bad-progress"); await load("learning-report.html");
        check("Corrupt report data blocks printing without deletion", doc.getElementById("print-report").disabled && testStorage.getItem(learningKey) === "bad-progress" && doc.getElementById("report-message").textContent.includes("could not be read"));
        testStorage.removeItem(learningKey);
        set(draftKey, { version: 1, courses: [{ id: "test-local", title: "Test C# Course", language: "csharp", languageLabel: "C#", description: "A test draft", status: "draft" }] });
        await load("admin-courses.html"); check("Admin list includes local drafts", doc.querySelectorAll(".course-management-card").length === 4 && doc.body.textContent.includes("Test C# Course"));
        fill("course-language-filter", "csharp"); doc.getElementById("course-language-filter").dispatchEvent(new win.Event("change"));
        check("Admin language filter supports both field shapes", doc.querySelectorAll(".course-management-card").length === 2);
        await load("admin-course-content.html?id=python-foundations"); check("Base course language rendered", doc.getElementById("course-content-language").textContent === "Python");
        await load("admin-course-content.html?id=test-local"); check("Draft course language rendered", doc.getElementById("course-content-language").textContent === "C#");
        set(contentKey, { version: 1, preserved: "keep", courses: { "other-course": { levels: [], custom: "keep" }, "test-local": { levels: [], custom: "keep" } } });
        await load("admin-level-create.html?id=test-local");
        fill("level-title", "Test level"); fill("level-description", "A clear test description"); fill("level-objectives", "Understand the example"); submit("#level-create-form");
        check("Level creation preserves existing content contract and extra fields", get(contentKey).version === 1 && get(contentKey).courses["test-local"].levels.length === 1 && get(contentKey).courses["test-local"].custom === "keep" && get(contentKey).courses["other-course"].custom === "keep" && get(contentKey).preserved === "keep");
        testStorage.setItem(contentKey, "bad-content"); await load("admin-level-create.html?id=test-local");
        check("Corrupt level content blocks editor and is preserved", doc.getElementById("level-create-view").hidden && testStorage.getItem(contentKey) === "bad-content");
        testStorage.setItem(draftKey, "bad-courses"); await load("admin-courses.html");
        check("Corrupt admin drafts visible error and unchanged", doc.getElementById("course-search").disabled && doc.body.textContent.includes("could not be read") && testStorage.getItem(draftKey) === "bad-courses");
        await load("admin-course-create.html"); fill("course-title", "New test course"); fill("course-language", "cpp"); fill("course-description", "Test draft"); submit("#course-create-form");
        check("Course creation refuses corrupt drafts", testStorage.getItem(draftKey) === "bad-courses" && doc.getElementById("course-create-message").textContent.includes("left unchanged"));
        testStorage.removeItem(draftKey); await load("admin-course-create.html"); fill("course-title", "New test course"); fill("course-language", "cpp"); fill("course-description", "Test draft"); submit("#course-create-form");
        check("New course writer contract remains version 1 with language", get(draftKey).version === 1 && get(draftKey).courses[0].language === "cpp" && !Object.hasOwn(get(draftKey).courses[0], "languageId"));
        await load("signup.html");
        fill("full-name", "Test Student"); fill("email", account.email); fill("password", "LongPassword123!"); fill("confirm-password", "LongPassword123!"); fill("age", "21.5"); submit("#signup-form");
        check("Signup rejects fractional age", doc.getElementById("age-error").textContent.includes("whole number"));
        fill("age", "0"); submit("#signup-form"); check("Signup rejects zero age", doc.getElementById("age-error").textContent.includes("between 1 and 120"));
        fill("full-name", "123 456"); fill("age", "21"); submit("#signup-form"); check("Signup rejects numeric names", doc.getElementById("name-error").textContent.includes("Use letters"));
        fill("full-name", "Test Student");
        fill("age", "21"); fill("confirm-password", "Mismatch"); submit("#signup-form"); check("Signup confirmation preserved", doc.getElementById("confirm-error").textContent === "Passwords do not match.");
        fill("confirm-password", "LongPassword123!"); testStorage.setItem(sessionKey, "bad-identity"); submit("#signup-form");
        check("Signup preserves corrupt account identity", testStorage.getItem(sessionKey) === "bad-identity" && doc.getElementById("signup-message").textContent.includes("Existing records were kept"));
        set(sessionKey, account); set(prefKey, { language: "python", experience: "basics", goal: "projects" });
        const beforePrefs = testStorage.getItem(prefKey);
        const nextLoad = new Promise(resolve => { frame.onload = () => { win = frame.contentWindow; doc = win.document; setTimeout(resolve, 30); }; });
        submit("#signup-form"); await nextLoad;
        check("Signup saves private age, no password, keeps preferences", get(sessionKey).age === 21 && !Object.hasOwn(get(sessionKey), "password") && testStorage.getItem(prefKey) === beforePrefs);
        await load("login.html");
        check("Login uses the animated student with local poster, pause control and form links", !!doc.querySelector('.auth-visual video source[src="../../assets/videos/student-coding.mp4"]') && !!doc.querySelector('.auth-visual video[poster="../../assets/images/student-coding-poster.jpg"]') && !!doc.querySelector(".auth-video-toggle") && !!doc.getElementById("login-form") && !!doc.querySelector('a[href$="/forgot-password.html"]'));
        doc.getElementById("fill-demo").click(); check("Sample login autofill retained", doc.getElementById("email").value === "student@example.com" && doc.getElementById("password").value === "DemoStudent123!");
        const loginLoad = new Promise(resolve => { frame.onload = () => { win = frame.contentWindow; doc = win.document; setTimeout(resolve, 30); }; });
        submit("#login-form"); await loginLoad;
        check("Sample sign-in preserves existing private age", get(sessionKey).age === 21 && win.location.pathname.endsWith("dashboard.html") && testStorage.getItem(prefKey) === beforePrefs);
        await load("dashboard.html");
        check("Shared student navigation includes all four services", ["community.html", "peer-mentoring.html", "showcase.html", "freelance-services.html"].every(href => doc.querySelector(`.workspace-navigation a[href$="/${href}"]`)));
        await load("admin-dashboard.html");
        check("Admin navigation remains focused on admin tools", !doc.querySelector('.workspace-navigation a[href$="/community.html"]'));
        await load("peer-mentoring.html");
        const serviceMenu = doc.querySelector(".workspace-menu-toggle, .menu-toggle");
        serviceMenu.click();
        check("Mobile service navigation opens", serviceMenu.getAttribute("aria-expanded") === "true");
        doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        check("Mobile service navigation closes with Escape", serviceMenu.getAttribute("aria-expanded") === "false");
        // All new pages use a real 390px iframe viewport for overflow checks.
        for (const file of ["community.html", "peer-mentoring.html", "showcase.html", "student-public-profile.html?id=demo-maya", "freelance-services.html", "service-details.html?id=demo-script", "mentoring-details.html?id=demo-python", "service-draft.html", "learning-report.html", "login.html", "signup.html"]) {
            await load(file);
            check(`390px layout: ${file}`, doc.documentElement.scrollWidth <= win.innerWidth + 1);
        }
    } catch (error) { check(`Harness failure: ${error.message}`, false); }
    output.dataset.done = "true";
    document.title = checks.every(value => value.passed) ? "PASS: CodeMentor smoke checks" : "FAIL: CodeMentor smoke checks";
})();

