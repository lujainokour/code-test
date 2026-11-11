/* Lesson / level completion moments (lesson.html, level-assessment.html).
   Listens to the existing "learning-progress-changed" event that cmStorage fires when progress is
   saved, and compares real progress before and after. Never writes storage and never changes
   grading: lesson.js / level-assessment.js are untouched.
   - New lesson completed  -> small moment: animated check + the page's existing next link becomes
                              the single primary action.
   - New level completed   -> larger moment above the quiz page's existing next-step button
                              (still the only primary action), plus light confetti.
   Placed-out levels are never "completed" (course.completed), so they never trigger a moment. */
(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const course = window.pythonCurriculum;
    if (!course) return;
    // Pure: what became complete between two saved progress objects.
    function diff(prev, now, c = course) {
        const lessons = p => new Set((p?.lessons || []).filter(id => c.allLessons.some(l => l.id === id)));
        const levels = p => new Set(c.levels.filter(l => c.completed(l, p || { lessons: [], tasks: [], assessments: {} })).map(l => l.id));
        const a = lessons(prev), b = lessons(now), la = levels(prev), lb = levels(now);
        return { lessons: [...b].filter(id => !a.has(id)), levels: [...lb].filter(id => !la.has(id)) };
    }
    const read = () => { try { return course.read(); } catch { return null; } };
    const kit = () => window.interactionKit;
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    function moment(kind, title, detail) {
        const box = el("div", undefined, `cm-moment cm-moment-${kind}`); box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
        if (kit()) box.append(kit().checkMark());
        const text = el("div", undefined, "cm-moment-text"); text.append(el(kind === "level" ? "h2" : "strong", title), el("p", detail));
        box.append(text); return box;
    }
    function lessonMoment(id) {
        const panel = document.querySelector(".lesson-next-panel"); if (!panel) return null;
        panel.querySelector(".cm-moment")?.remove();
        const lesson = course.allLessons.find(l => l.id === id);
        const box = moment("lesson", "Lesson complete", `“${lesson?.title || id}” is saved on this device.`);
        const heading = panel.querySelector("h2"); if (heading) heading.after(box); else panel.prepend(box);
        // One primary next action: the page's own next link (the Complete button is hidden by lesson.js).
        const next = document.getElementById("next-activity");
        if (next && !next.hidden) { next.classList.remove("button-outline"); next.classList.add("button-primary"); }
        return box;
    }
    function levelMoment(levelId) {
        const level = course.levels.find(l => l.id === levelId);
        const host = document.getElementById("assessment-next-step") || document.getElementById("assessment-result")?.parentElement;
        if (!host) return null;
        host.querySelector(".cm-moment")?.remove();
        const box = moment("level", `Level ${levelId} complete!`, `${level?.title || "This level"}: every lesson done and the quiz passed.`);
        host.prepend(box);
        kit()?.confetti({ pieces: 60, duration: 1400 });
        return box;
    }
    let before = read();
    function onChange() {
        const now = read(); if (!before || !now) { before = now; return; }
        const changes = diff(before, now); before = now;
        // Run after the page script has finished updating its own UI for this save.
        setTimeout(() => { if (changes.levels.length) levelMoment(changes.levels[0]); else if (changes.lessons.length) lessonMoment(changes.lessons[0]); }, 0);
    }
    window.addEventListener("learning-progress-changed", onChange);
    window.completionMoments = Object.freeze({ diff, lessonMoment, levelMoment });
})();
