/* The browser and seed generator consume this same curriculum contract. */
(() => {
    "use strict";
    const entries = new Map();
    function register(course) {
        if (!course || !/^[a-z][a-z0-9-]*$/.test(course.id) || !course.name || !["python", "javascript"].includes(course.runner) || !Array.isArray(course.levels) || !course.levels.length || !course.tasks) throw Error("Invalid curriculum schema");
        const lessonIds = new Set(), taskIds = new Set();
        for (const level of course.levels) {
            if (!Number.isInteger(level.id) || level.lessons.length !== 4 || level.quiz.length !== 4 || !Array.isArray(level.tasks)) throw Error("Invalid curriculum level");
            for (const lesson of level.lessons) {
                if (!lesson.id || lessonIds.has(lesson.id) || !Array.isArray(lesson.paragraphs) || !Array.isArray(lesson.options) || !Number.isInteger(lesson.correct)) throw Error("Invalid curriculum lesson");
                lessonIds.add(lesson.id);
            }
            for (const id of level.tasks) {
                const task = course.tasks[id];
                if (!task || taskIds.has(id) || typeof task.starter !== "string" || !Array.isArray(task.tests) || !task.tests.length || typeof task.solution !== "string") throw Error("Invalid curriculum task");
                taskIds.add(id);
            }
        }
        if (entries.has(course.id)) throw Error("Duplicate curriculum id");
        entries.set(course.id, Object.freeze(course));
    }
    window.curriculumRegistry = Object.freeze({ register, get: id => entries.get(id), all: () => [...entries.values()] });
})();
