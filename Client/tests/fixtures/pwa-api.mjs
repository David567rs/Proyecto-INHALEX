import { createServer } from "node:http"

const products = [
  { _id: "507f1f77bcf86cd799439011", slug: "lavanda", name: "Lavanda", category: "linea-insomnio", description: "Un aroma floral para acompañar tus pausas.", aromas: ["Lavanda"], image: "/products/lavanda.jpg", price: 89 },
  { _id: "507f1f77bcf86cd799439012", slug: "menta", name: "Menta", category: "linea-verde", description: "Una nota fresca en tu día.", aromas: ["Menta"], image: "/products/menta.jpg", price: 79 },
].map(item => ({ ...item, currency: "MXN", benefits: [], presentation: "Inhalador personal", origin: "México", inStock: true, stockAvailable: 12, allowBackorder: false }))
const company = { privacyPolicy: { title: "Privacidad de prueba", content: "Información pública de prueba. No contiene datos de clientes." }, termsAndConditions: { title: "Términos de prueba", content: "Consulta precios vigentes al reconectar." }, about: { mission: "Acompañar tus pausas.", vision: "Aromas a tu alcance.", values: ["Cuidado", "Calidad"] }, faqs: [{ question: "¿Puedo explorar sin conexión?", answer: "Sí, consulta la copia pública guardada." }] }

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:43001")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Vary", "Origin")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
  res.setHeader("Cache-Control", "private,no-store")
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return }
  const url = new URL(req.url, "http://localhost:43200")
  let body, status = 200
  if (url.pathname === "/api/products") body = { items: products, total: products.length, page: 1, limit: 100, totalPages: 1 }
  else if (url.pathname === "/api/products/categories") body = [{ id: "linea-insomnio", name: "Línea Insomnio", count: 1 }, { id: "linea-verde", name: "Línea Verde", count: 1 }]
  else if (url.pathname.startsWith("/api/products/")) body = products.find(item => item.slug === url.pathname.split("/").pop())
  else if (url.pathname === "/api/company-content") body = company
  else if (url.pathname === "/api" || url.pathname === "/api/health") body = { status: "ok" }
  else if (url.pathname.startsWith("/api/reviews/products/")) body = { items: [], total: 0 }
  else if (url.pathname === "/api/notifications/push/config") body = { enabled: false, publicKey: null }
  else { status = 401; body = { message: "Autenticación requerida" } }
  if (status === 200 && ["/api/products", "/api/products/categories", "/api/company-content"].includes(url.pathname)) res.setHeader("Cache-Control", "public,max-age=0,must-revalidate")
  res.writeHead(body ? status : 404, { "Content-Type": "application/json" }); res.end(JSON.stringify(body || { message: "Not found" }))
}).listen(43200, "127.0.0.1", () => console.log("Isolated PWA fixture API on localhost:43200; no database."))
