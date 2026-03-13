async function loadComponent(path, target) {
  try {
    const response = await fetch(path)

    if (!response.ok) {
      throw new Error(`Failed to load ${path}`)
    }

    const html = await response.text()
    document.querySelector(target).innerHTML = html

  } catch (error) {
    console.error(error)
  }
}

document.addEventListener("DOMContentLoaded", () => {

  if (document.querySelector("#header")) {
    loadComponent("/components/header.html", "#header")
  }

  if (document.querySelector("#footer")) {
    loadComponent("/components/footer.html", "#footer")
  }

})
