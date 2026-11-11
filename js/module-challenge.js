(() => {
    "use strict";
    if (window.learningUnavailable) return;
    const card = document.getElementById("level-challenge");
    function render() {
        const challenge = window.levelChallenges.get(window.pythonCurriculum.id, window.pythonCurriculum.selected.id);
        card.hidden = !challenge;
        const actions = document.getElementById("level-challenge-actions"); actions.replaceChildren();
        if (!challenge) return;
        document.getElementById("level-challenge-title").textContent = challenge.title;
        document.getElementById("level-challenge-description").textContent = challenge.description;
        const url = window.levelChallenges.assignmentUrl(challenge.assignmentUrl);
        if (url) {
            const link = document.createElement("a");
            link.textContent = "Play on Kahoot!"; link.className = "button button-outline";
            link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
            link.setAttribute("aria-label", "Play on Kahoot! (opens in a new tab)"); actions.append(link);
        } else {
            const pending = document.createElement("p");
            pending.className = "dashboard-meta"; pending.textContent = "Challenge coming soon"; actions.append(pending);
        }
    }
    render(); window.addEventListener("pageshow", render);
})();
