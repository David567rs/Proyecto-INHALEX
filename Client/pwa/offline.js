/* Offline app intentionally has no authentication, storage of personal data, or order actions. */
const element = id => document.getElementById(id)
let data = { products: [], company: null }
let contact = null
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const categoryLabel = id => data.categories?.find(category => category.id === id)?.name || String(id || "Aromas").replace(/^linea-/, "Línea ").replace(/-/g, " ")
const dateLabel = value => value ? `Copia guardada: ${new Date(value).toLocaleString("es-MX")}.` : "Aún no hay una copia guardada."
const text = (tag, value, className) => { const node = document.createElement(tag); node.textContent = String(value || ""); if (className) node.className = className; return node }
function imageUrl(value) {
  try { const url = new URL(value, location.origin); return url.origin === location.origin && /^\/(products|aromas|images)\//.test(url.pathname) ? url.href : "/pwa/icon-192.png" } catch { return "/pwa/icon-192.png" }
}
function priceLabel(item) {
  try { return new Intl.NumberFormat("es-MX", { style: "currency", currency: item.currency || "MXN" }).format(item.price) } catch { return "Consultar precio" }
}
function showProduct(item) {
  const body = element("product-detail")
  body.replaceChildren(text("p", categoryLabel(item.category), "eyebrow"), text("h2", item.name), text("p", item.longDescription || item.description), text("p", `Aromas: ${(item.aromas || []).join(", ") || item.name}`), text("p", `${priceLabel(item)} · precio guardado`), text("p", "Reconecta para consultar precio y disponibilidad actuales. Los pedidos necesitan conexión.", "notice"))
  element("product-dialog").showModal()
}
function renderProducts() {
  const query = normalize(element("search").value)
  const category = element("category").value
  const items = data.products.filter(item => (!category || item.category === category) && normalize([item.name, item.description, item.category, ...(item.aromas || [])].join(" ")).includes(query))
  const grid = element("products")
  grid.replaceChildren()
  for (const item of items) {
    const card = document.createElement("button")
    card.className = "product"
    card.type = "button"
    const image = document.createElement("img")
    image.src = imageUrl(item.image); image.alt = ""; image.loading = "lazy"
    image.onerror = () => { image.onerror = null; image.src = "/pwa/icon-192.png" }
    const copy = document.createElement("div"); copy.className = "product-text"
    copy.append(text("small", categoryLabel(item.category)), text("h2", item.name), text("p", (item.aromas || []).join(" · ") || item.description), text("p", `${priceLabel(item)} · guardado`, "price"))
    card.append(image, copy); card.addEventListener("click", () => showProduct(item)); grid.append(card)
  }
  element("empty").hidden = data.products.length > 0
  if (data.products.length && !items.length) grid.append(text("p", "No hay aromas guardados que coincidan con tu búsqueda."))
  element("catalog-date").textContent = `${dateLabel(data.savedAt)} ${data.products.length} aromas guardados${data.total > data.products.length ? ` de ${data.total}` : ""}.`
}
function showView(view) {
  for (const button of document.querySelectorAll("[data-view]")) button.setAttribute("aria-pressed", String(button.dataset.view === view))
  element("catalog-view").hidden = view !== "catalog"
  element("content-view").hidden = view === "catalog"
  if (view === "catalog") return
  const body = element("content-body"); body.replaceChildren()
  const names = { about: "Sobre INHALEX", faq: "Preguntas frecuentes", privacyPolicy: "Política de privacidad", termsAndConditions: "Términos y condiciones", contact: "Estamos para ayudarte" }
  element("content-title").textContent = names[view] || "Información"
  element("content-date").textContent = view === "contact" ? "Información de contacto incluida con esta versión de INHALEX." : dateLabel(data.companySavedAt)
  if (view === "contact" && contact) {
    body.append(text("p", contact.address), text("p", contact.city), text("p", contact.hours))
    const email = text("a", contact.email); email.href = `mailto:${contact.email}`
    const phone = text("a", contact.phone); phone.href = contact.phoneHref
    const links = document.createElement("p"); links.append(email, document.createElement("br"), phone); body.append(links)
  } else if (!data.company) body.append(text("p", "Esta información aún no está guardada. Con conexión, abre Instalar INHALEX y guarda el catálogo y la ayuda."))
  else if (view === "about") {
    const about = data.company.about || {}
    body.append(text("h3", "Misión"), text("p", about.mission), text("h3", "Visión"), text("p", about.vision), text("h3", "Valores"))
    const list = document.createElement("ul"); for (const value of about.values || []) list.append(text("li", value)); body.append(list)
  } else if (view === "faq") {
    for (const faq of data.company.faqs || []) { const details = document.createElement("details"); details.append(text("summary", faq.question), text("p", faq.answer)); body.append(details) }
  } else {
    const section = data.company[view]
    element("content-title").textContent = section?.title || names[view]
    // Text nodes keep CMS markdown harmless; never inject stored HTML.
    body.append(text("p", section?.content || "No hay contenido guardado."))
    body.append(text("p", "Esta es una copia para consulta. Al reconectar, revisa la versión vigente en el sitio.", "notice"))
  }
}
async function start() {
  try {
    const [snapshotResponse, configResponse] = await Promise.all([fetch("/__pwa/snapshot", { cache: "no-store" }), fetch("/pwa-config.json")])
    if (snapshotResponse.ok) data = await snapshotResponse.json()
    if (configResponse.ok) contact = (await configResponse.json()).contact
  } catch { element("connection-status").textContent = "No pudimos leer el catálogo guardado. Abre INHALEX con conexión para prepararlo." }
  if (!Array.isArray(data.products)) data.products = []
  for (const category of [...new Set(data.products.map(item => item.category))].filter(Boolean).sort()) { const option = text("option", categoryLabel(category)); option.value = category; element("category").append(option) }
  renderProducts()
  const views = { "/politicas": "privacyPolicy", "/terminos": "termsAndConditions", "/nosotros": "about", "/faq": "faq", "/contacto": "contact" }
  showView(views[location.pathname] || "catalog")
  element("private-notice").hidden = !/^\/(admin|auth|cuenta|bolsa)(\/|$)/.test(location.pathname)
  const slug = location.pathname.match(/^\/productos\/([^/]+)$/)?.[1]
  const product = slug && data.products.find(item => item.slug === decodeURIComponent(slug))
  if (product) showProduct(product)
}
for (const button of document.querySelectorAll("[data-view]")) button.addEventListener("click", () => showView(button.dataset.view))
element("search").addEventListener("input", renderProducts)
element("category").addEventListener("change", renderProducts)
element("close-dialog").addEventListener("click", () => element("product-dialog").close())
window.addEventListener("online", () => { element("connection-status").textContent = "Tu dispositivo detecta conexión. Puedes volver a la web para consultar información actualizada." })
void start()
