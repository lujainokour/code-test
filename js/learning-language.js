/* Account-owned language choices. Scoped progress writes reject stale language pages. */
(() => {
    "use strict";
    const storage = window.cmStorage, catalog = window.languageCatalog;
    const style = document.createElement("link"); style.rel = "stylesheet"; style.href = new URL("../css/learning-language.css", document.currentScript.src).href; document.head.append(style);
    const selectedAtLoad = (() => { try { return storage.activeLanguage(); } catch { return null; } })();
    let ownerAtLoad; try { ownerAtLoad = storage.captureOwner(); } catch { /* Existing guards report unavailable identity. */ }
    const node = (tag, text, cls) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (cls) value.className = cls; return value; };
    function select(id, expectedOwner) {
        storage.assertOwner(expectedOwner);
        if (expectedOwner === "guest") throw Error("Sign in to save a learning language.");
        if (!catalog.has(id)) throw Error("Choose a language from the catalog.");
        const raw = storage.getItem("codementor-demo-onboarding");
        const previous = raw === null ? null : JSON.parse(raw);
        if (previous !== null && (!previous || typeof previous !== "object" || Array.isArray(previous) || !catalog.has(previous.language))) throw Error("Saved preferences are unreadable. Existing records were kept.");
        storage.assertOwner(expectedOwner);
        if (previous) storage.setItem("codementor-demo-onboarding", JSON.stringify({ ...previous, language: id }));
        storage.setItem("codementor-demo-language", JSON.stringify(id));
        window.dispatchEvent(new CustomEvent("learning-language-changed"));
    }
    function selector(parent) {
        if (!parent || parent.querySelector("#my-language")) return;
        const box = node("section", undefined, "dashboard-card language-choice"); box.style.marginBlock = "20px";
        const label = node("label", "My language"); label.htmlFor = "my-language";
        const input = node("select"); input.id = "my-language"; input.name = "language"; input.style.maxWidth = "100%";
        catalog.populateSelect(input, true);
        try { input.value = storage.activeLanguage(); } catch { input.disabled = true; }
        const status = node("p", "Each language keeps its own progress on this account.", "form-message"); status.setAttribute("role", "status");
        const button = node("button", "Use this language", "button button-outline"); button.type = "button";
        button.addEventListener("click", () => {
            try { select(input.value, ownerAtLoad); location.assign("dashboard.html"); }
            catch (error) { status.textContent = error.message; }
        });
        box.append(label, input, button, status); parent.prepend(box);
    }
    function unavailable() {
        const main = document.querySelector("main"); if (!main) return;
        let id, entry;
        try { id = storage.activeLanguage(); entry = catalog.get(id); } catch { /* Show a readable error without replacing saved data. */ }
        main.replaceChildren(node("h1", entry ? `${entry.name}: coming soon` : "Learning language unavailable"), node("p", entry ? "This language has no published built-in learning path or runnable tasks yet. Your other language progress is kept." : "Saved language preferences could not be read. Existing records were kept."));
        if (entry) {
            const notification = node("button", "Notify me on this device", "button button-outline"); notification.type = "button";
            const status = node("p", "This is a local interest flag, not an email subscription.", "form-message"); status.setAttribute("role", "status");
            try { if (JSON.parse(storage.getItem("codementor-demo-language-notifications") || "{}")[id]) notification.textContent = "Interest saved on this device"; } catch { status.textContent = "Saved interest flags could not be read. They were kept."; notification.disabled = true; }
            notification.addEventListener("click", () => {
                try { storage.assertOwner(ownerAtLoad); const flags = JSON.parse(storage.getItem("codementor-demo-language-notifications") || "{}"); if (!flags || typeof flags !== "object" || Array.isArray(flags)) throw Error("Saved interest flags are invalid."); storage.setItem("codementor-demo-language-notifications", JSON.stringify({ ...flags, [id]: true })); notification.textContent = "Interest saved on this device"; status.textContent = "Saved locally. No email or external notification was sent."; }
                catch (error) { status.textContent = error.message; }
            }); main.append(notification, status);
        }
        const python = node("button", "Continue Python", "button button-primary"); python.type = "button";
        python.addEventListener("click", () => { try { select("python", ownerAtLoad); location.assign("dashboard.html"); } catch (error) { main.append(node("p", error.message)); } });
        main.append(python); selector(main);
    }
    function invalidate() {
        const preferencesPage = /\/(onboarding|profile)\.html$/.test(location.pathname);
        try { if (storage.captureOwner() === ownerAtLoad && (preferencesPage || storage.activeLanguage() === selectedAtLoad)) return; } catch { /* Fail closed. */ }
        window.pythonRunner?.stop(); window.javascriptRunner?.stop();
        window.learningUnavailable = true;
        const main = document.querySelector("main");
        if (main) main.hidden = true;
        if (main && !document.getElementById("language-change-notice")) {
            const notice = node("section", undefined, "dashboard-card"); notice.id = "language-change-notice"; notice.setAttribute("role", "status");
            const link = node("a", "Open the current learning dashboard", "button button-primary"); link.href = "dashboard.html";
            notice.append(node("h1", "Account or language changed"), node("p", "Reload to continue. Previous account and language records were kept."), link);
            main.before(notice);
        }
    }
    window.learningLanguage = Object.freeze({ select, selector, id: () => storage.activeLanguage(), ownerAtLoad });
    window.showLanguageUnavailable = unavailable;
    const requestedChoice = new URLSearchParams(location.search).get("chooseLanguage");
    if (requestedChoice && location.pathname.endsWith("/dashboard.html")) {
        try { select(requestedChoice, ownerAtLoad); location.replace("dashboard.html"); return; }
        catch { /* Invalid choices never overwrite stored language; the selector reports availability. */ }
    }
    // Defer scripts run after parsing but before page renderers insert private/user content.
    // Translate only static Python labels; code samples come from the selected schema.
    if (selectedAtLoad === "javascript" && /\/(dashboard|learning-path|module|lesson|level-assessment|workspace|code-review|progress|learning-report|certificates|project|mentor)\.html$/.test(location.pathname)) {
        document.title = document.title.replaceAll("Python", "JavaScript");
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const labels = [];
        while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest("script,style,code,pre,textarea")) labels.push(walker.currentNode);
        labels.forEach(text => { text.textContent = text.textContent.replaceAll("Python", "JavaScript").replaceAll("PYTHON", "JAVASCRIPT"); });
    }
    if (/\/(dashboard|learning-path)\.html$/.test(location.pathname)) selector(document.querySelector("main"));
    window.addEventListener("storage", event => { if (event.key === null || event.key?.includes("codementor-demo-language") || event.key === "codementor-profile-v1") invalidate(); });
    window.addEventListener("learning-language-changed", invalidate);
    window.addEventListener("student-account-changed", invalidate);
    window.addEventListener("pageshow", invalidate);
    window.addEventListener("focus", invalidate);
})();
