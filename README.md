# NounsBR PNG Exporter

Standalone PNG exporter for NounsBR assets. Converts RLE-encoded image data into high-quality PNG files.

## Features

- ✨ Zero dependencies on other packages
- 🎨 Exports all trait categories (backgrounds, bodies, accessories, heads, glasses)
- 🖼️ Configurable output size (default 2000x2000)
- 🔍 Nearest-neighbor scaling for crisp pixel art
- 📦 Self-contained with all necessary data

## Installation

```bash
pnpm install
```

## Usage

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

## Output

Creates PNG files in `output/` directory (or custom path) organized by category:
- `output/backgrounds/*.png` - Solid color backgrounds
- `output/bodies/*.png` - Body traits (transparent)
- `output/accessories/*.png` - Accessory traits (transparent)
- `output/heads/*.png` - Head traits (transparent)
- `output/glasses/*.png` - Glasses traits (transparent)

All traits except backgrounds are exported with transparent backgrounds using nearest-neighbor scaling for crisp pixel art.

## Structure

```
nounsbr-png-exporter/
├── data/
│   └── image-data.json    # RLE-encoded trait data
├── src/
│   ├── export.js          # Main export script
│   └── svg-builder.js     # SVG generation logic
├── package.json
└── README.md
```

## Publishing as Standalone

This package is completely self-contained and can be published or moved to a separate repository without any dependencies on other NounsBR packages.

