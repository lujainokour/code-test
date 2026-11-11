const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), crypto = require('node:crypto');
let time = Date.parse('2026-11-09T06:00:00Z'), account = null, queue = Promise.resolve(), checks = 0;
const local = new Map(), session = new Map();
const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)) });
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
const student = expected => {
    if (!account || account.role !== 'student' || (expected && account.email !== expected)) throw Error('Student identity changed');
    return account;
};
const window = { platformStore: { student } };
vm.runInNewContext(fs.readFileSync('js/admin-sessions-store.js', 'utf8'), {
    window, localStorage: storage(local), sessionStorage: storage(session), Date: ClockDate, URL,
    crypto: { randomUUID: crypto.randomUUID }, navigator: { locks: { request: (_, action) => { const result = queue.then(action); queue = result.catch(() => {}); return result; } } }
});
const store = window.adminSessionsStore, key = 'codementor-teacher-store-v1';
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log('PASS ' + name); };
const reject = async (name, action) => { await assert.rejects(action); check(name, true); };
const admin = () => session.set('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: time }));
const login = email => { account = { role: 'student', isDemo: true, email, name: 'Test Learner' }; };
(async () => {
    assert.throws(() => store.getBookings());
    local.set('codementor-teacher-session', JSON.stringify({ role: 'teacher', isDemo: true, email: 'teacher@example.com' }));
    await reject('Retired teacher identity cannot manage sessions', () => store.addSession({}));
    check('Teacher authentication APIs are removed', !store.setTeacherSession && !store.getTeacherSession && !store.resetToDefault);
    admin();
    const legacy = { profile: { name: 'Legacy provider', email: 'legacy@example.com', currency: 'USD' }, sessions: [], bookings: [], students: [{id:'legacy-learner',name:'Test Learner',email:'learner@example.com',initials:'TL',sessionsCompleted:0,progressNotes:[{date:'2026-11-01',text:'Existing progress note.'}]}], schedule: { defaultRate: 20, meetingPlatform: 'Google Meet', availability: Object.fromEntries(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day=>[day,{active:true,slots:['10:00 AM - 11:00 AM']}])) } };
    local.set(key, JSON.stringify(legacy));
    store.getSessions(); check('Reading legacy data preserves it byte for byte', local.get(key) === JSON.stringify(legacy));
    const offering = await store.addSession({ title: 'Platform Python support', description: 'Work through Python programming exercises.', subject: 'Python Programming', duration: 60, price: 20 });
    check('Admin can publish a platform session', store.getPublicSessions()[0].platformSession && store.getPublicSessions()[0].providerName === 'CodeMentor Learning Team');
    const slot = store.getAvailableSlots(offering.id)[0];
    session.clear(); login('learner@example.com');
    await reject('Student cannot change platform availability', () => store.updateSchedule(legacy.schedule));
    const attempts = await Promise.allSettled([store.requestBooking(offering.id, slot.id, 'Help with Python functions', account.email), store.requestBooking(offering.id, slot.id, 'Help with Python functions', account.email)]);
    check('Concurrent reservations produce one booking', attempts.filter(r=>r.status==='fulfilled').length === 1);
    const booking = attempts.find(r=>r.status==='fulfilled').value;
    check('Student sees their pending booking', store.getStudentBookings(account.email)[0].status === 'Pending');
    await reject('Student cannot confirm a platform booking', () => store.updateBookingStatus(booking.id, 'Confirmed', { meetingUrl: 'https://meet.example.com/room' }));
    login('other@example.com'); check('Other student cannot read the booking', store.getStudentBookings(account.email).length === 0);
    await reject('Other student cannot cancel the booking', () => store.cancelStudentBooking(booking.id, account.email));
    admin();
    await reject('Admin cannot confirm without a valid meeting link', () => store.updateBookingStatus(booking.id, 'Confirmed', { meetingUrl: 'javascript:alert(1)' }));
    await reject('Active bookings prevent deleting the session', () => store.deleteSession(offering.id));
    await store.updateBookingStatus(booking.id, 'Confirmed', { meetingUrl: 'https://meet.example.com/room' });
    login('learner@example.com'); check('Admin confirmation and meeting link reach the student', store.getStudentBookings(account.email)[0].meetingUrl === 'https://meet.example.com/room');
    check('Confirmation enrolls the student for follow-up', store.getStudents().some(s=>s.email === account.email));
    check('Confirmation connects the existing student and preserves notes', store.getStudents()[0].linkedStudent && store.getStudents()[0].progressNotes[0].text === 'Existing progress note.');
    await reject('Completion before the scheduled end is rejected', () => store.updateBookingStatus(booking.id, 'Completed'));
    await store.updateSession(offering.id, { status: 'Paused' });
    check('Pausing removes a listing and keeps its confirmed booking', !store.getPublicSessions().length && store.getStudentBookings(account.email)[0].status === 'Confirmed');
    await reject('Pausing blocks new reservations', () => store.requestBooking(offering.id, slot.id, 'Please help me learn Python', account.email));
    await reject('Declining requires an explanation', () => store.updateBookingStatus(booking.id, 'Declined'));
    const overlap = structuredClone(legacy.schedule); overlap.availability.Monday.slots.push('10:30 AM - 11:30 AM');
    await reject('Overlapping weekly availability is rejected', () => store.updateSchedule(overlap));
    const enrollment = store.getStudents()[0]; await store.addStudentNote(enrollment.id, 'Practise Python return values.');
    check('Admin can retain student follow-up notes', store.getStudents()[0].progressNotes[0].text.includes('return values'));
    time = Date.parse(booking.startsAt) + 61 * 60000; admin();
    await store.updateBookingStatus(booking.id, 'Completed');
    check('Completing a session updates student progress once', store.getStudents()[0].sessionsCompleted === 1);
    await store.updateBookingStatus(booking.id, 'Completed');
    check('Repeating completion cannot double count progress', store.getStudents()[0].sessionsCompleted === 1);
    session.clear(); assert.throws(() => store.getStudents());
    await reject('Admin logout blocks subsequent mutations', () => store.addStudentNote(enrollment.id, 'A stale note'));
    const saved = local.get(key); local.set(key, '{broken'); admin(); assert.throws(() => store.getSessions());
    check('Malformed legacy data is preserved for recovery', local.get(key) === '{broken'); local.set(key, saved);
    console.log(`${checks} admin session checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
