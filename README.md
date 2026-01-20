# Lure Database Assistant

A VS Code extension for searching and referencing fishing lure colors from historical manufacturer databases.

## Features

- **Search Lure Colors**: Search the color database by name, ID, company code, or manufacturer
- **Quick Reference**: Highlight any text and search for matching colors instantly
- **Color Details**: View detailed information about each color including timeline, IDs, and manufacturer info
- **Copy IDs**: Easily copy color IDs to reference in your lure datasets

## Usage

### Search Colors

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Search Lure Colors"
3. Enter a color name, ID, or search term

### Search Selected Text

1. Highlight any text in the editor (e.g., "Frog", "Silver Flash", "00")
2. Right-click and select "Search Selected Text in Lure Colors"
3. Or use keyboard shortcut: `Ctrl+Shift+L` (`Cmd+Shift+L` on Mac)

### View Color Details

- Click on any search result to view detailed information
- Use the copy button to copy the color ID to clipboard

## Database

The extension includes color data from:
- **Creek Chub Bait Company** (1916-1978) - 73 colors

### Color ID Format

Colors use the format: `{manufacturer}-{companyId}`
- Example: `ccbc-00` (Creek Chub Bait Company, color code 00)
- Duplicates use suffixes: `ccbc-00b`, `ccbc-00c`

## Development

### Setup

```bash
npm install
```

### Compile

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Package Extension

```bash
vsce package
```

## Publishing

1. Update `publisher` in `package.json` with your VS Code Marketplace publisher name
2. Update version number
3. Package: `vsce package`
4. Publish: `vsce publish`

## Data Structure

The extension reads from `src/data.json` which contains:
- Manufacturer metadata (name, location, history, officers)
- Color entries (id, name, years, company codes)
- Lookup indexes for fast searches

### Adding Colors

Colors can be added to `src/data.json` using the snippet:
- Type `lurecolor` in the colors array
- Fill in the fields

## License

MIT
vscode extension to help with color code lookups
