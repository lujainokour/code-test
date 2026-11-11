/* Shared decorative animation for account screens. */
(() => {
    "use strict";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.querySelectorAll(".auth-video-media").forEach(container => {
        const video = container.querySelector("video");
        const toggle = container.querySelector(".auth-video-toggle");
        let userPaused = reducedMotion.matches;
        video.muted = true;
        function syncButton() {
            const label = video.paused ? "Play animation" : "Pause animation";
            toggle.textContent = label;
            toggle.setAttribute("aria-label", label);
        }
        function updatePlayback() {
            if (document.hidden || userPaused) {
                video.pause();
            } else {
                video.play().catch(syncButton);
            }
            syncButton();
        }
        video.autoplay = !userPaused;
        video.addEventListener("play", syncButton);
        video.addEventListener("pause", syncButton);
        video.addEventListener("error", () => { toggle.hidden = true; });
        toggle.addEventListener("click", () => {
            userPaused = !video.paused;
            updatePlayback();
        });
        reducedMotion.addEventListener("change", () => {
            userPaused = reducedMotion.matches;
            updatePlayback();
        });
        document.addEventListener("visibilitychange", updatePlayback);
        window.addEventListener("pageshow", updatePlayback);
        updatePlayback();
    });
})();
