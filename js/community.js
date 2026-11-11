/* Community page. Every user-provided string is rendered with textContent only. */
(() => {
    "use strict";
    const feed = document.getElementById("community-posts");
    if (!feed || feed.dataset.initialized) return;
    feed.dataset.initialized = "true";
    const membership = window.communityMembership, store = window.communityStore;
    const $ = id => document.getElementById(id);
    const status = $("community-status");
    let owner;
    try { owner = window.platformStore.student().email.trim().toLowerCase(); }
    catch (error) { status.textContent = error.message; $("community-composer").hidden = true; return; }
    let activeLanguage = null;
    try { activeLanguage = window.cmStorage.activeLanguage(); } catch { activeLanguage = null; }
    const nav = { all: "All my channels", ...membership.catalogue, saved: "Saved posts" };
    const descriptions = {
        python: "Python questions, notes and code reviews.",
        javascript: "JavaScript questions, notes and code reviews.",
        general: "Study habits, notes and everything else.",
        projects: "Share what you are building and get feedback.",
        help: "Stuck? Ask here. Include what you tried."
    };
    let selected = "all", page = 1;
    const openReplies = new Set(), editing = new Set(), reporting = new Set();

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

    function codeBlock(code) {
        const figure = node("figure", undefined, "community-code");
        const head = node("figcaption", undefined, "community-code-head");
        head.append(node("span", store.LANGUAGES[code.language] || code.language, "community-code-lang"));
        const copy = button("Copy code", async () => {
            try { await navigator.clipboard.writeText(code.text); copy.textContent = "Copied"; }
            catch { copy.textContent = "Copy failed: select the code"; }
            setTimeout(() => { copy.textContent = "Copy code"; }, 2000);
        }, "community-copy");
        head.append(copy);
        const pre = node("pre"), text = node("code", code.text);
        pre.dir = "ltr"; pre.tabIndex = 0; pre.setAttribute("aria-label", `${store.LANGUAGES[code.language] || "Code"} example`);
        pre.append(text); figure.append(head, pre); return figure;
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
    function postCard(post) {
        const card = node("article", undefined, "community-post"); card.dataset.postId = post.id;
        if (post.solved) card.classList.add("is-solved");
        const meta = node("div", undefined, "community-post-meta");
        const initials = post.name.split(/\s+/).slice(0, 2).map(s => Array.from(s)[0] || "").join("");
        meta.append(node("span", initials, "community-avatar"), node("b", post.name), node("span", membership.catalogue[post.channel], "community-tag"));
        if (post.sample) meta.append(node("span", "SAMPLE", "community-sample-badge"));
        if (post.solved) meta.append(node("span", "Solved", "community-solved-badge"));
        const time = node("time", when(post.createdAt)); time.dateTime = post.createdAt; meta.append(time);
        if (post.editedAt) { const edited = node("span", "edited", "community-edited"); edited.title = `Edited ${new Date(post.editedAt).toLocaleString()}`; meta.append(edited); }
        card.append(meta);
        if (post.hidden) card.append(node("p", `Hidden by a moderator. Only you can see this post. Reason: ${post.hiddenReason}`, "community-moderation-note"));
        if (editing.has(post.id) && post.mine) { card.append(editForm(post)); return card; }
        const title = node("h3", post.title); title.dir = "auto"; card.append(title);
        if (post.body) { const body = node("p", post.body, "community-post-body"); body.dir = "auto"; card.append(body); }
        if (post.code) card.append(codeBlock(post.code));
        if (post.tags.length) {
            const tags = node("ul", undefined, "community-tags"); tags.setAttribute("aria-label", "Tags");
            post.tags.forEach(tag => { const li = node("li"); li.append(button("#" + tag, () => { $("community-tag").value = tag; page = 1; render(); }, "community-tag-chip")); tags.append(li); });
            card.append(tags);
        }
        const actions = node("div", undefined, "community-post-actions");
        for (const [id, label] of Object.entries(store.REACTIONS)) {
            const r = post.reactions[id], b = button(`${label} · ${r.count}`, () => act(() => store.react(post.id, id, owner)));
            b.setAttribute("aria-pressed", String(r.mine)); b.dataset.reaction = id; actions.append(b);
        }
        const replies = node("div", undefined, "community-replies"); replies.id = `replies-${post.id}`; replies.hidden = !openReplies.has(post.id);
        const replyButton = button(`Replies · ${post.replies.length}`, () => {
            replies.hidden = !replies.hidden; replyButton.setAttribute("aria-expanded", String(!replies.hidden));
            if (replies.hidden) openReplies.delete(post.id); else { openReplies.add(post.id); replies.querySelector("textarea")?.focus(); }
        });
        replyButton.setAttribute("aria-expanded", String(!replies.hidden)); replyButton.setAttribute("aria-controls", replies.id);
        const saved = button(post.saved ? "Saved" : "Save", () => act(() => store.toggleSaved(post.id, owner))); saved.setAttribute("aria-pressed", String(post.saved));
        actions.append(replyButton, saved);
        if (post.mine) {
            actions.append(
                button(post.solved ? "Mark as not solved" : "Mark as solved", () => act(() => store.setSolved(post.id, !post.solved, owner), post.solved ? "Marked as not solved." : "Marked as solved."), "community-owner-action"),
                button("Edit post", () => { editing.add(post.id); render(); }, "community-owner-action"),
                button("Delete post", () => { if (window.confirm("Delete this post and its replies? This cannot be undone.")) act(() => store.deletePost(post.id, owner), "Post deleted."); }, "community-delete"));
        } else if (post.reportedByMe) actions.append(node("span", "Reported", "community-edited"));
        else actions.append(button("Report", () => { reporting.add(post.id); render(); }, "community-report-button"));
        card.append(actions);
        if (reporting.has(post.id) && !post.mine) card.append(reportForm(post));
        post.replies.forEach(reply => {
            const row = node("div", undefined, "community-reply");
            const head = node("div", undefined, "community-reply-meta"); head.append(node("b", reply.name));
            if (reply.sample) head.append(node("span", "SAMPLE", "community-sample-badge"));
            const t = node("time", when(reply.createdAt)); t.dateTime = reply.createdAt; head.append(t); row.append(head);
            const content = node("p", reply.body, "community-reply-body"); content.dir = "auto"; row.append(content);
            if (reply.mine) row.append(button("Delete reply", () => { if (window.confirm("Delete your reply?")) act(() => store.deleteReply(post.id, reply.id, owner), "Reply deleted."); }, "community-delete"));
            replies.append(row);
        });
        if (!post.hidden) {
            const form = node("form"), label = node("label", "Add a reply"), input = node("textarea");
            input.id = `reply-${post.id}`; input.required = true; input.maxLength = store.LIMITS.reply; input.rows = 2; input.dir = "auto"; label.htmlFor = input.id;
            const submit = node("button", "Post reply", "button button-outline"); submit.type = "submit"; form.append(label, input, submit);
            form.addEventListener("submit", async event => {
                event.preventDefault(); submit.disabled = true; openReplies.add(post.id);
                const ok = await act(() => store.reply(post.id, input.value, owner), "Reply published.");
                if (ok) $(`reply-${post.id}`)?.focus(); else submit.disabled = false;
            });
            replies.append(form);
        }
        card.append(replies); return card;
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
            li.textContent = item.type === "reply"
                ? `${item.name} replied to "${item.title}" · ${when(item.at)}`
                : `An administrator ${statusText[item.status]} ${item.status === "revoked" ? "" : "your request for "}${membership.catalogue[item.channel]}${item.note ? ` — ${item.note}` : ""} · ${when(item.at)}`;
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
    function render() {
        try {
            renderAccess();
            const tagSelect = $("community-tag"), currentTag = tagSelect.value;
            const result = store.query({ channel: selected, search: $("community-search").value, tag: currentTag, status: $("community-filter").value, sort: $("community-sort").value, page }, owner);
            page = result.page;
            tagSelect.replaceChildren(Object.assign(node("option", "All tags"), { value: "" }), ...result.tags.map(t => Object.assign(node("option", "#" + t), { value: t })));
            tagSelect.value = result.tags.includes(currentTag) ? currentTag : "";
            $("community-feed-title").textContent = nav[selected];
            $("community-count").textContent = `${result.total} ${result.total === 1 ? "discussion" : "discussions"}`;
            feed.replaceChildren(...result.items.map(postCard));
            if (!result.items.length) {
                const empty = node("div", undefined, "community-empty");
                empty.append(node("p", result.channels.length ? "No discussions match yet. Start one with a clear title, what you tried and a small code example." : "Join a channel to read and post. Choose one below and tell the administrator why you would like to join."));
                feed.append(empty);
            }
            renderPagination(result);
            $("community-channels").replaceChildren(...Object.entries(nav).filter(([id]) => id === "all" || id === "saved" || result.channels.includes(id)).map(([id, label]) => {
                const item = button(label, () => { selected = id; page = 1; render(); });
                item.setAttribute("aria-pressed", String(selected === id));
                if (id === activeLanguage) { item.classList.add("is-active-language"); item.append(node("span", "Your language", "community-language-mark")); }
                return item;
            }));
            renderNotifications();
        } catch (error) {
            say(error.message); feed.replaceChildren(); $("community-composer").hidden = true; document.querySelector(".community-toolbar").hidden = true;
            $("community-access").replaceChildren(); $("community-access").hidden = true; $("community-directory").replaceChildren(); $("community-count").textContent = ""; $("community-pagination").hidden = true;
        }
    }
    function renderAccess() {
        window.platformStore.student(owner);
        const allowed = Object.keys(membership.catalogue).filter(id => membership.state(id, owner) === "approved");
        const composer = $("community-composer"), picker = $("post-channel"), previous = picker.value;
        picker.replaceChildren(...allowed.filter(id => ["all", "saved"].includes(selected) || id === selected).map(id => { const option = node("option", membership.catalogue[id]); option.value = id; return option; }));
        if ([...picker.options].some(o => o.value === previous)) picker.value = previous;
        else if ([...picker.options].some(o => o.value === activeLanguage)) picker.value = activeLanguage;
        composer.hidden = !picker.options.length;
        document.querySelector(".community-toolbar").hidden = !allowed.length;
        const directory = $("community-directory"), gate = $("community-access");
        directory.hidden = selected !== "all"; directory.replaceChildren(); gate.hidden = true; gate.replaceChildren();
        for (const id of Object.keys(membership.catalogue)) {
            const state = membership.state(id, owner), card = node("article", undefined, "community-panel");
            if (id === activeLanguage) card.classList.add("is-active-language");
            card.append(node("span", state === "approved" ? "MEMBER" : state === "pending" ? "REQUEST PENDING" : "PRIVATE CHANNEL", "community-badge"));
            if (id === activeLanguage) card.append(node("span", "Your language", "community-language-mark"));
            card.append(node("h3", membership.catalogue[id]), node("p", descriptions[id]));
            card.append(button(state === "approved" ? "Enter channel" : state === "pending" ? "View request" : "Request to join", () => { selected = id; page = 1; render(); }, "button button-outline"));
            directory.append(card);
        }
        if (!Object.hasOwn(membership.catalogue, selected)) return;
        const state = membership.state(selected, owner);
        gate.hidden = false;
        gate.append(node("span", "PRIVATE CHANNEL", "community-badge"), node("h2", membership.catalogue[selected]));
        if (state === "approved") {
            gate.append(node("p", "You are a member. Discussions in this channel are open to approved members."), button("Leave channel", () => act(() => membership.withdraw(selected, owner, state), "You left the channel. Request approval to join again."), "button button-outline"));
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

    $("community-composer").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget, submit = form.querySelector("button[type=submit]"); submit.disabled = true;
        const fields = { channel: $("post-channel").value, title: $("post-title").value, body: $("post-body").value, code: $("post-code").value, language: $("post-language").value, tags: $("post-tags").value };
        const ok = await act(() => store.createPost(fields, owner), "Your discussion is published.");
        submit.disabled = false;
        if (ok) { form.reset(); selected = fields.channel; page = 1; $("community-search").value = ""; $("community-filter").value = "all"; $("community-sort").value = "latest"; render(); $("community-feed-title").scrollIntoView({ block: "center" }); }
    });
    $("community-notifications").addEventListener("click", () => {
        const panel = $("community-notification-panel"); panel.hidden = !panel.hidden;
        $("community-notifications").setAttribute("aria-expanded", String(!panel.hidden)); render();
    });
    document.querySelector(".community-create").addEventListener("click", event => { event.preventDefault(); selected = "all"; page = 1; render(); $("community-directory").scrollIntoView({ block: "start" }); });
    for (const id of ["community-search", "community-tag", "community-filter", "community-sort"]) $(id).addEventListener(id === "community-search" ? "input" : "change", () => { page = 1; render(); });
    store.subscribe(render);
    window.addEventListener("pageshow", render);
    render();
})();
