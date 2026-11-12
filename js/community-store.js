/* Community posts, replies, reactions, moderation, audit and notifications.
   Browser-local prototype: every rule here is enforced in this browser only. A server must
   enforce the same rules before real users share content. All text is stored as plain text
   and must be rendered with textContent, never parsed as HTML. */
(() => {
    "use strict";
    const key = "codementor-community-v1"; // payload version 4; versions 1-3 are migrated on read
    const membership = () => window.communityMembership;
    // GROUPS: one per catalog language plus General, Help and Show your project, and private study
    // groups (all listed in js/community-membership.js). Every group needs administrator approval
    // unless an administrator explicitly opens it (audited). Study groups always need approval.
    const groupsMeta = () => membership().groups;
    const isChannel = id => Object.hasOwn(membership().catalogue, id);
    const channelLabel = id => membership().catalogue[id] || id;
    const TOPIC_TEXT = Object.freeze({general: "Introductions, study habits and everything else.", help: "Stuck? Ask here and include what you tried.", projects: "Share what you are building and get feedback."});
    function describe(id) {
        const g = groupsMeta()[id];
        if (!g) return "";
        if (g.kind === "language") return g.comingSoon ? `${g.label} learners. The learning path is coming soon; questions are welcome.` : `${g.label} questions, tips and code reviews.`;
        if (g.kind === "study") return "A small private study group.";
        return TOPIC_TEXT[id] || "";
    }
    // Before groups needed approval, these channels were open to every student.
    const FORMERLY_OPEN = Object.freeze(["general", "help", "projects", "python", "javascript", "csharp", "cpp"]);
    const LIMITS = Object.freeze({title: 140, body: 5000, code: 4000, reply: 2000, tags: 5, tag: 24, report: 500, reason: 500});
    const RATE = Object.freeze({windowMs: 5 * 60 * 1000, posts: 3, replies: 10});
    const LANGUAGES = Object.freeze({python: "Python", javascript: "JavaScript", csharp: "C#", cpp: "C++", text: "Plain text"});
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
    // "Related lesson/task" link on a post: an id from the curriculum and a short title, shown as a link.
    const validRelated = r => r && ["lesson", "task"].includes(r.kind) && typeof r.id === "string" && /^[a-z0-9-]{1,60}$/.test(r.id) && isText(r.title, LIMITS.title);
    function relatedOf(value) {
        if (value === undefined || value === null || value === "") return null;
        const related = {kind: value.kind, id: value.id, title: typeof value.title === "string" ? value.title.trim() : value.title};
        if (!validRelated(related)) throw Error("The related lesson or task link is not valid. Remove it and try again.");
        return related;
    }
    function codeOf(code, language) {
        const text = plain(code, LIMITS.code, "Code block", {allowEmpty: true, keepIndent: true});
        if (!text) return null;
        if (!Object.hasOwn(LANGUAGES, language)) throw Error("Choose a language label for the code block.");
        return {language, text};
    }

    // ---------- storage ----------
    function validPost(p) {
        return isText(p.id, 100) && isText(p.owner, 254) && isText(p.name, 160) && isDate(p.createdAt) && isChannel(p.channel) &&
            isText(p.title, LIMITS.title) && typeof p.body === "string" && p.body.length <= LIMITS.body &&
            (p.code === null || (p.code && Object.hasOwn(LANGUAGES, p.code.language) && isText(p.code.text, LIMITS.code))) &&
            Array.isArray(p.tags) && p.tags.length <= LIMITS.tags && p.tags.every(t => isText(t, LIMITS.tag)) &&
            p.reactions && Object.keys(REACTIONS).every(r => ownerList(p.reactions[r])) && ownerList(p.saved) && typeof p.solved === "boolean" &&
            (p.editedAt === null || isDate(p.editedAt)) && Array.isArray(p.replies) && p.replies.every(r => isText(r.id, 100) && isText(r.owner, 254) && isText(r.name, 160) && isDate(r.createdAt) && isText(r.body, LIMITS.reply) &&
                (r.parentId === undefined || r.parentId === null || isText(r.parentId, 100)) && (r.editedAt === undefined || r.editedAt === null || isDate(r.editedAt)) && (r.helpful === undefined || ownerList(r.helpful))) &&
            (p.acceptedReplyId === undefined || p.acceptedReplyId === null || isText(p.acceptedReplyId, 100)) &&
            Array.isArray(p.reports) && p.reports.every(r => isText(r.id, 100) && isText(r.reporter, 254) && isText(r.reason, LIMITS.report) && ["open", "resolved"].includes(r.status)) &&
            p.moderation && MODERATION.includes(p.moderation.state) &&
            (p.solvedAt === undefined || p.solvedAt === null || isDate(p.solvedAt)) &&
            (p.related === undefined || p.related === null || validRelated(p.related)) &&
            (p.pinned === undefined || typeof p.pinned === "boolean") && (p.locked === undefined || typeof p.locked === "boolean");
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
    function migrateV2(data) {
        const map = membership().legacy;
        return {...data, version: 3, channelSeen: {}, posts: data.posts.map(p => ({...p, channel: map[p.channel] || p.channel}))};
    }
    function migrateV3(data) {
        const at = new Date().toISOString(), groupModes = {}, audit = [...data.audit];
        for (const id of FORMERLY_OPEN) {
            if (!data.posts.some(p => p.channel === id && p.moderation.state !== "removed")) continue;
            groupModes[id] = {mode: "open", at, by: "migration"};
            audit.push({id: crypto.randomUUID(), at, actor: "system", action: "group-kept-open", targetType: "group", targetId: id, channel: id, reason: "Had posts while every channel was open; kept open so no student loses access. An administrator can switch it to approval required."});
        }
        return {...data, version: 4, groupModes, audit};
    }
    const validModes = m => m && typeof m === "object" && Object.entries(m).every(([id, v]) => isChannel(id) && groupsMeta()[id].kind !== "study" && ["open", "approval"].includes(v?.mode) && isDate(v.at));
    function read() {
        let data;
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return {version: 4, posts: [], audit: [], seen: {}, activity: {}, channelSeen: {}, groupModes: {}};
            data = JSON.parse(raw);
            if (data?.version === 1 && Array.isArray(data.posts)) data = migrateV1(data);
            if (data?.version === 2 && Array.isArray(data.posts)) data = migrateV2(data);
            if (data?.version === 3 && Array.isArray(data.posts) && Array.isArray(data.audit)) data = migrateV3(data);
            if (data?.version !== 4 || !validModes(data.groupModes) || !Array.isArray(data.posts) || !data.posts.every(validPost) || new Set(data.posts.map(p => p.id)).size !== data.posts.length ||
                !Array.isArray(data.audit) || typeof data.seen !== "object" || !data.seen || typeof data.activity !== "object" || !data.activity ||
                typeof data.channelSeen !== "object" || !data.channelSeen) throw Error();
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
    function modeOf(data, id) { return groupsMeta()[id]?.kind === "study" ? "approval" : data.groupModes?.[id]?.mode === "open" ? "open" : "approval"; }
    // Approval-required groups: approved members only. Groups an administrator opened: any signed-in,
    // enabled student (checked by studentOf).
    function assertAccess(data, channel, owner) {
        if (!isChannel(channel)) throw Error("Choose a discussion group.");
        if (modeOf(data, channel) === "open") return;
        membership().assertMember(channel, owner);
    }
    function findPost(data, id, owner) {
        const post = data.posts.find(p => p.id === id);
        if (!post || post.moderation.state === "removed") throw Error("This post was removed. Refresh the discussions and try again.");
        assertAccess(data, post.channel, owner);
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
            assertAccess(data, channel, me.email);
            const post = {
                id: crypto.randomUUID(), channel, owner: me.email, name: me.name, createdAt: new Date().toISOString(), editedAt: null,
                title: plain(fields.title, LIMITS.title, "Title"), body: plain(fields.body, LIMITS.body, "Post", {allowEmpty: Boolean(String(fields.code || "").trim())}),
                code: codeOf(fields.code, fields.language), tags: tagsOf(fields.tags), related: relatedOf(fields.related), reactions: {helpful: [], thanks: []}, saved: [], solved: false,
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
    // Deleted posts can be restored by their author from the same tab for a short window (Undo).
    // The snapshot is kept in memory only, so it can never be forged from storage or another tab.
    const UNDO_WINDOW_MS = 6000;
    const recentlyDeleted = new Map();
    function deletePost(id, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("You can only delete your own posts.");
            data.posts.splice(data.posts.indexOf(post), 1);
            recentlyDeleted.set(id, { snapshot: JSON.parse(JSON.stringify(post)), owner: me.email, at: Date.now() });
        });
    }
    function undoDelete(id, expected, now = Date.now()) {
        return transaction(() => studentOf(expected), (data, me) => {
            const entry = recentlyDeleted.get(id);
            if (!entry || entry.owner !== me.email) throw Error("This post can no longer be restored.");
            if (now - entry.at > UNDO_WINDOW_MS) { recentlyDeleted.delete(id); throw Error("The undo window has closed. The post stays deleted."); }
            if (data.posts.some(p => p.id === id)) throw Error("This post already exists. Nothing was changed.");
            assertAccess(data, entry.snapshot.channel, me.email);
            if (!validPost(entry.snapshot)) throw Error("This post can no longer be restored.");
            data.posts.push(entry.snapshot);
            recentlyDeleted.delete(id);
            return true;
        });
    }
    // Replies are threaded one level deep: answering a nested reply attaches to its top-level reply.
    function reply(id, body, expected, parentId = null) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.moderation.state !== "visible") throw Error("Replies are closed while a moderator reviews this post.");
            if (post.locked) throw Error("This thread is locked by a moderator. New replies are closed.");
            let parent = null;
            if (parentId) {
                const target = post.replies.find(r => r.id === parentId);
                if (!target) throw Error("The reply you answered was deleted. Refresh and try again.");
                parent = target.parentId || target.id;
            }
            const record = {id: crypto.randomUUID(), owner: me.email, name: me.name, createdAt: new Date().toISOString(), body: plain(body, LIMITS.reply, "Reply"), parentId: parent, editedAt: null, helpful: []};
            rateCheck(data, me.email, "reply");
            post.replies.push(record); return record.id;
        });
    }
    function deleteReply(id, replyId, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email), target = post.replies.find(r => r.id === replyId);
            if (!target || target.owner !== me.email) throw Error("You can only delete your own replies.");
            post.replies.splice(post.replies.indexOf(target), 1);
            if (post.acceptedReplyId === replyId) post.acceptedReplyId = null;
            for (const r of post.replies) if (r.parentId === replyId) r.parentId = null; // keep answers to it
        });
    }
    function editReply(id, replyId, body, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email), target = post.replies.find(r => r.id === replyId);
            if (!target || target.owner !== me.email) throw Error("You can only edit your own replies.");
            const text = plain(body, LIMITS.reply, "Reply");
            if (text === target.body) return false;
            target.body = text; target.editedAt = new Date().toISOString(); return true;
        });
    }
    function reactReply(id, replyId, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const target = findPost(data, id, me.email).replies.find(r => r.id === replyId);
            if (!target) throw Error("This reply was deleted. Refresh and try again.");
            if (target.owner === me.email) throw Error("You cannot mark your own reply as helpful.");
            const list = target.helpful || (target.helpful = []), i = list.indexOf(me.email);
            if (i < 0) list.push(me.email); else list.splice(i, 1);
            return i < 0;
        });
    }
    // The author accepts one reply from someone else; that also marks the post solved.
    function acceptAnswer(id, replyId, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("Only the author can accept an answer.");
            const before = {replyId: post.acceptedReplyId || null, solved: post.solved, solvedAt: post.solvedAt || null};
            if (replyId === null) { post.acceptedReplyId = null; return before; }
            const target = post.replies.find(r => r.id === replyId);
            if (!target) throw Error("This reply was deleted. Refresh and try again.");
            if (target.owner === me.email) throw Error("You cannot accept your own reply.");
            post.acceptedReplyId = replyId;
            if (!post.solved) { post.solved = true; post.solvedAt = new Date().toISOString(); }
            return before;
        });
    }
    // Undo for acceptAnswer: puts back exactly what the author had before.
    function restoreAcceptance(id, before, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            const post = findPost(data, id, me.email);
            if (post.owner !== me.email) throw Error("Only the author can change the accepted answer.");
            post.acceptedReplyId = before.replyId && post.replies.some(r => r.id === before.replyId) ? before.replyId : null;
            post.solved = Boolean(before.solved); post.solvedAt = post.solved ? before.solvedAt : null;
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
            post.solved = Boolean(solved); post.solvedAt = post.solved ? new Date().toISOString() : null; return post.solved;
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
    function view(p, owner, people = null) {
        const badgesOf = who => people?.get(who)?.badges ? [...people.get(who).badges] : [];
        return {
            authorBadges: badgesOf(p.owner),
            id: p.id, channel: p.channel, name: p.name, mine: p.owner === owner, sample: p.sample === true, createdAt: p.createdAt, editedAt: p.editedAt,
            title: p.title, body: p.body, code: p.code ? {...p.code} : null, tags: [...p.tags], solved: p.solved, solvedAt: p.solvedAt || null,
            reactions: Object.fromEntries(Object.keys(REACTIONS).map(r => [r, {count: p.reactions[r].length, mine: p.reactions[r].includes(owner)}])),
            saved: p.saved.includes(owner), hidden: p.moderation.state === "hidden", hiddenReason: p.moderation.state === "hidden" ? p.moderation.reason || "" : "",
            reportedByMe: p.reports.some(r => r.reporter === owner && r.status === "open"),
            acceptedReplyId: p.acceptedReplyId || null, locked: p.locked === true, pinned: p.pinned === true, related: p.related ? {...p.related} : null,
            replies: p.replies.map(r => ({id: r.id, name: r.name, mine: r.owner === owner, badges: badgesOf(r.owner), sample: r.sample === true, createdAt: r.createdAt, body: r.body,
                parentId: r.parentId || null, editedAt: r.editedAt || null, accepted: p.acceptedReplyId === r.id,
                helpful: {count: (r.helpful || []).length, mine: (r.helpful || []).includes(owner)}}))
        };
    }
    // Only channels the student may read; hidden posts only for their author; removed posts never.
    const readable = (data, owner) => new Set(Object.keys(membership().catalogue).filter(c => modeOf(data, c) === "open" || approved(c, owner)));
    function accessible(data, owner) {
        const allowed = readable(data, owner);
        return data.posts.filter(p => allowed.has(p.channel) && p.moderation.state !== "removed" && (p.moderation.state === "visible" || p.owner === owner));
    }
    const top = p => helpful(p) * 2 + p.reactions.thanks.length + p.replies.length;
    function query(options = {}, expected) {
        const me = studentOf(expected), data = read();
        const {channel = "all", search = "", tag = "", status = "all", sort = "latest", mine = false, page = 1, pageSize = PAGE_SIZE} = options;
        const allowed = readable(data, me.email);
        let posts = accessible(data, me.email);
        const tags = [...new Set(posts.flatMap(p => p.tags))].sort();
        if (channel === "saved") posts = posts.filter(p => p.saved.includes(me.email));
        else if (channel !== "all") posts = posts.filter(p => p.channel === channel);
        const q = String(search).trim().toLowerCase();
        if (q) posts = posts.filter(p => [p.title, p.body, p.code?.text || "", p.name, p.tags.join(" ")].join("\n").toLowerCase().includes(q));
        if (tag) posts = posts.filter(p => p.tags.includes(tag));
        if (status === "solved") posts = posts.filter(p => p.solved);
        if (status === "unsolved") posts = posts.filter(p => !p.solved);
        if (status === "unanswered") posts = posts.filter(p => p.replies.length === 0);
        if (mine) posts = posts.filter(p => p.owner === me.email);
        const latest = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
        const pinnedFirst = (a, b) => (b.pinned === true) - (a.pinned === true);
        posts.sort(sort === "latest" ? (a, b) => pinnedFirst(a, b) || latest(a, b) : sort === "helpful" ? (a, b) => helpful(b) - helpful(a) || latest(a, b) : sort === "replies" ? (a, b) => b.replies.length - a.replies.length || latest(a, b) : sort === "top" ? (a, b) => top(b) - top(a) || latest(a, b) : latest);
        const size = Math.max(1, Math.min(50, Number(pageSize) || PAGE_SIZE)), pages = Math.max(1, Math.ceil(posts.length / size));
        const current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), pages);
        const people = scores(accessible(data, me.email));
        return {items: posts.slice((current - 1) * size, current * size).map(p => view(p, me.email, people)), total: posts.length, page: current, pages, tags, channels: [...allowed]};
    }

    function get(id, expected) {
        const me = studentOf(expected), posts = accessible(read(), me.email), post = posts.find(p => p.id === id);
        if (!post) throw Error("This discussion is not available. It may have been removed, or you do not have access.");
        return view(post, me.email, scores(posts));
    }
    // "Similar questions": plain keyword and tag matching over saved posts the student can read. Not AI.
    const STOP = new Set("a an and are as at be but by can do does for from how i if in is it its me my no not of on or so that the this to was what when where which why with you your have has get got use using".split(" "));
    function words(text) {
        return [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_+#]+/gu) || [])]
            .map(w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w).filter(w => w.length > 2 && !STOP.has(w));
    }
    function similar(fields, expected, limit = 3) {
        const me = studentOf(expected), title = words(fields?.title || ""), body = new Set(words(String(fields?.body || "").slice(0, 400)));
        let tags = [];
        try { tags = tagsOf(fields?.tags || ""); } catch { tags = []; }
        if (title.length + tags.length < 2) return [];
        return accessible(read(), me.email).filter(p => p.moderation.state === "visible").map(p => {
            const theirs = new Set(words(p.title)), theirTags = new Set(p.tags);
            const score = title.filter(w => theirs.has(w)).length * 2 + tags.filter(t => theirTags.has(t)).length * 3 + [...theirs].filter(w => body.has(w)).length;
            return {post: p, score};
        }).filter(x => x.score >= 4).sort((a, b) => b.score - a.score || Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt)).slice(0, limit)
            .map(({post, score}) => ({id: post.id, title: post.title, channel: post.channel, solved: post.solved, replies: post.replies.length, score}));
    }

    // ---------- reputation (computed from saved data; never stored, never estimated) ----------
    // Points: an accepted answer 10, a "Helpful" on your reply 2, a "Helpful" on your post 1.
    // Reactions or answers on your own posts never count. Only posts the viewer can read are used,
    // so activity inside a private study group is invisible to non-members.
    const POINTS = Object.freeze({accepted: 10, replyHelpful: 2, postHelpful: 1});
    const BADGES = Object.freeze({
        "first-answer": Object.freeze({label: "First answer", icon: "1", description: "Replied to another member's question."}),
        "helper": Object.freeze({label: "Helper", icon: "H", description: "Replied to 5 posts by other members."}),
        "problem-solver": Object.freeze({label: "Problem solver", icon: "✓", description: "Had an answer accepted."}),
        "welcome-wagon": Object.freeze({label: "Welcome wagon", icon: "W", description: "Replied to the first post of 3 different members."})
    });
    const WEEK_MS = 7 * 86400000;
    function scores(posts, now = Date.now()) {
        const visible = posts.filter(p => p.moderation.state === "visible"), people = new Map();
        const person = (owner, name, sample) => {
            if (!people.has(owner)) people.set(owner, {name, sample: sample === true, points: 0, weekPoints: 0, accepted: 0, helpfulReceived: 0, answers: 0, welcomed: new Set(), acceptedReplyIds: []});
            return people.get(owner);
        };
        const firstPost = new Map();
        for (const p of [...visible].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) if (!firstPost.has(p.owner)) firstPost.set(p.owner, p.id);
        const add = (who, points, at) => { who.points += points; if (now - Date.parse(at) <= WEEK_MS) who.weekPoints += points; };
        for (const p of visible) {
            const author = person(p.owner, p.name, p.sample);
            const postHelpful = p.reactions.helpful.filter(x => x !== p.owner).length;
            author.helpfulReceived += postHelpful; add(author, postHelpful * POINTS.postHelpful, p.createdAt);
            for (const r of p.replies) {
                const who = person(r.owner, r.name, r.sample);
                const helpfulOnReply = (r.helpful || []).filter(x => x !== r.owner).length;
                who.helpfulReceived += helpfulOnReply; add(who, helpfulOnReply * POINTS.replyHelpful, r.createdAt);
                if (r.owner === p.owner) continue;
                who.answers++;
                if (firstPost.get(p.owner) === p.id) who.welcomed.add(p.owner);
                if (p.acceptedReplyId === r.id) { who.accepted++; who.acceptedReplyIds.push(r.id); add(who, POINTS.accepted, r.createdAt); }
            }
        }
        for (const who of people.values()) {
            who.badges = [who.answers >= 1 && "first-answer", who.answers >= 5 && "helper", who.accepted >= 1 && "problem-solver", who.welcomed.size >= 3 && "welcome-wagon"].filter(Boolean);
            delete who.welcomed;
        }
        return people;
    }
    function reputation(expected, now = Date.now()) {
        const me = studentOf(expected), people = scores(accessible(read(), me.email), now);
        const mine = people.get(me.email) || {points: 0, weekPoints: 0, accepted: 0, helpfulReceived: 0, answers: 0, badges: [], acceptedReplyIds: []};
        const helpers = [...people.entries()].filter(([, p]) => p.weekPoints > 0)
            .sort((a, b) => b[1].weekPoints - a[1].weekPoints || b[1].accepted - a[1].accepted || a[1].name.localeCompare(b[1].name)).slice(0, 5)
            .map(([owner, p]) => ({name: p.name, sample: p.sample, points: p.weekPoints, badges: [...p.badges], me: owner === me.email}));
        return {me: {name: me.name, points: mine.points, weekPoints: mine.weekPoints, accepted: mine.accepted, helpfulReceived: mine.helpfulReceived, answers: mine.answers, badges: [...mine.badges], acceptedReplyIds: [...mine.acceptedReplyIds]}, helpers, POINTS, BADGES};
    }

    // Side panels. Every number is counted from the saved posts the student can read; nothing is estimated.
    function highlights(expected, now = Date.now()) {
        const me = studentOf(expected), posts = accessible(read(), me.email).filter(p => p.moderation.state === "visible");
        const day = new Date(now); day.setHours(0, 0, 0, 0);
        const brief = p => ({id: p.id, title: p.title, channel: p.channel, name: p.name, sample: p.sample === true, createdAt: p.createdAt, replies: p.replies.length});
        const latest = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt);
        const open = posts.filter(p => p.owner !== me.email && p.replies.length === 0 && !p.solved).sort(latest);
        const solved = posts.filter(p => p.solved && p.solvedAt && Date.parse(p.solvedAt) >= day.getTime()).sort((a, b) => Date.parse(b.solvedAt) - Date.parse(a.solvedAt));
        const counts = new Map();
        for (const p of posts) if (now - Date.parse(p.createdAt) <= 14 * 86400000) for (const t of p.tags) counts.set(t, (counts.get(t) || 0) + 1);
        return {
            unanswered: open.slice(0, 3).map(brief), unansweredCount: open.length,
            solvedToday: solved.slice(0, 3).map(brief), solvedTodayCount: solved.length,
            trending: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(([tag, count]) => ({tag, count})),
            total: posts.length
        };
    }

    // Unread per channel: posts and replies by others since the student last opened that channel
    // (first visit: the last 7 days). Counted from saved data only.
    function channelSummary(expected, now = Date.now()) {
        const me = studentOf(expected), data = read(), seen = data.channelSeen[me.email] || {}, posts = accessible(data, me.email).filter(p => p.moderation.state === "visible");
        const out = {};
        for (const id of readable(data, me.email)) {
            const since = Date.parse(seen[id] || 0) || now - 7 * 86400000, mine = posts.filter(p => p.channel === id);
            out[id] = {
                total: mine.length,
                unread: mine.reduce((n, p) => n + (p.owner !== me.email && Date.parse(p.createdAt) > since ? 1 : 0) + p.replies.filter(r => r.owner !== me.email && Date.parse(r.createdAt) > since).length, 0)
            };
        }
        return out;
    }
    function markChannelSeen(channel, expected) {
        return transaction(() => studentOf(expected), (data, me) => {
            assertAccess(data, channel, me.email);
            (data.channelSeen[me.email] ||= {})[channel] = new Date().toISOString();
        });
    }

    // Every group with its access mode and this student's membership state (never other students' data).
    function groupsFor(expected) {
        const me = studentOf(expected), data = read();
        return Object.entries(groupsMeta()).map(([id, g]) => {
            let state = "none", error = "";
            try { state = membership().state(id, me.email); } catch (e) { state = "unavailable"; error = e.message; }
            const mode = modeOf(data, id);
            return {id, label: g.label, kind: g.kind, language: g.language || null, comingSoon: g.comingSoon, description: describe(id), mode, state, error, readable: mode === "open" || state === "approved"};
        });
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
    // Admin overview of groups: every count is computed from saved posts and membership records.
    function channelStats() {
        adminSession();
        const data = read(), posts = data.posts.filter(p => p.moderation.state !== "removed");
        let members = {}, pending = {};
        try { for (const r of membership().requests()) if (r.status === "approved") members[r.channel] = (members[r.channel] || 0) + 1; pending = membership().pendingCounts(); } catch { members = null; pending = null; }
        return Object.entries(groupsMeta()).map(([id, g]) => {
            const list = posts.filter(p => p.channel === id), visible = list.filter(p => p.moderation.state === "visible");
            return {id, label: g.label, kind: g.kind, comingSoon: g.comingSoon, mode: modeOf(data, id), modeBy: data.groupModes[id]?.by || "default",
                posts: visible.length, hidden: list.length - visible.length, replies: visible.reduce((n, p) => n + p.replies.length, 0), solved: visible.filter(p => p.solved).length,
                pinned: visible.filter(p => p.pinned).length, locked: visible.filter(p => p.locked).length,
                members: members ? members[id] || 0 : null, pending: pending ? pending[id] || 0 : null};
        });
    }
    // Explicit, audited switch between "Approval required" (default) and "Open". Opening needs a note.
    // Switching back to approval first keeps everyone who posted or replied there as an approved member,
    // so nobody silently loses access to their own discussions.
    async function setGroupMode(id, mode, note = "") {
        adminSession();
        if (!isChannel(id)) throw Error("Choose a group.");
        if (groupsMeta()[id].kind === "study") throw Error("Study groups are private and always need approval.");
        if (!["open", "approval"].includes(mode)) throw Error("Choose Open or Approval required.");
        const why = plain(note, LIMITS.reason, "Reason", {allowEmpty: mode === "approval"});
        const current = modeOf(read(), id);
        if (current === mode) return {mode, changed: false, kept: 0};
        let kept = 0;
        if (mode === "approval") {
            const people = new Map();
            for (const p of read().posts) if (p.channel === id && p.moderation.state !== "removed") {
                people.set(p.owner, {owner: p.owner, name: p.name, sample: p.sample === true});
                for (const r of p.replies) people.set(r.owner, {owner: r.owner, name: r.name, sample: r.sample === true});
            }
            kept = await membership().grantMany([...people.values()], id, why || "Kept as a member when the group changed to approval required.");
        }
        await transaction(adminSession, data => {
            data.groupModes[id] = {mode, at: new Date().toISOString(), by: "admin"};
            audit(data, {action: mode === "open" ? "group-opened" : "group-approval-required", targetType: "group", targetId: id, channel: id, reason: why, detail: mode === "approval" ? `${kept} existing participant(s) kept as members` : "Any signed-in student can now read and post"});
        });
        return {mode, changed: true, kept};
    }
    function adminThreads({channel = "all", limit = 25} = {}) {
        adminSession();
        return read().posts.filter(p => p.moderation.state !== "removed" && (channel === "all" || p.channel === channel))
            .sort((a, b) => (b.pinned === true) - (a.pinned === true) || Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, Math.max(1, Math.min(100, limit)))
            .map(p => ({id: p.id, title: p.title, channel: p.channel, author: p.name, sample: p.sample === true, createdAt: p.createdAt, replies: p.replies.length,
                pinned: p.pinned === true, locked: p.locked === true, state: p.moderation.state}));
    }
    function pinPost(id, pinned, reason = "") {
        return transaction(adminSession, data => {
            const post = data.posts.find(p => p.id === id);
            if (!post || post.moderation.state === "removed") throw Error("This post no longer exists.");
            if (Boolean(post.pinned) === Boolean(pinned)) return false;
            post.pinned = Boolean(pinned);
            audit(data, {action: pinned ? "post-pinned" : "post-unpinned", targetType: "post", targetId: id, channel: post.channel, reason: plain(reason, LIMITS.reason, "Reason", {allowEmpty: true})});
            return true;
        });
    }
    // Locking closes new replies (existing replies, reactions and reports stay). A reason is required.
    function lockPost(id, locked, reason) {
        return transaction(adminSession, data => {
            const post = data.posts.find(p => p.id === id);
            if (!post || post.moderation.state === "removed") throw Error("This post no longer exists.");
            const why = plain(reason, LIMITS.reason, "Reason");
            if (Boolean(post.locked) === Boolean(locked)) return false;
            post.locked = Boolean(locked);
            audit(data, {action: locked ? "thread-locked" : "thread-unlocked", targetType: "post", targetId: id, channel: post.channel, reason: why});
            return true;
        });
    }

    // ---------- SAMPLE data (explicit admin action only) ----------
    const S = "sample-community-";
    const sampleAuthor = n => ({owner: `sample-learner-${n}@sample.invalid`, name: `Sample Learner ${n} (SAMPLE)`});
    // About 30 posts across open channels and one study group, 8 fictional members, replies, accepted
    // answers and Helpful reactions. Everything is labelled SAMPLE and removable; ids are fixed so
    // loading twice adds nothing.
    function samplePosts(now) {
        const at = hours => new Date(now - hours * 3600000).toISOString();
        const owners = n => sampleAuthor(n).owner;
        const reply = (id, n, hours, body, helpfulBy = []) => ({id: S + id, ...sampleAuthor(n), createdAt: at(hours), body, sample: true, parentId: null, editedAt: null, helpful: helpfulBy.map(owners)});
        const post = (id, channel, n, hours, title, body, code, tags, extra = {}) => {
            const {replies = [], accepted = null, helpfulBy = [], solved = Boolean(accepted)} = extra;
            const list = replies.map(([rid, rn, rh, text, by]) => reply(rid, rn, rh, text, by));
            return {
                id: S + id, channel, ...sampleAuthor(n), createdAt: at(hours), editedAt: null, title: "[SAMPLE] " + title, body, code, tags,
                reactions: {helpful: helpfulBy.map(owners), thanks: []}, saved: [], solved, solvedAt: solved ? at(Math.max(0.5, (replies[0]?.[2] || hours) - 1)) : null,
                acceptedReplyId: accepted ? S + accepted : null, replies: list, reports: [], moderation: {state: "visible"}, sample: true
            };
        };
        const py = (text) => ({language: "python", text}), js = (text) => ({language: "javascript", text});
        return [
            post("py-1", "python", 1, 30, "Why does my loop print one number too few?", "Sample post for demonstrations. I expected 1 to 5.", py("for i in range(1, 5):\n    print(i)"), ["loops", "range"],
                {replies: [["py-1-r1", 2, 29, "range(1, 5) stops before 5. Use range(1, 6) to include it.", [1, 3, 4]]], accepted: "py-1-r1", helpfulBy: [3]}),
            post("py-2", "python", 3, 20, "Study note: f-strings in one minute", "Sample note. Put an f before the quotes and wrap names in braces.", py("name = \"Ada\"\nprint(f\"Hello, {name}!\")"), ["strings", "notes"], {helpfulBy: [1, 2, 5]}),
            post("py-3", "python", 2, 6, "KeyError when reading a dictionary", "Sample question. How do I avoid the error when a key is missing?", py("scores = {\"a\": 1}\nprint(scores[\"b\"])"), ["dict", "errors"],
                {replies: [["py-3-r1", 1, 5, "Try scores.get(\"b\", 0) to return a default instead.", [2]]]}),
            post("py-4", "python", 5, 50, "input() always gives me a string", "Sample question. 2 + 3 printed 23.", py("a = input()\nb = input()\nprint(a + b)"), ["input", "types"],
                {replies: [["py-4-r1", 6, 49, "Convert first: int(input()). input() returns text.", [5, 7]], ["py-4-r2", 7, 48, "And float(input()) if you need decimals.", [5]]], accepted: "py-4-r1"}),
            post("py-5", "python", 7, 70, "When should I use a while loop?", "Sample discussion. for vs while for beginners.", null, ["loops"],
                {replies: [["py-5-r1", 3, 69, "Use while when you do not know how many steps you need, like reading until the user types quit.", [7, 8]]], accepted: "py-5-r1"}),
            post("py-6", "python", 8, 4, "My function returns None", "Sample question. I print inside the function but the result is None.", py("def double(n):\n    print(n * 2)\n\nx = double(4)\nprint(x)"), ["functions"], {}),
            post("py-7", "python", 4, 90, "Tip: use enumerate instead of range(len())", "Sample tip.", py("for i, name in enumerate([\"a\", \"b\"]):\n    print(i, name)"), ["loops", "tips"], {helpfulBy: [1, 6, 8]}),
            post("py-8", "python", 6, 2, "How do I read a file line by line?", "Sample question.", null, ["files"], {}),
            post("js-1", "javascript", 4, 26, "let vs const: which should I use?", "Sample discussion. When do you pick each one?", null, ["variables"],
                {replies: [["js-1-r1", 5, 25, "Default to const; use let only when you reassign the variable.", [4, 6]]], accepted: "js-1-r1"}),
            post("js-2", "javascript", 5, 8, "Array.map returns undefined values", "Sample question about a missing return.", js("const doubled = [1, 2, 3].map(n => { n * 2 });"), ["arrays", "functions"],
                {replies: [["js-2-r1", 4, 7, "Braces need an explicit return: n => { return n * 2; } or n => n * 2.", [5, 2]]], accepted: "js-2-r1"}),
            post("js-3", "javascript", 6, 40, "== vs === in comparisons", "Sample question.", js("console.log(0 == \"0\");\nconsole.log(0 === \"0\");"), ["operators"],
                {replies: [["js-3-r1", 2, 39, "=== also compares types, so prefer it. == converts first.", [6]]]}),
            post("js-4", "javascript", 2, 12, "Why is my for loop variable undefined after the loop?", "Sample question about let scope.", js("for (let i = 0; i < 3; i++) {}\nconsole.log(i);"), ["scope", "loops"], {}),
            post("js-5", "javascript", 8, 60, "Tip: template literals", "Sample tip. Backticks let you put values inside text.", js("const name = \"Ada\";\nconsole.log(`Hi ${name}`);"), ["strings", "tips"], {helpfulBy: [4, 5]}),
            post("js-6", "javascript", 3, 3, "How do I sort numbers correctly?", "Sample question. [10, 9, 1].sort() gives [1, 10, 9].", js("[10, 9, 1].sort((a, b) => a - b);"), ["arrays"], {}),
            post("help-1", "help", 6, 12, "How do I ask a good question here?", "Sample guidance post. Share the lesson, what you expected, what happened and a small code example.", null, ["guide"], {helpfulBy: [1, 2, 3, 4]}),
            post("help-2", "help", 3, 2, "Placement test: can I retake it?", "Sample question. I placed lower than I hoped.", null, ["placement"],
                {replies: [["help-2-r1", 6, 1, "Yes. A retake updates the recommendation; your completed work is kept.", [3]]], accepted: "help-2-r1"}),
            post("help-3", "help", 1, 16, "My code works but Submit says a test fails", "Sample question.", null, ["submit", "tests"],
                {replies: [["help-3-r1", 7, 15, "Check spaces and capital letters. The expected output must match exactly.", [1, 2]]], accepted: "help-3-r1"}),
            post("help-4", "help", 4, 1, "Where do I see my saved code?", "Sample question.", null, ["workspace"], {}),
            post("help-5", "help", 8, 30, "How long should each lesson take?", "Sample question.", null, ["study"], {replies: [["help-5-r1", 5, 29, "About 15 minutes, plus practice. Go at your own pace.", []]]}),
            post("gen-1", "general", 1, 100, "Introduce yourself here", "Sample thread. Say hi and share what you are learning.", null, ["introductions"],
                {replies: [["gen-1-r1", 2, 99, "Hi! Learning Python for data work.", []], ["gen-1-r2", 3, 98, "Hello from a JavaScript beginner.", []], ["gen-1-r3", 4, 97, "Hi all, starting from zero.", []]]}),
            post("gen-2", "general", 2, 36, "What helps you study every day?", "Sample discussion.", null, ["study", "habits"],
                {replies: [["gen-2-r1", 8, 35, "Small goals: one lesson and one practice task.", [2, 1]]]}),
            post("gen-3", "general", 5, 9, "Weekly challenge: what did you learn?", "Sample thread. Share what you learned, not the full answer.", null, ["challenge"], {helpfulBy: [7]}),
            post("gen-4", "general", 7, 5, "Note-taking apps for coding?", "Sample question.", null, ["tools"], {}),
            post("proj-1", "projects", 3, 44, "My study task manager (Level 3 project)", "Sample project post. Feedback welcome on how I store tasks.", py("tasks = []\ntasks.append({\"title\": \"Read\", \"done\": False})"), ["project", "lists"],
                {replies: [["proj-1-r1", 1, 43, "Nice! A small function for adding tasks would make it easier to test.", [3]]], helpfulBy: [1, 2]}),
            post("proj-2", "projects", 6, 20, "A tiny tip calculator in JavaScript", "Sample project.", js("const total = (bill, pct) => bill * (1 + pct / 100);"), ["project"], {helpfulBy: [4]}),
            post("proj-3", "projects", 8, 7, "Quiz game idea", "Sample project idea. What should I build first?", null, ["project", "ideas"], {replies: [["proj-3-r1", 2, 6, "Start with one question and a score variable.", [8]]], accepted: "proj-3-r1"}),
            post("cs-1", "csharp", 4, 22, "Anyone learning C# already?", "Sample post in the C# space (the path is coming soon).", {language: "csharp", text: "Console.WriteLine(\"Hello\");"}, ["csharp"], {}),
            post("cpp-1", "cpp", 7, 28, "C++: why do I need #include <iostream>?", "Sample question in the C++ space (the path is coming soon).", {language: "cpp", text: "#include <iostream>\nint main() { std::cout << \"Hi\"; }"}, ["cpp"],
                {replies: [["cpp-1-r1", 6, 27, "It brings in std::cout. Without it the compiler does not know cout.", [7]]], accepted: "cpp-1-r1"}),
            post("grp-1", "study-python", 2, 18, "Study group plan: loops week", "Sample post visible to approved members of the Python study group only.", null, ["plan"], {}),
            post("grp-2", "study-python", 5, 10, "Group check-in: dictionaries", "Sample post for the Python study group.", null, ["dict"], {replies: [["grp-2-r1", 2, 9, "Done with the lesson; practising get() now.", []]]})
        ];
    }
    function sampleStatus() {
        const posts = read().posts.filter(p => p.sample === true);
        return {loaded: posts.length > 0, posts: posts.length, replies: posts.reduce((n, p) => n + p.replies.filter(r => r.sample === true).length, 0)};
    }
    // SAMPLE members: approved in every group they post or reply in, plus demo requests in other states.
    function sampleMemberships(now) {
        const at = new Date(now).toISOString(), out = new Map();
        const add = (n, channel, status, reason, note) => {
            const a = sampleAuthor(n), id = `sample-membership-${n}-${channel}`;
            if (!out.has(id)) out.set(id, {id, channel, owner: a.owner, name: a.name, reason, status, updatedAt: at, ...(note ? {decisionNote: note} : {}), sample: true});
        };
        for (const p of samplePosts(now)) {
            add(Number(p.owner.match(/(\d+)@/)[1]), p.channel, "approved", "SAMPLE member for demonstrations.");
            for (const r of p.replies) add(Number(r.owner.match(/(\d+)@/)[1]), p.channel, "approved", "SAMPLE member for demonstrations.");
        }
        add(2, "csharp", "pending", "SAMPLE request: I want to start C# with others.");
        add(7, "java", "pending", "SAMPLE request: preparing for a Java course.");
        add(5, "go", "rejected", "SAMPLE request: interested in Go.", "SAMPLE decision: please try again when the Go path opens.");
        add(8, "rust", "revoked", "SAMPLE request: learning Rust.", "SAMPLE removal: inactive for a long time.");
        return [...out.values()];
    }
    async function loadSample() {
        const added = await transaction(adminSession, data => {
            let added = 0;
            for (const p of samplePosts(Date.now())) if (!data.posts.some(x => x.id === p.id)) { data.posts.push(p); added++; }
            // Idempotent for replies too: a sample reply already present is never duplicated.
            audit(data, {action: "sample-loaded", targetType: "sample", targetId: "community", reason: `${added} sample post(s) added`});
            return added;
        });
        await membership().addSample(sampleMemberships(Date.now()));
        return added;
    }
    // Removes sample posts and sample replies only. Real replies on a sample post would be lost with it,
    // so that requires an explicit confirmation flag.
    async function removeSample({includeRealReplies = false} = {}) {
        const result = await transaction(adminSession, data => {
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
        result.memberships = await membership().removeSample();
        return result;
    }

    function subscribe(callback) {
        const keys = [key, membership().key, "codementor-profile-v1", "codementor-platform-v1", null];
        window.addEventListener("storage", event => { if (keys.includes(event.key)) callback(); });
        for (const type of ["community-changed", "community-membership-changed", "student-account-changed"]) window.addEventListener(type, callback);
    }

    window.communityStore = Object.freeze({
        key, LIMITS, RATE, LANGUAGES, REACTIONS, PAGE_SIZE, channelLabel, describe, groupsFor, channelSummary, markChannelSeen, setGroupMode,
        UNDO_WINDOW_MS, createPost, editPost, deletePost, undoDelete, reply, deleteReply, editReply, reactReply, acceptAnswer, restoreAcceptance,
        react, toggleSaved, setSolved, report, contactPolicy,
        query, get, similar, highlights, reputation, BADGES, POINTS, notifications, markNotificationsRead,
        queue, moderate, auditLog, channelStats, adminThreads, pinPost, lockPost, sampleStatus, loadSample, removeSample, subscribe
    });
})();
