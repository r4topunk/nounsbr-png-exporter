import { readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Optional limit for how many NFTs to generate from command line args
const rawLimit = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;
const LIMIT = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : undefined;
const INPUT_DIR = process.argv[3] || join(__dirname, '../output');
const OUTPUT_DIR = process.argv[4] || join(__dirname, '../nfts');
const SIZE = process.argv[5] ? parseInt(process.argv[5], 10) : 2000;

console.log(`\n🎨 NounsBR NFT Generator`);
console.log(`Generating NFTs deterministically at ${SIZE}x${SIZE}`);
console.log(`Input: ${INPUT_DIR}`);
console.log(`Output: ${OUTPUT_DIR}`);
if (Number.isInteger(LIMIT)) {
  console.log(`Limiting to ${LIMIT} combinations\n`);
} else if (rawLimit !== undefined) {
  console.log(`Invalid limit provided ("${process.argv[2]}"); exporting all possible combinations\n`);
} else {
  console.log(`Exporting all possible combinations\n`);
}

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

// Layer order (as specified)
const LAYERS = ['backgrounds', 'bodies', 'accessories', 'heads', 'glasses'];

/**
 * Get all PNG files from a directory
 */
function getTraitsFromFolder(folderName) {
  const folderPath = join(INPUT_DIR, folderName);
  try {
    const files = readdirSync(folderPath)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b))
      .map(file => join(folderPath, file));
    return files;
  } catch (err) {
    console.error(`❌ Error reading ${folderName}: ${err.message}`);
    return [];
  }
}

/**
 * Load all available traits
 */
function loadAllTraits() {
  const allTraits = {};
  
  for (const layer of LAYERS) {
    const traits = getTraitsFromFolder(layer);
    if (traits.length === 0) {
      throw new Error(`No traits found in ${layer} folder`);
    }
    allTraits[layer] = traits;
    console.log(`📦 Loaded ${traits.length} ${layer}`);
  }
  
  return allTraits;
}

/**
 * Composite layers to create final NFT image
 */
async function compositeNFT(selectedTraits, outputPath) {
  const backgroundBuffer = await sharp(selectedTraits.backgrounds)
    .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' })
    .png()
    .toBuffer();

  const composites = await Promise.all(
    LAYERS.slice(1).map(async layer => ({
      input: await sharp(selectedTraits[layer])
        .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' })
        .png()
        .toBuffer()
    }))
  );

  const buffer = await sharp(backgroundBuffer)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(outputPath, buffer);
}

/**
 * Main generation function
 */
async function generateNFTs() {
  try {
    // Load all available traits
    const allTraits = loadAllTraits();
    console.log();

    const backgroundToUse = allTraits.backgrounds[0];
    if (!backgroundToUse) {
      throw new Error('No background available to generate combinations');
    }

    const totalCombinations =
      allTraits.glasses.length *
      allTraits.heads.length *
      allTraits.bodies.length *
      allTraits.accessories.length;

    console.log(`📊 Total combinations (single background): ${totalCombinations}`);
    console.log(`🎯 Background in use: ${backgroundToUse.split(/[\\/]/).pop()}\n`);

    let generatedCount = 0;

    generationLoop:
    for (const [glassesIndex, glassesPath] of allTraits.glasses.entries()) {
      console.log(`👓 Glasses ${glassesIndex + 1}/${allTraits.glasses.length}: ${basename(glassesPath)}`);
      for (const [headIndex, headPath] of allTraits.heads.entries()) {
        console.log(`  🧠 Head ${headIndex + 1}/${allTraits.heads.length}: ${basename(headPath)}`);
        for (const bodyPath of allTraits.bodies) {
          for (const accessoryPath of allTraits.accessories) {
            const tokenId = generatedCount + 1;
            const selectedTraits = {
              backgrounds: backgroundToUse,
              bodies: bodyPath,
              accessories: accessoryPath,
              heads: headPath,
              glasses: glassesPath
            };

            const outputPath = join(OUTPUT_DIR, `${tokenId}.png`);
            await compositeNFT(selectedTraits, outputPath);
            console.log(`✓ Generated NFT #${tokenId}`);

            generatedCount += 1;
            if (Number.isInteger(LIMIT) && generatedCount >= LIMIT) {
              break generationLoop;
            }
          }
        }
      }
    }

    console.log(`\n✨ Done! Generated ${generatedCount} NFTs in ${OUTPUT_DIR}`);
    console.log(`📄 Metadata files skipped as requested`);

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

// Run the generator
generateNFTs();
