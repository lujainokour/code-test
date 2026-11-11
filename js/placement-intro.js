(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const store = window.placementStore, context = store.capture();
    const button = document.getElementById("start-assessment"), status = document.getElementById("placement-message");
    const experiences = { beginner: "Just starting", basics: "Know the basics", practising: "Have some practice" };
    const goals = { foundations: "Build foundations", "problem-solving": "Solve problems", projects: "Build projects" };
    let ready = false;
    function render() {
        ready = false; button.disabled = true; status.textContent = "";
        try {
            const bank = store.bank(context), attempt = store.read(context);
            const preferences = JSON.parse(window.cmStorage.getItem("codementor-demo-onboarding") || "null");
            const valid = preferences && preferences.language === context.language && Object.hasOwn(experiences, preferences.experience) && Object.hasOwn(goals, preferences.goal);
            const name = window.languageCatalog.get(context.language).name;
            document.title = `${name} placement | CodeMentor AI`;
            document.querySelector(".onboarding-description").textContent = `Explore your current ${name} understanding and choose a starting point without changing completed work.`;
            document.getElementById("summary-language").textContent = name;
            document.getElementById("summary-experience").textContent = valid ? experiences[preferences.experience] : "Not selected";
            document.getElementById("summary-goal").textContent = valid ? goals[preferences.goal] : "Not selected";
            document.getElementById("placement-question-count").textContent = String(bank.questions.length);
            document.getElementById("placement-introduction").textContent = `Answer a few ${name} questions to find a recommended starting level. Placement can mark up to two levels as placed out; it does not complete lessons or award completion badge progress.`;
            document.getElementById("placement-start-note").textContent = "Review the recommendation before choosing where to start. You can also confirm a start from Level 1. Real learning progress is always kept.";
            const account = JSON.parse(window.cmStorage.getItem("codementor-demo-session") || "null");
            if (account?.name?.trim()) document.getElementById("placement-greeting").textContent = `Ready for the challenge, ${account.name.trim().split(/\s+/)[0]}?`;
            button.textContent = !valid ? "Complete preferences →" : attempt?.status === "submitted" ? "View results →" : attempt ? "Resume assessment →" : "Start assessment →";
            status.textContent = attempt?.status === "in-progress" ? "Your saved assessment is ready to resume." : attempt?.status === "submitted" ? "Your submitted result is saved. Retakes are available on the results page." : "";
            ready = valid; button.disabled = false;
        } catch (error) { status.textContent = error.message; status.classList.add("is-error"); }
    }
    button.addEventListener("click", () => {
        try {
            window.cmStorage.assertOwner(context.owner);
            if (window.cmStorage.activeLanguage() !== context.language) throw Error("Your language changed. Reload before starting placement.");
            if (!ready) { location.href = "onboarding.html"; return; }
            const attempt = store.begin(context);
            location.href = attempt.status === "submitted" ? "placement-results.html" : "placement-question.html";
        } catch (error) { status.textContent = error.message; status.classList.add("is-error"); }
    });
    window.addEventListener("pageshow", render); render();
})();
