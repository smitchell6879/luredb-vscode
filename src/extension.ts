import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ColorSearchProvider, ColorData } from './colorSearchProvider';
import { LureSearchProvider, LureData } from './lureSearchProvider';

let colorSearchProvider: ColorSearchProvider;
let lureSearchProvider: LureSearchProvider;
let colorLookup: Map<string, { name: string; pre1925Id?: string[]; companyId?: string }> = new Map();

export function activate(context: vscode.ExtensionContext) {
  console.log('LureDB extension is now active');

  // Initialize the color search provider
  const dataPath = path.join(context.extensionPath, 'src', 'data.json');
  colorSearchProvider = new ColorSearchProvider(dataPath);

  // Initialize the lure search provider (uses same data.json file)
  lureSearchProvider = new LureSearchProvider(dataPath);

  // Build color lookup map for quick name resolution
  buildColorLookup(dataPath);

  // Command: Search colors with input
  const searchColorsCommand = vscode.commands.registerCommand(
    'luredb.searchColors',
    async () => {
      const searchTerm = await vscode.window.showInputBox({
        prompt: 'Enter color name or ID to search',
        placeHolder: 'e.g., Frog, ccbc-00, Silver Flash',
        ignoreFocusOut: true
      });

      if (searchTerm) {
        await showColorResults(searchTerm);
      }
    }
  );

  // Command: Search selected text
  const searchSelectedTextCommand = vscode.commands.registerCommand(
    'luredb.searchSelectedText',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection || selection.trim().length === 0) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      await showColorResults(selection.trim());
    }
  );

  // Command: Search lures with input
  const searchLuresCommand = vscode.commands.registerCommand(
    'luredb.searchLures',
    async () => {
      const searchTerm = await vscode.window.showInputBox({
        prompt: 'Enter lure name or number to search',
        placeHolder: 'e.g., Pikie, 700, Darter',
        ignoreFocusOut: true
      });

      if (searchTerm) {
        await showLureResults(searchTerm);
      }
    }
  );

  // Command: Search lures from selected text
  const searchLuresSelectedTextCommand = vscode.commands.registerCommand(
    'luredb.searchLuresSelectedText',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection || selection.trim().length === 0) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      await showLureResults(selection.trim());
    }
  );

  context.subscriptions.push(
    searchColorsCommand,
    searchSelectedTextCommand,
    searchLuresCommand,
    searchLuresSelectedTextCommand
  );
}

function buildColorLookup(dataPath: string): void {
  try {
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);

    if (data.manufacturers?.['creek-chub']?.colors) {
      for (const color of data.manufacturers['creek-chub'].colors) {
        colorLookup.set(color.id, {
          name: color.name,
          pre1925Id: color.pre1925Id,
          companyId: color.companyId
        });
      }
    }
  } catch (error) {
    console.error('Failed to build color lookup:', error);
  }
}

function getColorInfo(colorId: string): { name: string; pre1925Id?: string[]; companyId?: string } {
  const info = colorLookup.get(colorId);
  return info || { name: colorId };
}

