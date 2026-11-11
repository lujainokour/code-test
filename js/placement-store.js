/* Account/language-owned placement records. This module never writes learning progress. */
(() => {
    "use strict";
    const storage = window.cmStorage, banks = window.placementBanks, engine = window.placementEngine;
    const attemptKey = "codementor-demo-placement", previousKey = "codementor-demo-placement-recommendation", choiceKey = "codementor-demo-placement-choice";
    const copy = value => value === null ? null : JSON.parse(JSON.stringify(value));
    function capture() { return { owner: storage.captureOwner(), language: storage.activeLanguage() }; }
    function assertContext(context, write = false) {
        if (!context || (write && context.owner === "guest")) throw Error("Sign in as a student to save placement.");
        storage.assertOwner(context.owner);
        if (storage.activeLanguage() !== context.language) throw Error("Your learning language changed. Reload before saving placement.");
    }
    function bank(context = capture()) { assertContext(context); const value = banks.get(context.language); if (!value) throw Error("Placement is not available for this language."); return engine.validateBank(value); }
    function read(context = capture()) {
        assertContext(context);
        const raw = storage.getItem(attemptKey);
        if (raw === null) return null;
        let value; try { value = JSON.parse(raw); } catch { throw Error("Saved placement could not be read. Existing records were kept."); }
        return copy(engine.validateAttempt(bank(context), value));
    }
    function write(key, value, context) { assertContext(context, true); storage.setItem(key, JSON.stringify(value)); }
    function expected(snapshot, context) {
        const current = read(context);
        if (JSON.stringify(current) !== snapshot) throw Error("This placement attempt changed. Reload before continuing. Nothing was overwritten.");
        return current;
    }
    function begin(context, retake = false) {
        assertContext(context, true); const content = bank(context), current = read(context);
        if (current && !retake) return current;
        if (retake && current?.status !== "submitted") throw Error("Finish the current attempt before starting a retake.");
        // Keep the last submitted recommendation while a new attempt is in progress.
        if (retake) write(previousKey, current, context);
        const attempt = { version: 1, id: "placement-" + crypto.randomUUID(), revision: 1, languageId: context.language, bankVersion: content.version, status: "in-progress", currentQuestion: 0, answers: Array(content.questions.length).fill(null), startedAt: new Date().toISOString() };
        write(attemptKey, attempt, context); return copy(attempt);
    }
    function save(values, snapshot, context) {
        assertContext(context, true); const current = expected(snapshot, context);
        if (current?.status !== "in-progress") throw Error("Only an active placement attempt can be edited.");
        const next = { ...current, answers: copy(values.answers), currentQuestion: values.currentQuestion, revision: (current.revision || 0) + 1 };
        engine.validateAttempt(bank(context), next); write(attemptKey, next, context); return copy(next);
    }
    function submit(snapshot, context) {
        assertContext(context, true); const current = expected(snapshot, context);
        if (current?.status !== "in-progress" || current.answers.some(answer => answer === null)) throw Error("Answer every question or choose unsure before submitting.");
        const next = { ...current, status: "submitted", submittedAt: new Date().toISOString(), revision: (current.revision || 0) + 1 };
        engine.validateAttempt(bank(context), next, true); write(attemptKey, next, context); return copy(next);
    }
    function recommendation(context = capture()) {
        const current = read(context);
        if (current?.status === "submitted") return engine.evaluate(bank(context), current);
        const raw = storage.getItem(previousKey);
        if (raw === null) return null;
        let previous; try { previous = JSON.parse(raw); } catch { throw Error("Previous placement recommendation is unreadable. Existing records were kept."); }
        return engine.evaluate(bank(context), previous);
    }
    function choice(context = capture()) {
        assertContext(context); if (context.owner === "guest") return null;
        const raw = storage.getItem(choiceKey); if (raw === null) return null;
        let value; try { value = JSON.parse(raw); } catch { throw Error("Saved placement choice could not be read. Existing records were kept."); }
        const content = bank(context);
        if (value?.version !== 1 || value.languageId !== context.language || value.bankVersion !== content.version || value.ruleVersion !== engine.policy.version || !["recommended", "override"].includes(value.mode) || !Number.isInteger(value.startLevel) || value.startLevel < 1 || value.startLevel > Math.min(content.levelCount, engine.policy.maxSkip + 1) || (value.mode === "override" && value.startLevel !== 1) || typeof value.attemptId !== "string") throw Error("Saved placement choice is invalid. Existing records were kept.");
        return copy(value);
    }
    function apply(snapshot, context, override = false, confirmed = false) {
        assertContext(context, true);
        if (override && confirmed !== true) throw Error("Confirm the override before starting from Level 1.");
        const current = expected(snapshot, context), result = engine.evaluate(bank(context), current);
        const value = { version: 1, ruleVersion: engine.policy.version, languageId: context.language, bankVersion: bank(context).version, startLevel: override ? 1 : result.recommendedStart, mode: override ? "override" : "recommended", attemptId: current.id || "legacy-python-v1", selectedAt: new Date().toISOString() };
        write(choiceKey, value, context); return copy(value);
    }
    window.placementStore = Object.freeze({ capture, bank, read, begin, save, submit, recommendation, choice,
        applyRecommended: (snapshot, context) => apply(snapshot, context), overrideFromOne: (snapshot, confirmed, context) => apply(snapshot, context, true, confirmed) });
})();
