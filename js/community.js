/* Community page. Every user-provided string is rendered with textContent only. */
(() => {
    "use strict";
    const feed = document.getElementById("community-posts");
    if (!feed || feed.dataset.initialized) return;
    feed.dataset.initialized = "true";
    const membership = window.communityMembership, store = window.communityStore;
    const $ = id => document.getElementById(id);
    const status = $("community-status");
    let owner, me;
    try { me = window.platformStore.student(); owner = me.email.trim().toLowerCase(); }
    catch (error) { status.textContent = error.message; $("community-composer").hidden = true; return; }
    let activeLanguage = null;
    try { activeLanguage = window.cmStorage.activeLanguage(); } catch { activeLanguage = null; }
    const kit = () => window.interactionKit;
    const later = (fn, ms) => (typeof setTimeout === "function" ? setTimeout(fn, ms) : fn());
    const icons = { all: "All", python: "Py", javascript: "JS", general: "#", projects: "★", help: "?", saved: "♥" };
    const descriptions = {
        python: "Python questions, notes and code reviews.",
        javascript: "JavaScript questions, notes and code reviews.",
        general: "Study habits, introductions and everything else.",
        projects: "Show what you are building and get feedback.",
        help: "Stuck? Ask here. Include what you tried."
    };
    const TABS = [["latest", "Latest"], ["unanswered", "Unanswered"], ["solved", "Solved"], ["top", "Top"], ["mine", "My posts"]];
    let selected = "all", view = "latest", page = 1;
    const editing = new Set(), reporting = new Set(), editingReplies = new Set();
    let openId = null, lastOpener = null, replyTo = null;

    function node(tag, content, cls) {
        const el = document.createElement(tag);
        if (content !== undefined) el.textContent = content;
        if (cls) el.className = cls;
        return el;
    }
    function button(label, action, cls) {
        const el = node("button", label, cls); el.type = "button"; el.addEventListener("click", action); return el;
    }
    function say(text) { status.textContent = text; }
    async function act(action, message) {
        try { await action(); if (message) say(message); render(); return true; }
        catch (error) { say(error.message || "Could not save. Your changes were not stored."); render(); return false; }
    }
    const when = iso => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    function ago(iso, now = Date.now()) {
        const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} h ago`;
        const days = Math.round(hours / 24);
        if (days === 1) return "yesterday";
        if (days < 7) return `${days} days ago`;
        return when(iso);
    }
    function initialsOf(name) { return String(name).replace(/\(SAMPLE\)/g, "").trim().split(/\s+/).slice(0, 2).map(s => Array.from(s)[0] || "").join("").toUpperCase() || "?"; }
    // Deterministic soft colour from the display name; never a photo.
    function tone(name) { let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return String(h % 6); }
    function avatar(name) { const a = node("span", initialsOf(name), "community-avatar"); a.dataset.tone = tone(name); a.setAttribute("aria-hidden", "true"); return a; }
    const channelLabel = id => membership.catalogue[id] || id;

    function codeBlock(code) {
        const figure = node("figure", undefined, "community-code");
        const head = node("figcaption", undefined, "community-code-head");
        head.append(node("span", store.LANGUAGES[code.language] || code.language, "community-code-lang"));
        const copy = button("Copy code", async () => {
            try { await navigator.clipboard.writeText(code.text); copy.textContent = "Copied"; kit()?.toast("Code copied."); }
            catch { copy.textContent = "Copy failed: select the code"; }
            later(() => { copy.textContent = "Copy code"; }, 2000);
        }, "community-copy");
        head.append(copy);
        const pre = node("pre"), text = node("code");
        const parts = window.communityHighlight ? window.communityHighlight.tokens(code.text, code.language) : [{ type: "plain", text: code.text }];
        for (const part of parts) text.append(part.type === "plain" ? part.text : node("span", part.text, "tok-" + part.type));
        pre.dir = "ltr"; pre.tabIndex = 0; pre.setAttribute("aria-label", `${store.LANGUAGES[code.language] || "Code"} example`);
        pre.append(text); figure.append(head, pre); return figure;
    }
    function tagList(tags) {
        const list = node("ul", undefined, "community-tags"); list.setAttribute("aria-label", "Tags");
        tags.forEach(tag => { const li = node("li"); li.append(button("#" + tag, () => { $("community-tag").value = tag; page = 1; render(); }, "community-tag-chip")); list.append(li); });
        return list;
    }
    function editForm(post) {
        const form = node("form", undefined, "community-edit");
        const field = (label, input) => { const l = node("label", label); input.id = `${input.name}-${post.id}`; l.htmlFor = input.id; form.append(l, input); return input; };
        const title = node("input"); title.name = "edit-title"; title.value = post.title; title.maxLength = store.LIMITS.title; title.required = true; title.dir = "auto"; field("Title", title);
        const body = node("textarea"); body.name = "edit-body"; body.value = post.body; body.maxLength = store.LIMITS.body; body.rows = 4; body.dir = "auto"; field("Post", body);
        const language = node("select"); language.name = "edit-language";
        for (const [id, label] of Object.entries(store.LANGUAGES)) { const o = node("option", label); o.value = id; language.append(o); }
        language.value = post.code?.language || (post.channel === "javascript" ? "javascript" : "python"); field("Code language", language);
        const code = node("textarea", undefined, "community-code-input"); code.name = "edit-code"; code.value = post.code?.text || ""; code.maxLength = store.LIMITS.code; code.rows = 5; code.dir = "ltr"; code.spellcheck = false; field("Code (optional)", code);
        const tags = node("input"); tags.name = "edit-tags"; tags.value = post.tags.join(", "); tags.maxLength = 140; field("Tags", tags);
        const save = node("button", "Save changes", "button button-primary"); save.type = "submit";
        const cancel = button("Cancel", () => { editing.delete(post.id); render(); }, "button button-outline");
        const row = node("div", undefined, "community-post-actions"); row.append(save, cancel); form.append(row);
        form.addEventListener("submit", async event => {
            event.preventDefault(); save.disabled = true;
            const ok = await act(async () => {
                const changed = await store.editPost(post.id, { title: title.value, body: body.value, code: code.value, language: language.value, tags: tags.value }, owner);
                editing.delete(post.id);
                say(changed ? "Post updated. It now shows an edited mark." : "No changes to save.");
            });
            if (!ok) save.disabled = false;
        });
        return form;
    }
    function reportForm(post) {
        const form = node("form", undefined, "community-report"), label = node("label", "Why are you reporting this post?"), reason = node("textarea");
        reason.id = `report-${post.id}`; reason.required = true; reason.maxLength = store.LIMITS.report; reason.rows = 2; reason.dir = "auto"; label.htmlFor = reason.id;
        const send = node("button", "Send report", "button button-primary"); send.type = "submit";
        const cancel = button("Cancel", () => { reporting.delete(post.id); render(); }, "button button-outline");
        const row = node("div", undefined, "community-post-actions"); row.append(send, cancel);
        form.append(label, reason, row);
        form.addEventListener("submit", async event => {
            event.preventDefault(); send.disabled = true;
            await act(async () => { await store.report(post.id, reason.value, owner); reporting.delete(post.id); }, "Report sent. A moderator will review this post.");
        });
        return form;
    }
    // Deleting your own post is reversible for a few seconds (real restore of the same post).
    async function deleteWithUndo(post) {
        if (!kit()) { if (window.confirm("Delete this post and its replies? This cannot be undone.")) act(() => store.deletePost(post.id, owner), "Post deleted."); return; }
        const ok = await act(() => store.deletePost(post.id, owner), "Post deleted. You can undo this for a few seconds.");
        if (!ok) return;
        kit().toast("Post deleted.", { duration: store.UNDO_WINDOW_MS, undo: async () => { await store.undoDelete(post.id, owner); say("Post restored."); render(); } });
    }
    function meta(post) {
        const row = node("div", undefined, "community-card-meta community-post-meta");
        row.append(avatar(post.name), node("b", post.name));
        if (post.sample) row.append(node("span", "SAMPLE", "community-sample-badge"));
        row.append(node("span", channelLabel(post.channel), "community-lang-badge"));
        const time = node("time", ago(post.createdAt)); time.dateTime = post.createdAt; time.title = new Date(post.createdAt).toLocaleString(); row.append(time);
        if (post.editedAt) { const edited = node("span", "edited", "community-edited"); edited.title = `Edited ${new Date(post.editedAt).toLocaleString()}`; row.append(edited); }
        return row;
    }
    function keyed(el, key) { el.dataset.key = key; return el; }
    function replyForm(post) {
        const form = node("form", undefined, "community-reply-form"), input = node("textarea"), label = node("label", replyTo ? "Your reply" : "Add a reply");
        input.id = `reply-${post.id}`; input.required = true; input.maxLength = store.LIMITS.reply; input.rows = 3; input.dir = "auto"; label.htmlFor = input.id;
        if (replyTo) {
            const target = post.replies.find(r => r.id === replyTo);
            const chip = node("p", undefined, "community-replying");
            chip.append(node("span", `Replying to ${target ? target.name : "a reply"}`), keyed(button("Cancel", () => { replyTo = null; renderDrawer(); $(`reply-${post.id}`)?.focus(); }, "community-mini"), "cancel-reply-to"));
            form.append(chip);
        }
        const submit = node("button", "Post reply", "button button-primary"); submit.type = "submit"; form.append(label, input, submit);
        form.addEventListener("submit", async event => {
            event.preventDefault(); submit.disabled = true;
            let id = null;
            const ok = await act(async () => { id = await store.reply(post.id, input.value, owner, replyTo); });
            if (!ok) { submit.disabled = false; return; }
            replyTo = null; say("Reply published.");
            kit()?.toast("Reply published.", { undo: async () => { await store.deleteReply(post.id, id, owner); say("Reply removed."); render(); } });
            $(`reply-${post.id}`)?.focus();
        });
        return form;
    }
    function replyRow(post, reply) {
        const row = node("article", undefined, "community-reply"); row.dataset.replyId = reply.id;
        if (reply.parentId) row.classList.add("is-nested");
        if (reply.accepted) row.classList.add("is-accepted");
        const head = node("div", undefined, "community-reply-meta"); head.append(avatar(reply.name), node("b", reply.name));
        if (reply.sample) head.append(node("span", "SAMPLE", "community-sample-badge"));
        if (reply.accepted) head.append(node("span", "Accepted answer ✓", "community-solved-badge"));
        const t = node("time", ago(reply.createdAt)); t.dateTime = reply.createdAt; t.title = new Date(reply.createdAt).toLocaleString(); head.append(t);
        if (reply.editedAt) head.append(node("span", "edited", "community-edited"));
        row.append(head);
        if (editingReplies.has(reply.id) && reply.mine) {
            const form = node("form", undefined, "community-edit"), input = node("textarea"), label = node("label", "Edit your reply");
            input.id = `edit-reply-${reply.id}`; input.value = reply.body; input.maxLength = store.LIMITS.reply; input.rows = 3; input.dir = "auto"; label.htmlFor = input.id;
            const save = node("button", "Save reply", "button button-primary"); save.type = "submit";
            const actions = node("div", undefined, "community-post-actions"); actions.append(save, button("Cancel", () => { editingReplies.delete(reply.id); renderDrawer(); }, "button button-outline"));
            form.append(label, input, actions);
            form.addEventListener("submit", async event => {
                event.preventDefault();
                await act(async () => { const changed = await store.editReply(post.id, reply.id, input.value, owner); editingReplies.delete(reply.id); say(changed ? "Reply updated. It shows an edited mark." : "No changes to save."); });
            });
            row.append(form); return row;
        }
        const content = node("p", reply.body, "community-reply-body"); content.dir = "auto"; row.append(content);
        const actions = node("div", undefined, "community-post-actions");
        if (!reply.mine) {
            const h = keyed(button(`Helpful ${reply.helpful.count}`, () => act(() => store.reactReply(post.id, reply.id, owner))), `helpful-${reply.id}`);
            h.setAttribute("aria-pressed", String(reply.helpful.mine)); h.setAttribute("aria-label", `Helpful, ${reply.helpful.count}`); actions.append(h);
        } else if (reply.helpful.count) actions.append(node("span", `${reply.helpful.count} found this helpful`, "community-edited"));
        if (!post.locked && !post.hidden) actions.append(keyed(button("Reply", () => { replyTo = reply.id; renderDrawer(); $(`reply-${post.id}`)?.focus(); }), `reply-to-${reply.id}`));
        if (post.mine && !reply.mine) actions.append(keyed(button(reply.accepted ? "Unaccept answer" : "Accept answer", () => acceptWithUndo(post, reply.accepted ? null : reply.id), "community-owner-action"), `accept-${reply.id}`));
        if (reply.mine) actions.append(
            keyed(button("Edit reply", () => { editingReplies.add(reply.id); renderDrawer(); $(`edit-reply-${reply.id}`)?.focus(); }, "community-owner-action"), `edit-${reply.id}`),
            button("Delete reply", () => { if (window.confirm("Delete your reply?")) act(() => store.deleteReply(post.id, reply.id, owner), "Reply deleted."); }, "community-delete"));
        row.append(actions);
        return row;
    }
    async function acceptWithUndo(post, replyId) {
        let before = null;
        const ok = await act(async () => { before = await store.acceptAnswer(post.id, replyId, owner); });
        if (!ok) return;
        const message = replyId ? "Answer accepted. The discussion is marked solved." : "Accepted answer removed.";
        say(message);
        kit()?.toast(message, { undo: async () => { await store.restoreAcceptance(post.id, before, owner); say("Change undone."); render(); } });
    }
    function postView(post) {
        const box = node("div", undefined, "community-detail"); box.id = `detail-${post.id}`;
        const head = node("div", undefined, "community-drawer-head");
        head.append(meta(post), keyed(button("Close", () => closePost(), "community-mini community-drawer-close"), "close"));
        box.append(head);
        const title = node("h2", post.title, "community-drawer-title"); title.id = "community-drawer-title"; title.tabIndex = -1; title.dir = "auto"; box.append(title);
        const flags = node("div", undefined, "community-card-foot");
        if (post.solved) flags.append(node("span", "Solved ✓", "community-solved-badge"));
        if (post.locked) flags.append(node("span", "Locked by a moderator", "community-badge"));
        if (post.related) { const link = node("a", `Related ${post.related.kind}: ${post.related.title}`, "community-related"); link.href = post.related.kind === "lesson" ? `../student/lesson.html?lesson=${encodeURIComponent(post.related.id)}` : `../student/workspace.html?task=${encodeURIComponent(post.related.id)}`; flags.append(link); }
        if (flags.children.length) box.append(flags);
        if (post.hidden) box.append(node("p", `Hidden by a moderator. Only you can see this post. Reason: ${post.hiddenReason}`, "community-moderation-note"));
        if (editing.has(post.id) && post.mine) { box.append(editForm(post)); return box; }
        if (post.body) { const body = node("p", post.body, "community-post-body"); body.dir = "auto"; box.append(body); }
        if (post.code) box.append(codeBlock(post.code));
        if (post.tags.length) box.append(tagList(post.tags));
        const actions = node("div", undefined, "community-post-actions");
        for (const [id, label] of Object.entries(store.REACTIONS)) {
            const r = post.reactions[id], b = keyed(button(`${label} · ${r.count}`, () => act(() => store.react(post.id, id, owner))), `react-${id}`);
            b.setAttribute("aria-pressed", String(r.mine)); b.dataset.reaction = id; actions.append(b);
        }
        const saved = keyed(button(post.saved ? "Saved" : "Save", () => act(() => store.toggleSaved(post.id, owner))), "save"); saved.setAttribute("aria-pressed", String(post.saved));
        actions.append(saved);
        if (post.mine) {
            actions.append(
                keyed(button(post.solved ? "Mark as not solved" : "Mark as solved", () => act(() => store.setSolved(post.id, !post.solved, owner), post.solved ? "Marked as not solved." : "Marked as solved."), "community-owner-action"), "solve"),
                keyed(button("Edit post", () => { editing.add(post.id); renderDrawer(); }, "community-owner-action"), "edit"),
                button("Delete post", () => deleteWithUndo(post), "community-delete"));
        } else if (post.reportedByMe) actions.append(node("span", "Reported", "community-edited"));
        else actions.append(keyed(button("Report", () => { reporting.add(post.id); renderDrawer(); }, "community-report-button"), "report"));
        box.append(actions);
        if (reporting.has(post.id) && !post.mine) box.append(reportForm(post));
        const replies = node("section", undefined, "community-replies"); replies.id = `replies-${post.id}`;
        replies.append(node("h3", `${post.replies.length} ${post.replies.length === 1 ? "reply" : "replies"}`, "community-replies-title"));
        const top = post.replies.filter(r => !r.parentId || !post.replies.some(x => x.id === r.parentId));
        const ordered = [...top].sort((a, b) => (b.accepted - a.accepted) || Date.parse(a.createdAt) - Date.parse(b.createdAt));
        for (const r of ordered) {
            replies.append(replyRow(post, r));
            post.replies.filter(c => c.parentId === r.id).forEach(c => replies.append(replyRow(post, c)));
        }
        if (post.locked) replies.append(node("p", "This thread is locked by a moderator. New replies are closed.", "community-moderation-note"));
        else if (!post.hidden) replies.append(replyForm(post));
        box.append(replies);
        return box;
    }
    function renderDrawer() {
        const dialog = $("community-post-dialog");
        if (!openId) return;
        const focusKey = document.activeElement?.dataset?.key;
        let post;
        try { post = store.get(openId, owner); }
        catch (error) { dialog.replaceChildren(node("p", error.message, "community-empty"), button("Close", () => closePost(), "button button-outline")); return; }
        dialog.replaceChildren(postView(post));
        if (focusKey) dialog.querySelector?.(`[data-key="${focusKey}"]`)?.focus();
    }
    function openPost(id, opener = null) {
        openId = id; lastOpener = opener; replyTo = null;
        const dialog = $("community-post-dialog");
        renderDrawer();
        if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal(); else dialog.open = true;
        $("community-drawer-title")?.focus();
    }
    function closePost() {
        const dialog = $("community-post-dialog");
        if (typeof dialog.close === "function" && dialog.open) dialog.close(); else { dialog.open = false; onDrawerClosed(); }
    }
    function onDrawerClosed() {
        openId = null; replyTo = null; editing.clear(); reporting.clear(); editingReplies.clear();
        const back = lastOpener; lastOpener = null;
        if (back && back.isConnected !== false) back.focus();
    }
    // Compact card: who, where, when, title, two-line preview, tags and quick actions.
    function postCard(post) {
        const card = node("article", undefined, "community-card community-post"); card.dataset.postId = post.id;
        if (post.solved) card.classList.add("is-solved");
        if (post.pinned) card.classList.add("is-pinned");
        card.append(meta(post));
        const title = node("h3", undefined, "community-card-title"); title.dir = "auto";
        const opener = button(post.title, () => openPost(post.id, opener), "community-card-open");
        opener.setAttribute("aria-haspopup", "dialog"); opener.dataset.key = `open-${post.id}`;
        title.append(opener); card.append(title);
        if (post.body || post.code) { const preview = node("p", post.body || post.code.text, "community-card-preview"); preview.dir = "auto"; card.append(preview); }
        if (post.tags.length) card.append(tagList(post.tags));
        const foot = node("div", undefined, "community-card-foot");
        if (post.pinned) foot.append(node("span", "Pinned", "community-badge"));
        foot.append(node("span", `${post.replies.length} ${post.replies.length === 1 ? "reply" : "replies"}`));
        if (post.solved) foot.append(node("span", "Solved ✓", "community-solved-badge"));
        foot.append(node("span", undefined, "community-spacer"));
        const helpful = post.reactions.helpful, h = button(`Helpful ${helpful.count}`, () => act(() => store.react(post.id, "helpful", owner)), "community-mini");
        h.setAttribute("aria-pressed", String(helpful.mine)); h.setAttribute("aria-label", `Helpful, ${helpful.count}`);
        const sv = button(post.saved ? "Saved" : "Save", () => act(() => store.toggleSaved(post.id, owner)), "community-mini"); sv.setAttribute("aria-pressed", String(post.saved));
        foot.append(h, sv);
        if (!post.mine && !post.reportedByMe) foot.append(button("Report", () => { reporting.add(post.id); openPost(post.id, opener); }, "community-mini"));
        card.append(foot);
        return card;
    }

    function renderNotifications() {
        const info = store.notifications(owner), count = $("community-notification-count"), panel = $("community-notification-panel");
        count.hidden = info.count === 0; count.textContent = String(info.count);
        $("community-notifications").setAttribute("aria-label", `Notifications, ${info.count} unread`);
        if (panel.hidden) return;
        panel.replaceChildren(node("h2", "Notifications"));
        if (!info.items.length) panel.append(node("p", "You are all caught up. Replies to your posts and membership decisions appear here.", "community-empty"));
        const list = node("ul", undefined, "community-notification-list");
        const statusText = { approved: "approved", rejected: "declined", revoked: "removed you from" };
        info.items.forEach(item => {
            const li = node("li");
            if (item.type === "reply") { const b = button(`${item.name} replied to "${item.title}" · ${ago(item.at)}`, () => openPost(item.postId, b), "community-widget-link"); li.append(b); list.append(li); return; }
            li.textContent = `An administrator ${statusText[item.status]} ${item.status === "revoked" ? "" : "your request for "}${channelLabel(item.channel)}${item.note ? ` — ${item.note}` : ""} · ${ago(item.at)}`;
            list.append(li);
        });
        panel.append(list);
        if (info.count) panel.append(button("Mark all as read", () => act(() => store.markNotificationsRead(owner), "Notifications marked as read."), "button button-outline"));
    }
    function renderPagination(result) {
        const pager = $("community-pagination");
        pager.hidden = result.pages <= 1; pager.replaceChildren();
        if (pager.hidden) return;
        const prev = button("Previous", () => { page = result.page - 1; render(); feed.scrollIntoView({ block: "start" }); }, "button button-outline");
        const next = button("Next", () => { page = result.page + 1; render(); feed.scrollIntoView({ block: "start" }); }, "button button-outline");
        prev.disabled = result.page <= 1; next.disabled = result.page >= result.pages;
        pager.append(prev, node("span", `Page ${result.page} of ${result.pages}`), next);
    }
    function renderTabs() {
        $("community-tabs").replaceChildren(...TABS.map(([id, label]) => {
            const tab = button(label, () => { view = id; page = 1; render(); }); tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", String(view === id)); tab.dataset.view = id; return tab;
        }));
    }
    function channelButton(id, label, extra) {
        const item = button("", () => { selected = id; page = 1; render(); if (narrow()) showSection("feed"); }, "community-channel");
        item.append(node("span", icons[id] || "#", "community-channel-icon"), node("span", label, "community-channel-label"));
        if (extra) item.append(extra);
        item.setAttribute("aria-pressed", String(selected === id));
        if (id === activeLanguage) item.classList.add("is-active-language");
        return item;
    }
    function renderChannels(result) {
        const list = [channelButton("all", "All my channels")];
        const ids = Object.keys(membership.catalogue).sort((a, b) => (b === activeLanguage) - (a === activeLanguage));
        for (const id of ids) {
            const state = membership.state(id, owner);
            const note = id === activeLanguage ? node("span", "Your language", "community-language-mark") : state === "approved" ? null : node("span", state === "pending" ? "Pending" : "Private", "community-channel-note");
            list.push(channelButton(id, channelLabel(id), note));
        }
        list.push(node("div", undefined, "community-channel-divider"), channelButton("saved", "Saved posts"));
        $("community-channels").replaceChildren(...list);
    }
    function widgetLink(item, extra) {
        const b = button("", () => openPost(item.id, b), "community-widget-link");
        b.append(node("span", item.title)); const small = node("small", `${channelLabel(item.channel)} · ${extra}`); b.append(small); b.dir = "auto";
        return b;
    }
    function renderHighlights() {
        const h = store.highlights(owner);
        const list = (host, items, extra, empty) => {
            if (!items.length) { host.replaceChildren(node("p", empty, "community-widget-empty")); return; }
            const ol = node("ol"); items.forEach(item => { const li = node("li"); li.append(widgetLink(item, extra(item))); ol.append(li); }); host.replaceChildren(ol);
        };
        list($("community-unanswered"), h.unanswered, item => `${item.name} · ${ago(item.createdAt)}`, "Every question has a reply. Nice work, everyone.");
        list($("community-solved"), h.solvedToday, item => `${item.replies} ${item.replies === 1 ? "reply" : "replies"}`, "Nothing marked solved yet today.");
        const trending = $("community-trending");
        if (!h.trending.length) trending.replaceChildren(node("p", "Tags from the last two weeks appear here.", "community-widget-empty"));
        else { const ul = node("ul", undefined, "community-trending-list"); h.trending.forEach(t => { const li = node("li"); li.append(button(`#${t.tag} · ${t.count}`, () => { $("community-tag").value = t.tag; page = 1; render(); showSection("feed"); }, "community-tag-chip")); ul.append(li); }); trending.replaceChildren(ul); }
        const challenge = window.communityChallenges?.weekly(activeLanguage), host = $("community-challenge");
        if (!challenge) { host.replaceChildren(node("p", "Weekly challenges start when your language has practice tasks.", "community-widget-empty")); return; }
        const link = node("a", "Open the task", "button button-outline"); link.href = challenge.href;
        host.replaceChildren(node("p", `Week ${challenge.week}: ${challenge.title}`), node("p", "Solve it, then share what you learned (not the full answer) in the community.", "community-widget-empty"), link);
    }
    function firstRun() {
        const box = node("div", undefined, "community-welcome");
        box.append(node("h3", `Welcome, ${me.name.trim()}!`), node("p", "Nothing here yet. Start the conversation."));
        const actions = node("div", undefined, "community-welcome-actions");
        actions.append(
            button("Ask your first question", () => focusComposer({ channel: "help" }), "button button-primary"),
            button("Introduce yourself", () => focusComposer({ channel: "general", title: `Hi, I'm ${me.name.trim()}` }), "button button-outline"),
            button("Browse channels", () => { showSection("channels"); $("community-channels").querySelector("button")?.focus(); }, "button button-outline"));
        box.append(actions); return box;
    }
    function focusComposer(prefill = {}) {
        const composer = $("community-composer");
        if (composer.hidden) { say("Join or open a channel to post. Choose one from the channel list."); showSection("channels"); return; }
        showSection("feed");
        if (prefill.channel && [...$("post-channel").options].some(o => o.value === prefill.channel)) $("post-channel").value = prefill.channel;
        if (prefill.title !== undefined) $("post-title").value = prefill.title;
        $("post-title").focus(); composer.scrollIntoView({ block: "start" });
    }
    const narrow = () => typeof window.matchMedia === "function" && window.matchMedia("(max-width: 760px)").matches;
    function showSection(section) {
        $("community-layout").dataset.section = section;
        for (const id of ["channels", "feed", "highlights"]) $(`community-tab-${id}`).setAttribute("aria-selected", String(id === section));
    }

    function render() {
        try {
            renderAccess();
            renderTabs();
            const tagSelect = $("community-tag"), currentTag = tagSelect.value;
            const filters = { latest: {}, unanswered: { status: "unanswered" }, solved: { status: "solved" }, top: { sort: "top" }, mine: { mine: true } }[view];
            const result = store.query({ channel: selected, search: $("community-search").value, tag: currentTag, page, ...filters }, owner);
            page = result.page;
            tagSelect.replaceChildren(Object.assign(node("option", "All tags"), { value: "" }), ...result.tags.map(t => Object.assign(node("option", "#" + t), { value: t })));
            tagSelect.value = result.tags.includes(currentTag) ? currentTag : "";
            $("community-feed-title").textContent = selected === "all" ? "All discussions" : selected === "saved" ? "Saved posts" : channelLabel(selected);
            $("community-count").textContent = `${result.total} ${result.total === 1 ? "discussion" : "discussions"}`;
            feed.replaceChildren(...result.items.map(postCard));
            if (!result.items.length) {
                const filtered = $("community-search").value.trim() || currentTag || view !== "latest" || selected !== "all";
                if (result.channels.length && !filtered) feed.append(firstRun());
                else {
                    const empty = node("div", undefined, "community-empty");
                    empty.append(node("p", result.channels.length ? "No discussions match. Try another tab or search, or start one yourself." : "Open a channel from the list to read and post."));
                    feed.append(empty);
                }
            }
            kit()?.stagger(feed);
            renderPagination(result);
            renderChannels(result);
            renderHighlights();
            renderNotifications();
            renderDrawer();
        } catch (error) {
            say(error.message); feed.replaceChildren(); $("community-composer").hidden = true;
            document.querySelector(".community-toolbar").hidden = true;
            $("community-access").replaceChildren(); $("community-access").hidden = true; $("community-count").textContent = ""; $("community-pagination").hidden = true;
        }
    }
    function renderAccess() {
        window.platformStore.student(owner);
        const allowed = Object.keys(membership.catalogue).filter(id => membership.state(id, owner) === "approved");
        const composer = $("community-composer"), picker = $("post-channel"), previous = picker.value;
        picker.replaceChildren(...allowed.filter(id => ["all", "saved"].includes(selected) || id === selected).map(id => { const option = node("option", channelLabel(id)); option.value = id; return option; }));
        if ([...picker.options].some(o => o.value === previous)) picker.value = previous;
        else if ([...picker.options].some(o => o.value === activeLanguage)) picker.value = activeLanguage;
        composer.hidden = !picker.options.length;
        document.querySelector(".community-toolbar").hidden = !allowed.length;
        const gate = $("community-access");
        gate.hidden = true; gate.replaceChildren();
        if (!Object.hasOwn(membership.catalogue, selected)) return;
        const state = membership.state(selected, owner);
        gate.hidden = false;
        gate.append(node("span", "PRIVATE CHANNEL", "community-badge"), node("h2", channelLabel(selected)), node("p", descriptions[selected] || ""));
        if (state === "approved") {
            gate.append(button("Leave channel", () => act(() => membership.withdraw(selected, owner, state), "You left the channel. Request approval to join again."), "button button-outline"));
            return;
        }
        const copy = { pending: "Your request is waiting for administrator approval. Discussions stay private until you are accepted.", rejected: "Your request was declined. You can submit a new request with more information.", revoked: "An administrator removed your access. You may request to join again.", left: "You left this channel. Request approval to join again.", cancelled: "Your request was cancelled. You can request to join again." };
        gate.append(node("p", copy[state] || "This channel is private. Tell the administrator why you would like to join. Posts and replies open after approval."));
        if (state === "pending") { gate.append(button("Cancel request", () => act(() => membership.withdraw(selected, owner, state), "Join request cancelled."), "button button-outline")); return; }
        const form = node("form"), label = node("label", "Why would you like to join?"), reason = node("textarea"), submit = node("button", "Send join request", "button button-primary");
        reason.id = "join-reason"; reason.required = true; reason.maxLength = 1000; reason.rows = 3; reason.dir = "auto"; label.htmlFor = reason.id; submit.type = "submit"; form.append(label, reason, submit);
        const channel = selected;
        form.addEventListener("submit", async event => { event.preventDefault(); submit.disabled = true; await act(() => membership.request(channel, reason.value, owner), "Request sent. An administrator will review it."); submit.disabled = false; });
        gate.append(form);
    }

    function renderSimilar() {
        const host = $("community-similar");
        let items = [];
        try { items = store.similar({ title: $("post-title").value, body: $("post-body").value, tags: $("post-tags").value }, owner); } catch { items = []; }
        host.hidden = !items.length; host.replaceChildren();
        if (!items.length) return;
        host.append(node("p", "Similar questions", "community-similar-title"), node("p", "System suggestion from matching words and tags in existing posts — not AI. Check them before posting.", "community-hint"));
        const list = node("ul");
        items.forEach(item => { const li = node("li"), b = button("", () => openPost(item.id, b), "community-widget-link"); b.append(node("span", item.title), node("small", `${channelLabel(item.channel)} · ${item.replies} ${item.replies === 1 ? "reply" : "replies"}${item.solved ? " · Solved ✓" : ""}`)); li.append(b); list.append(li); });
        host.append(list);
    }
    let similarTimer = null;
    for (const id of ["post-title", "post-tags", "post-body"]) $(id).addEventListener("input", () => { if (typeof clearTimeout === "function") clearTimeout(similarTimer); similarTimer = later(renderSimilar, 250); });
    $("community-composer").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget, submit = form.querySelector("button[type=submit]"); submit.disabled = true;
        const fields = { channel: $("post-channel").value, title: $("post-title").value, body: $("post-body").value, code: $("post-code").value, language: $("post-language").value, tags: $("post-tags").value };
        let id = null;
        const ok = await act(async () => { id = await store.createPost(fields, owner); }, "Your discussion is published.");
        submit.disabled = false;
        if (!ok) return;
        form.reset(); renderSimilar(); selected = fields.channel; view = "latest"; page = 1; $("community-search").value = ""; render();
        kit()?.toast("Your discussion is published.", { undo: async () => { await store.deletePost(id, owner); say("Post removed."); render(); } });
        $("community-feed-title").scrollIntoView({ block: "center" });
    });
    $("community-notifications").addEventListener("click", () => {
        const panel = $("community-notification-panel"); panel.hidden = !panel.hidden;
        $("community-notifications").setAttribute("aria-expanded", String(!panel.hidden)); render();
    });
    $("community-ask").addEventListener("click", () => focusComposer());
    for (const id of ["channels", "feed", "highlights"]) $(`community-tab-${id}`).addEventListener("click", () => showSection(id));
    $("community-search").addEventListener("input", () => { page = 1; render(); });
    $("community-tag").addEventListener("change", () => { page = 1; render(); });
    $("community-post-dialog").addEventListener("close", onDrawerClosed);
    $("community-post-dialog").addEventListener("click", event => { if (event.target === $("community-post-dialog")) closePost(); });
    store.subscribe(render);
    window.addEventListener("pageshow", render);
    render();
    // Deep link: community.html?post=<id> opens that discussion if the student can read it.
    try { const id = new URLSearchParams(location.search).get("post"); if (id) openPost(id); } catch { /* no deep link */ }
})();
