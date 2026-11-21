/* "Ask CodeMentor about this attempt" for the coding workspace.
   - A structured result card (before run, running, passed, failed check, Python error) built from the
     workspace's own records: Submit results come from progress.taskResults (written by workspace.js),
     Run output from the output panel. workspace.js is not modified.
   - An in-page assistant that answers from two layers: (1) approved course content (task, requirements,
     lessons linked to the task) retrieved with simple keyword scoring, and (2) the facts of the current
     attempt (task id, failing check, expected and actual output, error). Facts are never invented.
   - It is a prepared, rule-based analysis, NOT a language model. Nothing leaves the browser. The student's
     code, questions and community text are treated as data only: they are matched, never executed or
     followed as instructions.
   - "Still stuck?" shows related community discussions and a community draft with a preview; the
     student chooses whether to include the error or code. Nothing is posted from here. */
(() => {
    "use strict";

    // =====================================================================
    // 1. Pure engine (no DOM). Exported for tests as window.attemptAssistant.engine.
    // =====================================================================
    const ARABIC = /[؀-ۿ]/;
    const detectLanguage = text => ARABIC.test(String(text || "")) ? "ar" : "en";
    const normalize = text => String(text ?? "").replace(/\r\n/g, "\n").trimEnd();

    // Python errors arrive as traceback text from the worker (PythonError string).
    function parseError(text) {
        const raw = String(text || "").trim();
        if (!raw) return null;
        const lines = raw.split("\n").map(line => line.trimEnd()).filter(Boolean);
        let type = null, message = "";
        for (let i = lines.length - 1; i >= 0; i--) {
            const m = lines[i].match(/^\s*([A-Za-z_]*(?:Error|Exception|Interrupt|Exit))\s*:?\s*(.*)$/);
            if (m) { type = m[1]; message = m[2]; break; }
        }
        // Prefer the student's own file (<exec>) over runtime-internal frames.
        const own = [...raw.matchAll(/File "<exec>", line (\d+)/g)].map(m => Number(m[1]));
        const any = [...raw.matchAll(/line (\d+)/g)].map(m => Number(m[1]));
        const line = own.length ? own[own.length - 1] : any.length ? any[any.length - 1] : null;
        return { type: type || "Error", message: message || lines[lines.length - 1], line };
    }

    // Reads the failing check from a saved Submit result. Returns null when there is no usable attempt.
    function failingCase(result) {
        if (!result || !Array.isArray(result.cases) || !Number.isInteger(result.total)) return null;
        const index = result.cases.findIndex(c => c && c.passed === false);
        if (index < 0) return null;
        const c = result.cases[index];
        return { index, number: index + 1, total: result.total, passedBefore: result.passed, input: String(c.input ?? ""), expected: String(c.expected ?? ""), output: String(c.output ?? ""), error: String(c.error ?? "") };
    }

    // Rule-based diagnosis. Each rule states facts from the attempt; causes are worded as possibilities.
    function diagnose(result, code) {
        if (!result || !Array.isArray(result.cases)) return { kind: "no-attempt" };
        if (Number.isInteger(result.total) && result.passed === result.total) return { kind: "passed", total: result.total };
        const fail = failingCase(result);
        if (!fail) return { kind: "incomplete" };
        const source = String(code || "");
        if (fail.error.trim()) {
            const error = parseError(fail.error);
            const type = error.type;
            let kind = "runtime";
            if (/SyntaxError|IndentationError|TabError/.test(type)) kind = "syntax";
            else if (type === "NameError") kind = "name";
            else if (type === "ValueError" && /invalid literal for int|could not convert/i.test(error.message)) kind = "int-conversion";
            else if (type === "TypeError" && /'(?:str)'|str\b/.test(error.message)) kind = "type-text";
            else if (type === "EOFError") kind = "extra-input";
            else if (type === "ZeroDivisionError") kind = "zero-division";
            return { kind, fail, error };
        }
        const expected = normalize(fail.expected), actual = normalize(fail.output);
        if (!actual) return { kind: "no-output", fail };
        if (expected.toLowerCase().replace(/\s+/g, " ") === actual.toLowerCase().replace(/\s+/g, " ")) return { kind: "format", fail };
        if (actual.length > expected.length && actual.endsWith(expected)) return { kind: "extra-output", fail, extra: actual.slice(0, actual.length - expected.length).trim() };
        // Boundary: the test input is one number that also appears in a strict comparison in the code.
        const number = fail.input.trim().match(/^-?\d+(?:\.\d+)?$/) ? fail.input.trim() : null;
        if (number) {
            const pattern = new RegExp(`(?:[\\w)\\]]\\s*(>|<)\\s*${number.replace(".", "\\.")}(?![\\d.=])|${number.replace(".", "\\.")}\\s*(>|<)(?!=)\\s*[\\w(])`);
            const m = source.match(pattern);
            if (m) return { kind: "boundary", fail, number, operator: m[1] || m[2] };
        }
        return { kind: "different-output", fail };
    }

    // ---------- retrieval over approved course content ----------
    const STOP = new Set("a an and are as at be but by can do does for from how i if in is it its me my no not of on or so that the this to was what when where which why with you your have has get got use using then than there their they".split(" "));
    const tokens = text => (String(text || "").toLowerCase().match(/[a-z_]+|>=|<=|==|!=|[<>]|\d+/g) || []).filter(t => !STOP.has(t) && (t.length > 2 || /[<>=!]|\d/.test(t)));
    const KIND_TERMS = {
        boundary: ["compare", ">=", "<=", ">", "<", "condition", "if", "else"],
        "int-conversion": ["int", "input", "convert", "number", "text", "string"],
        "type-text": ["int", "str", "convert", "type", "number", "text"],
        "no-output": ["print", "output", "input"],
        "extra-output": ["print", "input", "prompt", "output"],
        format: ["print", "exact", "text", "string"],
        name: ["variable", "name", "assign", "value"],
        syntax: ["indentation", "block", "colon", "if"],
        "extra-input": ["input", "read", "line"],
        "zero-division": ["divide", "zero", "number", "check"],
        "different-output": ["output", "print", "condition", "value"],
        runtime: ["error", "value", "check"]
    };
    // Builds chunks from the task and every lesson; lessons linked to the task (guide.topics) rank higher.
    function buildCorpus(task, guide, lessons) {
        const chunks = [];
        if (task) task.requirements.forEach((text, i) => chunks.push({ id: `task-req-${i}`, kind: "task", title: `${task.title}: requirements`, text, href: null }));
        for (const lesson of lessons || []) {
            const linked = Boolean(guide?.topics?.includes(lesson.id));
            (lesson.paragraphs || []).forEach((text, i) => chunks.push({ id: `${lesson.id}-${i}`, kind: "lesson", lessonId: lesson.id, title: lesson.title, text, linked, href: `lesson.html?lesson=${encodeURIComponent(lesson.id)}` }));
        }
        return chunks;
    }
    function retrieve(corpus, query, { kind, limit = 1 } = {}) {
        const terms = new Set([...tokens(query), ...(KIND_TERMS[kind] || [])]);
        if (!terms.size) return [];
        return corpus.map(chunk => {
            const words = tokens(chunk.title + " " + chunk.text);
            let score = 0;
            for (const word of new Set(words)) if (terms.has(word)) score += /[<>=]/.test(word) ? 3 : 1;
            if (chunk.linked) score += 2;
            if (chunk.kind === "task") score -= 1;
            return { chunk, score };
        }).filter(item => item.score >= 3).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.chunk);
    }

    // ---------- wording (English UI; Arabic when the student asks in Arabic) ----------
    const TXT = {
        en: {
            empty: "(nothing)",
            noticed: "What I noticed",
            explanation: "Possible explanation",
            step: "One step to try",
            source: "Source",
            missing: "What I still need",
            facts: f => `Check ${f.number} of ${f.total} did not pass. Input: ${f.input.trim() || "(none)"}. Expected output: ${normalize(f.expected) || "(nothing)"}. Your program printed: ${normalize(f.output) || "nothing"}.`,
            errorFacts: (f, e) => `Check ${f.number} of ${f.total} stopped with a runtime error: ${e.type}${e.line ? ` on line ${e.line}` : ""}${e.message ? ` (${e.message})` : ""}. Input: ${f.input.trim() || "(none)"}.`,
            noAttempt: "I don't have a submitted attempt for this task yet, so I can't say what failed. Press Submit solution once, then ask again. You can also ask a general question about the task below.",
            passed: n => `All ${n} checks passed in your last submission. If you want, ask what you would like to understand better about your solution.`,
            incomplete: "Your last submission was saved without a failing check I can read (it may have been stopped). Submit again and I'll look at the result.",
            causes: {
                boundary: d => `Your code compares with \`${d.operator}\` against ${d.number}, and this check uses exactly ${d.number}. A strict comparison (\`${d.operator}\`) leaves ${d.number} itself out, so it may fall into the other branch. Re-read the requirement: does ${d.number} itself count?`,
                "no-output": () => "Your program finished without printing anything for this input. Possibly no print() runs on this path, or the value is calculated but not printed.",
                "extra-output": d => `The expected text appears at the end of your output, but something is printed before it${d.extra ? ` ("${d.extra.slice(0, 60)}")` : ""}. Possibly an input() prompt or an extra print().`,
                format: () => "Your output has the right words but not exactly the same characters (capital letters, spaces or punctuation). The checker compares the text exactly.",
                "different-output": () => "Your program printed a different result for this input. The cause is not certain from the result alone; tracing the code with this exact input will show which line decides the output.",
                "int-conversion": () => "Python could not turn the input text into a number. Possibly the conversion uses the wrong value, or the input contains something other than digits.",
                "type-text": () => "Python tried to combine or compare text (str) with a number. input() always returns text; possibly the value was not converted with int() before it was used as a number.",
                name: d => `Python does not know a name used${d.error.line ? ` on line ${d.error.line}` : ""}. Possibly a typo, a different capitalisation, or a variable used before it is assigned.`,
                syntax: d => `Python could not read the code${d.error.line ? ` near line ${d.error.line}` : ""}. Possibly a missing colon after if/else, or lines that are not indented the same way.`,
                "extra-input": () => "Your program asked for more input than this check provides. Possibly input() is called more times than needed.",
                "zero-division": () => "The program divided by zero for this input. Possibly a case (like an empty list or a zero value) needs a check before dividing.",
                runtime: d => `Python stopped with ${d.error.type}. The message above says what went wrong; the line number shows where to look.`
            },
            steps: {
                boundary: d => `Put ${d.number} in Standard input, press Run, and see which message appears. Then decide whether your comparison should include ${d.number}.`,
                "no-output": () => "Add a temporary print() to see which branch runs, then Run with this input.",
                "extra-output": () => "Look for an input(\"...\") with prompt text or an extra print(); the task says not to print prompts. Run with this input to compare.",
                format: () => "Copy the expected text from the task exactly into your print(), then Run with this input.",
                "different-output": () => "Put this input in Standard input and Run. Follow the values line by line and find where your result changes.",
                "int-conversion": () => "Print the raw input value before converting it, then Run with this input.",
                "type-text": () => "Find where the input is used as a number and check that it is converted with int() first, then Run again.",
                name: () => "Compare the name in the error with where you assigned it (spelling and capitals), then Run.",
                syntax: () => "Check the line in the error and the line above it for a missing colon or mismatched indentation, then Run.",
                "extra-input": () => "Count how many times your code calls input() and compare with the input of this check.",
                "zero-division": () => "Add a check for the zero case before the division, then Run with this input.",
                runtime: () => "Go to the line in the error, check the values used there, and Run with this input."
            },
            useInput: "Put this input in Standard input",
            sourceNone: "I didn't find a course passage that clearly matches this. Tell me which line or word is unclear and I'll look again.",
            solution: "I won't show the full solution here, so you can still solve it yourself. One hint at a time is in Hints & explained solution; the explained solution unlocks there after an attempt.",
            exampleTitle: "A similar example (a different problem)",
            unclear: "I can't tell what you want to know from that. Are you asking about the error, the expected output, or which lesson covers this?",
            followup: "Answer from the course",
            from: "From"
        },
        ar: {
            empty: "(لا شيء)",
            noticed: "شو لاحظت",
            explanation: "تفسير محتمل",
            step: "خطوة وحدة جرّبيها",
            source: "المصدر",
            missing: "شو ناقصني",
            facts: f => `فحص ${f.number} من ${f.total} ما نجح. المُدخل (input): ${f.input.trim() || "(لا شيء)"}. الناتج المتوقع: ${normalize(f.expected) || "(لا شيء)"}. برنامجك طبع: ${normalize(f.output) || "ولا شي"}.`,
            errorFacts: (f, e) => `فحص ${f.number} من ${f.total} وقف بخطأ Python: ${e.type}${e.line ? ` بالسطر ${e.line}` : ""}${e.message ? ` (${e.message})` : ""}. المُدخل: ${f.input.trim() || "(لا شيء)"}.`,
            noAttempt: "ما عندي محاولة مسلّمة لهالتمرين لسا، فما بقدر أحكي شو اللي فشل. اضغطي Submit solution مرة، وبعدين اسأليني. وبتقدري تسألي سؤال عام عن التمرين.",
            passed: n => `كل الفحوصات (${n}) نجحت بآخر تسليم. إذا بدك، اسأليني عن شي بدك تفهميه أكثر بحلك.`,
            incomplete: "آخر تسليم انحفظ بدون فحص فاشل بقدر أقرأه (يمكن انوقف). سلّمي مرة ثانية وبشوف النتيجة.",
            causes: {
                boundary: d => `كودك بيقارن بـ \`${d.operator}\` مع ${d.number}، وهالفحص بيستخدم ${d.number} بالظبط. المقارنة الصارمة (\`${d.operator}\`) ما بتشمل ${d.number} نفسه، فممكن يروح للفرع الثاني. ارجعي للمطلوب: هل ${d.number} نفسه بينحسب؟`,
                "no-output": () => "برنامجك خلص بدون ما يطبع شي لهالمُدخل. ممكن ما في print() بتشتغل بهالمسار، أو القيمة انحسبت بس ما انطبعت.",
                "extra-output": d => `النص المتوقع موجود بآخر الناتج، بس في شي انطبع قبله${d.extra ? ` ("${d.extra.slice(0, 60)}")` : ""}. ممكن رسالة داخل input() أو print() زيادة.`,
                format: () => "الناتج فيه نفس الكلمات بس مش نفس الحروف بالظبط (حروف كبيرة، مسافات أو علامات). الفاحص بيقارن النص حرفيًا.",
                "different-output": () => "برنامجك طبع نتيجة مختلفة لهالمُدخل. السبب مش أكيد من النتيجة لحالها؛ تتبّع الكود بنفس المُدخل بيبيّن أي سطر بيقرر الناتج.",
                "int-conversion": () => "Python ما قدر يحوّل نص المُدخل لرقم. ممكن التحويل على قيمة غلط، أو المُدخل فيه شي غير الأرقام.",
                "type-text": () => "Python حاول يجمع أو يقارن نص (str) مع رقم. input() دايمًا بيرجّع نص؛ ممكن القيمة ما تحوّلت بـ int() قبل ما تستخدميها كرقم.",
                name: d => `Python مش عارف اسم مستخدم${d.error.line ? ` بالسطر ${d.error.line}` : ""}. ممكن خطأ إملائي، حروف كبيرة مختلفة، أو متغير مستخدم قبل ما ياخد قيمة.`,
                syntax: d => `Python ما قدر يقرأ الكود${d.error.line ? ` قريب السطر ${d.error.line}` : ""}. ممكن ناقص نقطتين (:) بعد if/else، أو الأسطر مش بنفس المسافة البادئة.`,
                "extra-input": () => "برنامجك طلب مُدخلات أكثر من اللي بيعطيه الفحص. ممكن input() مستدعاة أكثر من اللازم.",
                "zero-division": () => "البرنامج قسم على صفر لهالمُدخل. ممكن في حالة (قائمة فاضية أو قيمة صفر) بدها فحص قبل القسمة.",
                runtime: d => `Python وقف بـ ${d.error.type}. رسالة الخطأ بتحكي شو صار، ورقم السطر بيدلك وين تدوري.`
            },
            steps: {
                boundary: d => `حطي ${d.number} بـ Standard input، اضغطي Run، وشوفي أي رسالة بتطلع. بعدين قرري إذا المقارنة لازم تشمل ${d.number}.`,
                "no-output": () => "زيدي print() مؤقتة لتعرفي أي فرع بيشتغل، وبعدين Run بنفس المُدخل.",
                "extra-output": () => "دوري على input(\"...\") فيها نص أو print() زيادة؛ التمرين بيطلب ما تطبعي رسائل. اعملي Run بنفس المُدخل وقارني.",
                format: () => "انسخي النص المتوقع من التمرين بالظبط جوّا print()، وبعدين Run بنفس المُدخل.",
                "different-output": () => "حطي هالمُدخل بـ Standard input واضغطي Run. تتبّعي القيم سطر سطر ولاقي وين النتيجة بتتغير.",
                "int-conversion": () => "اطبعي قيمة المُدخل قبل التحويل، وبعدين Run بنفس المُدخل.",
                "type-text": () => "دوري وين المُدخل مستخدم كرقم وتأكدي إنه متحوّل بـ int() قبلها، وبعدين Run.",
                name: () => "قارني الاسم اللي بالخطأ مع مكان ما عطيتيه قيمة (الإملاء والحروف الكبيرة)، وبعدين Run.",
                syntax: () => "افحصي السطر اللي بالخطأ والسطر اللي قبله: نقطتين ناقصة أو مسافة بادئة مختلفة، وبعدين Run.",
                "extra-input": () => "عدّي كم مرة كودك بيستدعي input() وقارني مع مُدخل الفحص.",
                "zero-division": () => "زيدي فحص لحالة الصفر قبل القسمة، وبعدين Run بنفس المُدخل.",
                runtime: () => "روحي للسطر اللي بالخطأ، افحصي القيم المستخدمة فيه، وبعدين Run بنفس المُدخل."
            },
            useInput: "حطّي هالمُدخل بـ Standard input",
            sourceNone: "ما لقيت مقطع من الدروس بيطابق هالسؤال بوضوح. احكيلي أي سطر أو كلمة مش واضحة وبرجع بدوّر.",
            solution: "ما رح أعرض الحل الكامل هون حتى تضلي قادرة تحلّيه بنفسك. في تلميح وحدة وحدة بقسم Hints & explained solution، والحل المشروح بينفتح هناك بعد أول محاولة.",
            exampleTitle: "مثال مشابه (مسألة مختلفة)",
            unclear: "مش واضح لي شو بدك تعرفي. سؤالك عن الخطأ، عن الناتج المتوقع، ولا عن الدرس اللي بيشرح هالشي؟",
            followup: "جواب من محتوى الدورة",
            from: "من"
        }
    };

    // Similar examples use a different problem so the task's own solution is never shown.
    const EXAMPLES = {
        boundary: { code: 'age = 18\nif age > 18:\n    print("Adult")      # 18 is NOT included\nelse:\n    print("Not yet")\n\nif age >= 18:\n    print("Adult")      # 18 IS included', en: "With age = 18 the first condition is False (18 > 18 is False) but the second is True. The only difference is whether the boundary value itself counts.", ar: "لما age = 18 الشرط الأول False (لأن 18 > 18 خطأ) بس الثاني True. الفرق الوحيد هو إذا القيمة الحدّية نفسها بتنحسب." },
        "int-conversion": { code: 'text = "12"\nnumber = int(text)    # works: 12\nint("twelve")          # ValueError', en: "int() can only convert text made of digits.", ar: "int() بتحوّل بس النص اللي كله أرقام." },
        "type-text": { code: 'value = input()        # always text, e.g. "5"\nprint(value + 1)       # TypeError\nprint(int(value) + 1)  # 6', en: "Convert text to a number before doing number operations.", ar: "حوّلي النص لرقم قبل ما تعملي عمليات حسابية." },
        default: { code: 'name = "Sami"\nprint("Hello", name)   # trace: name is "Sami" here', en: "Tracing means writing down each variable's value after every line for one input.", ar: "التتبّع يعني تكتبي قيمة كل متغير بعد كل سطر لمُدخل واحد." }
    };

    // Builds the structured answer for an attempt (no question) or a follow-up question.
    function answer({ result, code, question = "", task, corpus, uiLanguage = "en" }) {
        const lang = question.trim() ? detectLanguage(question) : uiLanguage;
        const t = TXT[lang];
        const d = diagnose(result, code);
        const q = question.trim();
        const reply = { lang, kind: d.kind, sections: [], actions: [], source: null, example: null };
        const wantsSolution = /\b(solution|answer|full code|solve it)\b|الحل|حل كامل|جاوب/i.test(q);
        const wantsExample = /\bexample\b|مثال/i.test(q);
        if (wantsSolution) { reply.sections.push({ title: t.step, text: t.solution }); return reply; }
        if (wantsExample) {
            const ex = EXAMPLES[d.kind] || EXAMPLES.default;
            reply.example = { title: t.exampleTitle, code: ex.code, text: ex[lang] };
            return reply;
        }
        if (d.kind === "no-attempt") {
            reply.sections.push({ title: t.missing, text: t.noAttempt });
            if (q) { const [hit] = retrieve(corpus, q, {}); if (hit) reply.source = hit; else reply.sections.push({ title: t.source, text: t.sourceNone }); }
            return reply;
        }
        if (d.kind === "passed") { reply.sections.push({ title: t.noticed, text: t.passed(d.total) }); if (q) { const [hit] = retrieve(corpus, q, {}); reply.source = hit || null; } return reply; }
        if (d.kind === "incomplete") { reply.sections.push({ title: t.missing, text: t.incomplete }); return reply; }
        reply.sections.push({ title: t.noticed, text: d.error ? t.errorFacts(d.fail, d.error) : t.facts(d.fail) });
        if (q && !/\b(why|explain|what|how|wrong|mean)\b|ليش|ليه|اشرح|شو|كيف|ليش|غلط|يعني/i.test(q)) {
            const [hit] = retrieve(corpus, q, { kind: d.kind });
            if (hit) { reply.sections.push({ title: t.followup, text: hit.text }); reply.source = hit; }
            else reply.sections.push({ title: t.missing, text: t.unclear });
            return reply;
        }
        reply.sections.push({ title: t.explanation, text: t.causes[d.kind](d) });
        reply.sections.push({ title: t.step, text: t.steps[d.kind](d) });
        if (d.fail && d.fail.input.trim()) reply.actions.push({ type: "use-input", label: t.useInput, value: d.fail.input });
        const [hit] = retrieve(corpus, `${q} ${task?.title || ""}`, { kind: d.kind });
        reply.source = hit || null;
        return reply;
    }

    // The minimum context a future server-side model would receive (only after the student chooses to send).
    function minimalContext({ taskId, task, result, code, question }) {
        const d = diagnose(result, code);
        return { taskId, taskTitle: task?.title || "", requirements: task?.requirements || [], check: d.fail ? { number: d.fail.number, total: d.fail.total, input: d.fail.input.slice(0, 200), expected: d.fail.expected.slice(0, 200), output: d.fail.output.slice(0, 200), error: d.error ? `${d.error.type}: ${d.error.message}`.slice(0, 300) : "" } : null, question: String(question || "").slice(0, 500) };
    }

    const engine = Object.freeze({ detectLanguage, parseError, failingCase, diagnose, buildCorpus, retrieve, answer, minimalContext, TXT, EXAMPLES });
    window.attemptAssistant = Object.freeze({ engine });

    // =====================================================================
    // 2. Workspace UI (only on the coding page)
    // =====================================================================
    const $ = id => document.getElementById(id);
    function mount() {
        if (window.learningUnavailable) return;
        const editor = $("code-editor"), runButton = $("run-code"), submitButton = $("submit-code"), card = $("attempt-result");
        if (!editor || !runButton || !submitButton || !card || !window.pythonCurriculum) return;
        const taskId = new URLSearchParams(location.search).get("task") || "student-profile";
        const task = window.pythonCurriculum.tasks?.[taskId];
        if (!task) return;
        const guide = window.learningSupport?.tasks?.[taskId] || null;
        const corpus = buildCorpus(task, guide, window.pythonCurriculum.allLessons);
        const languageName = window.pythonCurriculum.name || "Python";
        const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
        const button = (text, cls, onClick) => { const b = el("button", text, cls); b.type = "button"; b.addEventListener("click", onClick); return b; };

        // ----- Run vs Submit explained, from the real behaviour of workspace.js -----
        const help = $("run-submit-help");
        if (help) help.textContent = `Run executes your code once with the Standard input box and shows the output; it does not check tests or change progress. Submit checks ${task.tests.length} test cases in order, stops at the first one that does not pass, and saves the result. Passing all of them saves the task as completed.`;

        function readResult() {
            try { return JSON.parse(window.cmStorage.getItem("codementor-demo-learning") || "null")?.taskResults?.[taskId] || null; }
            catch { return null; }
        }

        // ----- Result card -----
        let mode = null, before = null;
        function setCard(state, build) {
            card.hidden = false;
            card.dataset.state = state;
            card.replaceChildren();
            build(card);
        }
        function renderIdle() {
            const saved = readResult();
            if (saved && Array.isArray(saved.cases)) return renderSubmit(saved, true);
            setCard("idle", host => {
                host.append(el("p", "Not run yet", "attempt-status"), el("p", "Write your solution, then Run to try it with your own input or Submit to check it.", "attempt-detail"));
            });
        }
        function renderRunning(kind) {
            setCard("running", host => host.append(el("p", kind === "submit" ? "Checking your solution…" : "Running your code…", "attempt-status"), el("p", "Your code stays in the editor and is saved as a draft.", "attempt-detail")));
        }
        function compareTable(fail) {
            const grid = el("dl", null, "attempt-compare");
            const row = (label, value, cls) => { const wrap = el("div", null, cls); wrap.append(el("dt", label), el("dd", null)); const pre = el("pre", value === "" ? "(nothing)" : value); wrap.lastChild.append(pre); grid.append(wrap); };
            row("Input", fail.input.trim() || "(none)", "attempt-compare-input");
            row("Expected", normalize(fail.expected), "attempt-compare-expected");
            const err = fail.error.trim() ? parseError(fail.error) : null;
            row(err ? "Your program stopped with" : "Your output",
                err ? `${err.type}${err.line ? ` (line ${err.line})` : ""}${err.message ? `: ${err.message}` : ""}${normalize(fail.output) ? `\nPrinted before the error:\n${normalize(fail.output)}` : ""}` : normalize(fail.output),
                "attempt-compare-actual");
            return grid;
        }
        function askButton(label = "Ask CodeMentor about this attempt") {
            const b = button(label, "button button-primary attempt-ask", () => openAssistant(b));
            b.setAttribute("aria-controls", "attempt-assistant");
            b.setAttribute("aria-expanded", "false");
            b.id = "ask-about-attempt";
            return b;
        }
        function renderSubmit(result, fromStorage = false) {
            const d = diagnose(result, editor.value);
            if (d.kind === "passed") {
                setCard("passed", host => host.append(el("p", `Passed: all ${d.total} checks`, "attempt-status"), el("p", fromStorage ? "Your last submission passed every check. Completion is saved on this device." : "Every check passed. Completion is saved on this device.", "attempt-detail"), askButton("Ask CodeMentor about this solution")));
                return;
            }
            const fail = failingCase(result);
            if (!fail) { renderIdle(); return; }
            const state = fail.error.trim() ? "error" : "failed";
            setCard(state, host => {
                host.append(
                    el("p", state === "error" ? `Runtime error in check ${fail.number} of ${fail.total}` : `Check ${fail.number} of ${fail.total} did not pass`, "attempt-status"),
                    el("p", `${fromStorage ? "Last saved submission. " : ""}${fail.passedBefore} of ${fail.total} passed before this one. Compare what was expected with what your program did.`, "attempt-detail"),
                    compareTable(fail)
                );
                const actions = el("div", null, "attempt-actions");
                actions.append(askButton());
                if (fail.input.trim() && !$("program-input").hidden) actions.append(button("Put this input in Standard input", "button button-outline", () => useInput(fail.input)));
                host.append(actions);
            });
        }
        function renderRun() {
            const output = $("program-output")?.textContent || "";
            const failed = $("workspace-message")?.classList.contains("is-error");
            const error = failed ? parseError(output) : null;
            setCard(failed ? "error" : "ran", host => {
                host.append(el("p", failed ? `Runtime error${error?.type ? `: ${error.type}` : ""}${error?.line ? ` on line ${error.line}` : ""}` : "Run finished", "attempt-status"),
                    el("p", failed ? "Read the last line of the output below; it names the problem. Run does not check tests." : "Your output is shown below. Run does not check tests; Submit checks them and saves the result.", "attempt-detail"));
                if (readResult()?.cases) { const actions = el("div", null, "attempt-actions"); actions.append(askButton("Ask CodeMentor about my last submission")); host.append(actions); }
            });
        }
        function useInput(value) {
            const input = $("program-input");
            if (!input || input.disabled) return;
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true })); // workspace.js saves the draft
            input.focus();
        }

        // Follow the real execution: a click starts it, and the buttons re-enable when workspace.js finishes.
        [runButton, submitButton].forEach(b => b.addEventListener("click", () => {
            if (b.disabled) return;
            mode = b === submitButton ? "submit" : "run";
            before = JSON.stringify(readResult());
        }, true));
        new MutationObserver(() => {
            if (!mode) return;
            if (submitButton.disabled) { renderRunning(mode); return; }
            const finished = mode; mode = null;
            const after = readResult();
            if (finished === "submit" && JSON.stringify(after) !== before && after) renderSubmit(after);
            else if (finished === "submit") {
                const msg = $("workspace-message");
                setCard(msg?.classList.contains("is-error") ? "error" : "idle", host => host.append(el("p", msg?.classList.contains("is-error") ? "The check could not finish" : "Not checked", "attempt-status"), el("p", msg?.textContent || "", "attempt-detail")));
            } else renderRun();
        }).observe(submitButton, { attributes: true, attributeFilter: ["disabled"] });

        // ----- Assistant panel -----
        const panel = $("attempt-assistant"), log = $("assistant-log"), form = $("assistant-form"), question = $("assistant-question");
        let opener = null;
        function contextLine() {
            const fail = failingCase(readResult());
            $("assistant-context").textContent = fail ? `${task.title} · check ${fail.number} of ${fail.total} · input ${fail.input.trim() || "(none)"}` : `${task.title} · no failing submission saved`;
        }
        function renderReply(reply, asked) {
            const item = el("article", null, "assistant-reply");
            item.lang = reply.lang;
            item.dir = reply.lang === "ar" ? "rtl" : "ltr";
            if (asked) { const q = el("p", null, "assistant-asked"); q.append(el("span", reply.lang === "ar" ? "سؤالك: " : "You asked: "), el("bdi", asked)); item.append(q); }
            // `code` spans become <code> (text nodes only; nothing is parsed as HTML).
            const rich = text => { const p = el("p"); String(text).split("`").forEach((part, i) => p.append(i % 2 ? Object.assign(el("code", part), { dir: "ltr" }) : document.createTextNode(part))); return p; };
            for (const section of reply.sections) { item.append(el("h3", section.title), rich(section.text)); }
            if (reply.example) { item.append(el("h3", reply.example.title)); const pre = el("pre", null, "assistant-code"); pre.dir = "ltr"; pre.append(el("code", reply.example.code)); item.append(pre, el("p", reply.example.text)); }
            for (const action of reply.actions) if (action.type === "use-input" && !$("program-input").hidden) item.append(button(action.label, "button button-outline assistant-action", () => useInput(action.value)));
            if (reply.source) {
                const src = el("p", null, "assistant-source");
                src.append(el("span", `${TXT[reply.lang].source}: `));
                if (reply.source.href) { const a = el("a", reply.source.title); a.href = reply.source.href; src.append(a); } else src.append(el("span", reply.source.title));
                src.append(el("q", reply.source.text, "assistant-quote"));
                item.append(src);
            }
            log.append(item);
            item.scrollIntoView({ block: "nearest" });
        }
        function respond(asked = "") {
            const reply = answer({ result: readResult(), code: editor.value, question: asked, task, corpus, uiLanguage: "en" });
            renderReply(reply, asked);
        }
        function openAssistant(from) {
            opener = from || document.activeElement;
            panel.hidden = false;
            document.body.classList.add("assistant-open");
            document.querySelectorAll("#ask-about-attempt").forEach(b => b.setAttribute("aria-expanded", "true"));
            contextLine();
            log.replaceChildren();
            respond("");
            renderCommunity();
            $("assistant-title").focus();
        }
        function closeAssistant() {
            panel.hidden = true;
            document.body.classList.remove("assistant-open");
            document.querySelectorAll("#ask-about-attempt").forEach(b => b.setAttribute("aria-expanded", "false"));
            (opener && document.contains(opener) ? opener : editor).focus();
        }
        $("assistant-close").addEventListener("click", closeAssistant);
        panel.addEventListener("keydown", event => { if (event.key === "Escape") { event.stopPropagation(); closeAssistant(); } });
        form.addEventListener("submit", event => {
            event.preventDefault();
            const asked = question.value.trim().slice(0, 500);
            if (!asked) { question.focus(); return; }
            question.value = "";
            respond(asked);
        });
        panel.querySelectorAll("[data-ask]").forEach(chip => chip.addEventListener("click", () => respond(chip.dataset.ask)));

        // ----- Still stuck? Community -----
        function renderCommunity() {
            const host = $("assistant-related");
            host.replaceChildren();
            let items = [];
            let note = "";
            try {
                const result = window.communityStore.query({ channel: "all", pageSize: 50 });
                items = result.items.filter(post => post.related?.kind === "task" && post.related.id === taskId).slice(0, 3);
                if (!items.length) note = "No discussion is linked to this task yet.";
            } catch {
                note = "Discussions are visible to members of your language group. Ask the community below to open it (or request to join).";
            }
            if (note) { host.append(el("p", note, "assistant-muted")); return; }
            const list = el("ul", null, "assistant-related-list");
            for (const post of items) {
                const li = el("li"), a = el("a", post.title);
                a.href = `../services/community.html?group=${encodeURIComponent(post.channel)}&post=${encodeURIComponent(post.id)}`;
                li.append(a, el("span", post.solved ? "Solved" : "Open question", post.solved ? "assistant-tag is-solved" : "assistant-tag"));
                list.append(li);
            }
            host.append(list);
        }
        const includeError = $("share-include-result"), includeCode = $("share-include-code"), preview = $("share-preview"), what = $("share-tried");
        function communityDraft() {
            const base = window.communityAsk.draft(window.communityAsk.PLACES.find(p => p.page === "workspace"));
            const fail = failingCase(readResult());
            const parts = [`What I tried:\n${what.value.trim() || "(describe your idea in one or two sentences)"}`];
            if (includeError.checked && fail) {
                const err = fail.error.trim() ? parseError(fail.error) : null;
                parts.push(err ? `What happened:\nCheck ${fail.number} of ${fail.total} stopped with ${err.type}${err.line ? ` on line ${err.line}` : ""}: ${err.message}` : `What happened:\nCheck ${fail.number} of ${fail.total}. Input: ${fail.input.trim() || "(none)"}\nExpected: ${normalize(fail.expected)}\nMy output: ${normalize(fail.output) || "(nothing)"}`);
            }
            return { ...base, body: parts.join("\n\n"), code: includeCode.checked ? base.code : "", tags: `task, ${languageName.toLowerCase()}, ${taskId}`.replace(/[^a-z0-9+#., -]/g, "") };
        }
        function renderPreview() {
            let draft;
            try { draft = communityDraft(); } catch { preview.textContent = "Sign in with a student account to prepare a community question."; return; }
            preview.textContent = [`Title: ${draft.title}`, `Tags: ${draft.tags}`, `Related task: ${task.title}`, "", draft.body, draft.code ? `\nCode (${languageName}):\n${draft.code}` : "\nCode: not included"].join("\n");
        }
        [includeError, includeCode, what].forEach(control => control.addEventListener("input", renderPreview));
        $("share-open").addEventListener("click", () => {
            const toggle = $("share-open"), box = $("share-box");
            const opening = box.hidden;
            box.hidden = !opening;
            toggle.setAttribute("aria-expanded", String(opening));
            if (opening) { renderPreview(); what.focus(); }
        });
        $("share-continue").addEventListener("click", () => {
            let draft;
            try { draft = communityDraft(); } catch { $("share-status").textContent = "Sign in with a student account to ask the community."; return; }
            $("save-draft")?.click(); // keep the editor draft before leaving (workspace.js saves to this device)
            try { sessionStorage.setItem(window.communityAsk.KEY, JSON.stringify(draft)); } catch { /* the composer opens empty */ }
            location.href = `../services/community.html?group=${encodeURIComponent(draft.channel)}&compose=1`;
        });

        renderIdle();
        window.addEventListener("pageshow", () => { if (!mode) renderIdle(); });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
