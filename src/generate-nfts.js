import { readdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get the number of NFTs to generate from command line args
const COUNT = process.argv[2] ? parseInt(process.argv[2]) : 10;
const INPUT_DIR = process.argv[3] || join(__dirname, '../output');
const OUTPUT_DIR = process.argv[4] || join(__dirname, '../nfts');
const SIZE = process.argv[5] ? parseInt(process.argv[5]) : 2000;

console.log(`\n🎨 NounsBR NFT Generator`);
console.log(`Generating ${COUNT} random NFTs at ${SIZE}x${SIZE}`);
console.log(`Input: ${INPUT_DIR}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

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
      .map(file => join(folderPath, file));
    return files;
  } catch (err) {
    console.error(`❌ Error reading ${folderName}: ${err.message}`);
    return [];
  }
}

/**
 * Get a random item from an array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate metadata for an NFT
 */
function generateMetadata(tokenId, traits) {
  const getName = (path) => {
    const filename = path.split('/').pop();
    return filename.replace('.png', '').replace(/^(bg-|body-|accessory-|head-|glasses-)/, '');
  };

  return {
    name: `NounsBR #${tokenId}`,
    description: 'A unique NounsBR NFT',
    image: `${tokenId}.png`,
    attributes: [
      {
        trait_type: 'background',
        value: getName(traits.backgrounds)
      },
      {
        trait_type: 'body',
        value: getName(traits.bodies)
      },
      {
        trait_type: 'accessory',
        value: getName(traits.accessories)
      },
      {
        trait_type: 'head',
        value: getName(traits.heads)
      },
      {
        trait_type: 'glasses',
        value: getName(traits.glasses)
      }
    ]
  };
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
  // Start with the background
  let image = sharp(selectedTraits.backgrounds)
    .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest, fit: 'fill' });

  // Build composite array for all other layers
  const composites = [];
  
  for (const layer of LAYERS.slice(1)) { // Skip background as it's the base
    composites.push({
      input: selectedTraits[layer]
    });
  }

  // Composite all layers
  image = image.composite(composites);

  // Save the final image
  const buffer = await image.png({ compressionLevel: 9 }).toBuffer();
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

    // Generate NFTs
    const metadata = [];
    
    for (let i = 0; i < COUNT; i++) {
      const tokenId = i + 1;
      
      // Randomly select one trait from each layer
      const selectedTraits = {};
      for (const layer of LAYERS) {
        selectedTraits[layer] = getRandomItem(allTraits[layer]);
      }

      // Generate the NFT image
      const outputPath = join(OUTPUT_DIR, `${tokenId}.png`);
      await compositeNFT(selectedTraits, outputPath);

      // Generate metadata
      const nftMetadata = generateMetadata(tokenId, selectedTraits);
      metadata.push(nftMetadata);

      // Save individual metadata file
      const metadataPath = join(OUTPUT_DIR, `${tokenId}.json`);
      writeFileSync(metadataPath, JSON.stringify(nftMetadata, null, 2));

      console.log(`✓ Generated NFT #${tokenId}`);
    }

    // Save collection metadata
    const collectionMetadataPath = join(OUTPUT_DIR, '_metadata.json');
    writeFileSync(collectionMetadataPath, JSON.stringify(metadata, null, 2));

    console.log(`\n✨ Done! Generated ${COUNT} NFTs in ${OUTPUT_DIR}`);
    console.log(`📝 Collection metadata saved to _metadata.json`);

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

// Run the generator
generateNFTs();

