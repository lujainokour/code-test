(async () => {
    if (new URLSearchParams(location.search).get('run') !== 'disposable-profile') return;
    const frame=document.getElementById('subject'),output=document.getElementById('results'),checks=[];
    let win,doc;
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const setAccount=email=>cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Access Student',email,role:'student',isDemo:true}));
    function check(name,passed,details){checks.push({name,passed:Boolean(passed),...(!passed?{details}: {})});output.textContent=JSON.stringify({passed:checks.filter(x=>x.passed).length,total:checks.length,checks},null,2);}
    async function load(route){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(route)),10000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.src=new URL('../'+route,location.href)});await wait(80);win=frame.contentWindow;doc=win.document;doc.querySelector('#cm-user-guide[open] .cm-guide-skip')?.click();}
    try {
        testStorage.clear();setAccount('access-a@example.com');
        await load('pages/student/lesson.html?lesson=variables');
        setAccount('access-b@example.com');await wait(40);
        doc.querySelector('input[name="knowledge-answer"][value="1"]').checked=true;doc.getElementById('knowledge-form').requestSubmit();
        check('Stale lesson cannot save an answer in a different account',cmStorage.getItem('codementor-demo-learning')===null);
        setAccount('access-a@example.com');await load('pages/student/level-assessment.html?level=1');
        cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:win.pythonCurriculum.levels[0].lessons.map(x=>x.id),tasks:[],assessments:{}}));
        await load('pages/student/level-assessment.html?level=1');
        setAccount('access-b@example.com');cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:win.pythonCurriculum.levels[0].lessons.map(x=>x.id),tasks:[],assessments:{}}));
        const before=cmStorage.getItem('codementor-demo-learning');
        win.levelQuizQuestions.forEach((q,i)=>doc.querySelector(`input[name="question-${i}"][value="${q.correct}"]`).checked=true);doc.getElementById('level-assessment-form').requestSubmit();
        check('Stale quiz cannot award another account a passing score',cmStorage.getItem('codementor-demo-learning')===before);
        const baseTasks=['student-profile','receipt','grade-checker','sum-numbers','list-summary','task-manager'];
        cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:[],tasks:baseTasks,assessments:{}}));
        await load('pages/student/practice.html');
        const statuses=[...doc.querySelectorAll('.practice-status')].map(x=>x.textContent);
        check('Practice lists all twelve tasks and preserves six existing passes',statuses.length===12&&statuses.filter(x=>x==='Passed').length===6,{statuses,body:doc.body.innerText});
        await load('pages/student/learning-path.html');
        const levels=win.pythonCurriculum.levels.filter(level=>level.id<=5);
        cmStorage.setItem('codementor-demo-learning',JSON.stringify({version:1,lessons:levels.flatMap(level=>level.lessons.map(x=>x.id)),tasks:[],assessments:Object.fromEntries(levels.map(level=>[level.id,{score:100}]))}));
        win.subscriptionStore.activateDemoPremium('access-b@example.com');
        await load('pages/student/lesson.html?lesson=complexity');
        check('Active Premium opens a paid lesson',doc.getElementById('lesson-title')?.textContent==='Reasoning about complexity');
        cmStorage.setItem('codementor-demo-subscription',JSON.stringify({version:1,plan:'free',status:'active'}));
        for(let attempt=0;attempt<50&&!win.location.pathname.endsWith('/subscription.html');attempt++)await wait(50);
        check('Revoking Premium in another tab removes access from an already open paid lesson',win.location.pathname.endsWith('/subscription.html'));
        sessionStorage.setItem('codementor-demo-service-drafts',JSON.stringify({version:1,records:[{id:'legacy-only',owner:'access-b@example.com',title:'Legacy'}]}));
        localStorage.setItem('codementor-demo-service-drafts',JSON.stringify({version:1,records:[{id:'shared-only',owner:'access-a@example.com',title:'Shared'}]}));
        const merged=JSON.parse(cmStorage.getItem('codementor-demo-service-drafts'));
        check('Migration keeps both existing shared and legacy-tab service records',merged.records.length===2&&sessionStorage.getItem('codementor-demo-service-drafts')===null);
        await load('pages/services/community.html');
        check('Community uses an internal composer without external invitations',!!doc.querySelector('#community-composer')&&!doc.querySelector('a[href*="discord"]'));
        check('Community exposes searchable discussions',!!doc.querySelector('#community-search')&&!!doc.querySelector('#community-posts'));
    } catch(error){check('Access regression error: '+error.message,false);}
    output.dataset.done='true';
})();
