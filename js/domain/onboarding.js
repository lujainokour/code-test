/* Pure onboarding rules (Slice 2). No DOM, no storage, no network, no clock: callers pass `now` and every input.
   Everything here is deterministic and based on data the student actually gave or produced; nothing is predicted.

   Stored shapes (see js/data/onboarding-repository.js)
     record  "codementor-demo-onboarding"        { language, experience, goal, completedAt?, updatedAt?, answersDefaulted? }   (unchanged contract)
     draft   "codementor-demo-onboarding-draft"  { language?, experience?, goal?, updatedAt }                                  (new, partial answers)

   Completion state (derived, never guessed)
     completed / explicit   record has a valid completedAt (the student pressed "Show my plan")
     completed / legacy     a valid record without completedAt (saved before this slice): treated as completed, never asked to repeat
     in_progress            no record, but a draft holds at least one valid answer: the student can resume
     not_started            nothing saved
     unreadable             a record exists but is invalid: nothing is replaced and the page says so
   `answersDefaulted: true` marks a record that was created from a language choice alone (experience and goal were filled
   with defaults by the languages page); its guidance is not personalised until the student confirms the two answers. */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.cmDomain = Object.assign(root.cmDomain || {}, { onboarding: api });
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";
    const EXPERIENCES = Object.freeze({ beginner: "Just starting", basics: "Know the basics", practising: "Have some practice" });
    const GOALS = Object.freeze({ foundations: "Build foundations", "problem-solving": "Solve problems", projects: "Build projects" });
    const FIELDS = Object.freeze(["language", "experience", "goal"]);
    const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const isoOk = value => typeof value === "string" && Number.isFinite(Date.parse(value));

    function validAnswer(field, value, knownLanguage) {
        if (field === "language") return typeof value === "string" && Boolean(knownLanguage(value));
        if (field === "experience") return typeof value === "string" && Object.hasOwn(EXPERIENCES, value);
        if (field === "goal") return typeof value === "string" && Object.hasOwn(GOALS, value);
        return false;
    }
    /** Only the answers that are valid; everything else is ignored (never repaired). */
    function validAnswers(source, knownLanguage) {
        const out = {};
        if (!isObject(source)) return out;
        for (const field of FIELDS) if (validAnswer(field, source[field], knownLanguage)) out[field] = source[field];
        return out;
    }
    const isComplete = answers => FIELDS.every(field => answers[field] !== undefined);

    function statusOf({ record, draft, knownLanguage }) {
        const draftAnswers = validAnswers(draft, knownLanguage), draftCount = Object.keys(draftAnswers).length;
        if (record !== null && record !== undefined) {
            if (!isObject(record) || !isComplete(validAnswers(record, knownLanguage))) {
                return { status: "unreadable", source: "none", answered: 0, missing: [...FIELDS], completedAt: null, confirmed: false, draftAnswers };
            }
            const explicit = isoOk(record.completedAt), defaulted = record.answersDefaulted === true;
            return { status: "completed", source: explicit ? "explicit" : "legacy", answered: 3, missing: [], completedAt: explicit ? record.completedAt : null, confirmed: !defaulted, draftAnswers };
        }
        const missing = FIELDS.filter(field => draftAnswers[field] === undefined);
        return { status: draftCount ? "in_progress" : "not_started", source: "none", answered: draftCount, missing, completedAt: null, confirmed: false, draftAnswers };
    }

    /** Draft after one answer. Invalid answers are rejected, never stored. */
    function applyDraftAnswer(draft, field, value, now, knownLanguage) {
        if (!validAnswer(field, value, knownLanguage)) throw new Error("Choose one of the listed options.");
        return { ...validAnswers(draft, knownLanguage), [field]: value, updatedAt: now };
    }
    /** The stored record after the student finishes. Unknown fields of an earlier record are kept; completedAt is the FIRST completion. */
    function completeRecord(previous, answers, now, knownLanguage) {
        const valid = validAnswers(answers, knownLanguage);
        if (!isComplete(valid)) throw new Error("Choose a language, your experience and your learning goal.");
        const base = isObject(previous) ? { ...previous } : {};
        delete base.answersDefaulted;
        return { ...base, ...valid, completedAt: isoOk(base.completedAt) ? base.completedAt : now, updatedAt: now };
    }

    // ---- starting plan ----
    const GOAL_LINES = Object.freeze({
        foundations: "Your goal is to build foundations: take the lessons in order and pass each level quiz before moving on.",
        "problem-solving": "Your goal is to solve problems: after each lesson, open a coding task in Practice; tasks are where problem-solving is trained.",
        projects: "Your goal is to build projects: the path builds toward the final project, so keep the coding tasks of each level."
    });
    const EXPERIENCE_LINES = Object.freeze({
        beginner: "You are just starting, so the path begins at Level 1 and nothing is skipped.",
        basics: "You know the basics, so a short placement check can show which early levels you can place out of.",
        practising: "You already have some practice, so a placement check lets you avoid repeating what you know."
    });
    /**
     * input: { track: {id, name, ready}, experience, goal, confirmed, lessonsDone,
     *          placement: { available, state: "missing"|"in-progress"|"submitted", applied?, maxSkip?, threshold? },
     *          alternatives: [{id, name}] }
     * output: { headline, reasons[], primary, secondary[<=2], trackNotice }  (actions use keys the page maps to links)
     */
    function planFor(input) {
        const { track, experience, goal, placement = {}, alternatives = [], lessonsDone = 0, confirmed = true } = input;
        const reasons = [];
        if (!track.ready) {
            const names = alternatives.map(item => item.name);
            return {
                headline: `${track.name} is coming soon`,
                reasons: [`${track.name} has no full learning path or placement check yet. It stays listed so you can follow its availability.`, names.length ? `${names.join(" and ")} ${names.length === 1 ? "is" : "are"} ready to learn today.` : "No track is ready yet."],
                primary: { id: "see-availability", label: `See ${track.name} availability`, target: "language-info", language: track.id },
                secondary: alternatives.slice(0, 2).map(item => ({ id: "switch-track", label: `Start with ${item.name}`, target: "switch-language", language: item.id })),
                trackNotice: `${track.name}: coming soon`
            };
        }
        if (confirmed) { reasons.push(EXPERIENCE_LINES[experience]); reasons.push(GOAL_LINES[goal]); }
        else reasons.push("Tell us your experience and goal to personalise this plan. Until then the path starts at Level 1.");
        const goalSecondary = confirmed && goal === "problem-solving" ? [{ id: "browse-practice", label: "Browse coding tasks", target: "practice" }]
            : confirmed && goal === "projects" ? [{ id: "see-project", label: "See the final project", target: "project" }] : [];
        const trim = list => list.slice(0, 2);
        const placementOffer = placement.available && placement.state === "missing";
        let primary, secondary = [];
        if (lessonsDone > 0) {
            primary = { id: "continue", label: "Continue learning", target: "dashboard" };
            secondary = goalSecondary;
        } else if (placement.state === "submitted") {
            primary = placement.applied ? { id: "continue", label: "Open your learning path", target: "learning-path" } : { id: "review-placement", label: "Review your placement result", target: "placement-results" };
            secondary = goalSecondary;
        } else if (placement.state === "in-progress") {
            primary = { id: "resume-placement", label: "Resume your placement check", target: "placement-question" };
            secondary = [{ id: "start-level-1", label: "Start at Level 1 instead", target: "learning-path" }];
        } else if (confirmed && placementOffer && (experience === "basics" || experience === "practising")) {
            primary = { id: "placement", label: "Take the placement check", target: "placement-intro" };
            secondary = [{ id: "start-level-1", label: "Skip it and start at Level 1", target: "learning-path" }, ...goalSecondary];
            if (placement.maxSkip) reasons.push(`The check can place you out of at most ${placement.maxSkip} levels, and you can always review them.`);
        } else {
            primary = { id: "start-level-1", label: "Start your first lesson", target: "learning-path" };
            secondary = [...(placementOffer ? [{ id: "placement", label: "Take the optional placement check", target: "placement-intro" }] : []), ...goalSecondary];
        }
        return { headline: `Your starting plan for ${track.name}`, reasons, primary, secondary: trim(secondary), trackNotice: null };
    }

    /** One sentence for the dashboard. Null when the answers are not confirmed (no personalisation is claimed). */
    function guidanceLine({ experience, goal, confirmed = true, trackReady = true }) {
        if (!confirmed || !trackReady || !Object.hasOwn(EXPERIENCES, experience) || !Object.hasOwn(GOALS, goal)) return null;
        const tail = { foundations: "lessons in order, one level quiz at a time", "problem-solving": "a coding task after each lesson", projects: "keep every coding task, they lead to the final project" }[goal];
        const head = { beginner: "Starting from Level 1", basics: "A placement check can shorten the start", practising: "Placement first, then skip what you know" }[experience];
        return `Your plan: ${head}; ${tail}.`;
    }

    // ---- placement explanation (the scoring itself is untouched: js/placement-engine.js) ----
    /** evaluation: result of placementEngine.evaluate: { recommendedStart, topicScores[{level, topic, correct, total, percentage, meetsThreshold}], threshold, maxSkip } */
    function explainPlacement(evaluation) {
        const { recommendedStart: start, topicScores, threshold, maxSkip } = evaluation;
        const levels = [...new Set(topicScores.map(score => score.level))].sort((a, b) => a - b);
        const pct = value => `${Math.round(value)}%`;
        const lines = [];
        for (const level of levels.filter(value => value < start)) lines.push(`Level ${level}: every topic reached ${threshold}% or more, so you are placed out of it.`);
        const atStart = topicScores.filter(score => score.level === start);
        const missed = atStart.filter(score => !score.meetsThreshold);
        if (start - 1 >= maxSkip && levels.includes(start)) {
            lines.push(`At most ${maxSkip} levels can be placed out, so you start at Level ${start}${missed.length ? "" : ", even though its topics also reached the threshold"}.`);
        } else if (missed.length) {
            for (const score of missed) lines.push(`Level ${start}: ${score.topic} scored ${pct(score.percentage)}, below the ${threshold}% needed, so you start here.`);
        } else if (levels.includes(start)) lines.push(`Level ${start}: this is the first level where the placement does not skip further.`);
        const headline = start === 1 ? "Why Level 1?" : `Why Level ${start}?`;
        const summary = start === 1 ? `Nothing is placed out: at least one Level 1 topic is below ${threshold}%.` : `${start === 2 ? "Level 1 is" : `Levels ${Array.from({ length: start - 1 }, (_, index) => index + 1).join(", ")} are`} placed out, not completed. Their lessons and quizzes stay available.`;
        return { headline, summary, lines };
    }

    return Object.freeze({ EXPERIENCES, GOALS, FIELDS, validAnswer, validAnswers, isComplete, statusOf, applyDraftAnswer, completeRecord, planFor, guidanceLine, explainPlacement });
});
