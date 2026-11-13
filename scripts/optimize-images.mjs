// Převede velké PNG/JPG fotky (export z Figmy, Wikimedia) do WebP vhodných pro web.
// Originály zůstávají ve složce design-assets/ (nejsou součástí buildu).
// Spuštění: npm run optimize-images
import sharp from 'sharp';
import { readdir, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const jobs = [
  { dir: 'src/assets/figma', maxWidth: 2000 },
  { dir: 'src/assets/activities', maxWidth: 1000 },
];
// Malé ikonky necháváme v PNG (průhlednost, ostré hrany)
const keepAsIs = (file, size) => size < 60 * 1024;

for (const { dir, maxWidth } of jobs) {
  const abs = path.join(root, dir);
  const originals = path.join(root, 'design-assets', path.basename(dir));
  await mkdir(originals, { recursive: true });
  for (const file of await readdir(abs)) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const src = path.join(abs, file);
    const { size } = await stat(src);
    if (keepAsIs(file, size)) continue;
    const out = path.join(abs, file.replace(/\.(png|jpe?g)$/i, '.webp'));
    // ikonky a loga se zobrazují malé – stačí menší rozlišení (2–3× pro retina)
    const width = file.startsWith('fact-') ? 120 : file.startsWith('logo') ? 480 : maxWidth;
    await sharp(src)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
    await rename(src, path.join(originals, file));
    const { size: newSize } = await stat(out);
    console.log(`${file}: ${(size / 1024).toFixed(0)} kB -> ${(newSize / 1024).toFixed(0)} kB`);
  }
}
