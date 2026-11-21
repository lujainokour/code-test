/* Learning-progress repository (Slice 1). The ONLY place that touches the stored progress record.
   Demo adapter: reads and writes through the existing cmStorage facade (owner- and language-scoped localStorage),
   keeping the exact same key and JSON shape as before, plus one additive field, `revision`.
   A future API adapter will expose the same two methods (read, update) over HTTP:
     GET  /me/progress?language=...                      -> { progress, revision }
     POST /me/... commands carrying `expectedRevision`   -> 409 { error: { code: "conflict" } } when stale

   Revision rules
     - A record without `revision` (written before this slice) has revision 0. Nothing is rewritten on read.
     - Every successful update stores revision + 1 and returns it.
     - update() always re-reads the newest stored record immediately before applying the change, so a change made
       in another tab is never overwritten by a stale copy. Passing `expectedRevision` additionally refuses
       the write (code "conflict") when the stored revision differs, for screens that hold a snapshot.
     - An unreadable or invalid stored record is never replaced: the call fails with code "unavailable". */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else { root.cmData = Object.assign(root.cmData || {}, { createLearningRepository: api.createLearningRepository }); if (root.cmStorage && root.cmDomain?.learning) root.cmData.learning = api.createLearningRepository({ storage: root.cmStorage, domain: root.cmDomain.learning }); }
})(typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";
    const DEFAULT_KEY = "codementor-demo-learning";
    const UNREADABLE = "Saved progress could not be read. Your records were kept.";
    const CONFLICT = "Your progress changed in another tab or window. Reload this page to see the latest version. Nothing was overwritten.";

    function createLearningRepository({ storage, domain, key = DEFAULT_KEY }) {
        if (!storage || !domain) throw new Error("A storage facade and the learning domain are required.");
        const revisionOf = progress => (Number.isInteger(progress.revision) && progress.revision >= 0 ? progress.revision : 0);

        /** @returns {{progress: object, revision: number}} the newest stored record (or an empty one) */
        function read({ strict = false, unreadableMessage = UNREADABLE } = {}) {
            const raw = storage.getItem(key);
            let value;
            if (raw === null || raw === undefined) value = domain.emptyProgress();
            else {
                try { value = JSON.parse(raw); } catch { throw new domain.DomainError("unavailable", unreadableMessage); }
            }
            if (!domain.validateProgress(value, strict ? "strict" : "basic")) throw new domain.DomainError("unavailable", unreadableMessage);
            return { progress: value, revision: revisionOf(value) };
        }

        /**
         * Apply a pure change to the newest stored record and save it.
         * @param {(progress: object) => object} change  pure function (see js/domain/learning.js apply* helpers)
         * @param {{expectedRevision?: number, strict?: boolean, unreadableMessage?: string, beforeWrite?: () => void}} options
         *        beforeWrite runs after the change is computed and before anything is stored (owner / access checks).
         */
        function update(change, options = {}) {
            const { progress, revision } = read(options);
            if (options.expectedRevision !== undefined && options.expectedRevision !== revision) {
                throw new domain.DomainError("conflict", CONFLICT, { expectedRevision: options.expectedRevision, actualRevision: revision });
            }
            const next = change(progress);
            if (!next || typeof next !== "object" || Array.isArray(next)) throw new domain.DomainError("validation", "The change produced no progress record. Nothing was saved.");
            const saved = { ...next, revision: revision + 1 };
            options.beforeWrite?.();
            storage.setItem(key, JSON.stringify(saved));
            return { progress: saved, revision: saved.revision };
        }

        return Object.freeze({ key, read, update });
    }

    return Object.freeze({ createLearningRepository, UNREADABLE, CONFLICT });
});
