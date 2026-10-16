import { open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import webPush from 'web-push';

// Creates local deployment material only. Never sends or prints the private key.
const destination = new URL('../.env.web-push', import.meta.url);
const subject = process.argv[2] || 'mailto:danielcruzhernandezinhalex@gmail.com';
if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subject)) {
  throw new Error('Provide a contact using mailto:correo@dominio.com');
}
let file;
try {
  file = await open(destination, 'wx', 0o600);
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('Ya existe .env.web-push. Conserva sus claves; no se ha sobrescrito.');
    process.exitCode = 1;
  } else throw error;
}
if (file) {
  try {
    const keys = webPush.generateVAPIDKeys();
    await file.writeFile(`# Configuración privada de Web Push. No subir a Git ni compartir en chats.\nVAPID_SUBJECT=${subject}\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`);
  } finally { await file.close(); }
  console.log(`Claves creadas en ${fileURLToPath(destination)}. Copia sus tres variables al entorno del servidor; no regeneres claves entre despliegues.`);
}
