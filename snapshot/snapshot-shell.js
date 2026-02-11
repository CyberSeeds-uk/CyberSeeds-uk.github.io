import "/components/cyber-seeds-snapshot.js";

function ensureComponent(){
  let el = document.querySelector("cyber-seeds-snapshot");
  if (!el){
    el = document.createElement("cyber-seeds-snapshot");
    document.body.appendChild(el);
  }
  return el;
}

document.addEventListener("click", e=>{
  if (!e.target.closest("[data-open-snapshot]")) return;
  e.preventDefault();
  ensureComponent().open();
});
