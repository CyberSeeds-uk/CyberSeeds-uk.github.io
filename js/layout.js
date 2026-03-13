async function loadComponent(path, target) {
  try {
    const res = await fetch(path)
    const html = await res.text()
    document.querySelector(target).innerHTML = html
  } catch (err) {
    console.error("Component failed:", path)
  }
}

document.addEventListener("DOMContentLoaded", () => {

  const components = [
    { path: "/components/header.html", target: "#header" },
    { path: "/components/footer.html", target: "#footer" }
  ]

  components.forEach(c => {
    if (document.querySelector(c.target)) {
      loadComponent(c.path, c.target)
    }
  })

})
