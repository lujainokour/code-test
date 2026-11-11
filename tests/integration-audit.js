/* Explicit opt-in. Run in a disposable profile, never in a user's working tab. */
(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    const check = (name, passed) => { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(item => item.passed).length, total: checks.length, checks }, null, 2); };
    function load(file) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timeout ${file}`)), 8000); frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 30); }; frame.src = testPageUrl(file); }); }
    function navigate(action) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Navigation timeout")), 8000); frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 30); }; action(); }); }
    async function waitExecution() {
        const start = Date.now();
        while (doc.getElementById("run-code").disabled) {
            if (Date.now() - start > 110000) throw new Error("Python execution timed out");
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    const fill = (id, value) => { doc.getElementById(id).value = value; };
    const submit = id => doc.getElementById(id).dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    const read = key => JSON.parse(testStorage.getItem(key));
    const sessionKey = "codementor-demo-session", prefKey = "codementor-demo-onboarding", attemptKey = "codementor-demo-placement";
    try {
        testStorage.clear();
        for (const file of ["index.html", "languages.html", "community.html", "peer-mentoring.html", "showcase.html", "freelance-services.html", "login.html", "signup.html"]) {
            await load(file);
            check(`Visitor route and logo: ${file}`, !doc.querySelector(".workspace-sidebar") && !!doc.querySelector('a.site-brand[href$="/index.html"]'));
            check(`Visitor width 390: ${file}`, doc.documentElement.scrollWidth <= win.innerWidth + 1);
            const broken = [...doc.querySelectorAll("a[href]")].filter(link => ["", "#", "javascript:void(0)"].includes(link.getAttribute("href")));
            check(`No placeholder links: ${file}`, broken.length === 0);
        }
        await load("index.html");
        const unlockFaq = [...doc.querySelectorAll("#faq details")].find(item => item.querySelector("summary")?.textContent.includes("unlock the next level"));
        check("FAQ explains the current lesson and quiz gate with optional practice", unlockFaq?.textContent.includes("four lessons") && unlockFaq.textContent.includes("70%") && unlockFaq.textContent.includes("Coding tasks provide additional practice"));
        check("Hero uses its existing independent motion controller", !!doc.getElementById("hero-background-video") && !doc.querySelector('script[src="js/smoke-intro.js"]') && !!doc.querySelector('script[src="js/hero-background.js"]'));
        const video = doc.getElementById("hero-background-video"), motion = doc.getElementById("hero-motion-toggle");
        video.pause(); check("Video motion button reflects pause", motion.textContent.includes("Play") || motion.textContent.includes("Pause"));
        await load("signup.html"); fill("full-name", "Audit Student"); fill("email", "audit@example.com"); fill("age", "22"); fill("password", "AuditPassphrase123!"); fill("confirm-password", "AuditPassphrase123!");
        await navigate(() => submit("signup-form"));
        check("Signup enters preferences without storing password", win.location.pathname.endsWith("onboarding.html") && read(sessionKey).age === 22 && !testStorage.getItem(sessionKey).includes("AuditPassphrase"));
        fill("onboarding-language", "python"); doc.querySelector('input[name="experience"][value="beginner"]').checked = true; doc.querySelector('input[name="goal"][value="foundations"]').checked = true;
        await navigate(() => submit("onboarding-form"));
        check("Python preferences route to matching placement", win.location.pathname.endsWith("placement-intro.html") && doc.getElementById("summary-language").textContent === "Python");
        await navigate(() => doc.getElementById("start-assessment").click());
        for (let index = 0; index < 10; index++) {
            const correct = win.placementQuestions[index].correct;
            const input = doc.querySelector(`#answer-options input[value="${correct}"]`); input.checked = true; input.dispatchEvent(new win.Event("change", { bubbles: true }));
            if (index < 9) doc.getElementById("next-question").click();
        }
        check("Placement saves ten actual selected answers", read(attemptKey).answers.every(answer => Number.isInteger(answer)));
        await navigate(() => doc.getElementById("review-answers").click());
        check("Review displays ten answers", doc.querySelectorAll(".review-row").length === 10);
        doc.getElementById("open-submit").click(); check("Placement confirmation opens", doc.getElementById("submit-dialog").open);
        await navigate(() => doc.getElementById("confirm-submit").click());
        check("Placement result derives 100 percent from answers", doc.getElementById("score-percentage").textContent === "100%" && read(attemptKey).status === "submitted");
        await load("learning-path.html"); doc.querySelector(".roadmap-locked button").click(); check("Unavailable roadmap level gives an explanation", doc.getElementById("unlock-dialog").open); doc.getElementById("close-unlock").click();
        await load("lesson.html?lesson=variables"); doc.getElementById("complete-lesson").click();
        check("Lesson completion persists to real demo progress", read("codementor-demo-learning").lessons.includes("variables"));
        await load("practice.html"); check("Practice offers real task routes", !!doc.querySelector('a[href*="/workspace.html?task="]'));
        await load("workspace.html?task=student-profile"); fill("code-editor", "print('audit draft')"); doc.getElementById("save-draft").click();
        check("Editor saves local code draft", read("codementor-demo-code-student-profile").code === "print('audit draft')");
        doc.getElementById("run-code").click(); await waitExecution();
        check("Run executes Python and displays its actual output without awarding a task", doc.getElementById("program-output").textContent.trim() === "audit draft" && doc.getElementById("workspace-message").textContent === "Program finished." && !read("codementor-demo-learning").tasks.length);
        doc.getElementById("submit-code").click(); await waitExecution();
        check("Submit records failed checks for an incorrect solution without awarding completion", doc.getElementById("workspace-message").textContent.includes("Some checks did not pass") && !read("codementor-demo-learning").tasks.length && read("codementor-demo-learning").taskResults["student-profile"].passed === 0);
        await load("level-assessment.html?level=1"); check("Normal student flow keeps the quiz locked until all four lessons are complete", doc.getElementById("level-assessment-form").hidden && doc.getElementById("assessment-message").textContent.includes("Complete the four Python lessons"));
        await load("progress.html"); check("Progress shows recorded lessons for the current four-lesson level", doc.getElementById("completed-lessons").textContent === "1 / 4");
        await load("learning-report.html"); check("Report shows identity and recorded progress, without invented projects", doc.getElementById("learning-report").textContent.includes("Audit Student") && doc.body.textContent.includes("1 of " + win.pythonCurriculum.allLessons.length) && doc.body.textContent.includes("no passing solution recorded yet"));
        let printed = false; win.print = () => { printed = true; }; doc.getElementById("print-report").click(); check("Report print invokes browser", printed);
        await load("mentoring-details.html?id=demo-python"); doc.getElementById("booking-slot").selectedIndex = 1; fill("booking-notes", "Audit local booking"); doc.querySelector(".services-panel form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
    } catch (error) {
        check(`Unexpected flow failure: ${error.message}`, false);
    }
    try {
        doc.querySelector(".services-panel form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
        check("Booking persists an owner-scoped local simulation", read("codementor-demo-peer-bookings").records[0].owner === "audit@example.com");
        await load("service-details.html?id=demo-script"); fill("service-brief", "Audit local service request"); doc.querySelector(".services-panel form").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
        check("Service request persists without external sending", read("codementor-demo-service-requests").records[0].status === "local-simulation");
        await load("service-draft.html"); fill("draft-title", "Audit draft"); fill("draft-description", "Private saved service draft"); fill("draft-skills", "Python"); fill("draft-price", "10"); fill("draft-days", "2"); doc.querySelector("form.services-panel").dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
        await load("service-draft.html"); check("Available draft history is readable after reload", doc.body.textContent.includes("Audit draft"));
        testStorage.setItem(attemptKey, "corrupt-attempt"); await load("placement-intro.html"); check("Corrupt placement cannot be replaced by Start", doc.getElementById("start-assessment").disabled && testStorage.getItem(attemptKey) === "corrupt-attempt");
        testStorage.removeItem(attemptKey); await load("placement-intro.html"); testStorage.setItem(attemptKey, "changed-after-load"); doc.getElementById("start-assessment").click(); check("Placement start preserves data changed after load", testStorage.getItem(attemptKey) === "changed-after-load");
        testStorage.setItem(prefKey, JSON.stringify({ language: "rust", experience: "beginner", goal: "projects" }));
        for (const file of ["module.html?level=1&language=python", "code-review.html?task=student-profile"]) { await load(file); check(`Language isolation regression: ${file}`, win.location.pathname.endsWith("languages.html") && new URL(win.location.href).searchParams.get("language") === "rust"); }
        testStorage.setItem(prefKey, JSON.stringify({ language: "python", experience: "beginner", goal: "projects" }));
        await load("admin-course-create.html"); fill("course-title", "Integration course"); fill("course-language", "javascript"); fill("course-description", "Local integration fixture"); submit("course-create-form");
        await navigate(() => doc.querySelector("#course-create-message a").click());
        await navigate(() => doc.getElementById("course-add-level").click()); fill("level-title", "Integration level"); fill("level-description", "Local level fixture"); fill("level-objectives", "Read the local content"); submit("level-create-form");
        await navigate(() => doc.querySelector("#level-create-message a").click());
        await navigate(() => doc.querySelector("#course-level-list a").click());
        fill("edit-lesson-title", "Integration lesson"); fill("edit-lesson-content", "JavaScript local content."); fill("edit-lesson-status", "published"); submit("lesson-editor");
        fill("source-title", "MDN JavaScript"); fill("source-url", "https://developer.mozilla.org/en-US/docs/Web/JavaScript"); submit("source-editor");
        fill("edit-lesson-title", "Integration lesson updated"); submit("lesson-editor");
        check("Admin create-course-level-lesson-source-edit chain works", doc.querySelector("#level-lessons").textContent.includes("Integration lesson updated") && doc.querySelector("#lesson-sources").textContent.includes("MDN JavaScript"));
        await navigate(() => doc.querySelector('#level-lessons a[href*="/lesson.html"]').click());
        check("Admin preview is the correct language and saved source", doc.getElementById("lesson-explanation").textContent.includes("JavaScript local content") && doc.getElementById("lesson-external-sources").textContent.includes("MDN JavaScript"));
        await load("admin-analytics.html"); check("Analytics reflects newly saved level and lesson", doc.querySelectorAll(".dashboard-stat h2")[2].textContent === "1" && doc.querySelectorAll(".dashboard-stat h2")[3].textContent === "1");
    } catch (error) { check(`Remaining flow failure: ${error.message}`, false); }
    output.dataset.done = "true"; document.title = checks.every(item => item.passed) ? "PASS: Integration audit" : "FAIL: Integration audit";
})();


