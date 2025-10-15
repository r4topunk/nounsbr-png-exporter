import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Calculate bounds for an image (matching SDK's calcBounds method)
 * Returns bounds with exclusive right bound [left, right)
 */
function calcBounds(image, width, height) {
  // Find top bound
  let top = 0;
  while (top < height) {
    let transparent = true;
    for (let x = 0; x < width; x++) {
      const pixel = image.rgbaAt(x, top);
      if (pixel.a !== 0) {
        transparent = false;
        break;
      }
    }
    if (!transparent) break;
    top++;
  }

  // Find bottom bound (inclusive)
  let bottom = height - 1;
  while (bottom >= top) {
    let transparent = true;
    for (let x = 0; x < width; x++) {
      const pixel = image.rgbaAt(x, bottom);
      if (pixel.a !== 0) {
        transparent = false;
        break;
      }
    }
    if (!transparent) break;
    bottom--;
  }

  // Find left bound
  let left = 0;
  while (left < width) {
    let transparent = true;
    for (let y = 0; y < height; y++) {
      const pixel = image.rgbaAt(left, y);
      if (pixel.a !== 0) {
        transparent = false;
        break;
      }
    }
    if (!transparent) break;
    left++;
  }

  // Find right bound (work inward from edge)
  let right = width - 1;
  while (right >= left) {
    let transparent = true;
    for (let y = 0; y < height; y++) {
      const pixel = image.rgbaAt(right, y);
      if (pixel.a !== 0) {
        transparent = false;
        break;
      }
    }
    if (!transparent) break;
    right--;
  }
  
  // Right bound is one pixel outside the content (exclusive)
  right = right + 1;

  return { top, right, bottom, left };
}

/**
 * Find or add color to palette
 */
function getColorIndex(palette, color) {
  const hexColor = color.toString(16).padStart(6, '0');
  let index = palette.indexOf(hexColor);
  
  if (index === -1) {
    palette.push(hexColor);
    index = palette.length - 1;
  }
  
  return index;
}

/**
 * Encode image data to RLE format with 255 max run length
 */
function encodeImage(image, width, height, palette) {
  const bounds = calcBounds(image, width, height);
  
  // Build array of color indexes for all pixels in bounds
  const indexes = [];
  for (let y = bounds.top; y <= bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {  // ✅ Exclusive right bound
      const pixel = image.rgbaAt(x, y);
      
      if (pixel.a === 0) {
        indexes.push(0);  // Transparent
      } else {
        const rgb = (pixel.r << 16) | (pixel.g << 8) | pixel.b;
        indexes.push(getColorIndex(palette, rgb));
      }
    }
  }

  // Run-length encode with 255 max length
  const encoding = [];
  let previous = indexes[0];
  let count = 1;

  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] !== previous || count === 255) {  // ✅ Split at 255
      encoding.push(count, previous);
      count = 1;
      previous = indexes[i];
    } else {
      count++;
    }
  }
  
  // Push final run
  encoding.push(count, previous);

  // Build hex string
  const boundsHex = [
    bounds.top.toString(16).padStart(2, '0'),
    bounds.right.toString(16).padStart(2, '0'),
    bounds.bottom.toString(16).padStart(2, '0'),
    bounds.left.toString(16).padStart(2, '0'),
  ].join('');

  const rectsHex = encoding
    .map(n => n.toString(16).padStart(2, '0'))
    .join('');

  return `0x00${boundsHex}${rectsHex}`;
}

/**
 * Process a single PNG file
 */
async function encodePNG(pngPath, palette) {
  const buffer = readFileSync(pngPath);
  const image = sharp(buffer);
  
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Create accessor for RGBA data
  const rgbaAt = (x, y) => {
    const idx = (y * info.width + x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3],
    };
  };

  const imageWithAccessor = { rgbaAt };
  
  return encodeImage(imageWithAccessor, info.width, info.height, palette);
}

/**
 * Main encoding function
 */
async function main() {
  const inputDir = process.argv[2];
  
  if (!inputDir) {
    console.error('Usage: node encode-png.js <input-directory>');
    console.error('Example: node encode-png.js ../new-arts/accessories');
    process.exit(1);
  }

  const fullPath = join(__dirname, inputDir);
  
  if (!statSync(fullPath).isDirectory()) {
    console.error(`Error: ${inputDir} is not a directory`);
    process.exit(1);
  }

  console.log(`Encoding PNGs from ${inputDir}...\n`);

  // Load project global palette so encoded color indexes match consumer palette
  const paletteJsonPath = process.argv[3]
    ? join(__dirname, process.argv[3])
    : join(__dirname, '../data/nouns_br_traits.json');
  let paletteFromProject;
  try {
    const paletteJson = JSON.parse(readFileSync(paletteJsonPath, 'utf-8'));
    paletteFromProject = Array.isArray(paletteJson?.palette)
      ? paletteJson.palette.slice()
      : [''];
  } catch (_e) {
    // Fallback to minimal palette if file is missing; encoder will print new colors
    paletteFromProject = [''];
  }

  // Ensure index 0 is transparent token
  if (paletteFromProject[0] !== '') {
    paletteFromProject.unshift('');
  }

  const palette = paletteFromProject;
  const encoded = [];

  const files = readdirSync(fullPath)
    .filter(f => f.endsWith('.png'))
    .sort();

  for (const file of files) {
    const pngPath = join(fullPath, file);
    const filename = basename(file, '.png');
    
    try {
      const data = await encodePNG(pngPath, palette);
      encoded.push({ filename, data });
      console.log(`✓ ${filename}`);
    } catch (err) {
      console.error(`✗ ${filename}: ${err.message}`);
    }
  }

  console.log('\n=== Encoded Data ===\n');
  console.log(JSON.stringify(encoded, null, 2));

  console.log('\n=== New Palette Colors ===\n');
  console.log(JSON.stringify(palette, null, 2));
  
  console.log(`\n✨ Encoded ${encoded.length} images`);
  console.log(`📊 Palette size: ${palette.length} colors`);
}

main().catch(console.error);

