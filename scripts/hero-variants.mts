// Writes responsive AVIF/WebP/JPEG variants of public/intro.jpg into public/hero/.
// Resize + encode only: no crop, no colour change. Run: npm run hero
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "assets/intro.jpg";
const OUT = "public/hero";
const WIDTHS = [1280, 1920, 2560] as const;

await mkdir(OUT, { recursive: true });
for (const w of WIDTHS) {
  const base = sharp(SRC).rotate().resize({ width: w, withoutEnlargement: true });
  await base.clone().avif({ quality: 60 }).toFile(`${OUT}/intro-${w}.avif`);
  await base.clone().webp({ quality: 80 }).toFile(`${OUT}/intro-${w}.webp`);
  await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/intro-${w}.jpg`);
  console.log(`wrote intro-${w}.{avif,webp,jpg}`);
}
