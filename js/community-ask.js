/* "Ask the community" on lesson, coding workspace and code review pages. Links only: it reads the
   page (title, task id, current code) and opens the community composer prefilled. It never posts;
   the student edits and publishes. The draft is handed over in this tab's sessionStorage, tied to
   the signed-in account and used once. Lesson, workspace and review logic are untouched. */
(() => {
    "use strict";
    const KEY = "codementor-community-draft";
    const $ = id => document.getElementById(id);
    const PLACES = [
        { page: "lesson", anchor: "lesson-mentor-link", kind: "lesson", param: "lesson", title: () => $("lesson-title")?.textContent, code: () => "" },
        { page: "workspace", anchor: "mentor-link", kind: "task", param: "task", title: () => $("task-title")?.textContent, code: () => $("code-editor")?.value || "" },
        { page: "code-review", anchor: "review-mentor-link", kind: "task", param: "task", title: () => ($("review-task-name")?.textContent || "").trim() || "Code review",
          code: () => { const text = $("review-code")?.textContent || ""; return /^No saved draft|^Saved draft unavailable/.test(text.trim()) ? "" : text; } }
    ];
    const clean = (text, max) => String(text || "").replace(/\s+/g, " ").trim().slice(0, max);
    function draft(place) {
        const account = window.platformStore.student();
        let language = "python";
        try { language = window.cmStorage.activeLanguage() || "python"; } catch { language = "python"; }
        const id = new URLSearchParams(location.search).get(place.param) || "";
        const name = clean(place.title(), 100) || (place.kind === "lesson" ? "this lesson" : "this task");
        const code = String(place.code() || "").slice(0, 4000);
        const related = /^[a-z0-9-]{1,60}$/.test(id) ? { kind: place.kind, id, title: name } : null;
        return {
            owner: account.email.trim().toLowerCase(), at: Date.now(),
            channel: ["python", "javascript"].includes(language) ? language : "help",
            title: clean(`${place.kind === "lesson" ? "Question about" : "Help with"}: ${name}`, 140),
            body: "What I tried:\n\nWhat happened:\n\nWhat I expected:\n",
            code: code.trim() ? code : "", language: ["python", "javascript"].includes(language) ? language : "text",
            tags: place.kind === "lesson" ? "lesson" : "task", related
        };
    }
    function mount() {
        for (const place of PLACES) {
            const anchor = $(place.anchor);
            if (!anchor || $("community-ask-link")) continue;
            const link = document.createElement("a");
            link.id = "community-ask-link"; link.className = "button button-outline community-ask-link";
            link.href = "../services/community.html?compose=1"; link.textContent = "Ask the community";
            link.setAttribute("aria-describedby", "community-ask-note");
            const note = document.createElement("span"); note.id = "community-ask-note"; note.className = "community-ask-note";
            note.textContent = place.kind === "lesson" ? "Opens a prefilled question you can edit. Nothing is posted until you publish." : "Opens a prefilled question with your current code. You can edit or remove it; nothing is posted until you publish.";
            link.addEventListener("click", () => {
                try { sessionStorage.setItem(KEY, JSON.stringify(draft(place))); }
                catch { /* Without a draft the composer simply opens empty. */ }
            });
            anchor.after(link, note);
        }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
    window.communityAsk = Object.freeze({ KEY, draft, mount, PLACES });
})();
