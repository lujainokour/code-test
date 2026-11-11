(() => {
 if(window.learningUnavailable)return;
 try {
  const course=window.pythonCurriculum,progress=course.read();
  if (course.id === 'javascript') {
   document.querySelector('main h1').textContent = course.tasks[course.projectTask].title;
   document.querySelector('.module-section p').textContent = course.tasks[course.projectTask].description;
  }
  const available=course.available(course.levels[2],progress);
  const passed=progress.tasks.includes('task-manager');
  document.getElementById('project-status-title').textContent=passed?'Project passed':available?'Ready to build':'Prepare for your project';
  document.getElementById('project-status-description').textContent=passed?'Your solution passed the automated checks. Review the results or extend your program.':available?'You have reached functions and collections. Apply what you learn in the project workspace.':'Complete the first two levels to prepare for this project. You can read the brief now.';
  const link=document.getElementById('project-workspace');
  if(!available){link.href=`module.html?level=${course.current(progress).id}`;link.textContent='Continue learning first';}
 } catch(error){document.getElementById('workspace-message').textContent=error.message;document.getElementById('project-workspace').hidden=true;}
})();
