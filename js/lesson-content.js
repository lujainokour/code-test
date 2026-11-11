/* Add saved sources to original lessons, or render a namespaced local lesson preview. */
(() => {
    if (window.learningUnavailable) return;
    const params = new URLSearchParams(location.search);
    const courseId = params.get("course"), levelId = params.get("level"), lessonId = params.get("lesson");
    const store = window.courseContentStore;
    const message = document.getElementById("workspace-message");
    function node(tag, text) { const element = document.createElement(tag); element.textContent = text; return element; }
    function sourceKey(value) {
        const url = new URL(value);
        // YouTube share/watch/embed forms identify the same video; ignore tracking.
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        if (["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
            const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || (url.pathname.startsWith("/embed/") ? url.pathname.slice(7) : null);
            if (id) return `youtube:${id}`;
        }
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(key => url.searchParams.delete(key));
        return url.href;
    }
    function sources(resources, builtInId, bank = window.pythonLessonSources) {
        const host = document.getElementById("lesson-external-sources"); host.replaceChildren();
        const videoSection = document.getElementById("lesson-video-section");
        const videoHost = document.getElementById("lesson-topic-videos");
        videoHost.replaceChildren();
        videoSection.hidden = true;
        const merged = new Map();
        (bank?.[builtInId] || []).forEach(resource => {
            if (store.externalUrl(resource.url)) merged.set(sourceKey(resource.url), { ...resource, origin: "Core reference" });
        });
        resources.forEach(resource => {
            if (!store.externalUrl(resource.url)) return;
            const key = sourceKey(resource.url), core = merged.get(key);
            // Display local titles/URLs without rewriting either source record.
            merged.set(key, { ...core, ...resource, origin: core?.origin?.includes("Core") ? "Core reference + local admin source" : "Local admin source" });
        });
        if (!merged.size) { host.append(node("p", "No external learning sources have been added to this lesson.")); return; }
        const list = document.createElement("ul"); list.className = "content-source-list";
        merged.forEach(resource => {
            const hostname = new URL(resource.url).hostname.toLowerCase().replace(/^www\./, "");
            const isVideo = resource.type?.toLowerCase() === "video" || ["youtube.com", "m.youtube.com", "youtu.be", "vimeo.com"].includes(hostname);
            if (isVideo) {
                const card = document.createElement("div"); card.className = "lesson-topic-video";
                card.append(node("h4", resource.title));
                card.append(node("p", resource.language || "Language not specified"));
                const watch = node("a", "Watch explanation / شاهد الشرح");
                watch.className = "button button-outline";
                watch.href = resource.url; watch.target = "_blank"; watch.rel = "noopener noreferrer";
                watch.setAttribute("aria-label", `Watch ${resource.title} (opens in a new tab)`);
                card.append(watch); videoHost.append(card); videoSection.hidden = false;
                return;
            }
            const item = document.createElement("li"); const a = node("a", `${resource.title} ↗`);
            a.href = resource.url; a.target = "_blank"; a.rel = "noopener noreferrer";
            a.setAttribute("aria-label", `${resource.title} (external source, opens in a new tab)`); item.append(a);
            item.append(node("p", `${resource.type || "External resource"} | ${resource.language || "Language not specified"} | ${resource.origin}`));
            list.append(item);
        });
        if (list.children.length) host.append(list);
        else host.append(node("p", "Video explanations are available above, beside the lesson content."));
    }
    function fail(text) { message.textContent = text; message.classList.add("is-error"); }
    if (!courseId && !levelId) {
        const originalId = lessonId || "variables";
        sources([], originalId);
        try {
            const data = store.readContent(); const courses = store.readCourses(); const resources = [];
            courses.filter(course => (course.language || course.languageId) === window.cmStorage.activeLanguage()).forEach(course => {
                const levels = Object.hasOwn(data.courses, course.id) ? data.courses[course.id].levels : [];
                levels.forEach(level => (level.lessons || []).filter(lesson => lesson.builtInLessonId === (lessonId || "variables") && lesson.status === "published").forEach(lesson => resources.push(...(lesson.resources || []))));
            }); sources(resources, originalId);
        } catch { fail("Saved external sources could not be read. The original lesson remains available and saved data was not changed."); }
        return;
    }
    if (courseId) {
        try {
            const context = store.context(courseId, levelId);
            const content = store.readContent();
            const levels = content.courses[courseId]?.levels || [];
            const levelNumber = levels.findIndex(value => value.id === context.level.id) + 1;
            if (levelNumber > 5 && !window.subscriptionStore.canAccessLevel(levelNumber)) {
                window.learningUnavailable = true;
                const main = document.querySelector("main");
                main.replaceChildren(node("p", "PREMIUM ACCESS"), node("h1", "Continue beyond Level 5"),
                    node("p", "This level is part of the Premium plan. Your Free access through Level 5 is unchanged."),
                    node("a", "Compare Free and Premium plans", "button button-primary"));
                main.querySelector("a").href = "subscription.html";
                return;
            }
        } catch (error) {
            window.learningUnavailable = true;
            const main = document.querySelector("main");
            main.replaceChildren(node("h1", "Plan access could not be checked"), node("p", error.message + " Your progress has not been changed."),
                node("a", "Review plans", "button button-outline"));
            main.querySelector("a").href = "subscription.html";
            return;
        }
    }
    window.savedLessonMode = true;
    const complete = document.getElementById("complete-lesson"); complete.disabled = true;
    document.querySelector(".lesson-next-actions").append(document.getElementById("next-activity"));
    document.getElementById("knowledge-form").closest("section").hidden = true;
    document.getElementById("topic-exercise").hidden = true;
    document.getElementById("topic-objectives").closest("section").hidden = true;
    document.getElementById("lesson-mentor-link").closest("section").hidden = true;
    const back = document.querySelector(".module-back"); back.href = `../public/course.html?id=${encodeURIComponent(courseId || "")}`; back.textContent = "← Back to local course";
    try {
        const current = store.context(courseId, levelId);
        const lesson = current.lessons.find(value => value.id === lessonId);
        if (!lesson || (lesson.status !== "published" && params.get("preview") !== "1")) throw new Error("This lesson is a draft or could not be found.");
        const localSchema = window.curriculumRegistry.get(current.course.language || current.course.languageId);
        const builtin = localSchema?.levels.flatMap(level => level.lessons).find(value => value.id === lesson.builtInLessonId);
        document.getElementById("lesson-title").textContent = lesson.title;
        document.title = `${lesson.title} | CodeMentor AI`;
        document.getElementById("lesson-intro").textContent = lesson.summary || builtin?.intro || "Local lesson content.";
        document.getElementById("lesson-position").textContent = `${current.course.title} / ${current.level.title} · ${lesson.minutes || 10} MINUTES`;
        document.getElementById("concept-title").textContent = "Platform lesson content";
        const explanation = document.getElementById("lesson-explanation"); explanation.replaceChildren();
        (lesson.content ? lesson.content.split(/\n\s*\n/) : builtin?.paragraphs || ["No platform explanation has been added."]).forEach(text => explanation.append(node("p", text)));
        document.getElementById("lesson-code").textContent = lesson.code || builtin?.code || "No code example added.";
        document.getElementById("lesson-output").textContent = lesson.output || builtin?.output || "No prepared output added.";
        sources(lesson.resources || [], builtin?.id, localSchema?.sources);
        const nav = document.getElementById("lesson-navigation"); nav.replaceChildren();
        current.lessons.filter(value => value.status === "published" || params.get("preview") === "1").forEach(value => {
            const a = node("a", value.title); a.href = `../student/lesson.html?course=${encodeURIComponent(courseId)}&level=${encodeURIComponent(levelId)}&lesson=${encodeURIComponent(value.id)}${params.get("preview") === "1" ? "&preview=1" : ""}`;
            if (value.id === lessonId) a.setAttribute("aria-current", "page"); nav.append(a);
        });
        const next = document.getElementById("next-activity"); next.href = back.href; next.textContent = "Back to local course";
        document.getElementById("completion-status").textContent = "Local content preview. Completion is not included in built-in learning progress.";
        document.getElementById("lesson-next-description").textContent = "Return to your local course to choose another available lesson.";
        complete.hidden = true;
        if (params.get("preview") === "1") fail("Admin preview of locally saved content. Drafts are not published to students or a server.");
    } catch (error) {
        document.getElementById("lesson-title").textContent = "Lesson content not available";
        document.getElementById("lesson-intro").textContent = "Return to the course to choose an available lesson.";
        document.getElementById("next-activity").hidden = true;
        fail(`${error.message} Saved records have not been changed.`);
    }
})();
