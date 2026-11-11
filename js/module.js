(() => {
    if (window.learningUnavailable) return;
    const course = window.pythonCurriculum, level = course.selected;
    const byId = id => document.getElementById(id);
    const node = (tag, text) => { const element = document.createElement(tag); element.textContent = text; return element; };
    const taskNames = { 'student-profile': 'Create a student profile', receipt: 'Build a receipt', 'grade-checker': 'Check a grade', 'sum-numbers': 'Sum a range', 'list-summary': 'Summarise a list', 'task-manager': 'Build a task manager' };
    Object.assign(taskNames, Object.fromEntries(Object.values(course.tasks).map(task => [task.id, task.title])));
    function render() {
        try {
            const progress = course.read();
            byId('workspace-message').textContent = course.placedOut(level, progress) ? 'This level is placed out, not completed. Review it any time; complete its real lessons, quiz and required tasks to earn completion credit.' : '';
            document.querySelector('main h1').textContent = level.title;
            document.querySelector('main > .eyebrow').textContent = `LEVEL ${level.id} / ${course.name.toUpperCase()}`;
            document.querySelector('.workspace-intro').textContent = level.goal;
            const lists = document.querySelectorAll('.module-activities'); lists.forEach(list => list.replaceChildren());
            level.lessons.forEach((lesson, index) => {
                const item = node('li', ''), info = node('div', '');
                info.append(node('h3', `${index + 1}. ${lesson.title}`), node('p', lesson.intro), node('span', `About ${lesson.minutes} minutes`));
                const link = node('a', progress.lessons.includes(lesson.id) ? 'Review' : 'Start');
                link.className = 'button button-outline'; link.href = `lesson.html?lesson=${lesson.id}`; link.dataset.lessonLink = lesson.id;
                item.append(info, link); lists[0].append(item);
            });
            level.tasks.forEach(id => {
                const item = node('li', ''), info = node('div', '');
                info.append(node('h3', taskNames[id]), node('p', `Run your ${course.name} solution and pass all automated checks.`));
                const link = node('a', progress.tasks.includes(id) ? 'Review passed task' : 'Practise');
                link.className = 'button button-outline'; link.href = `workspace.html?task=${id}`; link.dataset.taskLink = id;
                item.append(info, link); lists[1].append(item);
            });
            const goals = document.querySelector('.module-aside .roadmap-requirements'); goals.replaceChildren();
            level.objectives.forEach(objective => goals.append(node('li', objective)));
            const progression = document.getElementById('level-progression');
            if (progression) progression.textContent = level.progression;
            const remaining = level.lessons.filter(lesson => !progress.lessons.includes(lesson.id));
            byId('lesson-progress').textContent = `Lessons: ${level.lessons.length - remaining.length} / ${level.lessons.length}`;
            byId('task-progress').textContent = `Practice tasks passed: ${level.tasks.filter(id => progress.tasks.includes(id)).length} / ${level.tasks.length}`;
            const score = progress.assessments[level.id]?.score;
            byId('assessment-progress').textContent = Number.isFinite(score) ? `Quiz best score: ${score}% / ${score >= 70 ? 'Passed' : 'Try again'}` : 'Quiz: not attempted';
            byId('assessment-link').href = `level-assessment.html?level=${level.id}`;
            byId('assessment-link').hidden = remaining.length > 0;
            byId('assessment-locked').hidden = remaining.length === 0;
            byId('assessment-note').textContent = remaining.length ? `Complete ${remaining.length} remaining lessons to unlock the quiz.` : level.progression;
            byId('remaining-requirements').replaceChildren(...remaining.map(lesson => node('li', lesson.title)));
        } catch (error) {
            byId('workspace-message').textContent = error.message;
            byId('assessment-link').hidden = true;
        }
    }
    byId('assessment-locked').addEventListener('click', () => byId('requirements-dialog').showModal());
    byId('close-requirements').addEventListener('click', () => byId('requirements-dialog').close());
    render(); window.addEventListener('pageshow', render);
})();
