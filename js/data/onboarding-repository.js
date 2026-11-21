/* Onboarding repository (Slice 2). The only code that reads or writes the onboarding record and its draft.
   Demo adapter over the owner-scoped cmStorage facade. A future API adapter exposes the same methods:
     GET/PUT /me/profile            (record)        POST /me/onboarding/draft (draft)        POST /me/onboarding/complete

   Safety rules
     - The main record keeps its key and its three-field contract; completedAt/updatedAt are additive.
     - Partial answers live ONLY in the draft key, so no other page ever sees a half-finished record.
     - An unreadable main record is never replaced (complete() refuses). A corrupt draft is ignored and replaced
       by the next answer (a draft is a convenience, not a record).
     - Unknown fields of an existing record survive every write. */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else { root.cmData = Object.assign(root.cmData || {}, { createOnboardingRepository: api.createOnboardingRepository }); if (root.cmStorage && root.cmDomain?.onboarding && root.languageCatalog) root.cmData.onboarding = api.createOnboardingRepository({ storage: root.cmStorage, domain: root.cmDomain.onboarding, knownLanguage: id => root.languageCatalog.has(id) }); }
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";
    const RECORD_KEY = "codementor-demo-onboarding", DRAFT_KEY = "codementor-demo-onboarding-draft";
    const UNREADABLE = "Saved preferences could not be read. Existing records were kept.";

    function createOnboardingRepository({ storage, domain, knownLanguage, recordKey = RECORD_KEY, draftKey = DRAFT_KEY }) {
        if (!storage || !domain || !knownLanguage) throw new Error("A storage facade, the onboarding domain and a language check are required.");
        const parse = raw => { if (raw === null || raw === undefined) return { value: null, bad: false }; try { return { value: JSON.parse(raw), bad: false }; } catch { return { value: null, bad: true }; } };

        /** @returns {{record: object|null, draft: object|null, state: object, draftCorrupt: boolean}} */
        function read() {
            const rawRecord = parse(storage.getItem(recordKey)), rawDraft = parse(storage.getItem(draftKey));
            const record = rawRecord.bad ? {} : rawRecord.value;            // {} makes the state "unreadable" and blocks overwriting
            const state = domain.statusOf({ record, draft: rawDraft.bad ? null : rawDraft.value, knownLanguage });
            return { record: rawRecord.bad ? undefined : rawRecord.value, draft: rawDraft.bad ? null : rawDraft.value, state, draftCorrupt: rawDraft.bad };
        }

        /** Store one answer of an unfinished onboarding. */
        function saveDraftAnswer(field, value, { now, beforeWrite } = {}) {
            const { draft, state } = read();
            if (state.status === "unreadable") throw new Error(UNREADABLE);
            const next = domain.applyDraftAnswer(draft, field, value, now, knownLanguage);
            beforeWrite?.();
            storage.setItem(draftKey, JSON.stringify(next));
            return read();
        }

        /** Student with a finished onboarding edits one answer: same behaviour as before this slice (saved immediately). */
        function updateAnswer(field, value, { now, beforeWrite } = {}) {
            const { record, state } = read();
            if (state.status !== "completed") throw new Error(UNREADABLE);
            if (!domain.validAnswer(field, value, knownLanguage)) throw new Error("Choose one of the listed options.");
            const next = { ...record, [field]: value, updatedAt: now };
            beforeWrite?.();
            storage.setItem(recordKey, JSON.stringify(next));
            return read();
        }

        /** The student finished: write the record (keeping unknown fields), then drop the draft. */
        function complete(answers, { now, beforeWrite } = {}) {
            const { record, state } = read();
            if (state.status === "unreadable") throw new Error(UNREADABLE);
            const next = domain.completeRecord(record, answers, now, knownLanguage);
            beforeWrite?.();
            storage.setItem(recordKey, JSON.stringify(next));
            try { storage.removeItem(draftKey); } catch { /* a stale draft is harmless: a completed record wins */ }
            return read();
        }

        return Object.freeze({ recordKey, draftKey, read, saveDraftAnswer, updateAnswer, complete });
    }
    return Object.freeze({ createOnboardingRepository, UNREADABLE });
});
