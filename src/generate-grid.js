import { readdirSync, mkdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_SIZE = 200;

const {
  inputDir,
  outputPath,
  size,
  backgroundIndex,
  limits
} = parseArgs(process.argv.slice(2));

console.log(`\n🧩 NounsBR Grid Generator`);
console.log(`Input: ${inputDir}`);
console.log(`Output: ${outputPath}`);
console.log(`Tile size: ${size}px`);
console.log(`Background index: ${backgroundIndex}`);
logLimits();

mkdirSync(dirname(outputPath), { recursive: true });

const LAYERS = ['backgrounds', 'bodies', 'accessories', 'heads', 'glasses'];

async function main() {
  try {
    const traits = loadTraits();

    const background = traits.backgrounds[backgroundIndex];
    if (!background) {
      throw new Error(`Background index ${backgroundIndex} not available`);
    }

    const glasses = limitArray(traits.glasses, limits.glasses);
    const heads = limitArray(traits.heads, limits.heads);
    const bodies = limitArray(traits.bodies, limits.bodies);
    const accessories = limitArray(traits.accessories, limits.accessories);

    const columns = glasses.length * accessories.length;
    if (columns === 0) {
      throw new Error('No columns to render (check glasses/accessories limits)');
    }
    const rows = heads.length * bodies.length;
    if (rows === 0) {
      throw new Error('No rows to render (check heads/bodies limits)');
    }

    console.log(`\n📐 Grid layout`);
    console.log(`Columns: ${columns} (glasses × accessories)`);
    console.log(`Rows: ${rows} (heads × bodies)`);
    console.log(`Final size: ${columns * size} × ${rows * size}px\n`);

    const gridComposites = [];
    let rowOffset = 0;
    for (const [headIndex, headPath] of heads.entries()) {
      console.log(`🧠 Head ${headIndex + 1}/${heads.length}: ${basename(headPath)}`);
      for (const [bodyIndex, bodyPath] of bodies.entries()) {
        const rowComposites = [];
        let columnOffset = 0;

        for (const glassesPath of glasses) {
          for (const accessoryPath of accessories) {
            const tile = await renderTile({
              backgrounds: background,
              bodies: bodyPath,
              accessories: accessoryPath,
              heads: headPath,
              glasses: glassesPath
            });

            rowComposites.push({
              input: tile,
              left: columnOffset * size,
              top: 0
            });
            columnOffset += 1;
          }
        }

        const rowImage = sharp({
          create: {
            width: columns * size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        }).composite(rowComposites);

        const rowBuffer = await rowImage.png({ compressionLevel: 9 }).toBuffer();

        gridComposites.push({
          input: rowBuffer,
          top: rowOffset * size,
          left: 0
        });

        console.log(`  🧍 Body ${bodyIndex + 1}/${bodies.length}: ${basename(bodyPath)}`);
        rowOffset += 1;
      }
    }

    const baseImage = sharp({
      create: {
        width: columns * size,
        height: rows * size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    await baseImage
      .composite(gridComposites)
      .png({ compressionLevel: 9 })
      .toFile(outputPath);

    console.log(`\n✅ Grid saved to ${outputPath}`);
  } catch (error) {
    console.error(`\n❌ Error generating grid: ${error.message}`);
    process.exit(1);
  }
}

function parseArgs(argv) {
  const options = {
    inputDir: join(__dirname, '../output'),
    outputPath: join(__dirname, '../grid.png'),
    size: DEFAULT_SIZE,
    backgroundIndex: 0,
    limits: {
      glasses: undefined,
      heads: undefined,
      bodies: undefined,
      accessories: undefined
    }
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      options.outputPath = resolvePath(arg);
      continue;
    }

    const { key, value } = splitKeyValue(arg, argv, i);
    if (value === undefined) {
      continue;
    }

    switch (key) {
      case 'input':
        options.inputDir = resolvePath(value);
        break;
      case 'output':
        options.outputPath = resolvePath(value);
        break;
      case 'size':
        options.size = parsePositiveInt(value, 'size') ?? options.size;
        break;
      case 'background':
        options.backgroundIndex = parseNonNegativeInt(value, 'background');
        break;
      case 'traits': {
        const parsedLimit = parsePositiveInt(value, 'traits');
        if (parsedLimit !== undefined) {
          for (const traitKey of Object.keys(options.limits)) {
            options.limits[traitKey] = parsedLimit;
          }
        }
        break;
      }
      case 'glasses':
      case 'heads':
      case 'bodies':
      case 'accessories':
        options.limits[key] = parsePositiveInt(value, key);
        break;
      default:
        console.warn(`⚠️  Unknown option ignored: --${key}`);
    }
  }

  return options;
}

function splitKeyValue(arg, argv, index) {
  const trimmed = arg.replace(/^--/, '');
  const [key, directValue] = trimmed.split('=');
  if (directValue !== undefined) {
    return { key, value: directValue };
  }
  const next = argv[index + 1];
  if (next && !next.startsWith('--')) {
    argv.splice(index + 1, 1);
    return { key, value: next };
  }
  console.warn(`⚠️  Missing value for --${key}; option ignored`);
  return { key, value: undefined };
}

function resolvePath(pathLike) {
  return resolve(process.cwd(), pathLike);
}

function parsePositiveInt(value, label) {
  const parsed = parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  console.warn(`⚠️  Invalid value "${value}" for ${label}; ignoring`);
  return undefined;
}

function parseNonNegativeInt(value, label) {
  const parsed = parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  console.warn(`⚠️  Invalid value "${value}" for ${label}; using 0`);
  return 0;
}

function limitArray(array, limit) {
  const shuffled = shuffleArray(array);
  if (!limit || limit >= shuffled.length) {
    return shuffled;
  }
  return shuffled.slice(0, limit);
}

function loadTraits() {
  const traits = {};
  for (const layer of LAYERS) {
    const layerDir = join(inputDir, layer);
    const files = readdirSync(layerDir)
      .filter(file => file.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b))
      .map(file => join(layerDir, file));

    if (files.length === 0) {
      throw new Error(`No assets found for ${layer}`);
    }

    traits[layer] = files;
    console.log(`📦 Loaded ${files.length} ${layer}`);
  }
  return traits;
}

async function renderTile(selectedTraits) {
  const baseBuffer = await sharp(selectedTraits.backgrounds)
    .resize(size, size, { kernel: sharp.kernel.nearest, fit: 'fill' })
    .png()
    .toBuffer();

  const layerPaths = [
    selectedTraits.bodies,
    selectedTraits.accessories,
    selectedTraits.heads,
    selectedTraits.glasses
  ];

  const composites = await Promise.all(
    layerPaths.map(async layerPath => ({
      input: await sharp(layerPath)
        .resize(size, size, { kernel: sharp.kernel.nearest, fit: 'fill' })
        .png()
        .toBuffer()
    }))
  );

  return sharp(baseBuffer)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function logLimits() {
  const entries = Object.entries(limits)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');

  if (entries.length === 0) {
    console.log(`Limits: none (using all traits)\n`);
  } else {
    console.log(`Limits: ${entries}\n`);
  }
}

main();
