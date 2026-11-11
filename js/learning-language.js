/* Account-owned language choices. Scoped progress writes reject stale language pages.
   The compact language switcher lives in the top bar (and the mobile sidebar drawer). */
(() => {
    "use strict";
    const storage = window.cmStorage, catalog = window.languageCatalog;
    const appRoot = new URL("../", document.currentScript.src);
    const stylesheet = new URL("css/student-premium.css", appRoot).href;
    if (![...(document.querySelectorAll?.('link[rel="stylesheet"]') || [])].some(l => l.href === stylesheet)) {
        const style = document.createElement("link"); style.rel = "stylesheet"; style.href = stylesheet; document.head.append(style);
    }
    const selectedAtLoad = (() => { try { return storage.activeLanguage(); } catch { return null; } })();
    let ownerAtLoad; try { ownerAtLoad = storage.captureOwner(); } catch { /* Existing guards report unavailable identity. */ }
    const TOAST_KEY = "codementor-language-toast";
    let switching = false;
    const node = (tag, text, cls) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; if (cls) value.className = cls; return value; };
    const statusLabel = entry => entry.status === "ready" ? "Ready" : entry.status === "preview" ? "Preview" : "Coming soon";
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
    // Same rules as the dashboard: no saved choice → "none", unreadable preferences → "error".
    function selectionState() {
        try {
            const onboardingRaw = storage.getItem("codementor-demo-onboarding");
            if (onboardingRaw !== null) {
                const p = JSON.parse(onboardingRaw);
                if (!p || typeof p !== "object" || Array.isArray(p) || !catalog.has(p.language) || !["beginner", "basics", "practising"].includes(p.experience) || !["foundations", "problem-solving", "projects"].includes(p.goal)) throw Error();
                return { state: "selected", entry: catalog.get(storage.activeLanguage()) };
            }
            if (storage.getItem("codementor-demo-language") !== null) return { state: "selected", entry: catalog.get(storage.activeLanguage()) };
            return { state: "none", entry: null };
        } catch { return { state: "error", entry: null }; }
    }
    // ---- Honest availability panel (coming-soon languages) with the local "Notify me" flag ----
    function notifyControls(id) {
        const notification = node("button", "Notify me on this device", "button button-outline"); notification.type = "button";
        const status = node("p", "This is a local interest flag, not an email subscription.", "form-message"); status.setAttribute("role", "status");
        try { if (JSON.parse(storage.getItem("codementor-demo-language-notifications") || "{}")[id]) notification.textContent = "Interest saved on this device"; } catch { status.textContent = "Saved interest flags could not be read. They were kept."; notification.disabled = true; }
        notification.addEventListener("click", () => {
            try {
                storage.assertOwner(ownerAtLoad);
                const flags = JSON.parse(storage.getItem("codementor-demo-language-notifications") || "{}");
                if (!flags || typeof flags !== "object" || Array.isArray(flags)) throw Error("Saved interest flags are invalid.");
                storage.setItem("codementor-demo-language-notifications", JSON.stringify({ ...flags, [id]: true }));
                notification.textContent = "Interest saved on this device"; status.textContent = "Saved locally. No email or external notification was sent.";
            } catch (error) { status.textContent = error.message; }
        });
        return [notification, status];
    }
    function availabilityDialog(entry, returnFocus) {
        document.querySelector("dialog.lang-availability")?.remove();
        const dialog = node("dialog", undefined, "lang-availability"); dialog.setAttribute("aria-labelledby", "lang-availability-title");
        const title = node("h2", `${entry.name}: coming soon`); title.id = "lang-availability-title";
        const close = node("button", "Close", "button button-outline lang-availability-close"); close.type = "button";
        const catalogue = node("a", "View the language catalogue", "lang-availability-link"); catalogue.href = new URL(`pages/public/languages.html?language=${entry.id}`, appRoot).href;
        dialog.append(node("p", "NOT AVAILABLE YET", "lang-availability-eyebrow"), title, node("p", `${entry.description} This language has no published built-in learning path or runnable tasks yet, so it cannot be your active language. Your current progress is kept.`), ...notifyControls(entry.id), catalogue, close);
        const done = () => { dialog.close(); dialog.remove(); returnFocus?.focus(); };
        close.addEventListener("click", done);
        dialog.addEventListener("cancel", event => { event.preventDefault(); done(); });
        document.body.append(dialog);
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
        close.focus();
        return dialog;
    }
    // ---- Compact, keyboard-accessible switcher (listbox pattern) ----
    function switcher(parent, where) {
        if (!parent || parent.querySelector(`.lang-switch[data-where="${where}"]`)) return null;
        const uid = `lang-switch-${where}`, sel = selectionState();
        const wrap = node("div", undefined, "lang-switch"); wrap.dataset.where = where;
        const button = node("button", undefined, "lang-switch-button"); button.type = "button";
        button.setAttribute("aria-haspopup", "listbox"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", `${uid}-list`);
        const name = node("span", sel.state === "error" ? "Unavailable" : sel.entry ? sel.entry.name : "Not selected", "lang-switch-name");
        if (where === "topbar") name.id = "selected-language";
        const chip = node("span", sel.entry ? statusLabel(sel.entry) : sel.state === "error" ? "Check settings" : "Choose", "lang-chip");
        chip.dataset.status = sel.entry?.status || "none";
        button.setAttribute("aria-label", `Learning language: ${name.textContent}${sel.entry ? `, ${statusLabel(sel.entry)}` : ""}. Change language`);
        button.append(node("span", "Language", "lang-switch-kicker"), name, chip, node("span", "▾", "lang-switch-caret"));
        const list = node("ul", undefined, "lang-switch-list"); list.id = `${uid}-list`; list.setAttribute("role", "listbox"); list.tabIndex = -1; list.hidden = true;
        list.setAttribute("aria-label", "Choose a learning language");
        const options = catalog.entries.map(entry => {
            const li = node("li", undefined, "lang-option"); li.id = `${uid}-${entry.id}`; li.setAttribute("role", "option"); li.dataset.language = entry.id;
            li.setAttribute("aria-selected", String(sel.entry?.id === entry.id));
            const c = node("span", statusLabel(entry), "lang-chip"); c.dataset.status = entry.status;
            li.append(node("span", entry.name, "lang-option-name"), c);
            if (entry.status !== "ready") li.append(node("span", "Opens availability details", "lang-option-note"));
            li.addEventListener("click", () => choose(entry));
            li.addEventListener("mousemove", () => activate(options.indexOf(li)));
            return li;
        });
        list.append(...options);
        const message = node("p", "", "lang-switch-message"); message.setAttribute("role", "status");
        let active = -1;
        function activate(index) {
            active = (index + options.length) % options.length;
            options.forEach((o, i) => o.classList.toggle("is-active", i === active));
            list.setAttribute("aria-activedescendant", options[active].id);
            options[active].scrollIntoView?.({ block: "nearest" });
        }
        function open() {
            list.hidden = false; button.setAttribute("aria-expanded", "true"); wrap.classList.add("is-open");
            activate(Math.max(0, options.findIndex(o => o.getAttribute("aria-selected") === "true")));
            list.focus();
        }
        function close(focus) { list.hidden = true; button.setAttribute("aria-expanded", "false"); wrap.classList.remove("is-open"); if (focus) button.focus(); }
        function choose(entry) {
            if (entry.status !== "ready") { close(false); availabilityDialog(entry, button); return; }
            if (sel.entry?.id === entry.id) { close(true); return; }
            try {
                switching = true;
                const from = sel.entry?.status === "ready" ? sel.entry.name : null;
                select(entry.id, ownerAtLoad);
                try { sessionStorage.setItem(TOAST_KEY, JSON.stringify({ to: entry.id, from, owner: ownerAtLoad })); } catch { /* the toast is optional */ }
                location.reload();
            } catch (error) { switching = false; close(true); message.textContent = error.message; }
        }
        button.addEventListener("click", () => (list.hidden ? open() : close(true)));
        button.addEventListener("keydown", event => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); open(); if (event.key === "ArrowUp") activate(options.length - 1); } });
        list.addEventListener("keydown", event => {
            const keys = { ArrowDown: () => activate(active + 1), ArrowUp: () => activate(active - 1), Home: () => activate(0), End: () => activate(options.length - 1),
                Enter: () => choose(catalog.get(options[active].dataset.language)), " ": () => choose(catalog.get(options[active].dataset.language)), Escape: () => close(true) };
            if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
            else if (event.key === "Tab") close(false);
            else if (/^[a-z]$/i.test(event.key)) { const i = options.findIndex((o, n) => n > active && o.textContent.toLowerCase().startsWith(event.key.toLowerCase())); const j = i >= 0 ? i : options.findIndex(o => o.textContent.toLowerCase().startsWith(event.key.toLowerCase())); if (j >= 0) activate(j); }
        });
        document.addEventListener("click", event => { if (!wrap.contains(event.target)) close(false); });
        if (sel.state === "error") button.title = "Saved preferences could not be read. Existing records were kept.";
        wrap.append(button, list, message);
        return wrap;
    }
    function mount() {
        const topbar = document.querySelector(".workspace-topbar");
        if (topbar) { const s = switcher(topbar, "topbar"); if (s) { const pill = topbar.querySelector(".account-pill, .sp-account"); if (pill) pill.before(s); else topbar.append(s); } }
        const sidebar = document.getElementById("workspace-sidebar");
        if (sidebar) { const s = switcher(sidebar, "sidebar"); if (s) { const nav = sidebar.querySelector("nav"); if (nav) nav.before(s); else sidebar.prepend(s); } }
    }
    function toast() {
        let note = null;
        try { note = JSON.parse(sessionStorage.getItem(TOAST_KEY) || "null"); sessionStorage.removeItem(TOAST_KEY); } catch { note = null; }
        if (!note || note.to !== selectedAtLoad || note.owner !== ownerAtLoad) return;
        const to = catalog.get(note.to)?.name; if (!to) return;
        const box = node("div", `Switched to ${to}.${note.from && note.from !== to ? ` Your ${note.from} progress is saved.` : ""}`, "cm-toast");
        box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
        document.body.append(box);
        setTimeout(() => box.classList.add("is-leaving"), 5000);
        setTimeout(() => box.remove(), 5600);
    }
    function unavailable() {
        const main = document.querySelector("main"); if (!main) return;
        let id, entry;
        try { id = storage.activeLanguage(); entry = catalog.get(id); } catch { /* Show a readable error without replacing saved data. */ }
        main.replaceChildren(node("h1", entry ? `${entry.name}: coming soon` : "Learning language unavailable"), node("p", entry ? "This language has no published built-in learning path or runnable tasks yet. Your other language progress is kept." : "Saved language preferences could not be read. Existing records were kept."));
        if (entry) main.append(...notifyControls(id));
        const python = node("button", "Continue Python", "button button-primary"); python.type = "button";
        python.addEventListener("click", () => { try { select("python", ownerAtLoad); location.assign("dashboard.html"); } catch (error) { main.append(node("p", error.message)); } });
        main.append(python);
        const inline = switcher(main, "inline"); if (inline) main.append(inline);
    }
    function invalidate() {
        const preferencesPage = /\/(onboarding|profile)\.html$/.test(location.pathname);
        try { if (storage.captureOwner() === ownerAtLoad && (preferencesPage || storage.activeLanguage() === selectedAtLoad)) return; } catch { /* Fail closed. */ }
        window.pythonRunner?.stop(); window.javascriptRunner?.stop();
        window.learningUnavailable = true;
        if (switching) return; // this tab is reloading into the newly chosen language
        const main = document.querySelector("main");
        if (main) main.hidden = true;
        if (main && !document.getElementById("language-change-notice")) {
            const notice = node("section", undefined, "dashboard-card"); notice.id = "language-change-notice"; notice.setAttribute("role", "status");
            const link = node("a", "Open the current learning dashboard", "button button-primary"); link.href = "dashboard.html";
            notice.append(node("h1", "Account or language changed"), node("p", "Reload to continue. Previous account and language records were kept."), link);
            main.before(notice);
        }
    }
    window.learningLanguage = Object.freeze({ select, selector: mount, switcher, selectionState, availabilityDialog, id: () => storage.activeLanguage(), ownerAtLoad });
    window.showLanguageUnavailable = unavailable;
    const requestedChoice = new URLSearchParams(location.search).get("chooseLanguage");
    if (requestedChoice && location.pathname.endsWith("/dashboard.html")) {
        try { select(requestedChoice, ownerAtLoad); location.replace("dashboard.html"); return; }
        catch { /* Invalid choices never overwrite stored language; the switcher reports availability. */ }
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
    // The shell rebuilds the top bar and sidebar after this script, so mount once parsing has finished.
    if (/\/(dashboard|learning-path|progress)\.html$/.test(location.pathname)) {
        // Deferred scripts run while readyState is "interactive"; DOMContentLoaded follows the shell script.
        if (document.readyState !== "complete") document.addEventListener("DOMContentLoaded", () => { mount(); toast(); }, { once: true });
        else { mount(); toast(); }
    }
    window.addEventListener("storage", event => { if (event.key === null || event.key?.includes("codementor-demo-language") || event.key === "codementor-profile-v1") invalidate(); });
    window.addEventListener("learning-language-changed", invalidate);
    window.addEventListener("student-account-changed", invalidate);
    window.addEventListener("pageshow", invalidate);
    window.addEventListener("focus", invalidate);
})();
