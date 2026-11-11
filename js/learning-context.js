/* Gate the original Python-only activities before their scripts can read/write progress. */
(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("course") && location.pathname.endsWith("/lesson.html")) return; // Namespaced local lessons have their own validation.
    function verify() {
    try {
        const raw = window.cmStorage.getItem("codementor-demo-onboarding");
        const preferences = raw === null ? null : JSON.parse(raw);
        if (preferences !== null && (!preferences || !window.languageCatalog.has(preferences.language))) throw new Error("Invalid preferences");
        const requested = params.get("language");
        const id = window.cmStorage.activeLanguage();
        if (requested && preferences && requested !== preferences.language) {
            window.learningUnavailable = true;
            location.replace(`../public/languages.html?language=${encodeURIComponent(preferences.language)}`);
            return;
        }
        if (!window.languageCatalog.get(id)?.builtInContent) {
            window.learningUnavailable = true;
            window.showLanguageUnavailable();
        } else if (id !== "python" && /\/(placement-(intro|question|review|results)|skill-analysis)\.html$/.test(location.pathname)) {
            window.learningUnavailable = true;
            const main = document.querySelector("main");
            const heading = document.createElement("h1"); heading.textContent = "Placement is not available for this language";
            const text = document.createElement("p"); text.textContent = "No placement bank exists for this language yet. Start at Level 1; no quiz result or skipped progress has been inferred.";
            const link = document.createElement("a"); link.href = "learning-path.html"; link.textContent = "Open my learning path";
            main.replaceChildren(heading, text, link);
        }
    } catch {
        window.learningUnavailable = true;
        const main = document.querySelector("main");
        if (main) {
            main.replaceChildren(); const heading = document.createElement("h1"); heading.textContent = "Learning preferences unavailable";
            const text = document.createElement("p"); text.textContent = "Saved preferences could not be read. Your records have not been deleted or replaced.";
            const a = document.createElement("a"); a.href = "../student/profile.html"; a.textContent = "Review profile settings"; main.append(heading, text, a);
        }
    }
    }
    verify();
    window.addEventListener('pageshow', event => { if (event.persisted) verify(); });
})();
