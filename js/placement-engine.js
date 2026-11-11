/* Pure placement policy. Completion and certificate scoring are deliberately separate. */
(function (root) {
    "use strict";
    const policy = Object.freeze({ version: 1, threshold: 75, maxSkip: 2 });
    function validateBank(bank) {
        if (!bank || typeof bank.id !== "string" || !Number.isInteger(bank.version) || !Number.isInteger(bank.levelCount) || bank.levelCount < 1 || !Array.isArray(bank.questions) || !bank.questions.length) throw Error("Placement bank is unavailable.");
        const ids = new Set();
        for (const question of bank.questions) {
            if (!question.id || ids.has(question.id) || !Number.isInteger(question.level) || question.level < 1 || question.level > bank.levelCount || !question.topic || !Array.isArray(question.options) || question.options.length < 2 || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) throw Error("Placement bank is invalid.");
            ids.add(question.id);
        }
        return bank;
    }
    function validateAttempt(bank, attempt, submitted = false) {
        validateBank(bank);
        if (!attempt || attempt.version !== 1 || !["in-progress", "submitted"].includes(attempt.status) || (submitted && attempt.status !== "submitted") || !Array.isArray(attempt.answers) || attempt.answers.length !== bank.questions.length) throw Error("Saved placement attempt is invalid. Existing records were kept.");
        if ((attempt.languageId !== undefined && attempt.languageId !== bank.id) || (attempt.languageId === undefined && bank.id !== "python") || (attempt.bankVersion !== undefined && attempt.bankVersion !== bank.version)) throw Error("Placement language or bank version changed. Existing records were kept.");
        if (attempt.status === "in-progress" && (!Number.isInteger(attempt.currentQuestion) || attempt.currentQuestion < 0 || attempt.currentQuestion >= bank.questions.length)) throw Error("Saved placement position is invalid.");
        if (attempt.id !== undefined && (typeof attempt.id !== "string" || !attempt.id)) throw Error("Saved placement identity is invalid.");
        if (attempt.revision !== undefined && (!Number.isInteger(attempt.revision) || attempt.revision < 1)) throw Error("Saved placement revision is invalid.");
        attempt.answers.forEach((answer, index) => {
            if (answer === null && attempt.status === "in-progress") return;
            if (answer === "unsure") return;
            if (!Number.isInteger(answer) || answer < 0 || answer >= bank.questions[index].options.length) throw Error("Saved placement answer is invalid.");
        });
        return attempt;
    }
    function evaluate(bank, attempt) {
        validateAttempt(bank, attempt, true);
        const topics = new Map(); let correct = 0, unsure = 0;
        bank.questions.forEach((question, index) => {
            const key = `${question.level}:${question.topic}`;
            const score = topics.get(key) || { level: question.level, topic: question.topic, correct: 0, total: 0 };
            score.total++;
            if (attempt.answers[index] === question.correct) { score.correct++; correct++; }
            if (attempt.answers[index] === "unsure") unsure++;
            topics.set(key, score);
        });
        const topicScores = [...topics.values()].map(score => ({ ...score, percentage: score.correct * 100 / score.total, meetsThreshold: score.correct * 100 >= policy.threshold * score.total }));
        let skipped = 0;
        for (let level = 1; level <= Math.min(policy.maxSkip, bank.levelCount - 1); level++) {
            const scores = topicScores.filter(score => score.level === level);
            if (!scores.length || !scores.every(score => score.meetsThreshold)) break;
            skipped++;
        }
        return { languageId: bank.id, ruleVersion: policy.version, recommendedStart: skipped + 1, placedOutLevels: Array.from({ length: skipped }, (_, index) => index + 1), topicScores, correct, total: bank.questions.length, unsure, percentage: Math.round(correct * 100 / bank.questions.length), maxSkip: policy.maxSkip, threshold: policy.threshold };
    }
    const api = Object.freeze({ policy, validateBank, validateAttempt, evaluate });
    root.placementEngine = api;
    if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window === "object" ? window : globalThis);
