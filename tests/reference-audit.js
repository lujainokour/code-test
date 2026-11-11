(async()=>{
 if(!window.cmStorage)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../js/learning-storage.js',location.href).href;script.onload=resolve;script.onerror=()=>reject(new Error('Application storage facade could not load'));document.head.append(script)});
 const root=new URL(new URLSearchParams(location.search).get('appRoot') || '../',location.href),routes=await (await fetch(new URL('../docs/page-routes.json',location.href))).json();
 const missing=[],pages=[],links=new Set();
 const frame=document.createElement('iframe');frame.style='width:1280px;height:900px';document.body.append(frame);
 for(const role of ['guest','student','admin']){
 sessionStorage.clear();localStorage.clear();
 if(role==='student')cmStorage.setItem('codementor-demo-session',JSON.stringify({name:'Route Tester',email:'route@example.com',role:'student',isDemo:true}));
 if(role==='admin')sessionStorage.setItem('codementor-admin-session',JSON.stringify({role:'admin',isDemo:true,signedInAt:Date.now()}));
 for(const route of Object.values(routes)){
 window.auditProgress={role,route};
 await new Promise(resolve=>{const timer=setTimeout(resolve,3000);frame.onload=()=>{clearTimeout(timer);resolve()};frame.src=new URL(route,root)});
 // Legacy entry points redirect. Inspect their final document, not an interim page.
 for(let attempt=0;attempt<60;attempt++){
 await new Promise(resolve=>setTimeout(resolve,50));
 const current=frame.contentDocument;
 if(current?.readyState==='complete'&&current.body&& !current.querySelector('meta[http-equiv="refresh" i]'))break;
 }
 const doc=frame.contentDocument;
 await Promise.all([...doc.images].map(img=>img.decode().catch(()=>{})));
 for(const node of doc.querySelectorAll('[href],[src],[action],[poster]')){
 for(const attr of ['href','src','action','poster']){
 const raw=node.getAttribute(attr);if(!raw||/^(?:data:|mailto:|tel:|javascript:)/.test(raw))continue;
 const url=new URL(raw,doc.baseURI);if(url.origin===location.origin){url.hash='';links.add(url.href)}
 }}
 const brands=[...doc.querySelectorAll('a.logo,a.brand-logo')];
 pages.push({role,route,actual:frame.contentWindow.location.pathname,brandsHome:brands.every(a=>a.href===new URL('index.html',root).href),brokenImages:[...doc.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)});
 }
 }
 for(const url of links){const response=await fetch(url,{method:'HEAD'});if(!response.ok)missing.push({url,status:response.status})}
 return {pages,checkedReferences:links.size,missing};
})()
