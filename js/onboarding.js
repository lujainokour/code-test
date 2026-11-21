/* Student onboarding page (Slice 2). Rules live in js/domain/onboarding.js, storage in js/data/onboarding-repository.js;
   this file only reads the form, calls them and renders. Answers are saved as a draft until the student presses
   "Show my starting plan"; a student who already finished onboarding edits their saved answers immediately, as before. */
(() => {
    const form = document.getElementById("onboarding-form"), select = document.getElementById("onboarding-language");
    const status = document.getElementById("onboarding-message"), button = document.getElementById("continue-button");
    const catalog = window.languageCatalog, domain = window.cmDomain?.onboarding, repository = window.cmData?.onboarding;
    const byId = id => document.getElementById(id);
    const plan = byId("onboarding-plan"), resume = byId("onboarding-resume");
    let owner; try { owner = window.cmStorage.captureOwner(); } catch { /* Saving stays blocked. */ }
    const beforeWrite = () => window.cmStorage.assertOwner(owner);
    const now = () => new Date().toISOString();
    const node = (tag, text, cls) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (cls) value.className = cls; return value; };
    function say(text, error = false) { status.textContent = text; status.classList.toggle("is-error", error); }
    catalog.populateSelect(select, true);
    const placeholder = node("option", "Choose a language"); placeholder.value = ""; placeholder.disabled = true; select.prepend(placeholder);

    function answers() {
        const data = new FormData(form), value = name => { const item = data.get(name); return item ? String(item) : undefined; };
        return { language: value("language") || undefined, experience: value("experience"), goal: value("goal") };
    }
    function fill(values) {
        select.value = values.language && catalog.has(values.language) ? values.language : "";
        for (const name of ["experience", "goal"]) {
            const choice = [...form.querySelectorAll(`input[name="${name}"]`)].find(input => input.value === values[name]);
            form.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = false; });
            if (choice) choice.checked = true;
        }
    }
    const answeredCount = () => Object.values(answers()).filter(Boolean).length;
    function renderProgress() {
        const count = answeredCount();
        byId("onboarding-progress").textContent = count === 3 ? "All 3 questions answered" : `${count} of 3 answered`;
        byId("onboarding-progress-bar").value = count;
    }
    function labelButton() {
        const entry = catalog.get(select.value);
        button.textContent = entry && !entry.builtInContent ? "See what is available →" : "Show my starting plan →";
    }
    function journey(completed) {
        const steps = [...document.querySelectorAll(".journey-steps li")];
        steps.forEach((item, index) => {
            const current = completed ? index === 1 : index === 0;
            item.classList.toggle("is-current", current); item.classList.toggle("is-done", completed && index === 0);
            if (current) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
        });
        const eyebrow = document.querySelector(".preferences-panel > .eyebrow");
        if (eyebrow) eyebrow.textContent = completed ? "YOUR STARTING PLAN" : "STEP 1 OF 3 · YOUR PREFERENCES";
    }

    // ---- starting plan (deterministic, from the saved answers and real activity) ----
    function planInput(record, confirmed) {
        const entry = catalog.get(record.language);
        let placementState = "missing", applied = false, lessonsDone = 0;
        try {
            const context = window.placementStore.capture(), attempt = window.placementStore.read(context);
            placementState = attempt?.status || "missing"; applied = Boolean(window.placementStore.choice(context));
        } catch { /* no placement information: the plan simply does not mention it */ }
        try { lessonsDone = window.cmData.learning.read().progress.lessons.length; } catch { lessonsDone = 0; }
        return {
            track: { id: entry.id, name: entry.name, ready: Boolean(entry.builtInContent) }, experience: record.experience, goal: record.goal, confirmed, lessonsDone,
            placement: { available: Boolean(window.placementBanks?.get?.(record.language)) && Boolean(entry.builtInContent), state: placementState, applied, maxSkip: window.placementEngine?.policy?.maxSkip },
            alternatives: catalog.entries.filter(item => item.builtInContent && item.id !== record.language).map(item => ({ id: item.id, name: item.name }))
        };
    }
    const hrefFor = { "learning-path": "learning-path.html", "placement-intro": "placement-intro.html", "placement-question": "placement-question.html", "placement-results": "placement-results.html", dashboard: "dashboard.html", practice: "practice.html", project: "project.html" };
    function actionNode(action, className) {
        if (action.target === "switch-language") {
            const control = node("button", action.label, className); control.type = "button";
            control.addEventListener("click", () => switchLanguage(action.language)); return control;
        }
        const link = node("a", action.label, className);
        link.href = action.target === "language-info" ? `../public/languages.html?language=${encodeURIComponent(action.language)}` : hrefFor[action.target] || "dashboard.html"; return link;
    }
    function showPlan(record, confirmed) {
        const result = domain.planFor(planInput(record, confirmed));
        byId("plan-title").textContent = result.headline;
        const notice = byId("plan-notice"); notice.hidden = !result.trackNotice; notice.textContent = result.trackNotice ? `Unavailable track: ${result.trackNotice}. It is listed so you can follow its availability.` : "";
        byId("plan-reasons").replaceChildren(...result.reasons.map(text => node("li", text)));
        const primary = byId("plan-primary"), replacement = actionNode(result.primary, "button button-primary"); replacement.id = "plan-primary"; primary.replaceWith(replacement);
        byId("plan-secondary").replaceChildren(...result.secondary.map(action => actionNode(action, "button button-outline")));
        plan.hidden = false; form.hidden = true; journey(true);
        chrome(true);
        return result;
    }
    // Heading, welcome line, progress bar and resume note belong to the questions, not to the finished plan.
    function chrome(planShown) {
        byId("onboarding-progress-wrap").hidden = planShown; byId("welcome-message").hidden = planShown; if (planShown) resume.hidden = true;
        byId("preferences-title").hidden = planShown;   // the plan card has its own heading; no second one above it
    }
    function showForm() { plan.hidden = true; form.hidden = false; journey(false); chrome(false); renderProgress(); labelButton(); }
    function switchLanguage(id) {
        try {
            const state = repository.read().state;
            if (state.status !== "completed") throw new Error("Finish your answers first.");
            repository.updateAnswer("language", id, { now: now(), beforeWrite });
            window.learningLanguage.select(id, owner); fill({ ...repository.read().record }); renderFromStorage();
        } catch (error) { say(error.message || "The track could not be changed. Existing records were kept.", true); }
    }

    // ---- render from what is stored (new, resumed, returning and legacy students) ----
    function renderFromStorage() {
        resume.hidden = true; say("");
        let result; try { result = repository.read(); } catch { say("Saved preferences could not be loaded. They have not been deleted or replaced.", true); button.disabled = true; return; }
        const { state, record, draft } = result;
        if (state.status === "unreadable") { say("Saved preferences could not be loaded. They have not been deleted or replaced.", true); button.disabled = true; fill({}); showForm(); return; }
        button.disabled = false;
        if (state.status === "completed" && state.confirmed) { fill(record); showPlan(record, true); return; }
        if (state.status === "completed") {              // a language was chosen elsewhere; experience and goal were never asked
            fill({ language: record.language, ...state.draftAnswers });
            resume.hidden = false; resume.textContent = "You have already chosen a language. Tell us your experience and your goal so your plan fits you.";
        } else if (state.status === "in_progress") {
            fill(state.draftAnswers); resume.hidden = false;
            resume.textContent = `Welcome back. Your ${state.answered} saved ${state.answered === 1 ? "answer was" : "answers were"} kept. Answer the remaining ${3 - state.answered === 1 ? "question" : "questions"} to see your plan.`;
        } else fill({});
        const account = (() => { try { return JSON.parse(window.cmStorage.getItem("codementor-demo-session") || "null"); } catch { return null; } })();
        if (typeof account?.name === "string" && account.name.trim()) byId("welcome-message").textContent = `Welcome, ${account.name.trim()}. Choose your learning preferences.`;
        showForm();
    }

    // ---- answers change: save as a draft, or (finished onboarding) save immediately as before ----
    form.addEventListener("change", event => {
        labelButton(); renderProgress();
        const field = event.target?.name; if (!["language", "experience", "goal"].includes(field)) return;
        const value = answers()[field]; if (!value) return;
        try {
            const state = repository.read().state;
            if (state.status === "unreadable") throw new Error("unreadable");
            if (state.status === "completed" && state.confirmed) {
                repository.updateAnswer(field, value, { now: now(), beforeWrite });
                if (field === "language") window.learningLanguage.select(value, owner);
            } else repository.saveDraftAnswer(field, value, { now: now(), beforeWrite });
            say("Saved on this device.");
        } catch { say("Saved preferences could not be read or saved. Existing records have not been replaced.", true); }
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        const values = answers();
        if (!form.reportValidity() || !domain.isComplete(domain.validAnswers(values, id => catalog.has(id)))) { say("Choose a language, your experience and your learning goal.", true); return; }
        try {
            const finished = repository.complete(values, { now: now(), beforeWrite });
            window.learningLanguage.select(values.language, owner);
            say("Your answers are saved on this device.");
            showPlan(finished.record, true); plan.focus();
        } catch (error) { say(error.message === "Choose a language, your experience and your learning goal." ? error.message : "Saved preferences could not be read or saved. Existing records have not been replaced.", true); }
    });
    byId("plan-edit").addEventListener("click", () => { showForm(); select.focus(); });
    byId("save-exit").addEventListener("click", () => {
        try {
            const state = repository.read().state, values = answers();
            if (state.status === "unreadable") throw new Error("unreadable");
            if (!(state.status === "completed" && state.confirmed)) for (const field of ["language", "experience", "goal"]) if (values[field]) repository.saveDraftAnswer(field, values[field], { now: now(), beforeWrite });
            location.href = "../../index.html";
        } catch { say("Saved preferences could not be read or saved. Existing records have not been replaced.", true); }
    });

    if (!domain || !repository) { say("Onboarding could not load. Existing records were not changed.", true); button.disabled = true; return; }
    renderFromStorage();
})();
