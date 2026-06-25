'use strict';

/**
 * TODO Extract — VS Code Extension
 * 
 * Scans workspace for TODO/FIXME/HACK/XXX comments and exports reports.
 */

const vscode = require('vscode');
const path = require('path');
const scanner = require('./lib/scanner');

const OUTPUT_CHANNEL = vscode.window.createOutputChannel('TODO Extract');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(OUTPUT_CHANNEL);

  // --- Command: Scan Workspace ---
  const scanCmd = vscode.commands.registerCommand('todoextract.scan', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showWarningMessage('TODO Extract: Open a workspace folder first.');
      return;
    }

    const config = vscode.workspace.getConfiguration('todoextract');
    const tags = config.get('tags') || scanner.DEFAULT_TAGS;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'TODO Extract: Scanning workspace...',
      cancellable: false,
    }, async (progress) => {
      try {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const annotations = await scanWorkspace(rootPath, tags, progress);

        if (annotations.length === 0) {
          vscode.window.showInformationMessage('TODO Extract: No annotations found. Clean codebase!');
          return;
        }

        const byTag = scanner.groupByTag(annotations);
        OUTPUT_CHANNEL.clear();
        OUTPUT_CHANNEL.appendLine('=== TODO Extract: Scan Results ===\n');
        OUTPUT_CHANNEL.appendLine(`Total: ${annotations.length} annotations\n`);
        OUTPUT_CHANNEL.appendLine('By tag:');
        for (const [tag, count] of Object.entries(byTag).sort((a, b) => b[1] - a[1])) {
          OUTPUT_CHANNEL.appendLine(`  ${tag}: ${count}`);
        }
        OUTPUT_CHANNEL.appendLine('');

        // Group by file
        const byFile = {};
        for (const a of annotations) {
          if (!byFile[a.file]) byFile[a.file] = [];
          byFile[a.file].push(a);
        }

        for (const [file, items] of Object.entries(byFile).sort()) {
          OUTPUT_CHANNEL.appendLine(`\n${file}:`);
          for (const a of items) {
            const authorStr = a.author ? ` @${a.author}` : '';
            OUTPUT_CHANNEL.appendLine(`  L${a.line} [${a.tag}]${authorStr}: ${a.message}`);
          }
        }

        OUTPUT_CHANNEL.show();
        vscode.window.showInformationMessage(
          `TODO Extract: Found ${annotations.length} annotations in ${Object.keys(byFile).length} files.`
        );
      } catch (err) {
        vscode.window.showErrorMessage(`TODO Extract: Error — ${err.message}`);
      }
    });
  });

  // --- Command: Scan Current File ---
  const scanFileCmd = vscode.commands.registerCommand('todoextract.scanFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('TODO Extract: No active file.');
      return;
    }

    const config = vscode.workspace.getConfiguration('todoextract');
    const tags = config.get('tags') || scanner.DEFAULT_TAGS;
    const includeAuthor = config.get('includeAuthor') !== false;

    const content = editor.document.getText();
    const fileName = path.basename(editor.document.fileName);
    const annotations = scanner.scanContent(content, tags, includeAuthor);

    if (annotations.length === 0) {
      vscode.window.showInformationMessage(`TODO Extract: No annotations in ${fileName}.`);
      return;
    }

    OUTPUT_CHANNEL.clear();
    OUTPUT_CHANNEL.appendLine(`=== TODO Extract: ${fileName} ===\n`);
    OUTPUT_CHANNEL.appendLine(`${annotations.length} annotation${annotations.length === 1 ? '' : 's'}:\n`);
    for (const a of annotations) {
      const authorStr = a.author ? ` @${a.author}` : '';
      OUTPUT_CHANNEL.appendLine(`  L${a.line} [${a.tag}]${authorStr}: ${a.message}`);
    }
    OUTPUT_CHANNEL.show();

    vscode.window.showInformationMessage(
      `TODO Extract: Found ${annotations.length} annotation${annotations.length === 1 ? '' : 's'} in ${fileName}.`
    );
  });

  // --- Command: Export as Markdown ---
  const exportMdCmd = vscode.commands.registerCommand('todoextract.exportMarkdown', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const config = vscode.workspace.getConfiguration('todoextract');
    const tags = config.get('tags') || scanner.DEFAULT_TAGS;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'TODO Extract: Generating Markdown report...',
      cancellable: false,
    }, async () => {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const annotations = await scanWorkspace(rootPath, tags);

      const markdown = scanner.toMarkdown(annotations);
      const doc = await vscode.workspace.openTextDocument({
        content: markdown,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);

      vscode.window.showInformationMessage(
        `TODO Extract: Markdown report generated (${annotations.length} annotations).`
      );
    });
  });

  // --- Command: Export as JSON ---
  const exportJsonCmd = vscode.commands.registerCommand('todoextract.exportJSON', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const config = vscode.workspace.getConfiguration('todoextract');
    const tags = config.get('tags') || scanner.DEFAULT_TAGS;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'TODO Extract: Generating JSON report...',
      cancellable: false,
    }, async () => {
      const rootPath = workspaceFolders[0].uri.fsPath;
      const annotations = await scanWorkspace(rootPath, tags);

      const json = scanner.toJSON(annotations);
      const doc = await vscode.workspace.openTextDocument({
        content: json,
        language: 'json',
      });
      await vscode.window.showTextDocument(doc);

      vscode.window.showInformationMessage(
        `TODO Extract: JSON report generated (${annotations.length} annotations).`
      );
    });
  });

  context.subscriptions.push(scanCmd, scanFileCmd, exportMdCmd, exportJsonCmd);
}

/**
 * Scan the entire workspace for annotations.
 */
async function scanWorkspace(rootPath, tags, progress) {
  const results = [];
  const config = vscode.workspace.getConfiguration('todoextract');
  const excludeDirs = config.get('excludeDirs') || scanner.DEFAULT_EXCLUDE_DIRS;
  const includeAuthor = config.get('includeAuthor') !== false;

  const files = await vscode.workspace.findFiles(
    '**/*',
    `{${excludeDirs.map(d => `**/${d}/**`).join(',')}}`
  );

  const scannableFiles = files.filter(f => scanner.shouldScanFile(f.fsPath));
  let scanned = 0;

  for (const fileUri of scannableFiles) {
    if (progress) {
      progress.report({ message: `Scanning ${++scanned}/${scannableFiles.length}` });
    }

    try {
      const doc = await vscode.workspace.openTextDocument(fileUri);
      const content = doc.getText();
      const relativePath = path.relative(rootPath, fileUri.fsPath);
      const found = scanner.scanContent(content, tags, includeAuthor);

      for (const a of found) {
        results.push({
          ...a,
          file: relativePath,
        });
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  return results;
}

function deactivate() {}

module.exports = { activate, deactivate };