async function showColorResults(searchTerm: string) {
  const results = colorSearchProvider.search(searchTerm);

  if (results.length === 0) {
    vscode.window.showInformationMessage(`No colors found matching "${searchTerm}"`);
    return;
  }

  // Create QuickPick items
  const items: vscode.QuickPickItem[] = results.map((result: ColorData) => {
    const detail = [
      `Manufacturer: ${result.manufacturerName}`,
      result.companyId ? `Company ID: ${result.companyId}` : '',
      result.yearIntroduced ? `Introduced: ${result.yearIntroduced}` : '',
      result.yearLastUsed ? `Last Used: ${result.yearLastUsed}` : ''
    ].filter(Boolean).join(' | ');

    return {
      label: `$(symbol-color) ${result.name}`,
      description: result.id,
      detail: detail,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('clippy'),
          tooltip: 'Copy ID'
        }
      ]
    };
  });

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.placeholder = `Found ${results.length} color(s) matching "${searchTerm}"`;
  quickPick.title = 'Lure Color Search Results';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Handle button clicks
  quickPick.onDidTriggerItemButton(async (e) => {
    const item = e.item;
    const colorId = item.description;
    if (colorId) {
      await vscode.env.clipboard.writeText(colorId);
      vscode.window.showInformationMessage(`Copied: ${colorId}`);
    }
  });

  // Handle selection
  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    if (selected) {
      const colorResult = results.find((r: ColorData) => r.id === selected.description);
      if (colorResult) {
        showColorDetails(colorResult);
      }
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

function showColorDetails(color: ColorData) {
  const panel = vscode.window.createWebviewPanel(
    'lureColorDetails',
    `Color: ${color.name}`,
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = getColorDetailsHtml(color);
}

function getColorDetailsHtml(color: ColorData): string {
  const pre1925Text = color.pre1925Id && color.pre1925Id.length > 0
    ? `<p><strong>Pre-1925 IDs:</strong> ${color.pre1925Id.join(', ')}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${color.name}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .info-section {
      margin: 20px 0;
      padding: 15px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }
    .id-badge {
      display: inline-block;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .timeline {
      margin-top: 10px;
    }
    strong {
      color: var(--vscode-textLink-foreground);
    }
  </style>
</head>
<body>
  <h1>${color.name}</h1>
  
  <div class="info-section">
    <p><strong>ID:</strong> <span class="id-badge">${color.id}</span></p>
    <p><strong>Manufacturer:</strong> ${color.manufacturerName}</p>
    ${color.companyId ? `<p><strong>Company Color Code:</strong> ${color.companyId}</p>` : ''}
  </div>

  <div class="info-section timeline">
    <h2>Timeline</h2>
    ${color.yearIntroduced ? `<p><strong>Introduced:</strong> ${color.yearIntroduced}</p>` : '<p><em>Introduction year unknown</em></p>'}
    ${color.yearLastUsed ? `<p><strong>Last Used:</strong> ${color.yearLastUsed}</p>` : '<p><em>Still in production or unknown</em></p>'}
    ${pre1925Text}
  </div>

  <div class="info-section">
    <h2>Usage</h2>
    <p>Reference this color in your lure dataset using the ID:</p>
    <code>"colors": ["${color.id}"]</code>
  </div>
</body>
</html>`;
}

export function deactivate() {
  // Cleanup if needed
}

async function showLureResults(searchTerm: string) {
  const results = lureSearchProvider.search(searchTerm);

  if (results.length === 0) {
    vscode.window.showInformationMessage(`No lures found matching "${searchTerm}"`);
    return;
  }

  // Create QuickPick items
  const items: vscode.QuickPickItem[] = results.map((result: LureData) => {
    const detail = [
      `Manufacturer: ${result.manufacturerName}`,
      result.yearIntroduced ? `Introduced: ${result.yearIntroduced}` : '',
      result.colors ? `Colors: ${result.colors.length}` : ''
    ].filter(Boolean).join(' | ');

    return {
      label: `$(file) ${result.name}`,
      description: `#${result.number}`,
      detail: detail,
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('clippy'),
          tooltip: 'Copy Name'
        }
      ]
    };
  });

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.placeholder = `Found ${results.length} lure(s) matching "${searchTerm}"`;
  quickPick.title = 'Lure Search Results';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Handle button clicks
  quickPick.onDidTriggerItemButton(async (e) => {
    const item = e.item;
    const lureName = item.label.replace('$(file) ', '');
    if (lureName) {
      await vscode.env.clipboard.writeText(lureName);
      vscode.window.showInformationMessage(`Copied: ${lureName}`);
    }
  });

  // Handle selection
  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    if (selected) {
      const lureName = selected.label.replace('$(file) ', '');
      const lureResult = results.find((r: LureData) => r.name === lureName);
      if (lureResult) {
        showLureDetails(lureResult);
      }
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

function showLureDetails(lure: LureData) {
  const panel = vscode.window.createWebviewPanel(
    'lureDetails',
    `Lure: ${lure.name}`,
    vscode.ViewColumn.Beside,
    {}
  );

  panel.webview.html = getLureDetailsHtml(lure);
}

function getLureDetailsHtml(lure: LureData): string {
  // Build a map of colorId to pre1925code for quick lookup
  const pre1925Map = new Map<string, number>();
  if (lure.pre1925codes) {
    for (const item of lure.pre1925codes) {
      for (const [colorId, code] of Object.entries(item)) {
        pre1925Map.set(colorId, code as number);
      }
    }
  }

  const colorsText = lure.colors && lure.colors.length > 0
    ? `<p><strong>Available Colors (${lure.colors.length}):</strong></p><ul>${lure.colors.map(c => {
        const info = getColorInfo(c);
        const pre1925Code = pre1925Map.get(c);
        
        // Calculate lure code if companyId is numeric
        let lureCode = '';
        if (info.companyId && /^\d+$/.test(info.companyId)) {
          const baseNumber = Math.floor(Number(lure.number) / 100) * 100;
          const calculatedCode = baseNumber + Number(info.companyId);
          lureCode = ` <span style="color: var(--vscode-descriptionForeground);">[Lure Code: ${calculatedCode}]</span>`;
        }
        
        const pre1925Str = pre1925Code !== undefined
          ? ` <span style="color: var(--vscode-descriptionForeground);">(pre-1925: ${pre1925Code})</span>`
          : '';
        return `<li><code>${c}</code> - ${info.name}${lureCode}${pre1925Str}</li>`;
      }).join('')}</ul>`
    : '<p><em>No colors specified</em></p>';

  const rareColorsText = lure.rare_colors && lure.rare_colors.length > 0
    ? `<p><strong>Rare Colors:</strong></p><ul>${lure.rare_colors.map(c => {
        const info = getColorInfo(c);
        const pre1925Code = pre1925Map.get(c);
        
        // Calculate lure code if companyId is numeric
        let lureCode = '';
        if (info.companyId && /^\d+$/.test(info.companyId)) {
          const baseNumber = Math.floor(Number(lure.number) / 100) * 100;
          const calculatedCode = baseNumber + Number(info.companyId);
          lureCode = ` <span style="color: var(--vscode-descriptionForeground);">[Lure Code: ${calculatedCode}]</span>`;
        }
        
        const pre1925Str = pre1925Code !== undefined
          ? ` <span style="color: var(--vscode-descriptionForeground);">(pre-1925: ${pre1925Code})</span>`
          : '';
        return `<li><code>${c}</code> - ${info.name}${lureCode}${pre1925Str}</li>`;
      }).join('')}</ul>`
    : '';

  const notesText = lure.notes
    ? `<div class="info-section"><h2>Notes</h2><p>${lure.notes}</p></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${lure.name}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1 {
      color: var(--vscode-editor-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .info-section {
      margin: 20px 0;
      padding: 15px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }
    .number-badge {
      display: inline-block;
      background-color: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 4px 8px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
    code {
      background-color: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    li {
      padding: 4px 0;
    }
    strong {
      color: var(--vscode-textLink-foreground);
    }
  </style>
</head>
<body>
  <h1>${lure.name}</h1>
  
  <div class="info-section">
    <p><strong>Number:</strong> <span class="number-badge">${lure.number}</span></p>
    <p><strong>Manufacturer:</strong> ${lure.manufacturerName}</p>
    ${lure.yearIntroduced ? `<p><strong>Year Introduced:</strong> ${lure.yearIntroduced}</p>` : ''}
    ${lure.yearLastMfg ? `<p><strong>Last Manufactured:</strong> ${lure.yearLastMfg}</p>` : ''}
  </div>

  <div class="info-section">
    <h2>Colors</h2>
    ${colorsText}
    ${rareColorsText}
  </div>

  ${notesText}
</body>
</html>`;
}
