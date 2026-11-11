/* The current product is light-only; historical preferences must stay intact. */
(async () => {
    if (new URLSearchParams(location.search).get("run") !== "disposable-profile") return;
    const frame = document.getElementById("subject"), output = document.getElementById("results"), checks = [];
    const check = (name, passed) => { checks.push({name, passed: Boolean(passed)}); output.textContent = JSON.stringify({passed: checks.filter(c => c.passed).length, total: checks.length, checks}, null, 2); };
    const routes = [...new Set([...Object.values(await (await fetch("../docs/page-routes.json")).json()), "pages/auth/admin-login.html"])];
    async function load(route) {
        await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(route)), 8000); frame.onload = () => { clearTimeout(timer); resolve(); }; frame.src = new URL("../" + route, location.href); });
        return frame.contentWindow;
    }
    try {
        testStorage.clear(); localStorage.setItem("codementor-ui-theme", "dark");
        for (const route of routes) {
            const win = await load(route);
            check(route + ": uses the current light palette", win.document.documentElement.dataset.theme === "light");
            check(route + ": preserves historical preference", localStorage.getItem("codementor-ui-theme") === "dark");
        }
        const win = frame.contentWindow;
        check("Unsupported palettes cannot create an inconsistent UI", win.codeMentorTheme.set("invalid") === false && win.codeMentorTheme.get() === "light");
        check("Setting light keeps storage untouched", win.codeMentorTheme.set("light") === true && localStorage.getItem("codementor-ui-theme") === "dark");
    } catch (error) { check("Unexpected: " + error.message, false); }
    document.documentElement.dataset.done = "true";
})();
