import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { buildSVG, removeBackground } from './svg-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Size for output PNGs (defaults to 2000x2000)
const SIZE = process.argv[2] ? parseInt(process.argv[2]) : 2000;
const OUTPUT_DIR = process.argv[3] || join(__dirname, '../output');

console.log(`Exporting traits at ${SIZE}x${SIZE} to ${OUTPUT_DIR}`);

// Load image data
const imageDataPath = join(__dirname, '../data/nouns_br_traits.json');
const imageData = JSON.parse(readFileSync(imageDataPath, 'utf-8'));

const { palette, images, bgcolors } = imageData;

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Export backgrounds first
console.log(`\nExporting backgrounds...`);
const backgroundsDir = join(OUTPUT_DIR, 'backgrounds');
mkdirSync(backgroundsDir, { recursive: true });

for (let i = 0; i < bgcolors.length; i++) {
  const color = bgcolors[i];
  const svg = `<svg width="320" height="320" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#${color}" /></svg>`;
  const outPath = join(backgroundsDir, `bg-${color}.png`);
  
  try {
    const png = await sharp(Buffer.from(svg))
      .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    
    writeFileSync(outPath, png);
    console.log(`  ✓ bg-${color}.png`);
  } catch (err) {
    console.error(`  ✗ bg-${color}.png - ${err.message}`);
  }
}

// Export each category
for (const [category, traits] of Object.entries(images)) {
  console.log(`\nExporting ${category}...`);
  const categoryDir = join(OUTPUT_DIR, category);
  mkdirSync(categoryDir, { recursive: true });

  for (const trait of traits) {
    const svgWithBg = buildSVG([trait], palette, 'ffffff');
    const svg = removeBackground(svgWithBg);
    
    const outPath = join(categoryDir, `${trait.filename}.png`);
    
    try {
      const png = await sharp(Buffer.from(svg))
        .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' })
        .png({ compressionLevel: 9 })
        .toBuffer();
      
      writeFileSync(outPath, png);
      console.log(`  ✓ ${trait.filename}.png`);
    } catch (err) {
      console.error(`  ✗ ${trait.filename}.png - ${err.message}`);
    }
  }
}

console.log(`\n✨ Done! PNGs exported to ${OUTPUT_DIR}`);

