async function loadComponent(path, target) {
  const response = await fetch(path)
  const html = await response.text()
  document.querySelector(target).innerHTML = html
}

document.addEventListener("DOMContentLoaded", () => {

  if (document.querySelector("#header")) {
    loadComponent("/components/header.html", "#header")
  }

  if (document.querySelector("#footer")) {
    loadComponent("/components/footer.html", "#footer")
  }

})
