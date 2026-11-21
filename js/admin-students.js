(() => {
    const students = window.adminStudentData;

    const form = document.getElementById("student-filter-form");
    const searchInput = document.getElementById("student-search");
    const statusFilter = document.getElementById(
        "student-status-filter"
    );
    const pathFilter = document.getElementById("student-path-filter");
    const clearButton = document.getElementById(
        "student-clear-filters"
    );

    const tableBody = document.getElementById("student-table-body");
    const emptyState = document.getElementById("student-empty-state");
    const resultsMessage = document.getElementById(
        "student-results-message"
    );
    const statsRoot = document.getElementById("student-overview-stats");
    const lowerRoot = document.getElementById("student-lower");

    if (!Array.isArray(students)) {
        resultsMessage.textContent =
            "Student data could not be loaded. Please refresh the page.";

        resultsMessage.classList.add("is-error");
        searchInput.disabled = true;
        statusFilter.disabled = true;
        if (pathFilter) pathFilter.disabled = true;
        clearButton.disabled = true;
        return;
    }

    // ---- presentation helpers (icons, initials); no data is added or estimated ----
    const ICONS = {
        total: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
        enabled: "M12 2l9 5-9 5-9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
        suspended: "M12 21a9 9 0 100-18 9 9 0 000 18z M5.6 5.6l12.8 12.8",
        recent: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4",
        warning: "M12 3l10 18H2z M12 10v5 M12 18h.01",
        bolt: "M13 2L3 14h8l-1 8 10-12h-8z",
        access: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M19 8v6 M22 11h-6",
        paths: "M12 2l9 5-9 5-9-5z M3 12l9 5 9-5 M3 17l9 5 9-5"
    };
    function icon(key, className = "student-ico") {
        const wrap = document.createElement("span");
        wrap.className = className;
        wrap.setAttribute("aria-hidden", "true");
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", ICONS[key]);
        svg.append(path);
        wrap.append(svg);
        return wrap;
    }
    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }
    function initials(name) {
        return String(name || "?").trim().split(/\s+/).slice(0, 2)
            .map(word => Array.from(word)[0] || "").join("").toUpperCase() || "?";
    }

    function createCell(text) {
        const cell = document.createElement("td");
        cell.textContent = text;
        return cell;
    }

    function createStudentRow(student) {
        const row = document.createElement("tr");

        const identityCell = document.createElement("td");
        identityCell.className = "student-identity";

        const avatar = element("span", initials(student.name), "student-avatar");
        avatar.setAttribute("aria-hidden", "true");

        const name = document.createElement("strong");
        name.textContent = student.name;

        const email = document.createElement("span");
        email.textContent = student.email;

        identityCell.append(avatar, name, email);

        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        status.className = `student-status is-${student.status}`;
        status.textContent =
            student.status === "enabled" ? "Enabled" : "Suspended";

        statusCell.append(status);

        const activityCell = document.createElement("td");
        const activityDate = document.createElement("time");

        activityDate.dateTime = student.lastActivity;
        activityDate.textContent = student.lastActivity;

        activityCell.append(activityDate);

        const actionCell = document.createElement("td");
        const detailsLink = document.createElement("a");

        detailsLink.className = "dashboard-text-link";
        detailsLink.href =
            `../admin/admin-student-details.html?id=${encodeURIComponent(student.id)}`;

        detailsLink.textContent = "View details →";
        detailsLink.setAttribute(
            "aria-label",
            `View details for ${student.name}`
        );

        actionCell.append(detailsLink);

        row.append(
            identityCell,
            createCell(student.learningPath),
            createCell(student.currentLevel),
            statusCell,
            activityCell,
            actionCell
        );

        return row;
    }

    function renderStudents() {
        const search = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedPath = pathFilter ? pathFilter.value : "all";

        const filteredStudents = students.filter(student => {
            const matchesSearch =
                student.name.toLowerCase().includes(search) ||
                student.email.toLowerCase().includes(search);

            const matchesStatus =
                selectedStatus === "all" ||
                student.status === selectedStatus;

            const matchesPath =
                selectedPath === "all" ||
                student.learningPath === selectedPath;

            return matchesSearch && matchesStatus && matchesPath;
        });

        const fragment = document.createDocumentFragment();

        filteredStudents.forEach(student => {
            fragment.append(createStudentRow(student));
        });

        tableBody.replaceChildren(fragment);
        emptyState.hidden = filteredStudents.length > 0;

        resultsMessage.textContent =
            `Showing ${filteredStudents.length} of ${students.length} sample students.`;
    }

    // Learning-path filter options come from the records themselves.
    if (pathFilter) {
        [...new Set(students.map(student => student.learningPath).filter(Boolean))].sort()
            .forEach(path => pathFilter.append(new Option(path, path)));
        pathFilter.addEventListener("change", renderStudents);
    }

    // Summary tiles: plain counts of the same records ("recently active" = last activity within 7 days of today).
    const enabledCount = students.filter(student => student.status === "enabled").length;
    const suspendedCount = students.filter(student => student.status === "suspended").length;
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const recentCount = students.filter(student => {
        const time = Date.parse(student.lastActivity);
        return Number.isFinite(time) && time >= weekAgo && time <= Date.now() + 24 * 3600 * 1000;
    }).length;
    [["total", "Total students", String(students.length), ""], ["enabled", "Enabled accounts", String(enabledCount), ""],
        ["suspended", "Suspended accounts", String(suspendedCount), ""], ["recent", "Recently active", String(recentCount), "(last 7 days)"]]
        .forEach(([key, label, value, note]) => {
            const tile = element("article", undefined, "student-stat");
            const number = element("p", undefined, "student-stat-value");
            number.append(element("strong", value));
            if (note) number.append(element("small", note));
            tile.append(icon(key, "student-ico student-ico-lg"), element("h2", label), number);
            statsRoot.append(tile);
        });

    // Lower cards: links to existing pages only.
    const attention = element("section", undefined, "dashboard-card student-attention");
    const attentionTitle = element("h2"); attentionTitle.append(icon("warning", "student-ico student-ico-title"), document.createTextNode("Needs attention"));
    attention.append(attentionTitle, element("p", "Accounts that may need your review.", "student-lower-sub"));
    const attentionRow = element("div", undefined, "student-attention-row");
    attentionRow.append(icon("suspended"), element("span", `${suspendedCount} suspended ${suspendedCount === 1 ? "account" : "accounts"}`));
    const reviewLink = element("a", "Review account →", "dashboard-text-link"); reviewLink.href = "admin-account-access.html";
    attentionRow.append(reviewLink); attention.append(attentionRow);

    const quick = element("section", undefined, "dashboard-card student-quick");
    const quickTitle = element("h2"); quickTitle.append(icon("bolt", "student-ico student-ico-title"), document.createTextNode("Quick actions"));
    quick.append(quickTitle, element("p", "Common student management tasks.", "student-lower-sub"));
    const quickRow = element("div", undefined, "student-quick-row");
    [["access", "Manage access", "admin-account-access.html", "button button-primary"], ["paths", "View learning paths", "admin-courses.html", "button button-outline"]].forEach(([key, label, href, cls]) => {
        const link = element("a", undefined, cls); link.href = href; link.append(icon(key, "student-ico student-ico-inline"), document.createTextNode(label)); quickRow.append(link);
    });
    quick.append(quickRow);
    lowerRoot.append(attention, quick);

    form.addEventListener("submit", event => {
        event.preventDefault();
        renderStudents();
    });

    searchInput.addEventListener("input", renderStudents);
    statusFilter.addEventListener("change", renderStudents);

    clearButton.addEventListener("click", () => {
        form.reset();
        renderStudents();
        searchInput.focus();
    });

    renderStudents();
})();
