(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    let win, doc;
    function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); output.textContent = JSON.stringify({ passed: checks.filter(value => value.passed).length, total: checks.length, checks }, null, 2); }
    function load(file) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(file)), 8000); frame.onload = () => { clearTimeout(timer); setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 25); }; frame.src = testPageUrl(file); }); }
    const sessionKey = "codementor-demo-session", account = { name: "Shell Test", email: "shell@example.com", role: "student", isDemo: true };
    try {
        testStorage.clear();
        await load("community.html"); check("Guest service retains public navigation", !doc.querySelector(".workspace-sidebar") && !!doc.querySelector(".site-header .navigation"));
        check("Guest service active link", !!doc.querySelector('.navigation a[href$="/community.html"][aria-current="page"]'));
        testStorage.setItem(sessionKey, JSON.stringify(account));
        for (const file of ["community.html", "peer-mentoring.html", "mentoring-details.html?id=demo-python", "showcase.html", "student-public-profile.html?id=demo-maya", "freelance-services.html", "service-details.html?id=demo-script", "service-draft.html", "languages.html", "learning-report.html", "progress.html", "lesson.html?lesson=variables", "workspace.html", "dashboard.html", "onboarding.html"]) {
            await load(file);
            check(`Student shell and active navigation: ${file}`, doc.querySelectorAll(".workspace-sidebar").length === 1 && doc.querySelectorAll(".workspace-topbar").length === 1 && doc.querySelectorAll('.workspace-navigation a[aria-current="page"]').length === 1);
            check(`Mobile shell fits: ${file}`, doc.documentElement.scrollWidth <= win.innerWidth + 1);
        }
        // Test the menu after intentionally dismissing the independent modal guide.
        doc.querySelector("#cm-user-guide[open] .cm-guide-skip")?.click();
        await new Promise(resolve => setTimeout(resolve, 40));
        const toggle = doc.getElementById("workspace-menu-toggle"); toggle.click(); check("Shared mobile menu opens once", toggle.getAttribute("aria-expanded") === "true");
        doc.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" })); check("Escape closes menu and returns focus", toggle.getAttribute("aria-expanded") === "false" && doc.activeElement === toggle);
        toggle.click(); doc.querySelector("main").click(); check("Click outside closes the shared menu", toggle.getAttribute("aria-expanded") === "false");
        await load("mentoring-details.html?id=demo-python");
        const profileLoad = new Promise(resolve => { frame.onload = () => { setTimeout(() => { win = frame.contentWindow; doc = win.document; resolve(); }, 20); }; });
        doc.querySelector('a[href*="/student-public-profile.html?id="]').click(); await profileLoad;
        check("Detail-to-profile navigation keeps the student frame", win.location.pathname.endsWith("student-public-profile.html") && !!doc.querySelector(".workspace-sidebar"));
        await new Promise(resolve => { frame.onload = () => setTimeout(resolve, 20); win.history.back(); setTimeout(resolve, 300); });
        win = frame.contentWindow; doc = win.document;
        check("Native Back returns to the detail page with student shell", win.location.pathname.endsWith("mentoring-details.html") && !!doc.querySelector(".workspace-sidebar"));
        frame.style.width = "1280px"; await load("showcase.html");
        const sidebarBox = doc.querySelector(".workspace-sidebar").getBoundingClientRect(), mainBox = doc.querySelector("main").getBoundingClientRect();
        check("Desktop sidebar does not cover content", mainBox.left >= sidebarBox.right && doc.documentElement.scrollWidth <= win.innerWidth + 1);
        frame.style.width = "390px";
        const before = testStorage.getItem(sessionKey);
        const homeLoad = new Promise(resolve => { frame.onload = () => { win = frame.contentWindow; doc = win.document; setTimeout(resolve, 20); }; }); doc.querySelector(".workspace-sidebar a.logo").click(); await homeLoad;
        check("Logo returns home without logout", win.location.pathname.endsWith("index.html") && testStorage.getItem(sessionKey) === before);
        check("Home keeps visitor layout", !doc.querySelector(".workspace-sidebar") && !!doc.querySelector(".hero-video-shell"));
        for (const file of ["login.html", "signup.html", "admin-dashboard.html", "admin-courses.html", "admin-level-content.html?course=missing&level=missing"]) {
            await load(file);
            const brands = [...doc.querySelectorAll("a.logo, a.brand-logo")];
            check(`Actual accessible home logo: ${file}`, brands.length > 0 && brands.every(link => new URL(link.href).pathname.endsWith("/index.html") && link.getAttribute("aria-label")?.includes("Home") && link.querySelector('img[alt="CodeMentor AI cherry logo"]')));
            if (file.startsWith("admin-")) check(`Admin shell has no student management links: ${file}`, !!doc.querySelector('.workspace-navigation[aria-label="Admin navigation"]') && !doc.querySelector('.workspace-navigation a[href$="/community.html"]') && !doc.getElementById("logout-button"));
        }
        check("Admin preview did not change the student session", testStorage.getItem(sessionKey) === before);
    } catch (error) { check(`Harness failure: ${error.message}`, false); }
    output.dataset.done = "true"; document.title = checks.every(value => value.passed) ? "PASS: Navigation phase" : "FAIL: Navigation phase";
})();
