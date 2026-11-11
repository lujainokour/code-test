/* Community posts, replies, reactions, moderation, audit and notifications.
   Browser-local prototype: every rule here is enforced in this browser only. A server must
   enforce the same rules before real users share content. All text is stored as plain text
   and must be rendered with textContent, never parsed as HTML. */
(() => {
    "use strict";
    const key = "codementor-community-v1"; // payload version 2; version 1 is migrated on read
    const membership = () => window.communityMembership;
    const LIMITS = Object.freeze({title: 140, body: 5000, code: 4000, reply: 2000, tags: 5, tag: 24, report: 500, reason: 500});
    const RATE = Object.freeze({windowMs: 5 * 60 * 1000, posts: 3, replies: 10});
    const LANGUAGES = Object.freeze({python: "Python", javascript: "JavaScript", text: "Plain text"});
    const REACTIONS = Object.freeze({helpful: "Helpful", thanks: "Thanks"});
    const PAGE_SIZE = 10;
    const MODERATION = ["visible", "hidden", "removed"];
    const emailOf = v => String(v || "").trim().toLowerCase();
    const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
    const isDate = v => Number.isFinite(Date.parse(v));
    const ownerList = v => Array.isArray(v) && v.every(x => isText(x, 254));

    // Plain-text normalisation. HTML is never interpreted: tags stay literal text and the UI uses textContent.
    function plain(value, max, label, {allowEmpty = false, keepIndent = false} = {}) {
        if (typeof value !== "string") value = "";
        // Remove control characters except tab/newline; normalise line endings.
        let text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
        text = keepIndent ? text.replace(/^\n+|\s+$/g, "") : text.trim();
        if (!text && allowEmpty) return "";
        if (!text || text.length > max) throw Error(`${label} must contain 1–${max} characters.`);
        return text;
    }
    function tagsOf(value) {
        const list = (Array.isArray(value) ? value : String(value || "").split(","))
            .map(t => String(t).trim().toLowerCase().replace(/^#/, "")).filter(Boolean);
        const unique = [...new Set(list)];
        if (unique.length > LIMITS.tags) throw Error(`Use at most ${LIMITS.tags} tags.`);
        for (const tag of unique) if (tag.length > LIMITS.tag || !/^[a-z0-9][a-z0-9+#.-]*$/.test(tag)) throw Error(`Tags use letters, numbers, + # . - only (up to ${LIMITS.tag} characters): "${tag.slice(0, 30)}".`);
        return unique;
    }
    function codeOf(code, language) {
        const text = plain(code, LIMITS.code, "Code block", {allowEmpty: true, keepIndent: true});
        if (!text) return null;
        if (!Object.hasOwn(LANGUAGES, language)) throw Error("Choose a language label for the code block.");
        return {language, text};
    }

    // ---------- storage ----------
    function validPost(p) {
        return isText(p.id, 100) && isText(p.owner, 254) && isText(p.name, 160) && isDate(p.createdAt) && Object.hasOwn(membership().catalogue, p.channel) &&
            isText(p.title, LIMITS.title) && typeof p.body === "string" && p.body.length <= LIMITS.body &&
            (p.code === null || (p.code && Object.hasOwn(LANGUAGES, p.code.language) && isText(p.code.text, LIMITS.code))) &&
            Array.isArray(p.tags) && p.tags.length <= LIMITS.tags && p.tags.every(t => isText(t, LIMITS.tag)) &&
            p.reactions && Object.keys(REACTIONS).every(r => ownerList(p.reactions[r])) && ownerList(p.saved) && typeof p.solved === "boolean" &&
            (p.editedAt === null || isDate(p.editedAt)) && Array.isArray(p.replies) && p.replies.every(r => isText(r.id, 100) && isText(r.owner, 254) && isText(r.name, 160) && isDate(r.createdAt) && isText(r.body, LIMITS.reply)) &&
            Array.isArray(p.reports) && p.reports.every(r => isText(r.id, 100) && isText(r.reporter, 254) && isText(r.reason, LIMITS.report) && ["open", "resolved"].includes(r.status)) &&
            p.moderation && MODERATION.includes(p.moderation.state);
    }
    function migrateV1(data) {
        const map = membership().legacy;
        return {
            version: 2, audit: [], seen: {}, activity: {},
            posts: data.posts.map(p => {
                const example = p.example === true || p.owner === "community-guide";
                return {
                    id: p.id, channel: map[p.channel] || p.channel, owner: p.owner, name: example ? "Community guide (SAMPLE)" : p.name, createdAt: p.createdAt, editedAt: null,
                    title: p.title, body: p.body, code: null, tags: [], reactions: {helpful: [...(p.likes || [])], thanks: []}, saved: [...(p.saved || [])],
                    solved: false, replies: (p.replies || []).map(r => ({id: r.id, owner: r.owner, name: r.name, createdAt: r.createdAt, body: r.body})),
                    reports: [], moderation: {state: "visible"}, ...(example ? {sample: true} : {})
                };
            })
        };
    }
    function read() {
        let data;
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return {version: 2, posts: [], audit: [], seen: {}, activity: {}};
            data = JSON.parse(raw);
            if (data?.version === 1 && Array.isArray(data.posts)) data = migrateV1(data);
            if (data?.version !== 2 || !Array.isArray(data.posts) || !data.posts.every(validPost) || new Set(data.posts.map(p => p.id)).size !== data.posts.length ||
                !Array.isArray(data.audit) || typeof data.seen !== "object" || !data.seen || typeof data.activity !== "object" || !data.activity) throw Error();
            return data;
        } catch { throw Error("Saved discussions could not be read. Existing data was kept. Restore browser storage before posting."); }
    }
    function write(data) {
        try { localStorage.setItem(key, JSON.stringify(data)); }
        catch { throw Error("Discussions could not be saved. Browser storage is unavailable or full."); }
    }
    async function transaction(check, change) {
        check();
        if (!navigator.locks?.request) throw Error("Open the site on localhost or HTTPS in a supported browser to save discussions.");
        const result = await navigator.locks.request(key, async () => {
            const actor = check(), data = read(), value = change(data, actor);
            check(); write(data); return value;
        });
        window.dispatchEvent(new Event("community-changed"));
        return result;
    }
    const studentOf = expected => {
        const account = window.platformStore.student(expected);
        return {email: emailOf(account.email), name: account.name.trim()};
    };
    function adminSession() {
        const a = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null");
        if (a?.role !== "admin" || a.isDemo !== true || !Number.isFinite(a.signedInAt) || a.signedInAt > Date.now() || Date.now() - a.signedInAt >= 8 * 3600000) throw Error("Sign in as an administrator to moderate the community.");
        return {email: "admin"};
    }
    const approved = (channel, owner) => { try { return membership().state(channel, owner) === "approved"; } catch { return false; } };
    function findPost(data, id, owner) {
        const post = data.posts.find(p => p.id === id);
        if (!post || post.moderation.state === "removed") throw Error("This post was removed. Refresh the discussions and try again.");
        membership().assertMember(post.channel, owner);
        if (post.moderation.state === "hidden" && post.owner !== owner) throw Error("This post is hidden by a moderator.");
        return post;
    }
    function rateCheck(data, owner, kind) {
        const now = Date.now(), list = (data.activity[owner] || []).filter(a => now - a.t < RATE.windowMs);
        const used = list.filter(a => a.k === kind).length, limit = kind === "post" ? RATE.posts : RATE.replies;
        if (used >= limit) {
            const wait = Math.ceil((RATE.windowMs - (now - list.filter(a => a.k === kind)[0].t)) / 60000);
            throw Error(`You are posting quickly. Please wait about ${wait} minute${wait === 1 ? "" : "s"} before adding another ${kind}.`);
        }
        list.push({t: now, k: kind}); data.activity[owner] = list.slice(-30);
    }
    function audit(data, entry) {
        data.audit.push({id: crypto.randomUUID(), at: new Date().toISOString(), actor: "admin", reason: "", ...entry});
        if (data.audit.length > 500) data.audit.splice(0, data.audit.length - 500);
    }

    // ---------- student actions ----------
    function createPost(fields, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const channel = fields?.channel;
            if (!Object.hasOwn(membership().catalogue, channel)) throw Error("Choose a discussion channel.");
            membership().assertMember(channel, me.email);
            const post = {
                id: crypto.randomUUID(), channel, owner: me.email, name: me.name, createdAt: new Date().toISOString(), editedAt: null,
                title: plain(fields.title, LIMITS.title, "Title"), body: plain(fields.body, LIMITS.body, "Post", {allowEmpty: Boolean(String(fields.code || "").trim())}),
                code: codeOf(fields.code, fields.language), tags: tagsOf(fields.tags), reactions: {helpful: [], thanks: []}, saved: [], solved: false,
                replies: [], reports: [], moderation: {state: "visible"}
            };
            rateCheck(data, me.email, "post");
            data.posts.push(post); return post.id;
        });
    }
    function editPost(id, fields, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("You can only edit your own posts.");
            const title = plain(fields.title, LIMITS.title, "Title"), code = codeOf(fields.code, fields.language);
            const body = plain(fields.body, LIMITS.body, "Post", {allowEmpty: Boolean(code)}), tags = tagsOf(fields.tags);
            const changed = title !== post.title || body !== post.body || JSON.stringify(code) !== JSON.stringify(post.code) || JSON.stringify(tags) !== JSON.stringify(post.tags);
            if (!changed) return false;
            Object.assign(post, {title, body, code, tags, editedAt: new Date().toISOString()});
            return true;
        });
    }
    function deletePost(id, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("You can only delete your own posts.");
            data.posts.splice(data.posts.indexOf(post), 1);
        });
    }
    function reply(id, body, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.moderation.state !== "visible") throw Error("Replies are closed while a moderator reviews this post.");
            const record = {id: crypto.randomUUID(), owner: me.email, name: me.name, createdAt: new Date().toISOString(), body: plain(body, LIMITS.reply, "Reply")};
            rateCheck(data, me.email, "reply");
            post.replies.push(record); return record.id;
        });
    }
    function deleteReply(id, replyId, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email), target = post.replies.find(r => r.id === replyId);
            if (!target || target.owner !== me.email) throw Error("You can only delete your own replies.");
            post.replies.splice(post.replies.indexOf(target), 1);
        });
    }
    function react(id, reaction, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            if (!Object.hasOwn(REACTIONS, reaction)) throw Error("Unknown reaction.");
            const list = findPost(data, id, me.email).reactions[reaction], i = list.indexOf(me.email);
            if (i < 0) list.push(me.email); else list.splice(i, 1);
            return i < 0;
        });
    }
    function toggleSaved(id, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const list = findPost(data, id, me.email).saved, i = list.indexOf(me.email);
            if (i < 0) list.push(me.email); else list.splice(i, 1);
            return i < 0;
        });
    }
    function setSolved(id, solved, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("Only the author can mark a post as solved.");
            post.solved = Boolean(solved); return post.solved;
        });
    }
    function report(id, reason, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner === me.email) throw Error("You cannot report your own post. Edit or delete it instead.");
            if (post.reports.some(r => r.reporter === me.email && r.status === "open")) throw Error("You already reported this post. A moderator will review it.");
            post.reports.push({id: crypto.randomUUID(), reporter: me.email, reason: plain(reason, LIMITS.report, "Report reason"), createdAt: new Date().toISOString(), status: "open"});
        });
    }
    // No private messages exist in the community. Learners under 18 can never be contacted privately.
    function contactPolicy(targetAge) {
        if (!Number.isInteger(targetAge) || targetAge < 18) return {allowed: false, reason: "Learners under 18 cannot be contacted privately."};
        return {allowed: false, reason: "Private messages are not available in the community."};
    }

    // ---------- reading ----------
    const helpful = p => p.reactions.helpful.length;
    function view(p, owner) {
        return {
            id: p.id, channel: p.channel, name: p.name, mine: p.owner === owner, sample: p.sample === true, createdAt: p.createdAt, editedAt: p.editedAt,
            title: p.title, body: p.body, code: p.code ? {...p.code} : null, tags: [...p.tags], solved: p.solved,
            reactions: Object.fromEntries(Object.keys(REACTIONS).map(r => [r, {count: p.reactions[r].length, mine: p.reactions[r].includes(owner)}])),
            saved: p.saved.includes(owner), hidden: p.moderation.state === "hidden", hiddenReason: p.moderation.state === "hidden" ? p.moderation.reason || "" : "",
            reportedByMe: p.reports.some(r => r.reporter === owner && r.status === "open"),
            replies: p.replies.map(r => ({id: r.id, name: r.name, mine: r.owner === owner, sample: r.sample === true, createdAt: r.createdAt, body: r.body}))
        };
    }
    // Only channels the student is approved for; hidden posts only for their author; removed posts never.
    function query(options = {}, expected) {
        const me = studentOf(expected), data = read();
        const {channel = "all", search = "", tag = "", status = "all", sort = "latest", page = 1, pageSize = PAGE_SIZE} = options;
        const allowed = new Set(Object.keys(membership().catalogue).filter(c => approved(c, me.email)));
        let posts = data.posts.filter(p => allowed.has(p.channel) && p.moderation.state !== "removed" && (p.moderation.state === "visible" || p.owner === me.email));
        const tags = [...new Set(posts.flatMap(p => p.tags))].sort();
        if (channel === "saved") posts = posts.filter(p => p.saved.includes(me.email));
        else if (channel !== "all") posts = posts.filter(p => p.channel === channel);
        const q = String(search).trim().toLowerCase();
        if (q) posts = posts.filter(p => [p.title, p.body, p.code?.text || "", p.name, p.tags.join(" ")].join("\n").toLowerCase().includes(q));
        if (tag) posts = posts.filter(p => p.tags.includes(tag));
        if (status === "solved") posts = posts.filter(p => p.solved);
        if (status === "unsolved") posts = posts.filter(p => !p.solved);
        if (status === "unanswered") posts = posts.filter(p => p.replies.length === 0);
        const latest = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
        posts.sort(sort === "helpful" ? (a, b) => helpful(b) - helpful(a) || latest(a, b) : sort === "replies" ? (a, b) => b.replies.length - a.replies.length || latest(a, b) : latest);
        const size = Math.max(1, Math.min(50, Number(pageSize) || PAGE_SIZE)), pages = Math.max(1, Math.ceil(posts.length / size));
        const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pages);
        return {items: posts.slice((current - 1) * size, current * size).map(p => view(p, me.email)), total: posts.length, page: current, pages, tags, channels: [...allowed]};
    }

    // ---------- notifications ----------
    function notifications(expected) {
        const me = studentOf(expected), data = read(), since = Date.parse(data.seen[me.email] || 0) || 0, items = [];
        for (const p of data.posts) {
            if (p.owner !== me.email || p.moderation.state === "removed") continue;
            for (const r of p.replies) if (r.owner !== me.email && Date.parse(r.createdAt) > since) items.push({type: "reply", postId: p.id, title: p.title, name: r.name, at: r.createdAt});
        }
        for (const d of membership().myDecisions(me.email)) if (Date.parse(d.updatedAt) > since) items.push({type: "membership", channel: d.channel, status: d.status, note: d.note, at: d.updatedAt});
        items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
        return {count: items.length, items};
    }
    function markNotificationsRead(expected) {
        return transaction(() => studentOf(expected), (data, me) => { data.seen[me.email] = new Date().toISOString(); });
    }

    // ---------- moderation (admin) ----------
    function queue() {
        adminSession();
        return read().posts.filter(p => p.reports.some(r => r.status === "open") || p.moderation.state !== "visible").map(p => ({
            id: p.id, channel: p.channel, title: p.title, body: p.body, code: p.code ? {...p.code} : null, author: p.name, sample: p.sample === true, createdAt: p.createdAt,
            moderation: {...p.moderation}, reports: p.reports.map(r => ({id: r.id, reason: r.reason, createdAt: r.createdAt, status: r.status}))
        })).sort((a, b) => b.reports.filter(r => r.status === "open").length - a.reports.filter(r => r.status === "open").length);
    }
    function moderate(id, action, reason) {
        return transaction(adminSession, data => {
            const post = data.posts.find(p => p.id === id);
            if (!post) throw Error("This post no longer exists.");
            const why = plain(reason, LIMITS.reason, "Reason");
            const from = post.moderation.state;
            const allowed = {hide: ["visible"], restore: ["hidden"], remove: ["visible", "hidden"], dismiss: ["visible", "hidden"]}[action];
            if (!allowed || !allowed.includes(from)) throw Error("This post changed. Refresh the review queue.");
            const at = new Date().toISOString();
            if (action === "hide") post.moderation = {state: "hidden", reason: why, at};
            if (action === "restore") post.moderation = {state: "visible", reason: why, at};
            if (action === "remove") {
                // Content is erased; a tombstone keeps the id for the audit trail.
                Object.assign(post, {title: "Removed by a moderator", body: "", code: null, tags: [], replies: [], moderation: {state: "removed", reason: why, at}});
            }
            post.reports.forEach(r => { if (r.status === "open") { r.status = "resolved"; r.resolution = action; } });
            audit(data, {action: "post-" + (action === "dismiss" ? "reports-dismissed" : action === "hide" ? "hidden" : action === "restore" ? "restored" : "removed"), targetType: "post", targetId: id, channel: post.channel, reason: why, detail: `${from} → ${post.moderation.state}`});
        });
    }
    function auditLog() { adminSession(); return structuredClone(read().audit); }

    // ---------- SAMPLE data (explicit admin action only) ----------
    const S = "sample-community-";
    const sampleAuthor = n => ({owner: `sample-learner-${n}@sample.invalid`, name: `Sample Learner ${n} (SAMPLE)`});
    function samplePosts(now) {
        const at = hours => new Date(now - hours * 3600000).toISOString();
        const post = (id, channel, n, hours, title, body, code, tags, extra = {}) => ({
            id: S + id, channel, ...sampleAuthor(n), createdAt: at(hours), editedAt: null, title: "[SAMPLE] " + title, body, code, tags,
            reactions: {helpful: [], thanks: []}, saved: [], solved: false, replies: [], reports: [], moderation: {state: "visible"}, sample: true, ...extra
        });
        const reply = (id, n, hours, body) => ({id: S + id, ...sampleAuthor(n), createdAt: at(hours), body, sample: true});
        return [
            post("py-1", "python", 1, 30, "Why does my loop print one number too few?", "Sample post for demonstrations. I expected 1 to 5.", {language: "python", text: "for i in range(1, 5):\n    print(i)"}, ["loops", "range"],
                {solved: true, replies: [reply("py-1-r1", 2, 29, "range(1, 5) stops before 5. Use range(1, 6) to include it.")]}),
            post("py-2", "python", 3, 20, "Study note: f-strings in one minute", "Sample note. Put an f before the quotes and wrap names in braces.", {language: "python", text: "name = \"Ada\"\nprint(f\"Hello, {name}!\")"}, ["strings", "notes"]),
            post("py-3", "python", 2, 6, "KeyError when reading a dictionary", "Sample question. How do I avoid the error when a key is missing?", {language: "python", text: "scores = {\"a\": 1}\nprint(scores[\"b\"])"}, ["dict", "errors"],
                {replies: [reply("py-3-r1", 1, 5, "Try scores.get(\"b\", 0) to return a default instead.")]}),
            post("js-1", "javascript", 4, 26, "let vs const: which should I use?", "Sample discussion. When do you pick each one?", null, ["variables"],
                {replies: [reply("js-1-r1", 5, 25, "Default to const; use let only when you reassign the variable.")]}),
            post("js-2", "javascript", 5, 8, "Array.map returns undefined values", "Sample question about a missing return.", {language: "javascript", text: "const doubled = [1, 2, 3].map(n => { n * 2 });"}, ["arrays", "functions"],
                {solved: true, replies: [reply("js-2-r1", 4, 7, "Braces need an explicit return: n => { return n * 2; } or n => n * 2.")]}),
            post("help-1", "help", 6, 12, "How do I ask a good question here?", "Sample guidance post. Share the lesson, what you expected, what happened and a small code example.", null, ["guide"]),
            post("help-2", "help", 3, 2, "Placement test: can I retake it?", "Sample question. I placed lower than I hoped.", null, ["placement"],
                {replies: [reply("help-2-r1", 6, 1, "Yes. A retake updates the recommendation; your completed work is kept.")]})
        ];
    }
    function sampleStatus() {
        const posts = read().posts.filter(p => p.sample === true);
        return {loaded: posts.length > 0, posts: posts.length, replies: posts.reduce((n, p) => n + p.replies.filter(r => r.sample === true).length, 0)};
    }
    function loadSample() {
        return transaction(adminSession, data => {
            let added = 0;
            for (const p of samplePosts(Date.now())) if (!data.posts.some(x => x.id === p.id)) { data.posts.push(p); added++; }
            audit(data, {action: "sample-loaded", targetType: "sample", targetId: "community", reason: `${added} sample post(s) added`});
            return added;
        });
    }
    // Removes sample posts and sample replies only. Real replies on a sample post would be lost with it,
    // so that requires an explicit confirmation flag.
    function removeSample({includeRealReplies = false} = {}) {
        return transaction(adminSession, data => {
            const samples = data.posts.filter(p => p.sample === true);
            const realReplies = samples.reduce((n, p) => n + p.replies.filter(r => r.sample !== true).length, 0);
            if (realReplies && !includeRealReplies) {
                const error = Error(`${realReplies} real repl${realReplies === 1 ? "y is" : "ies are"} attached to sample posts. Confirm to remove them with the sample data.`);
                error.realReplies = realReplies; throw error;
            }
            data.posts = data.posts.filter(p => p.sample !== true);
            for (const p of data.posts) p.replies = p.replies.filter(r => r.sample !== true);
            audit(data, {action: "sample-removed", targetType: "sample", targetId: "community", reason: `${samples.length} sample post(s) removed`});
            return {posts: samples.length, realReplies};
        });
    }

    function subscribe(callback) {
        const keys = [key, membership().key, "codementor-profile-v1", "codementor-platform-v1", null];
        window.addEventListener("storage", event => { if (keys.includes(event.key)) callback(); });
        for (const type of ["community-changed", "community-membership-changed", "student-account-changed"]) window.addEventListener(type, callback);
    }

    window.communityStore = Object.freeze({
        key, LIMITS, RATE, LANGUAGES, REACTIONS, PAGE_SIZE,
        createPost, editPost, deletePost, reply, deleteReply, react, toggleSaved, setSolved, report, contactPolicy,
        query, notifications, markNotificationsRead,
        queue, moderate, auditLog, sampleStatus, loadSample, removeSample, subscribe
    });
})();
