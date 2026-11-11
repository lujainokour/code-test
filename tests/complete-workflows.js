(async () => {
    if (new URLSearchParams(location.search).get('run') !== 'disposable-profile') return;
    const output = document.getElementById('results'), frame = document.getElementById('subject'), checks = [];
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    let win, doc;
    const account = email => ({ name: 'Workflow Student', email, role: 'student', isDemo: true });
    const setAccount = email => cmStorage.setItem('codementor-demo-session', JSON.stringify(account(email)));
    function check(name, value) { checks.push({ name, passed: Boolean(value) }); output.textContent = JSON.stringify({ passed: checks.filter(x => x.passed).length, total: checks.length, checks }, null, 2); }
    function throws(fn) { try { fn(); return false; } catch { return true; } }
    // CloudPeak demo data exists only after an administrator loads the SAMPLE company workspace.
    async function loadSampleCompany(){await load("pages/auth/company-login.html");const had=win.sessionStorage.getItem("codementor-admin-session");win.sessionStorage.setItem("codementor-admin-session",JSON.stringify({role:"admin",isDemo:true,signedInAt:Date.now()}));try{win.companyStore.admin.loadSampleCompany();}finally{if(had===null)win.sessionStorage.removeItem("codementor-admin-session");}}
    async function load(route) {
        await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Load timeout: ' + route)), 10000); frame.onload = () => { clearTimeout(timer); resolve(); }; frame.src = new URL('../' + route, location.href); });
        await wait(60); win = frame.contentWindow; doc = win.document;
        doc.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();
    }
    function progress() { return JSON.parse(cmStorage.getItem('codementor-demo-learning') || '{"version":1,"lessons":[],"tasks":[],"assessments":{}}'); }
    try {
        testStorage.clear(); setAccount('workflow-a@example.com'); await loadSampleCompany();
        await load('pages/student/workspace.html?task=student-profile');
        let resolveRun;
        win.pythonRunner = { execute: () => new Promise(resolve => { resolveRun = resolve; }), stop() {} };
        doc.getElementById('code-editor').value = '# private code owned by A';
        doc.getElementById('submit-code').click(); await wait(30);
        const oldWindow = win, oldDocument = doc;
        cmStorage.removeItem('codementor-demo-session'); setAccount('workflow-b@example.com'); await wait(100);
        resolveRun({ output: 'Name: Lujain\nAge: 21\nTrack: Python', error: '' }); await wait(80);
        check('Changing account while execution is pending clears and disables the old editor', oldDocument.getElementById('code-editor').value === '' && oldDocument.getElementById('code-editor').disabled);
        check('Late Python result cannot award another account or leak private source', !JSON.stringify(progress()).includes('private code') && progress().tasks.length === 0 && !progress().support);
        check('Old page cannot re-enable draft or submit controls after execution finishes', oldDocument.getElementById('save-draft').disabled && oldDocument.getElementById('submit-code').disabled);
        setAccount('workflow-a@example.com');
        check('Previous account draft remains in its own namespace', cmStorage.getItem('codementor-demo-code-student-profile')?.includes('private code owned by A'));

        await load('pages/services/service-draft.html');
        const services = win.studentServicesStore;
        const draft = services.save('draft', { title:'Workflow service',description:'A working local service',skills:'Python, Testing',language:'Python',price:20,days:3,status:'draft',providerName:'Workflow Student' }, 'workflow-a@example.com');
        services.updateDraftStatus(draft.id, 'published', 'workflow-a@example.com');
        check('Published service is persisted in shared browser storage', localStorage.getItem('codementor-demo-service-drafts')?.includes(draft.id));
        await load('pages/services/service-details.html?id=published-' + draft.id);
        win.companyStore.setCompanySession({ name:'Workflow Company',email:'company@example.com' });
        await load('pages/services/service-details.html?id=published-' + draft.id);
        doc.getElementById('service-brief').value = 'Please build this tool'; doc.getElementById('service-brief').form.requestSubmit();
        const request = win.studentServicesStore.ownRecords('request', 'company@example.com')[0];
        check('Company can request an actual published student service', request?.recipientEmail === 'workflow-a@example.com' && request.workflowStatus === 'New');
        await load('pages/student/requests.html?view=student');
        check('Student inbox receives the company request', doc.getElementById('incoming-service-requests').textContent.includes('Please build this tool'));
        win.studentServicesStore.updateRequestStatus(request.id, 'Accepted', 'workflow-a@example.com', 'New');
        check('Stale request update is rejected', throws(() => win.studentServicesStore.updateRequestStatus(request.id, 'Declined', 'workflow-a@example.com', 'New')));
        win.studentServicesStore.updateRequestStatus(request.id, 'Completed', 'workflow-a@example.com', 'Accepted');
        check('Completed service cannot be reopened', throws(() => win.studentServicesStore.updateRequestStatus(request.id, 'Accepted', 'workflow-a@example.com')));
        await load('pages/student/requests.html?view=company');
        check('Company tracker sees provider completion', doc.getElementById('service-content').textContent.includes('Completed'));

        await load('pages/services/peer-mentoring.html');
        const sessions = win.adminSessionsStore, session = sessions.getPublicSessions()[0], slot = sessions.getAvailableSlots(session.sessionId)[0];
        check('Student catalogue includes platform sessions and available calendar slots', doc.body.textContent.includes(session.topic) && slot);
        const attempts = await Promise.allSettled([sessions.requestBooking(session.sessionId, slot.id, 'Help with Python', 'workflow-a@example.com'), sessions.requestBooking(session.sessionId, slot.id, 'Duplicate time', 'workflow-a@example.com')]);
        check('Concurrent requests for one platform appointment reserve it only once', attempts.filter(r => r.status === 'fulfilled').length === 1);
        const booking = attempts.find(r => r.status === 'fulfilled').value;
        check('Reserved appointment is removed from availability', !sessions.getAvailableSlots(session.sessionId).some(item => item.id === slot.id));
        await load('pages/services/mentoring-details.html?id=' + encodeURIComponent(session.id));
        doc.getElementById('booking-slot').selectedIndex = 1;
        doc.getElementById('booking-notes').value = 'Booking through the student form';
        doc.getElementById('booking-notes').form.requestSubmit();
        for(let attempt=0;attempt<50&&!win.adminSessionsStore.getStudentBookings('workflow-a@example.com').some(item=>item.notes==='Booking through the student form');attempt++)await wait(50);
        check('Student can submit an platform booking through the actual page form',win.adminSessionsStore.getStudentBookings('workflow-a@example.com').some(item=>item.notes==='Booking through the student form'));
        check('Student cannot access administrator booking records', throws(() => sessions.getBookings()));
        sessionStorage.setItem('codementor-admin-session', JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()}));
        await load('pages/admin/admin-bookings.html');
        check('Admin dashboard receives the student booking', doc.body.textContent.includes('Help with Python'));
        await win.adminSessionsStore.updateBookingStatus(booking.id, 'Confirmed', {meetingUrl:'https://meet.example.com/workflow'});
        check('Accepting a booking registers the student for admin follow-up', win.adminSessionsStore.getStudents().some(item => item.email === 'workflow-a@example.com'));
        await load('pages/student/requests.html?view=student');
        check('Student sees admin confirmation', doc.getElementById('platform-bookings').textContent.includes('Confirmed'));
        await win.adminSessionsStore.cancelStudentBooking(booking.id, 'workflow-a@example.com');
        check('Student cancellation releases the appointment', win.adminSessionsStore.getAvailableSlots(session.sessionId).some(item => item.id === slot.id));
        setAccount('workflow-b@example.com');
        check('A different student cannot read the prior student bookings', throws(() => win.adminSessionsStore.getStudentBookings('workflow-a@example.com')));

        setAccount('workflow-a@example.com');
        await load('pages/company/company-talent.html');
        win.platformStore.publish({ bio:'Public bio',skills:['Python'],projects:[{ title:'Public project',description:'Public project',url:'https://github.com/workflow-student/example' }] }, 'workflow-a@example.com');
        await load('pages/company/company-talent.html');
        const talent = win.platformStore.publishedTalent()[0];
        check('Talent snapshot has an opaque contact reference and no email', talent.contactRef && !('email' in talent) && !JSON.stringify(talent).includes('workflow-a@example.com'));
        check('Talent directory HTML and links exclude the private student email', !doc.getElementById('company-talent-list').innerHTML.includes('workflow-a@example.com'));
        await load('pages/company/company-messages.html?candidate=' + encodeURIComponent(talent.contactRef));
        check('Company can start a conversation using the public candidate reference', doc.getElementById('chat-student-name').textContent === 'Workflow Student');

        await load('pages/student/learning-path.html');
        const course = win.pythonCurriculum;
        check('Six real Python levels, 24 lessons and 12 coding tasks are published', course.levels.length === 6 && course.allLessons.length === 24 && course.levels.flatMap(level => level.tasks).length === 12);
        check('Roadmap reuses existing cards for every published level plus the project', doc.querySelectorAll('#roadmap-list .roadmap-card').length === 7 && doc.getElementById('track-title').textContent.includes('6 levels'));
        await load('pages/student/module.html?level=5');
        check('Level progression is enforced for new free levels', doc.querySelector('main h1').textContent === 'Level not available yet');
        const freeLevels = course.levels.filter(level => level.id <= 5);
        cmStorage.setItem('codementor-demo-learning', JSON.stringify({version:1,lessons:freeLevels.flatMap(level => level.lessons.map(lesson => lesson.id)),tasks:[],assessments:Object.fromEntries(freeLevels.map(level => [level.id,{score:100}]))}));
        await load('pages/student/module.html?level=5');
        check('Free Level 5 opens after its prerequisites', doc.querySelector('main h1').textContent === 'Objects, Modules and Testing' && doc.querySelectorAll('[data-lesson-link]').length === 4);
        await load('pages/student/lesson.html?lesson=complexity');
        check('Advanced lessons require Premium even with all free levels passed', (win.location.pathname.endsWith('/subscription.html') || doc.querySelector('main h1')?.textContent === 'Premium access required') && !doc.getElementById('knowledge-form'));
        win.subscriptionStore.activateDemoPremium('workflow-a@example.com');
        await load('pages/student/lesson.html?lesson=complexity');
        check('Premium unlocks the advanced lesson through the existing component', doc.getElementById('lesson-title').textContent === 'Reasoning about complexity');
        check('Every added lesson has objectives, practice, sources and a quiz', course.levels.slice(3).every(level => level.quiz.length === 4 && level.lessons.every(lesson => lesson.objectives.length && lesson.exercise?.starter)));
        await load('pages/student/workspace.html?task=safe-average');
        check('New coding tasks reuse the original editor and submission controls', doc.getElementById('task-title').textContent === 'Calculate a safe average' && doc.getElementById('submit-code'));
        for (const lesson of win.pythonExtension.levels.flatMap(level => level.lessons)) {
            const execution = await win.pythonRunner.execute(lesson.code);
            check('Python lesson example executes with its documented output: ' + lesson.id, !execution.error && execution.output.trimEnd() === lesson.output.trimEnd());
        }
        for (const task of win.pythonExtension.tasks) {
            let passed = true;
            for (const test of task.tests) {
                const execution = await win.pythonRunner.execute(task.solution + task.verify, test.input);
                if (execution.error || execution.output.trimEnd() !== test.output.trimEnd()) passed = false;
            }
            check('Reference solution passes all real Python cases: ' + task.id, passed);
        }
        frame.style.width = '390px';
        check('Extended workspace fits the mobile viewport', doc.documentElement.scrollWidth <= win.innerWidth + 1);
    } catch (error) { check('Workflow execution error: ' + error.message, false); }
    output.dataset.done = 'true';
})();
