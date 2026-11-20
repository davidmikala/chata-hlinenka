/**
 * Nahraje současné fotky webu do Sanity, aby je zákazník v administraci
 * hned viděl a mohl je měnit. Spouští se jednou, po přihlášení do Sanity:
 *
 *   npx sanity login
 *   npx sanity exec scripts/sanity-seed.mjs --with-user-token
 *
 * Pokud dokument „Fotky na webu“ už existuje, skript nic nepřepíše.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getCliClient } from 'sanity/cli';
import { SLOTS, GALLERY } from '../src/content/photo-slots.js';

const client = getCliClient({ apiVersion: '2025-01-01' });
const ASSETS = path.resolve('src/assets');
const DOC_ID = 'sitePhotos';

const existing = await client.getDocument(DOC_ID);
if (existing) {
  console.log('Dokument „Fotky na webu“ už v Sanity je – nic nepřepisuji.');
  process.exit(0);
}

// každý soubor nahrát jen jednou (stejná fotka může být ve více slotech)
const uploaded = new Map();
async function upload(file) {
  if (!uploaded.has(file)) {
    const asset = await client.assets.upload('image', fs.createReadStream(path.join(ASSETS, file)), { filename: path.basename(file) });
    console.log('  nahráno:', file);
    uploaded.set(file, asset._id);
  }
  return uploaded.get(file);
}
const image = async (file, alt) => ({ _type: 'image', asset: { _type: 'reference', _ref: await upload(file) }, alt });

const doc = { _id: DOC_ID, _type: 'sitePhotos' };
for (const s of SLOTS) doc[s.key] = await image(s.file, s.alt);
doc.gallery = [];
for (const [i, g] of GALLERY.entries()) doc.gallery.push({ _key: `g${i + 1}`, ...(await image(g.file, g.alt)) });

await client.createIfNotExists(doc);
console.log(`Hotovo – ${uploaded.size} fotek nahráno, dokument „Fotky na webu“ vytvořen.`);
