(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(value => value.passed).length, total: checks.length, checks }, null, 2); }
    function load(file) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(file)), 8000); frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 25); }; frame.src = testPageUrl(file); }); }
    function fill(id, value) { doc.getElementById(id).value = value; }
    function submit(id) { doc.getElementById(id).dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); }
    const recoveryKey = "codementor-demo-password-recovery", progressKey = "codementor-demo-learning";
    try {
        testStorage.clear();
        await load("demo.html"); check("Demo explains prepared content and real limitations", doc.body.textContent.includes("static example") && doc.querySelector('a[href$="/login.html"]') && doc.querySelector('a[href$="/admin-dashboard.html"]'));
        await load("admin-analytics.html"); check("Analytics counts real sample records and zero stored content", doc.querySelectorAll(".dashboard-stat h2")[0].textContent === "4" && doc.querySelectorAll(".dashboard-stat h2")[2].textContent === "0" && doc.body.textContent.includes("fictional"));
        testStorage.setItem("codementor-demo-admin-course-content", JSON.stringify({ version: 1, courses: { "python-foundations": { levels: [{ id: "analytics-level", title: "Analytics level", lessons: [{ id: "analytics-lesson", title: "Local lesson", content: "Local text", status: "published" }] }] } } }));
        await load("admin-analytics.html"); check("Analytics derives stored level/lesson counts", doc.querySelectorAll(".dashboard-stat h2")[2].textContent === "1" && doc.querySelectorAll(".dashboard-stat h2")[3].textContent === "1");
        testStorage.setItem("codementor-demo-admin-course-content", "bad-analytics"); await load("admin-analytics.html"); check("Corrupt analytics data does not show misleading counts or erase data", !doc.querySelector(".dashboard-stat") && doc.getElementById("analytics-message").textContent.includes("could not read") && testStorage.getItem("codementor-demo-admin-course-content") === "bad-analytics");
        testStorage.removeItem("codementor-demo-admin-course-content");
        await load("forgot-password.html"); fill("recovery-email", "bad-email"); submit("recovery-form"); check("Recovery rejects invalid email", testStorage.getItem(recoveryKey) === null);
        fill("recovery-email", "recovery@example.com"); testStorage.setItem(recoveryKey, "bad-recovery"); submit("recovery-form"); check("Recovery preserves corrupt local marker", testStorage.getItem(recoveryKey) === "bad-recovery" && doc.getElementById("recovery-message").classList.contains("is-error"));
        testStorage.removeItem(recoveryKey); submit("recovery-form");
        const marker = JSON.parse(testStorage.getItem(recoveryKey));
        check("Recovery prepares local flow without claiming email delivery", marker.status === "prepared" && doc.getElementById("recovery-message").textContent.includes("No email was sent"));
        const resetHref = doc.querySelector("#recovery-next a").getAttribute("href"); await load(resetHref);
        check("Prepared reset link enables local form", !doc.querySelector("#recovery-form fieldset").disabled);
        fill("new-password", "short"); fill("confirm-password", "short"); submit("recovery-form"); check("Reset rejects short password", JSON.parse(testStorage.getItem(recoveryKey)).status === "prepared");
        fill("new-password", "LongPracticePassword123!"); fill("confirm-password", "Mismatch"); submit("recovery-form"); check("Reset confirms matching password", doc.getElementById("recovery-message").textContent.includes("do not match"));
        fill("confirm-password", "LongPracticePassword123!"); submit("recovery-form");
        check("Reset completes simulation without storing a password", JSON.parse(testStorage.getItem(recoveryKey)).status === "completed" && !testStorage.getItem(recoveryKey).includes("LongPracticePassword") && doc.getElementById("recovery-message").textContent.includes("No real password"));
        await load(resetHref); check("Completed local reset link cannot be reused", doc.querySelector("#recovery-form fieldset").disabled);
        testStorage.setItem(recoveryKey, JSON.stringify({ ...marker, createdAt: Date.now() - 21 * 60 * 1000 })); await load(resetHref); check("Expired local reset link is rejected", doc.querySelector("#recovery-form fieldset").disabled);
        await load("reset-password.html?demo=wrong"); check("Unknown reset marker is rejected", doc.querySelector("#recovery-form fieldset").disabled);
        await load("level-assessment.html?level=1"); check("Assessment is locked without required activities", doc.getElementById("level-assessment-form").hidden && doc.getElementById("assessment-message").textContent.includes("Complete the four Python lessons"));
        const progress = { version: 1, lessons: ["variables", "data-types", "input-output", "numbers"], tasks: ["student-profile", "receipt"], assessments: { "2": { score: 80, custom: "keep" } }, custom: "keep-progress" };
        testStorage.setItem(progressKey, JSON.stringify(progress)); await load("level-assessment.html?level=1"); check("Assessment form has four prepared questions after prerequisites", !doc.getElementById("level-assessment-form").hidden && doc.querySelectorAll("#level-assessment-form fieldset").length === 4 && doc.querySelectorAll("#level-assessment-form pre").length === 4);
        win.levelQuizQuestions.forEach((lesson, index) => { doc.querySelector(`input[name="question-${index}"][value="${lesson.correct}"]`).checked = true; }); submit("level-assessment-form");
        const updated = JSON.parse(testStorage.getItem(progressKey));
        check("Local quiz score is computed, labelled and saved without replacing other data", updated.assessments["1"].score === 100 && updated.assessments["1"].kind === "local-quiz-demo" && updated.assessments["2"].custom === "keep" && updated.custom === "keep-progress" && updated.tasks.length === 2);
        check("Quiz result explicitly avoids official assessment claims", doc.getElementById("assessment-result").textContent.includes("not server-verified"));
        testStorage.setItem(progressKey, "bad-progress"); submit("level-assessment-form"); check("Quiz refuses corrupt progress without overwriting", testStorage.getItem(progressKey) === "bad-progress" && doc.getElementById("assessment-message").textContent.includes("Nothing was overwritten"));
        await load("level-assessment.html?level=4"); check("Unavailable assessment level is honest", !doc.querySelector("#level-assessment-form:not([hidden])") && doc.querySelector("main h1").textContent === "Level not available yet");
        testStorage.setItem("codementor-demo-onboarding", JSON.stringify({ language: "java", experience: "beginner", goal: "projects" })); await load("level-assessment.html?level=1"); check("Java does not start a Python level quiz", win.location.pathname.endsWith("languages.html"));
        testStorage.removeItem("codementor-demo-onboarding");
        for (const file of ["demo.html", "admin-analytics.html", "forgot-password.html", "reset-password.html", "level-assessment.html?level=1"]) {
            await load(file); check(`390px original page: ${file}`, doc.documentElement.scrollWidth <= win.innerWidth + 1);
            check(`Original page has actual home logo: ${file}`, !!doc.querySelector('a.site-brand[href$="/index.html"] img[alt="CodeMentor AI cherry logo"]'));
        }
    } catch (error) { check(`Harness failure: ${error.message}`, false); }
    output.dataset.done = "true"; document.title = checks.every(value => value.passed) ? "PASS: Original pages phase" : "FAIL: Original pages phase";
})();
