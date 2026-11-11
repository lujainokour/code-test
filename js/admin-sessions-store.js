/* Administrator-managed platform sessions. Legacy storage keys retain existing bookings and notes. */
(() => {
    "use strict";

    const STORE_KEY = "codementor-teacher-store-v1";
    const LOCK_KEY = "codementor-instructor-bookings";

    const defaultInitialData = {
        profile: { name: "CodeMentor Learning Team", email: "admin@example.com", hourlyRate: 25, currency: "USD" },
        sessions: [
            {
                id: "sess-101", sample: true,
                title: "Python Data Structures & Advanced Algorithms",
                subject: "Data Structures & Algorithms",
                level: "Intermediate",
                duration: 60,
                type: "1-on-1 Mentoring",
                price: 25,
                description: "Deep dive into trees, graphs, dynamic programming, and writing clean, optimal Python code with big-O analysis.",
                status: "Active",
                enrolledCount: 18,
                createdAt: "2026-10-10T09:00:00Z"
            },
            {
                id: "sess-102", sample: true,
                title: "SQL Server Database Design & Query Optimization",
                subject: "SQL & Relational Databases",
                level: "Beginner to Advanced",
                duration: 60,
                type: "1-on-1 Mentoring",
                price: 30,
                description: "Hands-on normalized schema design (3NF), complex joins, subqueries, indexing strategies, and concurrency control.",
                status: "Active",
                enrolledCount: 12,
                createdAt: "2026-10-18T11:00:00Z"
            },
            {
                id: "sess-103", sample: true,
                title: "Python OOP & Design Patterns Masterclass",
                subject: "Python Programming",
                level: "Intermediate",
                duration: 90,
                type: "Small Group Workshop",
                price: 20,
                description: "Interactive session covering encapsulation, inheritance, polymorphism, abstract base classes, and SOLID design principles.",
                status: "Active",
                enrolledCount: 24,
                createdAt: "2026-10-22T14:30:00Z"
            },
            {
                id: "sess-104", sample: true,
                title: "Graduation Project Mentorship & AI Evaluation",
                subject: "Machine Learning Fundamentals",
                level: "Advanced",
                duration: 60,
                type: "1-on-1 Mentoring",
                price: 35,
                description: "Architectural consultation, model evaluation strategies, and methodology guidance for university capstone projects.",
                status: "Active",
                enrolledCount: 9,
                createdAt: "2026-11-01T16:00:00Z"
            }
        ],
        schedule: {
            defaultRate: 25,
            instantBooking: false,
            meetingPlatform: "Google Meet",
            availability: {
                Sunday: { active: true, slots: ["10:00 AM - 11:30 AM", "02:00 PM - 03:30 PM", "05:00 PM - 06:30 PM"] },
                Monday: { active: true, slots: ["11:00 AM - 12:30 PM", "04:00 PM - 05:30 PM"] },
                Tuesday: { active: true, slots: ["10:00 AM - 11:30 AM", "02:00 PM - 03:30 PM", "06:00 PM - 07:30 PM"] },
                Wednesday: { active: true, slots: ["01:00 PM - 02:30 PM", "04:00 PM - 05:30 PM"] },
                Thursday: { active: true, slots: ["10:00 AM - 11:30 AM", "03:00 PM - 04:30 PM"] },
                Friday: { active: false, slots: [] },
                Saturday: { active: false, slots: [] }
            }
        },
        bookings: [
            {
                id: "bk-201",
                studentName: "Lujain Okour",
                studentEmail: "student@example.com",
                studentInitials: "LO",
                sessionTitle: "Python Data Structures & Advanced Algorithms",
                requestedDate: "2026-11-08",
                requestedTime: "02:00 PM - 03:30 PM",
                price: 25,
                notes: "I'd like to review recursive binary search and linked list pointer manipulation before our university exam.",
                status: "Pending",
                createdAt: "2026-11-05T14:15:00Z"
            },
            {
                id: "bk-202",
                studentName: "Omar Khaled",
                studentEmail: "omar.k@example.com",
                studentInitials: "OK",
                sessionTitle: "SQL Server Database Design & Query Optimization",
                requestedDate: "2026-11-09",
                requestedTime: "11:00 AM - 12:30 PM",
                price: 30,
                notes: "Need guidance on setting up proper 3NF foreign key constraints and multi-row triggers without deadlocks.",
                status: "Confirmed",
                createdAt: "2026-11-04T10:30:00Z"
            },
            {
                id: "bk-203",
                studentName: "Noor Al-Hassan",
                studentEmail: "noor.h@example.com",
                studentInitials: "NH",
                sessionTitle: "Python OOP & Design Patterns Masterclass",
                requestedDate: "2026-11-10",
                requestedTime: "04:00 PM - 05:30 PM",
                price: 20,
                notes: "Interested in practical examples of the Factory and Strategy patterns in Python.",
                status: "Confirmed",
                createdAt: "2026-11-03T18:00:00Z"
            },
            {
                id: "bk-204",
                studentName: "Zaid Ahmad",
                studentEmail: "zaid.a@example.com",
                studentInitials: "ZA",
                sessionTitle: "Graduation Project Mentorship & AI Evaluation",
                requestedDate: "2026-11-02",
                requestedTime: "10:00 AM - 11:30 AM",
                price: 35,
                notes: "Reviewed capstone methodology and evaluation metrics. Everything agreed upon.",
                status: "Completed",
                createdAt: "2026-10-30T12:00:00Z"
            }
        ],
        students: [
            {
                id: "std-1",
                name: "Lujain Okour",
                email: "student@example.com",
                initials: "LO",
                enrolledCourse: "Python & Algorithms Mentorship",
                sessionsCompleted: 5,
                lastSessionDate: "2026-11-02",
                status: "Active",
                progressNotes: [
                    {
                        date: "2026-11-02",
                        text: "Showed strong understanding of list comprehensions and dictionary mappings. Recommended practice on recursive boundary checks."
                    },
                    {
                        date: "2026-10-25",
                        text: "Covered OOP fundamentals and class instantiation. Demonstrated clear grasp of object modeling."
                    }
                ]
            },
            {
                id: "std-2",
                name: "Omar Khaled",
                email: "omar.k@example.com",
                initials: "OK",
                enrolledCourse: "SQL Server Database Design",
                sessionsCompleted: 3,
                lastSessionDate: "2026-10-28",
                status: "Active",
                progressNotes: [
                    {
                        date: "2026-10-28",
                        text: "Mastered intermediate JOINs and GROUP BY queries. Moving next to CTEs and window functions."
                    }
                ]
            },
            {
                id: "std-3",
                name: "Noor Al-Hassan",
                email: "noor.h@example.com",
                initials: "NH",
                enrolledCourse: "Python OOP Masterclass",
                sessionsCompleted: 2,
                lastSessionDate: "2026-10-31",
                status: "Active",
                progressNotes: [
                    {
                        date: "2026-10-31",
                        text: "Great progress on encapsulation and private member variables. Highly motivated learner."
                    }
                ]
            },
            {
                id: "std-4",
                name: "Zaid Ahmad",
                email: "zaid.a@example.com",
                initials: "ZA",
                enrolledCourse: "Capstone AI Mentorship",
                sessionsCompleted: 6,
                lastSessionDate: "2026-11-02",
                status: "Completed",
                progressNotes: [
                    {
                        date: "2026-11-02",
                        text: "Completed project proposal defense preparation. Methodological structure is robust and well documented."
                    }
                ]
            }
        ]
    };

    function readStore() {
        let raw;
        try { raw = localStorage.getItem(STORE_KEY); }
        catch { throw new Error("Browser storage is unavailable. Your saved records have not been changed."); }
        if (raw === null) return JSON.parse(JSON.stringify(defaultInitialData));
        let value;
        try { value = JSON.parse(raw); } catch { throw new Error("Saved session data could not be read. It has not been replaced."); }
        if (!value || typeof value !== "object" || !value.profile || typeof value.profile.name !== "string" || typeof value.profile.email !== "string" || !Array.isArray(value.sessions) || !Array.isArray(value.bookings) || !Array.isArray(value.students) || !value.schedule || typeof value.schedule !== "object" || !value.schedule.availability) {
            throw new Error("Saved session data is invalid. It has not been replaced.");
        }
        return value;
    }

    function writeStore(data) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
        catch { throw new Error("Changes could not be saved. Browser storage is unavailable or full. Your previous records were kept."); }
        return true;
    }

    function requireAdmin() {
        let account;
        try { account = JSON.parse(sessionStorage.getItem("codementor-admin-session")); } catch {}
        if (account?.role !== "admin" || account.isDemo !== true || !Number.isFinite(account.signedInAt) || account.signedInAt > Date.now() || Date.now() - account.signedInAt >= 8 * 3600000) throw new Error("Sign in as an administrator to manage platform sessions.");
    }
    const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase();
    function slots(data, sessionId) {
        const session = data.sessions.find(item => item.id === sessionId && item.status === "Active");
        if (!session) return [];
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], result = [];
        const minutes = text => {
            const match = text.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
            if (!match || +match[2] > 59 || +match[1] > (match[3] ? 12 : 23) || (match[3] && +match[1] < 1)) return null;
            return (match[3] ? +match[1] % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0) : +match[1]) * 60 + +match[2];
        };
        for (let offset = 0; offset < 14; offset++) {
            const day = new Date(); day.setDate(day.getDate() + offset); day.setHours(0, 0, 0, 0);
            const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`;
            const schedule = data.schedule.availability[days[day.getDay()]];
            if (!schedule?.active) continue;
            for (const range of schedule.slots) {
                const parts = range.split(/\s*[-–]\s*/), start = minutes(parts[0] || ""), end = minutes(parts[1] || "");
                if (start === null || end === null || end - start < session.duration) continue;
                const at = new Date(day); at.setMinutes(start);
                if (at <= new Date()) continue;
                const blocked = data.bookings.some(booking => booking.requestedDate === date && ["Pending", "Confirmed", "Completed"].includes(booking.status) && (() => {
                    const parts = booking.requestedTime.split(/\s*[-–]\s*/), from = minutes(parts[0] || ""), to = minutes(parts[1] || "");
                    return from !== null && to !== null && start < to && start + session.duration > from;
                })());
                if (!blocked) result.push({ id: `${sessionId}:${date}:${encodeURIComponent(range)}`, date, time: range, startsAt: at.toISOString() });
            }
        }
        return result;
    }


    function minute(value) {
        const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] > 59) throw Error("Use time ranges such as 03:00 PM - 04:30 PM.");
        return (+match[1] % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + +match[2];
    }
    function validateSchedule(schedule) {
        if (!schedule.availability || !["Google Meet", "Zoom", "Microsoft Teams"].includes(schedule.meetingPlatform)) throw Error("Choose a meeting platform and weekly availability.");
        for (const value of Object.values(schedule.availability)) {
            if (typeof value.active !== "boolean" || !Array.isArray(value.slots)) throw Error("Check the weekly availability.");
            const ranges = value.slots.map(slot => { const parts = slot.split(/\s*-\s*/); if (parts.length !== 2) throw Error("Enter a start and end time."); const start = minute(parts[0]), end = minute(parts[1]); if (end <= start) throw Error("An appointment must end after its start."); return [start, end]; }).sort((a,b)=>a[0]-b[0]);
            if (ranges.some((range,index)=>index && range[0] < ranges[index-1][1])) throw Error("Weekly time windows cannot overlap.");
        }
    }

    // Public API
    window.adminSessionsStore = {
        // --- Platform configuration (legacy profile records are preserved) ---
        getProfile() {
            const store = readStore();
            return store.profile;
        },


        // --- Tutoring Sessions ---
        getSessions() {
            const store = readStore();
            return (store.sessions || []).map(session => ({ ...session, enrolledCount: new Set(store.bookings.filter(b => (b.sessionId === session.id || (!b.sessionId && b.sessionTitle === session.title)) && ["Confirmed", "Completed"].includes(b.status)).map(b => b.studentEmail.toLowerCase())).size }));
        },

        addSession(sessionData) {
            const store = readStore();
            if (!sessionData.title?.trim() || !sessionData.description?.trim() || !Number.isFinite(Number(sessionData.price)) || Number(sessionData.price) < 0 || !Number.isInteger(Number(sessionData.duration)) || Number(sessionData.duration) < 1) throw new Error("Enter a title, description, non-negative price and valid duration.");
            const newSession = {
                id: "sess-" + crypto.randomUUID(),
                title: sessionData.title.trim(),
                subject: sessionData.subject,
                level: sessionData.level || "Intermediate",
                duration: Number(sessionData.duration) || 60,
                type: sessionData.type || "1-on-1 Mentoring",
                price: Number(sessionData.price),
                description: sessionData.description.trim(),
                status: "Active",
                enrolledCount: 0,
                createdAt: new Date().toISOString()
            };
            store.sessions.unshift(newSession);
            writeStore(store);
            return newSession;
        },

        updateSession(id, updatedFields) {
            const store = readStore();
            const index = store.sessions.findIndex(s => s.id === id);
            if (index === -1) return null;
            if (!['Active', 'Paused'].includes(updatedFields.status) || Object.keys(updatedFields).some(key => key !== 'status')) throw Error("Only session visibility can be changed here.");
            store.sessions[index].status = updatedFields.status;
            writeStore(store);
            return store.sessions[index];
        },

        deleteSession(id) {
            const store = readStore();
            if (store.bookings.some(b => b.sessionId === id && ["Pending", "Confirmed"].includes(b.status))) throw new Error("Resolve this session's active bookings before removing it.");
            store.sessions = store.sessions.filter(s => s.id !== id);
            writeStore(store);
            return true;
        },

        // --- Schedule & Availability ---
        getSchedule() {
            const store = readStore();
            return store.schedule;
        },

        updateSchedule(scheduleData) {
            const store = readStore();
            if (!Number.isFinite(scheduleData.defaultRate) || scheduleData.defaultRate < 0) throw new Error("Enter a non-negative hourly rate.");
            validateSchedule(scheduleData);
            store.schedule = { ...store.schedule, ...scheduleData, instantBooking: false };
            store.profile.hourlyRate = store.schedule.defaultRate;
            writeStore(store);
            return store.schedule;
        },

        // --- Bookings / Student Requests ---
        getBookings() {
            const store = readStore();
            requireAdmin(); return store.bookings || [];
        },

        getPublicSessions() {
            const data = readStore();
            return data.sessions.filter(item => item.status === "Active").map(item => ({ id: `instructor-${item.id}`, sessionId: item.id, platformSession: true, providerName: "CodeMentor Learning Team", language: /python/i.test(item.subject + item.title) ? "Python" : /sql/i.test(item.subject + item.title) ? "SQL" : /c#/i.test(item.subject + item.title) ? "C#" : "Programming", skills: [item.subject], topic: item.title, description: item.description, duration: item.duration, price: item.price, currency: data.profile.currency || "USD", demoAdminApproved: true }));
        },
        getAvailableSlots(sessionId) { return slots(readStore(), sessionId); },
        async requestBooking(sessionId, slotId, notes, expectedOwner) {
            const reserve = () => {
                const account = window.platformStore.student(expectedOwner), data = readStore();
                const session = data.sessions.find(item => item.id === sessionId && item.status === "Active");
                const slot = slots(data, sessionId).find(item => item.id === slotId);
                if (!session || !slot) throw new Error("This appointment is no longer available. Reload and choose another time.");
                if (typeof notes !== "string" || !notes.trim() || notes.length > 1000) throw new Error("Describe your learning goal using up to 1000 characters.");
                const booking = { id: "bk-" + crypto.randomUUID(), sessionId, studentName: account.name, studentEmail: account.email.trim().toLowerCase(), studentInitials: initials(account.name), sessionTitle: session.title, requestedDate: slot.date, requestedTime: slot.time, startsAt: slot.startsAt, duration: session.duration, price: session.price, currency: data.profile.currency || "USD", notes: notes.trim(), status: "Pending", linkedStudent: true, createdAt: new Date().toISOString() };
                data.bookings.push(booking);
                writeStore(data);
                return { ...booking };
            };
            if (!navigator.locks?.request) throw new Error("Booking requires HTTPS or localhost in a browser supporting Web Locks.");
            return navigator.locks.request("codementor-instructor-bookings", reserve);
        },
        getStudentBookings(expectedOwner) {
            const account = window.platformStore.student(expectedOwner);
            return readStore().bookings.filter(booking => booking.linkedStudent && booking.studentEmail === account.email.trim().toLowerCase());
        },
        cancelStudentBooking(id, expectedOwner) {
            const account = window.platformStore.student(expectedOwner), data = readStore();
            const booking = data.bookings.find(item => item.id === id && item.linkedStudent && item.studentEmail === account.email.trim().toLowerCase());
            if (!booking || !["Pending", "Confirmed"].includes(booking.status)) throw new Error("This booking can no longer be cancelled.");
            if (booking.startsAt && Date.parse(booking.startsAt) <= Date.now()) throw Error("This appointment has started. Contact platform support about any issue.");
            booking.status = "Cancelled"; booking.updatedAt = new Date().toISOString(); writeStore(data);
        },

        updateBookingStatus(bookingId, newStatus, details = {}) {
            const store = readStore();
            const index = store.bookings.findIndex(b => b.id === bookingId);
            if (index === -1) return null;
            if (store.bookings[index].linkedStudent) requireAdmin();
            const previousStatus = store.bookings[index].status;
            if (previousStatus === newStatus) return store.bookings[index];
            const transitions = { Pending: ["Confirmed", "Declined"], Confirmed: ["Completed", "Declined"], Completed: [], Declined: [] };
            if (!transitions[previousStatus]?.includes(newStatus)) throw new Error("This booking changed. Reload before changing its status.");
            const booking = store.bookings[index];
            if (newStatus === "Confirmed") {
                if (booking.startsAt && Date.parse(booking.startsAt) <= Date.now()) throw Error("This appointment has passed. Decline it and ask the student to book another time.");
                let meeting;
                try { meeting = new URL(details.meetingUrl); } catch { throw Error("Add the scheduled meeting HTTPS link before confirming."); }
                if (meeting.protocol !== "https:" || meeting.username || meeting.password || !meeting.hostname.includes(".")) throw Error("Use a complete HTTPS meeting link without embedded credentials.");
                booking.meetingUrl = meeting.href;
            }
            if (newStatus === "Declined") {
                if (typeof details.reason !== "string" || details.reason.trim().length < 5 || details.reason.length > 1000) throw Error("Explain the decision using 5-1000 characters.");
                booking.reason = details.reason.trim(); booking.meetingUrl = "";
            }
            if (newStatus === "Completed" && booking.startsAt && Date.now() < Date.parse(booking.startsAt) + (booking.duration || 60) * 60000) throw Error("A session can be completed only after its scheduled end.");
            store.bookings[index].status = newStatus;
            store.bookings[index].updatedAt = new Date().toISOString();
            if (store.bookings[index].linkedStudent && ["Confirmed", "Completed"].includes(newStatus) && !store.students.some(s => s.email.toLowerCase() === store.bookings[index].studentEmail)) {
                const booking = store.bookings[index];
                store.students.push({ id: "student-" + crypto.randomUUID(), name: booking.studentName, email: booking.studentEmail, initials: booking.studentInitials, enrolledCourse: booking.sessionTitle, status: "Active", sessionsCompleted: 0, progressNotes: [], linkedStudent: true });
            }

            // Existing legacy students keep their notes and become linked to their actual booking.
            if (store.bookings[index].linkedStudent && ["Confirmed", "Completed"].includes(newStatus)) {
                const booking = store.bookings[index];
                const student = store.students.find(s => s.email.toLowerCase() === booking.studentEmail);
                if (student) { student.linkedStudent = true; student.enrolledCourse = booking.sessionTitle; }
            }
            // If confirmed or completed, reflect on student sessions
            if (newStatus === "Completed") {
                const booking = store.bookings[index];
                const student = store.students.find(s => s.email.toLowerCase() === booking.studentEmail.toLowerCase());
                if (student) {
                    student.sessionsCompleted = (student.sessionsCompleted || 0) + 1;
                    student.lastSessionDate = new Date().toISOString().split("T")[0];
                }
            }

            writeStore(store);
            return store.bookings[index];
        },

        // --- Enrolled Students & Tracking ---
        getStudents() {
            const store = readStore();
            requireAdmin(); return store.students || [];
        },

        addStudentNote(studentId, noteText) {
            const store = readStore();
            const student = store.students.find(s => s.id === studentId);
            if (!student) return null;
            if (student.linkedStudent) requireAdmin();
            if (!student.progressNotes) student.progressNotes = [];
            if (typeof noteText !== "string" || !noteText.trim() || noteText.length > 3000) throw Error("Enter a progress note of 1-3000 characters.");
            const newNote = {
                date: new Date().toISOString().split("T")[0],
                text: noteText.trim()
            };
            student.progressNotes.unshift(newNote);
            writeStore(store);
            return newNote;
        },

    };
    // All changes share the same lock as student reservations; recheck identity inside it.
    const api = window.adminSessionsStore;
    for (const name of ["getProfile", "getSessions", "getSchedule", "getBookings", "getStudents"]) {
        const action = api[name]; api[name] = function(...args) { requireAdmin(); return action.apply(api,args); };
    }
    for (const name of ["addSession", "updateSession", "deleteSession", "updateSchedule", "updateBookingStatus", "addStudentNote", "cancelStudentBooking"]) {
        const action = api[name]; api[name] = async function(...args) {
            const check = () => name === "cancelStudentBooking" ? window.platformStore.student(args[1]) : requireAdmin();
            check();
            if (!navigator.locks?.request) throw Error("Safe updates require localhost or HTTPS in a supported browser.");
            return navigator.locks.request(LOCK_KEY, () => { check(); return action.apply(api,args); });
        };
    }
    Object.freeze(api);
})();
