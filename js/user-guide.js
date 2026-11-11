/* A role-specific introduction, independent of learning and account records. */
(() => {
    "use strict";
    if (document.getElementById("cm-user-guide")) return;
    const script = document.currentScript;
    const root = new URL("../", script.src);
    const admin = script.dataset.role === "admin";
    const role = admin ? "Admin" : "Student";
    const key = `codementor-guide-v1:${role.toLowerCase()}:${encodeURIComponent(script.dataset.owner.trim().toLowerCase())}`;
    const steps = admin ? [
        { short: "Overview", tag: "GET YOUR BEARINGS", title: "See the bigger picture.", description: "Your dashboard brings the administration preview together. Start here to understand the workspace before opening a specific task.", actions: ["Find the main sections in the sidebar.", "Return to Dashboard whenever you need an overview."], tip: "These stops are shortcuts. You can manage your workspace in any order.", page: "pages/admin/admin-dashboard.html", link: "Open dashboard", icon: "grid" },
        { short: "Paths", tag: "ORGANISE LEARNING", title: "Give every course a direction.", description: "Learning paths is where you organise the courses students can explore and the levels they will work through.", actions: ["Review the existing learning paths.", "Create a course or open one to manage its structure."], tip: "Plan the course structure before adding individual lessons.", page: "pages/admin/admin-courses.html", link: "Explore learning paths", icon: "path" },
        { short: "Sessions", tag: "CONNECT THE SESSION CYCLE", title: "From a request to a completed session.", description: "Create platform sessions, configure availability, and manage student bookings. Student tutor applications and session oversight have their own section.", actions: ["Publish a platform session and set its availability.", "Review bookings, confirm with a meeting link, then track completion and student follow-up."], tip: "A decline or cancellation includes a reason the student can see. Existing bookings stay available when a listing is paused.", page: "pages/admin/admin-bookings.html", link: "Manage session bookings", icon: "book" },
        { short: "Students", tag: "KNOW YOUR LEARNERS", title: "Find the student behind the record.", description: "The Students section lets you browse the available student records and open a profile for more detail.", actions: ["Find a student in the list.", "Open their details to review the available learning information."], tip: "Admin tools currently work with local demo records, not a live student database.", page: "pages/admin/admin-students.html", link: "View students", icon: "people" },
        { short: "Insights", tag: "REVIEW & REFINE", title: "Make the next step clearer.", description: "Analytics brings the available platform summaries together so you can review the demo information in one place.", actions: ["Explore the available summaries.", "Use the sidebar to return to the section you want to work on."], tip: "You can reopen this guide at any time using User guide in the sidebar.", page: "pages/admin/admin-analytics.html", link: "Explore analytics", icon: "chart" }
    ] : [
        { short: "Your goals", tag: "MAKE IT YOURS", title: "Start with what you want to learn.", description: "Choose your programming language, tell us your experience, and pick a learning goal. These preferences give your journey a clear starting point.", actions: ["Choose your language, experience, and goal.", "Continue to the available learning experience."], tip: "Python has the built-in learning path. Other languages show their current content availability.", page: "pages/student/onboarding.html", link: "Choose my preferences", icon: "compass" },
        { short: "Your level", tag: "FIND YOUR START", title: "See what you already know.", description: "The Python placement check helps you spot familiar topics and areas that need practice. Your results include a useful review of your answers.", actions: ["Save your Python preferences before starting.", "Answer the questions, review them, then view your results."], tip: "It is fine to choose “I’m not sure”. This check is here to guide you.", page: "pages/student/placement-intro.html", link: "View placement check", icon: "compass" },
        { short: "Learn", tag: "ONE STEP AT A TIME", title: "Follow a path that makes sense.", description: "Open your learning path to find the Python levels, lessons, and quizzes. Each level builds on the one before it.", actions: ["Open an available level and work through its lessons.", "Complete its lessons and pass the quiz with at least 70% to move on."], tip: "A locked level tells you what to finish first. You can revisit earlier lessons.", page: "pages/student/learning-path.html", link: "Explore my learning path", icon: "book" },
        { short: "Try it", tag: "LEARN BY DOING", title: "Make the code your own.", description: "Practice tasks give you a place to apply what you have learned. Open a task to write Python, run it, and check the results.", actions: ["Choose an available task and read its instructions.", "Run your code, review the feedback, and try again when needed."], tip: "Hints are there to help. A failed check is a useful clue for your next attempt.", page: "pages/student/practice.html", link: "Find a practice task", icon: "code" },
        { short: "Keep going", tag: "SEE HOW FAR YOU HAVE COME", title: "Know where to go next.", description: "My progress brings your saved learning activity together. Return to your dashboard for your next steps and review suggestions.", actions: ["Check your completed lessons, quizzes, and tasks.", "Visit Certificates to see the remaining completion requirements."], tip: "Reopen this guide whenever you need a little direction. Your learning progress stays separate.", page: "pages/student/progress.html", link: "View my progress", icon: "chart" }
    ];
    const paths = {
        compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM16 8l-3 5-5 3 3-5 5-3Z",
        grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
        path: "M5 3v18M5 6h14l-3 4 3 4H5",
        book: "M12 5C8 2 4 3 2 4v15c3-2 6-2 10 0 4-2 7-2 10 0V4c-3-1-6-2-10 1ZM12 5v14",
        code: "m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18",
        people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4",
        chart: "M4 3v17h17M8 15v-4M13 15V7M18 15v-7"
    };
    function icon(name) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
    }
    function node(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }
    const launcher = node("button", "cm-guide-launcher");
    launcher.type = "button";
    launcher.innerHTML = `${icon("compass")}<span>User guide</span>`;
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-controls", "cm-user-guide");
    document.querySelector(".sidebar-bottom")?.prepend(launcher);
    const dialog = node("dialog", "cm-guide");
    dialog.id = "cm-user-guide";
    dialog.setAttribute("aria-labelledby", "cm-guide-heading");
    dialog.innerHTML = `
        <header class="cm-guide-header">
            <div class="cm-guide-brand">${icon("compass")}<span>CodeMentor AI <small>YOUR WORKSPACE GUIDE</small></span></div>
            <button type="button" class="cm-guide-close" aria-label="Close user guide">×</button>
        </header>
        <div class="cm-guide-layout">
            <section class="cm-guide-map" aria-label="Guide chapters">
                <p class="cm-guide-kicker">A LITTLE DIRECTION. A CONFIDENT START.</p>
                <h2 id="cm-guide-heading">Find your way.<br> <em>Make it yours.</em></h2>
                <div class="cm-guide-road">
                    <svg class="cm-guide-road-art" viewBox="0 0 500 540" preserveAspectRatio="none" aria-hidden="true">
                        <path class="cm-guide-road-shadow" d="M60 535 C60 470 410 500 380 425 S45 400 125 320 S450 300 365 210 S70 180 155 95 S350 105 375 20"/>
                        <path class="cm-guide-road-fill" d="M60 535 C60 470 410 500 380 425 S45 400 125 320 S450 300 365 210 S70 180 155 95 S350 105 375 20"/>
                        <path class="cm-guide-road-dashes" d="M60 535 C60 470 410 500 380 425 S45 400 125 320 S450 300 365 210 S70 180 155 95 S350 105 375 20"/>
                    </svg>
                    <ol class="cm-guide-stops"></ol>
                </div>
                <p class="cm-guide-map-note">Five simple stops. Explore at your own pace.</p>
            </section>
            <section class="cm-guide-content" aria-labelledby="cm-guide-step-title">
                <div class="cm-guide-meta"><span class="cm-guide-role">${role} guide</span><span class="cm-guide-count"></span></div>
                <div class="cm-guide-progress" aria-hidden="true"><span></span></div>
                <div class="cm-guide-copy" aria-live="polite" aria-atomic="true">
                    <span class="cm-guide-step-icon"></span>
                    <p class="cm-guide-kicker cm-guide-step-tag"></p>
                    <h3 id="cm-guide-step-title"></h3>
                    <p class="cm-guide-description"></p>
                    <p class="cm-guide-action-label">YOUR NEXT MOVES</p>
                    <ul class="cm-guide-actions"></ul>
                    <p class="cm-guide-tip"></p>
                </div>
                <a class="cm-guide-destination"></a>
                <div class="cm-guide-controls"><button type="button" class="cm-guide-previous">← Back</button><button type="button" class="cm-guide-next"></button></div>
            </section>
        </div>
        <footer class="cm-guide-footer"><span>A quick introduction. Your progress stays yours.</span><button type="button" class="cm-guide-skip">Skip for now</button></footer>`;
    document.body.append(dialog);
    const find = selector => dialog.querySelector(selector);
    const positions = [[76, 78.7], [25, 59.3], [73, 38.9], [31, 17.6], [75, 3.7]];
    const stops = steps.map((step, index) => {
        const li = node("li");
        li.style.setProperty("--stop-x", `${positions[index][0]}%`);
        li.style.setProperty("--stop-y", `${positions[index][1]}%`);
        const button = node("button", "cm-guide-stop");
        button.type = "button";
        button.setAttribute("aria-label", `Chapter ${index + 1}: ${step.short}`);
        button.innerHTML = `<span class="cm-guide-pin">${icon(step.icon)}</span><span class="cm-guide-stop-label"><b>0${index + 1}</b> ${step.short}</span>`;
        button.addEventListener("click", () => render(index));
        li.append(button);
        find(".cm-guide-stops").append(li);
        return button;
    });
    let current = 0;
    let previousOverflow;
    let returnFocus;
    function render(index) {
        current = index;
        const step = steps[index];
        find(".cm-guide-count").textContent = `${String(index + 1).padStart(2, "0")} / 05`;
        find(".cm-guide-progress span").style.width = `${(index + 1) * 20}%`;
        find(".cm-guide-step-icon").innerHTML = icon(step.icon);
        find(".cm-guide-step-tag").textContent = step.tag;
        find("#cm-guide-step-title").textContent = step.title;
        find(".cm-guide-description").textContent = step.description;
        find(".cm-guide-actions").replaceChildren(...step.actions.map(action => node("li", "", action)));
        find(".cm-guide-tip").textContent = step.tip;
        const destination = find(".cm-guide-destination");
        destination.href = new URL(step.page, root).href;
        destination.textContent = `${step.link} ↗`;
        find(".cm-guide-previous").disabled = index === 0;
        find(".cm-guide-next").textContent = index === steps.length - 1 ? "Start exploring →" : "Next stop →";
        stops.forEach((stop, i) => {
            stop.classList.toggle("is-current", i === index);
            if (i === index) stop.setAttribute("aria-current", "step");
            else stop.removeAttribute("aria-current");
        });
    }
    function remember() {
        const value = JSON.stringify({ version: 1, dismissed: true });
        try { localStorage.setItem(key, value); } catch { try { sessionStorage.setItem(key, value); } catch { /* The guide remains usable without storage. */ } }
    }
    function unseen() {
        try { return localStorage.getItem(key) === null && sessionStorage.getItem(key) === null; }
        catch { return false; }
    }
    function open() {
        if (dialog.open) return;
        returnFocus = document.activeElement;
        const menu = document.getElementById("workspace-sidebar");
        menu?.classList.remove("is-open");
        document.getElementById("workspace-menu-toggle")?.setAttribute("aria-expanded", "false");
        document.getElementById("workspace-menu-toggle")?.setAttribute("aria-label", "Open navigation");
        render(0);
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        dialog.showModal();
        find(".cm-guide-next").focus({ preventScroll: true });
    }
    function dismiss() { remember(); dialog.close(); }
    launcher.addEventListener("click", open);
    find(".cm-guide-close").addEventListener("click", dismiss);
    find(".cm-guide-skip").addEventListener("click", dismiss);
    find(".cm-guide-previous").addEventListener("click", () => render(Math.max(0, current - 1)));
    find(".cm-guide-next").addEventListener("click", () => {
        if (current < steps.length - 1) render(current + 1);
        else dismiss();
    });
    find(".cm-guide-destination").addEventListener("click", () => { remember(); dialog.close(); });
    dialog.addEventListener("cancel", event => { event.preventDefault(); dismiss(); });
    dialog.addEventListener("keydown", event => {
        if (event.key !== "Tab") return;
        const controls = [...dialog.querySelectorAll("button:not(:disabled), a[href]")].filter(element => element.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
        }
    });
    dialog.addEventListener("close", () => {
        document.documentElement.style.overflow = previousOverflow || "";
        const target = returnFocus?.isConnected && returnFocus !== document.body ? returnFocus : launcher;
        if (target.getClientRects().length) target.focus({ preventScroll: true });
        else document.getElementById("workspace-menu-toggle")?.focus({ preventScroll: true });
    });
    render(0);
    if (script.dataset.autostart === "true" && unseen()) open();
})();
