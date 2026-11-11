(() => {
    if (window.learningUnavailable) return;
    const course = window.pythonCurriculum;
    const list = document.getElementById('roadmap-list');
    const initial = [...list.querySelectorAll('.roadmap-card')];
    const projectCard = initial[3];
    course.levels.slice(3).forEach(level => {
        const card = initial[1].cloneNode(true);
        card.querySelector('.roadmap-number').textContent = String(level.id).padStart(2, '0');
        card.querySelector('h2').textContent = level.title;
        card.querySelector('.roadmap-content > p:not(.eyebrow)').textContent = level.goal;
        card.querySelector('[data-locked-level]')?.removeAttribute('data-locked-level');
        list.insertBefore(card, projectCard);
    });
    const cards = [...list.querySelectorAll('.roadmap-card')];
    document.getElementById('track-title').textContent = `${course.name} · ${course.levels.length} levels`;
    projectCard.querySelector('.roadmap-number').textContent = '★';
    function render() {
        try {
            const progress = course.read();
            course.levels.forEach((level, index) => {
                const card = cards[index]; card.querySelector("h2").textContent = level.title; card.querySelector(".roadmap-content > p:not(.eyebrow)").textContent = level.goal;
                const done = course.completed(level, progress), out = course.placedOut(level, progress), entitled = window.subscriptionStore.canAccessLevel(level.id), open = course.available(level, progress) && entitled;
                card.classList.toggle('roadmap-locked', !open);
                card.classList.toggle('roadmap-placed-out', out);
                card.querySelector('.eyebrow').textContent = `LEVEL ${level.id} / ${done ? 'COMPLETED' : out ? 'PLACED OUT — NOT COMPLETED' : open ? 'AVAILABLE' : 'LOCKED'}`;
                const old = card.querySelector('a, button');
                const action = document.createElement(open || !entitled ? 'a' : 'button'); action.className = 'button button-outline';
                action.textContent = done ? 'Review level' : out ? 'Review placed-out level' : open ? 'Continue level' : 'View requirements';
                if (!entitled) { action.href = 'subscription.html'; action.textContent = 'View Premium access'; }
                else if (open) action.href = `module.html?level=${level.id}`;
                else action.addEventListener('click', () => {
                    document.getElementById('unlock-title').textContent = `Unlock ${level.title}`;
                    document.getElementById('unlock-description').textContent = 'Complete the earlier levels and score at least 70% on each quiz. Coding tasks provide additional practice.';
                    document.getElementById('unlock-dialog').showModal();
                });
                old.replaceWith(action);
            });
            const project = projectCard, open = course.levels.slice(0, 3).every(level => course.completed(level, progress));
            project.querySelector('.eyebrow').textContent = open ? 'FOUNDATIONS PROJECT / AVAILABLE' : 'FOUNDATIONS PROJECT / COMPLETE LEVELS 1–3';
            const link = document.createElement('a'); link.className = 'button button-outline';
            link.href = open ? 'workspace.html?task=task-manager' : `module.html?level=${course.current(progress).id}`;
            link.textContent = open ? 'Build your task manager' : 'Continue learning';
            project.querySelector('button, a').replaceWith(link);
        } catch (error) { document.querySelector('.workspace-intro').textContent = error.message; }
    }
    document.getElementById('close-unlock').addEventListener('click', () => document.getElementById('unlock-dialog').close());
    render(); window.addEventListener('pageshow', render);
})();
