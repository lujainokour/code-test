(() => {
    "use strict";
    const feed = document.getElementById("community-posts");
    if (!feed || feed.dataset.initialized) return;
    feed.dataset.initialized = "true";
    const key = "codementor-community-v1";
    const membership = window.communityMembership;
    const channels = { all: "All communities", ...membership.catalogue, saved: "Saved posts" };
    const $ = id => document.getElementById(id);
    const status = $("community-status");
    let owner;
    try { owner = window.platformStore.student().email.trim().toLowerCase(); }
    catch (error) { status.textContent = error.message; $("community-composer").hidden = true; return; }
    let selected = "all";
    const openReplies = new Set();
    const guide = [
        { id: "guide-questions", channel: "questions", title: "A good question is a great place to start.", body: "Tell us which lesson you are working on, what you expected, and what happened instead. Include a small code example and what you have already tried." },
        { id: "guide-notes", channel: "notes", title: "Explain it in your own words.", body: "Turn a concept you just learned into a short study note. Add an example, explain why it works, and credit any sources you used." },
        { id: "guide-projects", channel: "projects", title: "What are you building?", body: "Share your project idea, a recent breakthrough, or a problem you are working through. Ask for specific feedback so others know how to help." }
    ].map(post => ({ ...post, owner: "community-guide", name: "Community guide", createdAt: "2026-01-01T00:00:00.000Z", likes: [], saved: [], replies: [], example: true }));
    const text = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
    const validPerson = item => text(item.owner, 254) && text(item.name, 160) && Number.isFinite(Date.parse(item.createdAt));
    function read() {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return { version: 1, posts: structuredClone(guide) };
            const data = JSON.parse(raw);
            if (data?.version !== 1 || !Array.isArray(data.posts) || !data.posts.every(p =>
                text(p.id, 100) && validPerson(p) && Object.hasOwn(channels, p.channel) && !["all", "saved"].includes(p.channel) &&
                text(p.title, 140) && text(p.body, 5000) && [p.likes, p.saved].every(list => Array.isArray(list) && list.every(v => text(v, 254))) &&
                Array.isArray(p.replies) && p.replies.every(r => text(r.id, 100) && validPerson(r) && text(r.body, 2000))) ||
                new Set(data.posts.map(p => p.id)).size !== data.posts.length) throw Error();
            return data;
        } catch { throw Error("Saved discussions could not be read. Existing data was kept. Restore browser storage before posting."); }
    }
    function node(tag, content, cls) {
        const el = document.createElement(tag);
        if (content !== undefined) el.textContent = content;
        if (cls) el.className = cls;
        return el;
    }
    function button(label, action, cls) {
        const el = node("button", label, cls); el.type = "button"; el.addEventListener("click", action); return el;
    }
    function clean(value, max, label) {
        const result = value.trim();
        if (!result || result.length > max) throw Error(`${label} must contain 1–${max} characters.`);
        return result;
    }
    async function mutate(change, message) {
        try {
            if (!navigator.locks?.request) throw Error("Open the site on localhost or HTTPS in a supported browser to save discussions.");
            await navigator.locks.request(key, () => {
                const account = window.platformStore.student(owner), data = read();
                change(data, account);
                localStorage.setItem(key, JSON.stringify(data));
            });
            render(); status.textContent = message; return true;
        } catch (error) { status.textContent = error.message || "Could not save. Your changes were not stored."; return false; }
    }
    function find(data, id) {
        const post = data.posts.find(p => p.id === id);
        if (!post) throw Error("This post was removed. Refresh the discussions and try again.");
        membership.assertMember(post.channel, owner);
        return post;
    }
    function toggle(id, field) {
        return mutate(data => {
            const list = find(data, id)[field], index = list.indexOf(owner);
            if (index === -1) list.push(owner); else list.splice(index, 1);
        }, field === "saved" ? "Saved posts updated." : "Reaction updated.");
    }
    function stamp(record) { return { id: crypto.randomUUID(), owner, name: record.name, createdAt: new Date().toISOString() }; }
    function remove(id, replyId) {
        return mutate(data => {
            const post = find(data, id);
            const target = replyId ? post.replies.find(r => r.id === replyId) : post;
            if (!target || target.owner !== owner) throw Error("You can only delete your own contributions.");
            if (replyId) post.replies = post.replies.filter(r => r.id !== replyId);
            else data.posts = data.posts.filter(p => p.id !== id);
        }, replyId ? "Reply deleted." : "Post deleted.");
    }
    function postCard(post) {
        const card = node("article", undefined, "community-post"); card.dataset.postId = post.id;
        const meta = node("div", undefined, "community-post-meta");
        const initials = post.name.split(/\s+/).slice(0, 2).map(s => Array.from(s)[0]).join("");
        meta.append(node("span", initials, "community-avatar"), node("b", post.name), node("span", channels[post.channel], "community-tag"));
        const time = node("time", post.example ? "Starter discussion" : new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })); time.dateTime = post.createdAt; meta.append(time);
        const title = node("h3", post.title); title.dir = "auto";
        const body = node("p", post.body, "community-post-body"); body.dir = "auto";
        const actions = node("div", undefined, "community-post-actions");
        const like = button(`Helpful · ${post.likes.length}`, () => toggle(post.id, "likes")); like.setAttribute("aria-pressed", post.likes.includes(owner));
        const saved = button(post.saved.includes(owner) ? "Saved" : "Save", () => toggle(post.id, "saved")); saved.setAttribute("aria-pressed", post.saved.includes(owner));
        const replies = node("div", undefined, "community-replies"); replies.id = `replies-${post.id}`; replies.hidden = !openReplies.has(post.id);
        const replyButton = button(`Replies · ${post.replies.length}`, () => {
            replies.hidden = !replies.hidden; replyButton.setAttribute("aria-expanded", !replies.hidden);
            if (replies.hidden) openReplies.delete(post.id); else { openReplies.add(post.id); replies.querySelector("textarea").focus(); }
        });
        replyButton.setAttribute("aria-expanded", !replies.hidden); replyButton.setAttribute("aria-controls", replies.id);
        actions.append(like, replyButton, saved);
        if (post.owner === owner) actions.append(button("Delete post", () => remove(post.id), "community-delete"));
        post.replies.forEach(reply => {
            const row = node("div", undefined, "community-reply");
            row.append(node("b", reply.name, "community-reply-meta"));
            const content = node("p", reply.body, "community-reply-body"); content.dir = "auto"; row.append(content);
            if (reply.owner === owner) row.append(button("Delete reply", () => remove(post.id, reply.id), "community-delete"));
            replies.append(row);
        });
        const form = node("form"), label = node("label", "Add a reply"), input = node("textarea");
        input.id = `reply-${post.id}`; input.required = true; input.maxLength = 2000; input.rows = 2; input.dir = "auto"; label.htmlFor = input.id;
        const submit = node("button", "Post reply", "button button-outline"); submit.type = "submit"; form.append(label, input, submit);
        form.addEventListener("submit", async event => {
            event.preventDefault(); submit.disabled = true;
            const value = input.value;
            const ok = await mutate((data, account) => { find(data, post.id).replies.push({ ...stamp(account), body: clean(value, 2000, "Reply") }); openReplies.add(post.id); }, "Reply published.");
            submit.disabled = false;
            if (ok) $( `reply-${post.id}`).focus();
        });
        replies.append(form); card.append(meta, title, body, actions, replies); return card;
    }
    function render() {
        try {
            const data = read(), query = $("community-search").value.trim().toLowerCase(), sort = $("community-sort").value;
            renderAccess();
            let posts = data.posts.filter(p => membership.state(p.channel, owner) === "approved" && (selected === "all" || (selected === "saved" ? p.saved.includes(owner) : p.channel === selected)) &&
                `${p.title} ${p.body} ${p.name}`.toLowerCase().includes(query) && (sort !== "unanswered" || p.replies.length === 0));
            posts.sort((a, b) => sort === "active" ? b.replies.length - a.replies.length || Date.parse(b.createdAt) - Date.parse(a.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt));
            $("community-feed-title").textContent = channels[selected];
            $("community-count").textContent = `${posts.length} ${posts.length === 1 ? "discussion" : "discussions"}`;
            feed.replaceChildren(...posts.map(postCard));
            if (!posts.length) feed.append(node("p", "No accessible discussions match. Join a community to participate.", "community-empty"));
            $("community-channels").replaceChildren(...Object.entries(channels).map(([id, label]) => {
                const item = button(label, () => { selected = id; render(); });
                item.setAttribute("aria-pressed", selected === id); return item;
            }));
        } catch (error) { status.textContent = error.message; feed.replaceChildren(); $("community-composer").hidden = true; document.querySelector(".community-toolbar").hidden = true; $("community-access").replaceChildren(); $("community-access").hidden = true; $("community-directory").replaceChildren(); $("community-count").textContent = ""; }
    }
    async function accessAction(action, message) {
        try { await action(); status.textContent = message; render(); }
        catch (error) { status.textContent = error.message; }
    }
    function renderAccess() {
        window.platformStore.student(owner);
        const allowed = Object.keys(membership.catalogue).filter(id => membership.state(id, owner) === "approved");
        const composer = $("community-composer"), picker = $("post-channel"), previous = picker.value;
        picker.replaceChildren(...allowed.filter(id => ["all", "saved"].includes(selected) || id === selected).map(id => { const option = node("option", channels[id]); option.value = id; return option; }));
        if ([...picker.options].some(o => o.value === previous)) picker.value = previous;
        composer.hidden = !picker.options.length;
        document.querySelector(".community-toolbar").hidden = !picker.options.length;
        if (composer.hidden) { $("post-title").value = ""; $("post-body").value = ""; }
        const directory = $("community-directory"), gate = $("community-access");
        directory.hidden = selected !== "all"; directory.replaceChildren(); gate.hidden = true; gate.replaceChildren();
        const descriptions = {questions: "Work through lesson questions with your study circle.", notes: "Exchange summaries and explain concepts together.", resources: "Curate useful learning resources with your group.", projects: "Discuss ideas, share progress and get project feedback."};
        for (const id of Object.keys(membership.catalogue)) {
            const state = membership.state(id, owner), card = node("article", undefined, "community-panel");
            card.append(node("span", state === "approved" ? "MEMBER" : state === "pending" ? "REQUEST PENDING" : "PRIVATE CHANNEL", "community-badge"), node("h3", channels[id]), node("p", descriptions[id]));
            card.append(button(state === "approved" ? "Enter channel" : state === "pending" ? "View request" : "Request to join", () => { selected = id; render(); }, "button button-outline")); directory.append(card);
        }
        if (!Object.hasOwn(membership.catalogue, selected)) return;
        const state = membership.state(selected, owner);
        gate.hidden = false;
        gate.append(node("span", "PRIVATE CHANNEL", "community-badge"), node("h2", channels[selected]));
        if (state === "approved") {
            gate.append(node("p", "You are a member. Discussions in this channel are open to approved members."), button("Leave channel", () => accessAction(() => membership.withdraw(selected, owner, state), "You left the channel. Request approval to join again."), "button button-outline")); return;
        }
        const copy = {pending: "Your request is waiting for administrator approval. Discussions stay private until you are accepted.", rejected: "Your request was declined. You can submit a new request with more information.", revoked: "An administrator removed your access. You may request to join again.", left: "You left this channel. Request approval to join again.", cancelled: "Your request was cancelled. You can request to join again."};
        gate.append(node("p", copy[state] || "This channel is private. Tell the administrator why you would like to join. Posts and replies open after approval."));
        if (state === "pending") { gate.append(button("Cancel request", () => accessAction(() => membership.withdraw(selected, owner, state), "Join request cancelled."), "button button-outline")); return; }
        const form = node("form"), label = node("label", "Why would you like to join?"), reason = node("textarea"), submit = node("button", "Send join request", "button button-primary");
        reason.id = "join-reason"; reason.required = true; reason.maxLength = 1000; reason.rows = 3; reason.dir = "auto"; label.htmlFor = reason.id; submit.type = "submit"; form.append(label, reason, submit);
        const channel = selected;
        form.addEventListener("submit", async event => { event.preventDefault(); submit.disabled = true; await accessAction(() => membership.request(channel, reason.value, owner), "Request sent. An administrator will review it."); submit.disabled = false; }); gate.append(form);
    }
    $("community-composer").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget, submit = form.querySelector("button[type=submit]"); submit.disabled = true;
        const channel = $("post-channel").value, title = $("post-title").value, body = $("post-body").value;
        const ok = await mutate((data, account) => {
            if (!Object.hasOwn(channels, channel) || ["all", "saved"].includes(channel)) throw Error("Choose a discussion channel.");
            membership.assertMember(channel, owner);
            data.posts.push({ ...stamp(account), channel, title: clean(title, 140, "Title"), body: clean(body, 5000, "Post"), likes: [], saved: [], replies: [] });
        }, "Your discussion is published.");
        submit.disabled = false;
        if (ok) { form.reset(); selected = channel; $("community-search").value = ""; $("community-sort").value = "newest"; render(); $("community-feed-title").scrollIntoView({ block: "center" }); }
    });
    document.querySelector(".community-create").addEventListener("click", event => { event.preventDefault(); selected = "all"; render(); $("community-directory").scrollIntoView({block: "start"}); });
    $("community-search").addEventListener("input", render);
    $("community-sort").addEventListener("change", render);
    window.addEventListener("storage", event => { if ([key, membership.key, "codementor-profile-v1", "codementor-platform-v1", null].includes(event.key)) render(); });
    window.addEventListener("community-membership-changed", render);
    window.addEventListener("student-account-changed", render);
    window.addEventListener("pageshow", render);
    render();
})();
