/* Loaded synchronously in <head>, before CSS: select the palette before first paint. */
(() => {
    "use strict";
    // The current design uses the light palette. Preserve any historical choice.
    let current = "light";
    function apply(value) {
        current = "light";
        document.documentElement.dataset.theme = current;
        window.dispatchEvent(new CustomEvent("codementor:themechange", { detail: current }));
    }
    apply("light");
    window.codeMentorTheme = Object.freeze({
        get: () => current,
        set(value) {
            if (value !== "light") return false;
            apply(value);
            return true;
        }
    });
})();
