import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { buildSVG, removeBackground } from './svg-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// New art filenames to test
const NEW_ARTS = [
  'accessory-grease',
  'accessory-tatewaku',
  'accessory-uroko',
  'head-capybara',
  'head-couch',
  'head-hanger',
  'head-index-card',
  'head-snowman',
  'head-treasurechest',
  'head-vending-machine',
  'head-wine-barrel',
  'glasses-deep-teal',
  'glasses-grass'
];

const SIZE = 320;
const OUTPUT_DIR = join(__dirname, '../test-new-arts');

console.log(`Testing new arts at ${SIZE}x${SIZE}`);

// Load image data
const imageDataPath = join(__dirname, '../data/nouns_br_traits.json');
const imageData = JSON.parse(readFileSync(imageDataPath, 'utf-8'));
const { palette, images } = imageData;

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

let tested = 0;

// Test each category
for (const [category, traits] of Object.entries(images)) {
  for (const trait of traits) {
    if (NEW_ARTS.includes(trait.filename)) {
      const svgWithBg = buildSVG([trait], palette, 'd5d7e1');
      const svg = removeBackground(svgWithBg);
      
      const outPath = join(OUTPUT_DIR, `${trait.filename}.png`);
      
      try {
        const png = await sharp(Buffer.from(svg))
          .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' })
          .png({ compressionLevel: 9 })
          .toBuffer();
        
        writeFileSync(outPath, png);
        console.log(`✓ ${trait.filename}.png`);
        tested++;
      } catch (err) {
        console.error(`✗ ${trait.filename}.png - ${err.message}`);
      }
    }
  }
}

console.log(`\n✨ Exported ${tested} new arts to ${OUTPUT_DIR}`);
console.log(`\nPlease check the images to see if colors look correct.`);
console.log(`If colors look weird, you'll need to provide source PNGs for re-encoding.`);

