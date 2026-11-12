(() => {
    "use strict";
    const root = document.getElementById("career-content"), message = document.getElementById("career-message"), store = window.companyStore;
    let owner, dirty = false;
    root.addEventListener("input", () => { dirty = true; });
    root.addEventListener("change", () => { dirty = true; });
    const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
    const link = (text, url) => { const node = el("a",text,"button button-outline"); node.href=url; return node; };
    function external(text,url) { try { const value=new URL(url); if(value.protocol!=="https:")return el("span","Invalid meeting or project link"); const a=link(text,value.href);a.target="_blank";a.rel="noopener noreferrer";return a; } catch {return el("span","Link unavailable");} }
    function status(text,error=false) {message.textContent=text;message.classList.toggle("is-error",error);}
    function action(form,fn) {form.addEventListener("submit",event=>{event.preventDefault();if(!form.reportValidity())return;try{window.platformStore.student(owner);fn();status("Saved. The local workspaces now share this record.");render();}catch(error){status(error.message,true);}});}
    function textarea(form,id,label,value="",required=true) {const node=el("textarea");node.id=id;node.value=value;node.required=required;node.maxLength=3000;node.rows=3;const caption=el("label",label);caption.htmlFor=id;form.append(caption,node);return node;}
    function button(form,text) {const node=el("button",text,"button button-primary");node.type="submit";form.append(node);}
    function training(application,card) {
        const data=application.training,snapshot=JSON.stringify(data),panel=el("section",undefined,"services-panel");panel.append(el("h3","Training project"),el("p","Use the opportunity brief as your project requirements. Task labels are self-reported; the company reviews the repository you submit."));
        if(data.review)panel.append(el("p","Company review: "+data.review.status,"services-tag"));
        if(data.submission)panel.append(external("View submitted repository",data.submission.url),el("p",data.submission.notes));
        if(data.review?.status==="Completed"){card.append(panel);return;}
        const form=el("form"),fields={},labels={plan:"Plan the work",build:"Implement the project",test:"Test the requirements",deliver:"Document and deliver"};
        for(const [id,label] of Object.entries(labels)){const caption=el("label",label),select=el("select");select.id="training-"+application.id+"-"+id;caption.htmlFor=select.id;for(const state of ["To Do","In Progress","Done"]){const option=el("option",state);option.value=state;select.append(option);}select.value=data.tasks[id];fields[id]=select;form.append(caption,select);}
        button(form,"Save task board");action(form,()=>store.updateStudentTraining(application.id,{tasks:Object.fromEntries(Object.entries(fields).map(([id,node])=>[id,node.value]))},snapshot,owner));panel.append(form);
        const delivery=el("form"),url=el("input");url.id="delivery-"+application.id;url.type="url";url.required=true;url.value=data.submission?.url||"";const caption=el("label","GitHub repository URL");caption.htmlFor=url.id;delivery.append(caption,url);const notes=textarea(delivery,"notes-"+application.id,"Delivery notes",data.submission?.notes||"",false);button(delivery,"Submit project for company review");action(delivery,()=>store.updateStudentTraining(application.id,{submission:{url:url.value,notes:notes.value}},snapshot,owner));panel.append(delivery);card.append(panel);
    }
    function career() {
        const applications=store.getStudentApplications(owner),company=store.getProfile(),section=el("section",undefined,"services-panel");section.append(el("h2","Open opportunities"));
        const opportunities=store.getOpportunities().filter(o=>o.status==="Active");
        if(!opportunities.length)section.append(el("p","No open opportunities in this browser yet. They appear here as soon as a company publishes one. Meanwhile, get your local portfolio ready."),link("Prepare my local portfolio","local-portfolio.html"));
        for(const opportunity of opportunities){const card=el("article",undefined,"services-card");card.dataset.opportunityId=opportunity.id;card.append(el("h3",opportunity.title),el("p",company.name+" · "+opportunity.type),el("p",opportunity.description),el("p",opportunity.location+" · "+opportunity.duration+" · "+opportunity.stipend));
            if(applications.some(a=>a.opportunityId===opportunity.id))card.append(el("p","Application saved — see My applications below."));
            else {const form=el("form"),cover=textarea(form,"cover-"+opportunity.id,"Why are you interested?");button(form,"Apply locally");action(form,()=>store.applyToOpportunity(opportunity.id,cover.value,owner));card.append(form);}section.append(card);}
        root.append(section);const list=el("section",undefined,"services-panel");list.id="my-applications";list.append(el("h2","My applications & training"));
        if(!applications.length)list.append(el("p",opportunities.length?"No applications yet. Choose an open opportunity above.":"No applications yet. You can apply as soon as a company publishes an opportunity."));
        for(const application of applications){const card=el("article",undefined,"services-card");card.dataset.applicationId=application.id;card.append(el("h3",application.opportunityTitle),el("p",application.companyName),el("p",application.status,"services-tag"),el("p",application.coverNote));if(application.interviewDate)card.append(el("p","Interview: "+application.interviewDate));if(application.meetingLink)card.append(external("Open meeting link",application.meetingLink));if(application.opportunityDescription)card.append(el("p",application.opportunityDescription));if(application.status==="Accepted")training(application,card);list.append(card);}root.append(list,link("Open company inbox","messages.html"),link("My portfolio","local-portfolio.html"));
    }
    function inbox() {
        const conversations=store.getStudentMessages(owner),company=store.getProfile();
        if(!conversations.length){const empty=el("section",undefined,"services-panel career-empty");empty.append(el("h2","No messages yet"),el("p","A company can contact you after you publish your profile or apply to an opportunity."));const next=el("div",undefined,"career-empty-actions");next.append(link("Browse opportunities","career.html"),link("Publish my profile","local-portfolio.html"));empty.append(next);root.append(empty);return;}
        for(const conversation of conversations){const panel=el("section",undefined,"services-panel");panel.append(el("h2",company.name));for(const item of conversation.thread){const bubble=el("article",undefined,"services-card");bubble.append(el("strong",item.sender==="student"?"You":"Company"),el("p",item.text));const time=el("time",new Date(item.time).toLocaleString());time.dateTime=item.time;bubble.append(time);panel.append(bubble);}const form=el("form"),reply=textarea(form,"company-reply","Reply to company");button(form,"Send reply locally");action(form,()=>store.sendStudentMessage(reply.value,owner));panel.append(form);root.append(panel);}
    }
    function render() {dirty=false;root.replaceChildren();try{owner=window.platformStore.student(owner).email.trim().toLowerCase();if(document.body.dataset.careerView==="messages")inbox();else career();}catch(error){status(error.message,true);root.append(link("Student sign in","../auth/login.html"));}}
    function refresh() {if(dirty){status("Workspace records changed. Your draft is kept on screen. Reload before saving if the record was updated elsewhere.");return;}render();}
    render();window.addEventListener("storage",event=>{if(event.key==="codementor-company-store-v1"||event.key==="codementor-platform-v1")refresh();});
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});window.addEventListener("pageshow",event=>{if(event.persisted)refresh();});
})();
