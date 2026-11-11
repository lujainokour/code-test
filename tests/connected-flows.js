(async()=>{
 if(new URLSearchParams(location.search).get("run")!=="disposable-profile")return;
 const frame=document.getElementById("subject"),output=document.getElementById("results"),checks=[];
 let win,doc;const account={name:"Connected Student",email:"student@example.com",role:"student",isDemo:true,age:22};
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function check(name,value){checks.push({name,passed:Boolean(value)});output.textContent=JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,checks},null,2);}
 async function load(route){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(route)),8000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.src=new URL("../"+route,location.href)});await wait(50);win=frame.contentWindow;doc=win.document;}
 function submit(form){form.dispatchEvent(new win.Event("submit",{bubbles:true,cancelable:true}));}
 function throws(action){try{action();return false}catch{return true}}
 function mobile(name){frame.style.width="390px";doc.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish()});check(name,doc.documentElement.scrollWidth<=win.innerWidth+1);frame.style.width="1280px";}
 // CloudPeak demo data exists only after an administrator loads the SAMPLE company workspace.
 async function loadSampleCompany(){await load("pages/auth/company-login.html");const had=win.sessionStorage.getItem("codementor-admin-session");win.sessionStorage.setItem("codementor-admin-session",JSON.stringify({role:"admin",isDemo:true,signedInAt:Date.now()}));try{win.companyStore.admin.loadSampleCompany();}finally{if(had===null)win.sessionStorage.removeItem("codementor-admin-session");}}
 function setStudent(value){cmStorage.setItem("codementor-demo-session",JSON.stringify(value));}
 try{
  testStorage.clear();setStudent(account);await loadSampleCompany();await load("pages/student/career.html");
  const store=win.companyStore,opp=store.addOpportunity({title:"Connected project",description:"Build and test a small console tool",skillsRequired:["Python"],duration:"2 weeks",stipend:"Unpaid demo"});
  await load("pages/student/career.html");
  check("Company opportunity is visible to the student",doc.body.textContent.includes("Connected project"));
  doc.getElementById("cover-"+opp.id).value="My private application note";submit(doc.getElementById("cover-"+opp.id).form);
  let application=win.companyStore.getStudentApplications(account.email).find(a=>a.opportunityId===opp.id);
  check("Student can submit an application through the page",application?.status==="Under Review"&&doc.getElementById("my-applications").textContent.includes("Connected project"));
  check("Duplicate application is rejected",throws(()=>win.companyStore.applyToOpportunity(opp.id,"Again",account.email)));
  check("Training stays locked before acceptance",throws(()=>win.companyStore.updateStudentTraining(application.id,{tasks:{}},JSON.stringify(application.training),account.email)));
  await load("pages/company/company-applications.html");
  check("Guest company preview cannot read connected private applications",!doc.body.textContent.includes("My private application note"));
  win.companyStore.setCompanySession({name:"CloudPeak Innovations (SAMPLE)",email:"company@example.com"});await load("pages/company/company-applications.html");
  check("Signed-in company sees the student's actual application",doc.getElementById("app-"+application.id)?.textContent.includes("My private application note"));
  doc.querySelector('#app-'+application.id+' .btn-accept-app').click();
  await load("pages/student/career.html");
  let card=doc.querySelector('[data-application-id="'+application.id+'"]');
  check("Company acceptance opens training on the student page",card.textContent.includes("Accepted")&&card.textContent.includes("Training project"));
  mobile("Populated student training fits a mobile viewport");
  card.querySelectorAll("select").forEach(select=>select.value="Done");submit(card.querySelector("form"));
  application=win.companyStore.getStudentApplications(account.email).find(a=>a.id===application.id);
  check("Training board saves the student's task states",Object.values(application.training.tasks).every(state=>state==="Done"));
  const snapshot=JSON.stringify(application.training);
  check("Stale training update is rejected",throws(()=>win.companyStore.updateStudentTraining(application.id,{tasks:application.training.tasks},"outdated",account.email)));
  card=doc.querySelector('[data-application-id="'+application.id+'"]');
  doc.getElementById("delivery-"+application.id).value="https://github.com/connected-student/project";
  doc.getElementById("notes-"+application.id).value="My submitted work";submit(doc.getElementById("delivery-"+application.id).form);
  await load("pages/company/company-applications.html");
  let companyCard=doc.getElementById("app-"+application.id);
  check("Company receives the student's repository and notes",companyCard.textContent.includes("My submitted work")&&companyCard.querySelector('a[href="https://github.com/connected-student/project"]'));
  mobile("Company submission review fits a mobile viewport");
  [...companyCard.querySelectorAll("button")].find(b=>b.textContent==="Changes requested").click();await load("pages/student/career.html");
  check("Student sees the company's requested changes",doc.querySelector('[data-application-id="'+application.id+'"]').textContent.includes("Changes requested"));
  submit(doc.getElementById("delivery-"+application.id).form);await load("pages/company/company-applications.html");
  companyCard=doc.getElementById("app-"+application.id);[...companyCard.querySelectorAll("button")].find(b=>b.textContent==="Completed").click();
  await load("pages/student/career.html");card=doc.querySelector('[data-application-id="'+application.id+'"]');
  check("Completed company review makes training read-only",card.textContent.includes("Company review: Completed")&&!card.querySelector("select"));
  application=win.companyStore.getStudentApplications(account.email).find(a=>a.id===application.id);
  check("Completed training cannot be reopened by an old review page",throws(()=>win.companyStore.reviewStudentTraining(application.id,"Changes requested",JSON.stringify(application.training))));
  await load("pages/student/local-portfolio.html");
  check("Submitted company work appears in the local portfolio",doc.getElementById("portfolio-publishing").textContent.includes("Connected project"));
  check("Private portfolio does not publish automatically",win.platformStore.publishedStudents().length===0);
  doc.getElementById("public-bio").value="Public project summary";doc.getElementById("public-skills").value="Python, Testing";doc.querySelector('input[name="public-project"]').checked=true;
  submit(doc.getElementById("publish-profile-form"));
  check("Publishing requires explicit consent",win.platformStore.publishedStudents().length===0);
  doc.getElementById("public-profile-consent").checked=true;submit(doc.getElementById("publish-profile-form"));
  mobile("Populated portfolio publishing controls fit a mobile viewport");
  const published=win.platformStore.publishedStudents()[0];
  check("Public snapshot excludes private email, age and application notes",published.name===account.name&&!JSON.stringify(published).includes(account.email)&&!Object.hasOwn(published,"age")&&!JSON.stringify(published).includes("My private application note"));
  await load("pages/services/showcase.html");check("Published profile appears in the Student Showcase",doc.getElementById("service-content").textContent.includes(account.name));
  await load("pages/services/student-public-profile.html?id="+published.id);check("Public project evidence is linked",doc.querySelector('a[href="https://github.com/connected-student/project"]'));
  await load("pages/company/company-talent.html");check("Published profile appears in company Talent Directory without a verification claim",doc.body.textContent.includes(account.name)&&doc.body.textContent.includes("Student-reported skills"));
  const payload='<img src="/missing-connected-audit" onerror="window.__connectedXSS=true">';
  win.companyStore.sendMessage(account.email,account.name,payload);await load("pages/student/messages.html");
  check("Company message reaches student inbox as inert text",doc.getElementById("career-content").textContent.includes(payload)&&!win.__connectedXSS&&!doc.querySelector('#career-content img'));
  doc.getElementById("company-reply").value="Student reply delivered locally";submit(doc.getElementById("company-reply").form);
  await load("pages/company/company-messages.html?student="+encodeURIComponent(account.email));
  check("Student reply reaches company conversation",doc.getElementById("company-chat-messages").textContent.includes("Student reply delivered locally"));
  doc.getElementById("company-chat-input").value="Second company reply";submit(doc.getElementById("company-chat-form"));
  await load("pages/student/messages.html");check("Company can reply through its existing page",doc.getElementById("career-content").textContent.includes("Second company reply"));
  setStudent({...account,name:"Other Student",email:"other-connected@example.com"});await load("pages/student/messages.html");
  check("Another student cannot read the first student's conversation",!doc.body.textContent.includes("Student reply delivered locally")&&throws(()=>win.companyStore.getStudentMessages(account.email)));
  await load("pages/student/career.html");check("Another student cannot see private applications",!doc.body.textContent.includes("My private application note"));
  win.companyStore.applyToOpportunity(opp.id,"Second student's application","other-connected@example.com");
  await load("pages/company/company-messages.html?student=other-connected%40example.com");
  check("Candidate Chat starts a conversation with the selected new applicant",doc.getElementById("chat-student-name").textContent==="Other Student"&&!doc.getElementById("company-chat-messages").textContent.includes("Second company reply"));
  doc.getElementById("company-chat-input").value="Message to the second applicant";submit(doc.getElementById("company-chat-form"));
  await load("pages/student/messages.html");check("New applicant receives the correctly addressed company message",doc.getElementById("career-content").textContent.includes("Message to the second applicant")&&!doc.getElementById("career-content").textContent.includes("Second company reply"));
  setStudent(account);await load("pages/admin/admin-students.html");
  const registered=win.adminStudentData.find(s=>s.email===account.email);
  check("Administrator directory includes the real local student",registered?.registered&&doc.body.textContent.includes(account.name));
  win.adminStudentStore.setStatus(registered.id,"suspended");
  check("Suspension blocks progress, applications, messages and publishing",throws(()=>win.cmStorage.getItem("codementor-demo-learning"))&&throws(()=>win.platformStore.student(account.email)));
  await load("pages/student/career.html");check("Direct student URL is blocked while suspended",doc.getElementById("account-access-block")?.textContent.includes("suspended")&&doc.querySelector("main").hidden);
  await load("pages/auth/login.html");doc.getElementById("email").value=account.email;doc.getElementById("password").value="DemoStudent123!";submit(doc.getElementById("login-form"));
  check("Suspended student cannot sign in again",doc.getElementById("login-message").textContent.includes("suspended"));
  await load("pages/admin/admin-students.html");win.adminStudentStore.setStatus(registered.id,"enabled");await load("pages/student/career.html");
  check("Restoring access preserves prior application and completed training",!doc.querySelector("main").hidden&&doc.querySelector('[data-application-id="'+application.id+'"]').textContent.includes("Company review: Completed"));
  platformStore.setStatus(registered.id,"suspended");await wait(100);
  check("Suspension also blocks a student page already open in another tab",doc.getElementById("account-access-block")?.textContent.includes("suspended")&&doc.querySelector("main").hidden);
  platformStore.setStatus(registered.id,"enabled");await wait(100);
  check("Restoring access unblocks the existing page without deleting work",!doc.querySelector("main").hidden);
  win.platformStore.unpublish(account.email);await load("pages/services/showcase.html");check("Unpublishing removes profile from public Showcase",!doc.getElementById("service-content").textContent.includes(account.name));
  await load("pages/company/company-talent.html");check("Unpublishing removes profile from Talent Directory",!doc.body.textContent.includes(account.name));
  const raw=localStorage.getItem("codementor-platform-v1");localStorage.setItem("codementor-platform-v1","{broken");
  check("Corrupt shared registry is preserved and blocks access",throws(()=>win.platformStore.assertAccess(account.email))&&localStorage.getItem("codementor-platform-v1")==="{broken");localStorage.setItem("codementor-platform-v1",raw);
 }catch(error){check("Unexpected: "+error.message,false);}
 output.dataset.done="true";
})();
