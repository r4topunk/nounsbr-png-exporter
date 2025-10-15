# NounsBR PNG Exporter

Standalone PNG exporter for NounsBR assets. Converts RLE-encoded image data into high-quality PNG files.

## Features

- ✨ Zero dependencies on other packages
- 🎨 Exports all trait categories (backgrounds, bodies, accessories, heads, glasses)
- 🖼️ Configurable output size (default 2000x2000)
- 🔍 Nearest-neighbor scaling for crisp pixel art
- 📦 Self-contained with all necessary data
- 🎲 Generate random NFTs by combining traits in layers

## Installation

```bash
pnpm install
```

## Usage

### Export Traits

Export all traits at 2000x2000 (default):
```bash
pnpm run export
```

Custom size:
```bash
pnpm run export 3000
```

Custom size and output directory:
```bash
pnpm run export 3000 /path/to/custom/output
```

### Generate Random NFTs

Generate random NFTs by combining traits in layers:

Generate 10 NFTs (default):
```bash
pnpm run generate
```

Generate custom number of NFTs:
```bash
pnpm run generate 50
```

Custom parameters:
```bash
pnpm run generate [count] [input-dir] [output-dir] [size]

# Example: Generate 100 NFTs from custom input, output to collection folder at 3000x3000
pnpm run generate 100 ./output ./collection 3000
```

The NFT generator layers traits in the following order:
1. Background
2. Body
3. Accessory
4. Head
5. Glasses

Each generated NFT includes:
- `{id}.png` - The composite image
- `{id}.json` - Individual metadata file
- `_metadata.json` - Collection metadata (all NFTs)

## Output

### Trait Export

Creates PNG files in `output/` directory (or custom path) organized by category:
- `output/backgrounds/*.png` - Solid color backgrounds
- `output/bodies/*.png` - Body traits (transparent)
- `output/accessories/*.png` - Accessory traits (transparent)
- `output/heads/*.png` - Head traits (transparent)
- `output/glasses/*.png` - Glasses traits (transparent)

All traits except backgrounds are exported with transparent backgrounds using nearest-neighbor scaling for crisp pixel art.

### NFT Generation

Creates composite NFT images in `nfts/` directory (or custom path):
- `nfts/{id}.png` - Composite NFT image
- `nfts/{id}.json` - Individual NFT metadata with trait attributes
- `nfts/_metadata.json` - Collection metadata file

Example metadata structure:
```json
{
  "name": "NounsBR #1",
  "description": "A unique NounsBR NFT",
  "image": "1.png",
  "attributes": [
    { "trait_type": "background", "value": "d5d7e1" },
    { "trait_type": "body", "value": "azul" },
    { "trait_type": "accessory", "value": "bola" },
    { "trait_type": "head", "value": "cafe" },
    { "trait_type": "glasses", "value": "amarelo" }
  ]
}
```

## Structure

```
nounsbr-png-exporter/
├── data/
│   └── image-data.json    # RLE-encoded trait data
├── src/
│   ├── export.js          # Trait export script
│   ├── generate-nfts.js   # NFT generator script
│   └── svg-builder.js     # SVG generation logic
├── output/                # Exported trait PNGs (generated)
├── nfts/                  # Generated NFT images (generated)
├── package.json
└── README.md
```

## Publishing as Standalone

This package is completely self-contained and can be published or moved to a separate repository without any dependencies on other NounsBR packages.

