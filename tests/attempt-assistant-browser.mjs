// End-to-end: the "Check a grade" exercise in real Chrome with real Python (Pyodide from vendor/).
// A student submits a solution with `>` instead of `>=`, sees check 1 (input 70) fail, opens
// "Ask CodeMentor about this attempt", asks in English and Arabic, uses the suggested input, previews a
// community question, leaves for the community and comes back to find the draft. Also: Run, mobile,
// keyboard close, and a passing submission. Run: node tests/attempt-assistant-browser.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadConfig } from "../server/config.mjs";
import { migrateUp, openDatabase } from "../server/db.mjs";
import { createApp } from "../server/app.mjs";

const PORT = 8797, ORIGIN = `http://localhost:${PORT}`;
const chromePath = process.env.CHROME_PATH || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome"].find(f => fs.existsSync(f));
if (!chromePath) { console.error("No Chrome/Edge found. Set CHROME_PATH."); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, detail = "") => { if (ok) { passed++; console.log("PASS " + name); } else { failed++; console.log("FAIL " + name + (detail ? " — " + String(detail).slice(0, 300) : "")); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-attempt-e2e-"));
const config = loadConfig({ NODE_ENV: "test", PORT: String(PORT), DB_PATH: path.join(tmp, "t.db") });
const db = openDatabase(config.dbPath); migrateUp(db);
const server = createApp({ config, db }).listen(PORT, "127.0.0.1");
const profile = path.join(tmp, "profile");
const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--host-resolver-rules=MAP localhost 127.0.0.1", "about:blank"], { stdio: "ignore" });
let ws; for (let i = 0; i < 100 && !ws; i++) { await sleep(100); try { const [p, b] = fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").trim().split("\n"); ws = `ws://127.0.0.1:${p}${b}`; } catch {} }
const sock = new WebSocket(ws); await new Promise(r => sock.onopen = r);
let id = 0; const pend = new Map(); const jsErrors = [];
sock.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === "Runtime.exceptionThrown") jsErrors.push(m.params.exceptionDetails.exception?.description?.split("\n")[0] || m.params.exceptionDetails.text); };
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, m => r(m.result ?? { error: m.error })); sock.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cmd = (m, p) => send(m, p, sessionId);
const ev = async x => { const r = await cmd("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result?.value; };
const waitFor = async (x, timeout = 15000) => { const end = Date.now() + timeout; while (Date.now() < end) { try { if (await ev(`(() => { try { return Boolean(${x}); } catch { return false; } })()`)) return true; } catch {} await sleep(150); } return false; };
const go = async url => { await cmd("Page.navigate", { url: ORIGIN + url }); await waitFor("document.readyState === 'complete'"); await sleep(400); };
const key = async (k, code) => { for (const type of ["keyDown", "keyUp"]) await cmd("Input.dispatchKeyEvent", { type, key: k, code: code || k, windowsVirtualKeyCode: k === "Escape" ? 27 : 0 }); };
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const WRONG = 'score = int(input())\nif score > 70:\n    print("Passed")\nelse:\n    print("Try again")\n';
const RIGHT = WRONG.replace("> 70", ">= 70");
const setCode = code => ev(`(() => { const e = document.getElementById('code-editor'); e.value = ${JSON.stringify(code)}; e.dispatchEvent(new Event('input', {bubbles:true})); })()`);
const card = () => ev("({ state: document.getElementById('attempt-result').dataset.state, text: document.getElementById('attempt-result').innerText })");
// Optional screenshots: SHOTS_DIR=<folder> node tests/attempt-assistant-browser.mjs
const shot = async name => { if (!process.env.SHOTS_DIR) return; const { data } = await cmd("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(process.env.SHOTS_DIR, name + ".png"), Buffer.from(data, "base64")); };

try {
    // A real student account (server mode) with onboarding done.
    await go("/pages/auth/login.html");
    await ev(`cmServerAuth.signup({role:'student', name:'Maya Learner', email:'maya@school.test', age:17, password:'Attempt journey password 1'}).then(u => cmServerAuth.establishLocalSession(u)).then(() => cmStorage.setItem('codementor-demo-onboarding', JSON.stringify({language:'python', goal:'career', level:'beginner'})))`);
    await go("/pages/student/workspace.html?task=grade-checker");
    // A new student first sees the site's workspace guide (a modal). Close it like a user would.
    if (await waitFor("[...document.querySelectorAll('dialog[open] button')].some(b => /Skip for now/.test(b.textContent))", 4000))
        await ev("[...document.querySelectorAll('dialog[open] button')].find(b => /Skip for now/.test(b.textContent)).click()");
    check("Exercise opens: title, requirement and Run/Submit explanation are visible", await waitFor("document.getElementById('task-title').textContent === 'Check a grade'") && /Submit checks 4 test cases in order, stops at the first one/.test(await ev("document.getElementById('run-submit-help').textContent")));
    const idle = await card();
    check("Before running: result card says 'Not run yet'", idle.state === "idle" && /Not run yet/.test(idle.text), JSON.stringify(idle));

    await setCode(WRONG);
    check("Draft autosaves", await waitFor("/Draft saved/.test(document.getElementById('draft-status').textContent)", 4000));
    await ev("document.getElementById('submit-code').click()");
    check("While checking: card shows the running state", await waitFor("document.getElementById('attempt-result').dataset.state === 'running'", 5000));
    check("Submit with `>` fails check 1 (real Python run)", await waitFor("document.getElementById('attempt-result').dataset.state === 'failed'", 120000), JSON.stringify(await card()));
    const failedCard = await card();
    check("Result card: check 1 of 4, input 70, expected Passed, actual Try again", /Check 1 of 4 did not pass/.test(failedCard.text) && /70/.test(failedCard.text) && /Passed/.test(failedCard.text) && /Try again/.test(failedCard.text), failedCard.text);

    // Open the assistant from the result itself.
    await ev("document.getElementById('ask-about-attempt').click()");
    check("Assistant opens from the result and takes focus", await waitFor("!document.getElementById('attempt-assistant').hidden") && await ev("document.activeElement.id") === "assistant-title");
    const first = await ev("document.querySelector('#assistant-log .assistant-reply').innerText");
    check("Assistant uses the real attempt: facts, possible explanation, one step", /Check 1 of 4 did not pass\. Input: 70\. Expected output: Passed\. Your program printed: Try again\./.test(first) && /POSSIBLE EXPLANATION|Possible explanation/i.test(first) && /ONE STEP TO TRY|One step to try/i.test(first), first);
    check("Assistant cites the linked lesson with a working link", await ev("document.querySelector('.assistant-source a')?.getAttribute('href')") === "lesson.html?lesson=conditions");
    await shot("assistant-desktop");
    check("Assistant states it is prepared analysis, not live AI", /not a live AI model/.test(await ev("document.querySelector('.assistant-mode').textContent")));
    check("Default answer does not contain the solution", !/>=\s*70/.test(first));

    await ev("(() => { const q = document.getElementById('assistant-question'); q.value = 'ليش 70 مشكلة؟'; document.getElementById('assistant-form').requestSubmit(); })()");
    check("Arabic question gets an Arabic, right-to-left answer", await waitFor("document.querySelectorAll('#assistant-log .assistant-reply')[1]?.lang === 'ar'") && await ev("document.querySelectorAll('#assistant-log .assistant-reply')[1].dir") === "rtl");
    await ev("document.querySelector('[data-ask=\"Show a similar example\"]').click()");
    check("Similar example is a different problem", await waitFor("/age/.test(document.querySelector('#assistant-log .assistant-reply:last-child .assistant-code')?.textContent || '')"));

    // The suggested step: put the failing input in Standard input.
    await ev("document.querySelector('.assistant-action').click()");
    check("'Put this input in Standard input' fills 70 and keeps the code", await ev("document.getElementById('program-input').value") === "70" && await ev("document.getElementById('code-editor').value") === WRONG);

    // Keyboard close returns focus; code untouched.
    await ev("document.getElementById('assistant-question').focus()");
    await key("Escape");
    check("Escape closes the assistant and returns focus to the result button", await waitFor("document.getElementById('attempt-assistant').hidden") && await ev("document.activeElement.id") === "ask-about-attempt");
    check("Code is unchanged after closing the assistant", await ev("document.getElementById('code-editor').value") === WRONG);

    // Run (not Submit) with the suggested input.
    await ev("document.getElementById('run-code').click()");
    check("Run shows a 'Run finished' card and says it does not check tests", await waitFor("document.getElementById('attempt-result').dataset.state === 'ran'", 60000) && /does not check tests/.test((await card()).text));

    // Community: preview with student choices, then leave and come back.
    await ev("document.getElementById('ask-about-attempt').click()");
    await waitFor("!document.getElementById('attempt-assistant').hidden");
    const related = await ev("document.getElementById('assistant-related').innerText");
    check("Related discussions: honest state when none is visible", /No discussion is linked|members of your language group/.test(related), related);
    await ev("document.getElementById('share-open').click()");
    const p1 = await ev("document.getElementById('share-preview').textContent");
    check("Community preview: code and result are NOT included until the student ticks them", /Code: not included/.test(p1) && !/Expected: Passed/.test(p1) && /Related task: Check a grade/.test(p1), p1);
    await ev("(() => { for (const id of ['share-include-result','share-include-code']) { const c = document.getElementById(id); c.checked = true; c.dispatchEvent(new Event('input', {bubbles:true})); } })()");
    const p2 = await ev("document.getElementById('share-preview').textContent");
    check("Community preview updates with the chosen result and code", /Expected: Passed/.test(p2) && /My output: Try again/.test(p2) && /score > 70/.test(p2) && /Tags: task, python, grade-checker/.test(p2), p2);
    await shot("assistant-community-preview");
    await ev("document.getElementById('share-continue').click()");
    check("Continue opens the community composer (nothing posted from the workspace)", await waitFor("location.pathname.endsWith('/pages/services/community.html')", 10000));
    await sleep(800);
    await go("/pages/student/workspace.html?task=grade-checker");
    check("Back in the editor: the draft is restored", await waitFor(`document.getElementById('code-editor').value === ${JSON.stringify(WRONG)}`) && await ev("document.getElementById('program-input').value") === "70");
    check("Back in the editor: the last submission result is shown again", /Last saved submission/.test((await card()).text));

    // Mobile: bottom sheet, no horizontal scroll.
    await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(300);
    await ev("document.getElementById('ask-about-attempt').click()");
    await waitFor("!document.getElementById('attempt-assistant').hidden");
    const sheet = await ev("(() => { const r = document.getElementById('attempt-assistant').getBoundingClientRect(); return { left: r.left, width: r.width, bottom: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, scroll: document.documentElement.scrollWidth > innerWidth + 1 }; })()");
    check("Mobile: assistant is a full-width bottom sheet without horizontal scroll", sheet.left === 0 && sheet.width === sheet.vw && sheet.bottom === sheet.vh && !sheet.scroll, JSON.stringify(sheet));
    await shot("assistant-mobile");
    await ev("document.getElementById('assistant-close').click()");
    await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // Passing submission.
    await setCode(RIGHT);
    await waitFor("/Draft saved/.test(document.getElementById('draft-status').textContent)", 4000);
    await ev("document.getElementById('submit-code').click()");
    check("Correct solution: card says all 4 checks passed", await waitFor("document.getElementById('attempt-result').dataset.state === 'passed'", 120000) && /Passed: all 4 checks/.test((await card()).text), JSON.stringify(await card()));
    check("No JavaScript errors on the journey", jsErrors.length === 0, jsErrors.join(" | "));
} catch (error) {
    failed++; console.log("FAIL unexpected — " + error.message);
} finally {
    try { await send("Browser.close"); } catch { chrome.kill(); }
    server.close(); db.close(); await sleep(300);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passed} passed, ${failed} failed (real Python via Pyodide, ${path.basename(chromePath)})`);
process.exit(failed ? 1 : 0);
