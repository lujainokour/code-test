/* Getting-started checklist for new or low-progress students (Dashboard).
   compute() is pure and uses only real saved state, for the ACTIVE language:
     language   ready language chosen (preferences/language key)
     placement  OPTIONAL: submitted placement attempt for this language
     lesson     >= 1 lesson really completed (placement never writes lessons)
     run        >= 1 saved test run of a coding task (taskResults[].submittedAt)
     task       >= 1 coding task with every test passing (progress.tasks)
     community  approved member of any community channel
   The celebration (rocket + light confetti, < 2 s) plays once per account; the "seen" flag
   lives in the per-account delight store. Afterwards the card is a compact "Setup complete" line. */
(() => {
    "use strict";
    const STEPS = [
        { id: "language", title: "Choose your language", href: "../student/onboarding.html", action: "Choose a language", needsLanguage: false },
        { id: "placement", title: "Take the placement check", optional: true, href: "../student/placement-intro.html", action: "Take placement", needsLanguage: true },
        { id: "lesson", title: "Finish your first lesson", href: "../student/learning-path.html", action: "Open the learning path", needsLanguage: true },
        { id: "run", title: "Run your first code", href: "../student/practice.html", action: "Open a coding task", needsLanguage: true },
        { id: "task", title: "Pass your first coding task", href: "../student/practice.html", action: "Practise", needsLanguage: true },
        { id: "community", title: "Join the community", href: "../services/community.html", action: "Request to join", needsLanguage: false }
    ];
    function compute(input) {
        const done = {
            language: input.ready === true,
            placement: input.placementState === "submitted",
            lesson: input.lessonsDone > 0,
            run: input.ranCode === true,
            task: input.tasksDone > 0,
            community: input.community === "approved"
        };
        const steps = STEPS.map(step => {
            let state = done[step.id] ? "done" : step.needsLanguage && !input.ready ? "locked" : "todo";
            if (step.id === "placement" && !done.placement && input.placementAvailable === false) state = "unavailable";
            let note = step.id === "community" && input.community === "pending" ? "Request sent, waiting for approval" : state === "locked" ? "Choose a ready language first" : state === "unavailable" ? "No placement check for this language yet" : "";
            // Slice 2: experienced students are told the optional check can spare them repeating levels (never required).
            if (step.id === "placement" && state === "todo" && ["basics", "practising"].includes(input.experience)) note = "Recommended for you: it can save you from repeating levels";
            return { ...step, state, note };
        });
        const required = steps.filter(s => !s.optional);
        const current = required.find(s => s.state === "todo");
        if (current) current.state = "current";
        const doneCount = required.filter(s => s.state === "done").length;
        return { steps, doneCount, total: required.length, percent: Math.round(doneCount / required.length * 100), allDone: doneCount === required.length };
    }
    // Real inputs from the dashboard model (active language, signed-in account).
    function inputFrom(model) {
        const tasks = new Set(model.course?.levels?.flatMap(l => l.tasks) || []);
        const runs = Object.entries(model.progress?.taskResults || {}).filter(([id, r]) => tasks.has(id) && Number.isFinite(Date.parse(r?.submittedAt)));
        let community = "unavailable";
        try {
            const m = window.communityMembership, owner = model.account?.email;
            if (m && owner) {
                const states = Object.keys(m.catalogue).map(c => m.state(c, owner));
                community = states.includes("approved") ? "approved" : states.includes("pending") ? "pending" : "none";
            }
        } catch { community = "unavailable"; }
        return {
            ready: Boolean(model.ready && !model.learningError), placementState: model.placement?.state,
            placementAvailable: Boolean(window.placementBanks?.get?.(model.course?.id)),
            lessonsDone: model.totals?.lessonsDone || 0, ranCode: runs.length > 0, tasksDone: model.totals?.tasksDone || 0, community,
            experience: model.preferences?.confirmed ? model.preferences.experience : undefined
        };
    }
    const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const icon = { done: "✓", current: "●", todo: "○", locked: "🔒", unavailable: "–" };
    const label = { done: "Done", current: "Next", todo: "To do", locked: "Locked", unavailable: "Not available" };
    function compact(host, result) {
        host.hidden = false; host.className = "sp-card sp-checklist is-complete"; host.dataset.state = "complete";
        host.replaceChildren(el("p", `✓ Setup complete · ${result.total} of ${result.total} getting-started steps done.`, "sp-checklist-done"));
    }
    function render(model, host = document.getElementById("getting-started")) {
        if (!host) return null;
        if (!model.account) { host.hidden = true; return null; }
        const result = compute(inputFrom(model));
        const kit = window.interactionKit, seen = kit?.seenStore(model.account.email.trim().toLowerCase());
        const celebrated = seen?.get("checklistCelebrated") === true;
        if (result.allDone && celebrated) { compact(host, result); return result; }
        host.hidden = false; host.className = "sp-card sp-checklist"; host.dataset.state = result.allDone ? "celebrating" : "open";
        const head = el("div", undefined, "sp-card-head");
        const title = el("h2", "Getting started", "sp-card-title"); title.id = "gs-title";
        head.append(title, el("p", `${result.doneCount} of ${result.total} done`, "sp-small"));
        const bar = el("progress", undefined, "sp-progress"); bar.max = 100; bar.value = result.percent; bar.setAttribute("aria-label", `Getting started: ${result.doneCount} of ${result.total} steps done`);
        const list = el("ol", undefined, "sp-checklist-steps");
        for (const step of result.steps) {
            const li = el("li", undefined, "sp-step"); li.dataset.step = step.id; li.dataset.state = step.state;
            li.append(el("span", icon[step.state], "sp-step-icon"));
            const body = el("div", undefined, "sp-step-body");
            body.append(el("span", `${step.title}${step.optional ? " (optional)" : ""}`, "sp-step-title"), el("span", step.note || label[step.state], "sp-step-state"));
            li.append(body);
            if (step.state === "current" || (step.state === "todo") || (step.optional && step.state === "todo")) { const a = el("a", step.action, "sp-text-link"); a.href = step.href; li.append(a); }
            if (step.state === "current") li.setAttribute("aria-current", "step");
            list.append(li);
        }
        const line = window.cmDomain?.onboarding?.guidanceLine({ experience: model.preferences?.experience, goal: model.preferences?.goal, confirmed: model.preferences?.confirmed, trackReady: Boolean(model.ready) });
        host.replaceChildren(head, ...(line ? [el("p", line, "sp-small sp-guidance")] : []), bar, list);
        if (result.allDone && !celebrated) {
            // Once per account: mark first so a reload during the animation never replays it.
            const saved = seen?.set("checklistCelebrated", true);
            if (saved) {
                kit.toast("Setup complete! You finished every getting-started step.", { tone: "celebrate" });
                const animated = kit.rocket() | kit.confetti({ duration: 1500 });
                setTimeout(() => compact(host, result), animated ? 1800 : 0);
            }
        }
        return result;
    }
    window.gettingStarted = Object.freeze({ STEPS, compute, inputFrom, render });
})();
