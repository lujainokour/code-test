/* Publish only the student-selected public snapshot; never private account fields. */
(() => {
    "use strict";
    const main=document.querySelector("main"),panel=document.createElement("section");panel.id="portfolio-publishing";panel.className="services-panel";main.append(panel);
    let owner;
    const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
    function render(){panel.replaceChildren(el("h2","Publish a student profile"));
        try{
            const account=platformStore.student(owner);owner=account.email.trim().toLowerCase();
            const saved=platformStore.getStudents().find(s=>s.email===owner)?.publicProfile;
            const internship=virtualInternshipStore.own(owner),projects=[];
            if(internship?.showInPortfolio&&internship.submission)projects.push({title:"School Management System in C#",description:internship.submission.notes||"Self-reported virtual internship project",url:internship.submission.url});
            const applications=companyStore.getStudentApplications(owner);
            for(const application of applications.filter(a=>a.training?.submission)){const project={title:application.opportunityTitle,description:application.training.submission.notes||"Company opportunity project — submitted locally",url:application.training.submission.url};projects.push(project);const card=el("article");card.className="services-card";card.append(el("h3",project.title),el("p","Company project · "+(application.training.review?.status||"Awaiting review")));const a=el("a","View repository");a.href=project.url;a.target="_blank";a.rel="noopener noreferrer";card.append(a);panel.append(card);}
            panel.append(el("p","Choose what to share. Publishing shows your name, bio, selected skills and project links in this browser's Student Showcase and company Talent Directory. It does not publish your email, age, messages, grades or private account fields. Recruiters can contact your local inbox. Skills and projects are self-reported."));
            if(saved){panel.append(el("p","Your public profile is published locally."));const remove=el("button","Unpublish profile");remove.type="button";remove.className="button button-outline";remove.onclick=()=>{try{platformStore.unpublish(owner);render();}catch(error){status.textContent=error.message;}};panel.append(remove);}
            const status=el("p");status.id="portfolio-publish-message";status.setAttribute("role","status");panel.append(status);
            if(!projects.length){panel.append(el("p","Include a saved internship project in your local portfolio, or submit an accepted company training project, before publishing."));return;}
            const form=el("form");form.id="publish-profile-form";
            const bio=el("textarea");bio.id="public-bio";bio.maxLength=1000;bio.rows=3;bio.value=saved?.bio||"";const bioLabel=el("label","Public bio");bioLabel.htmlFor=bio.id;
            const skills=el("input");skills.id="public-skills";skills.required=true;skills.maxLength=500;skills.value=saved?.skills.join(", ")||"";const skillsLabel=el("label","Skills, separated by commas");skillsLabel.htmlFor=skills.id;form.append(bioLabel,bio,skillsLabel,skills);
            const choices=projects.map((project,index)=>{const label=el("label"),input=el("input");input.type="checkbox";input.name="public-project";input.value=String(index);input.checked=Boolean(saved?.projects.some(p=>p.url===project.url));label.append(input,document.createTextNode(" "+project.title));form.append(label);return input;});
            const consent=el("input");consent.type="checkbox";consent.required=true;consent.id="public-profile-consent";const label=el("label");label.append(consent,document.createTextNode(" I choose to publish these details and my selected learning language under my name and allow companies to message my local inbox."));form.append(label);const submit=el("button",saved?"Update published profile":"Publish selected profile");submit.type="submit";submit.className="button button-primary";form.append(submit);
            form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;try{const selected=projects.filter((p,index)=>choices[index].checked);platformStore.publish({bio:bio.value,skills:skills.value.split(",").map(s=>s.trim()).filter(Boolean),projects:selected},owner);render();document.getElementById("portfolio-publish-message").textContent="Published locally. Open the Showcase or Talent Directory to view your selected profile.";}catch(error){status.textContent=error.message;}};panel.append(form);
            const links=el("p");for(const [text,href]of [["View Student Showcase","../services/showcase.html"],["View company Talent Directory","../company/company-talent.html"],["Browse opportunities","career.html"]]){const a=el("a",text);a.href=href;a.className="button button-outline";links.append(a);}panel.append(links);
        }catch(error){panel.append(el("p",error.message));}
    }
    render();window.addEventListener("pageshow",event=>{if(event.persisted)render();});
})();
