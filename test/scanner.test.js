'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const scanner = require('../lib/scanner');

// --- scanLine / scanContent ---

test('scanContent finds basic TODO', () => {
  const content = '// TODO: fix this later';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].tag, 'TODO');
  assert.ok(results[0].message.includes('fix this later'));
});

test('scanContent finds FIXME', () => {
  const content = '// FIXME: this is broken';
  const results = scanner.scanContent(content, ['FIXME']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].tag, 'FIXME');
});

test('scanContent finds HACK', () => {
  const content = '// HACK: temporary workaround';
  const results = scanner.scanContent(content, ['HACK']);
  assert.strictEqual(results[0].tag, 'HACK');
});

test('scanContent finds XXX', () => {
  const content = '// XXX: needs review';
  const results = scanner.scanContent(content, ['XXX']);
  assert.strictEqual(results[0].tag, 'XXX');
});

test('scanContent finds multiple tags', () => {
  const content = `
    // TODO: first item
    // FIXME: second item
    // HACK: third item
  `;
  const results = scanner.scanContent(content, ['TODO', 'FIXME', 'HACK']);
  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].tag, 'TODO');
  assert.strictEqual(results[1].tag, 'FIXME');
  assert.strictEqual(results[2].tag, 'HACK');
});

test('scanContent finds TODO with author', () => {
  const content = '// TODO(john): refactor this function';
  const results = scanner.scanContent(content, ['TODO'], true);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].author, 'john');
});

test('scanContent finds TODO without colon', () => {
  const content = '// TODO fix this thing';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
  assert.ok(results[0].message.length > 0);
});

test('scanContent handles hash comments', () => {
  const content = '# TODO: python style comment';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].tag, 'TODO');
});

test('scanContent handles block comments', () => {
  const content = '/* TODO: block comment style */';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
});

test('scanContent captures line numbers correctly', () => {
  const content = 'line1\nline2\n// TODO: on line 3\nline4';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results[0].line, 3);
});

test('scanContent handles end-of-line TODO', () => {
  const content = 'const x = 1; // TODO: remove this';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
});

test('scanContent is case insensitive', () => {
  const content = '// todo: lowercase tag';
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].tag, 'TODO');
});

test('scanContent handles empty content', () => {
  assert.deepStrictEqual(scanner.scanContent('', ['TODO']), []);
});

test('scanContent returns empty when no tags found', () => {
  const content = '// just a regular comment';
  assert.deepStrictEqual(scanner.scanContent(content, ['TODO']), []);
});

test('scanContent handles multiple TODOs per file', () => {
  const content = `
    // TODO: first
    // TODO: second
    // TODO: third
  `;
  const results = scanner.scanContent(content, ['TODO']);
  assert.strictEqual(results.length, 3);
});

test('scanContent captures fullLine', () => {
  const content = '  // TODO: indented comment  ';
  const results = scanner.scanContent(content, ['TODO']);
  assert.ok(results[0].fullLine.includes('TODO'));
});

// --- groupByTag ---

test('groupByTag counts tags correctly', () => {
  const annotations = [
    { tag: 'TODO' }, { tag: 'TODO' }, { tag: 'FIXME' },
    { tag: 'HACK' }, { tag: 'TODO' },
  ];
  const grouped = scanner.groupByTag(annotations);
  assert.strictEqual(grouped['TODO'], 3);
  assert.strictEqual(grouped['FIXME'], 1);
  assert.strictEqual(grouped['HACK'], 1);
});

test('groupByTag handles empty array', () => {
  assert.deepStrictEqual(scanner.groupByTag([]), {});
});

// --- groupByAuthor ---

test('groupByAuthor groups correctly', () => {
  const annotations = [
    { tag: 'TODO', author: 'john' },
    { tag: 'TODO', author: 'jane' },
    { tag: 'TODO', author: 'john' },
    { tag: 'TODO', author: null },
  ];
  const grouped = scanner.groupByAuthor(annotations);
  assert.strictEqual(grouped['john'], 2);
  assert.strictEqual(grouped['jane'], 1);
  assert.strictEqual(grouped['unassigned'], 1);
});

test('groupByAuthor handles all unassigned', () => {
  const annotations = [{ tag: 'TODO', author: null }, { tag: 'FIXME', author: null }];
  const grouped = scanner.groupByAuthor(annotations);
  assert.strictEqual(grouped['unassigned'], 2);
});

// --- toMarkdown ---

test('toMarkdown generates header', () => {
  const md = scanner.toMarkdown([]);
  assert.ok(md.includes('# TODO Extract Report'));
});

test('toMarkdown includes summary table', () => {
  const annotations = [
    { file: 'app.js', line: 1, tag: 'TODO', author: null, message: 'test' },
  ];
  const md = scanner.toMarkdown(annotations);
  assert.ok(md.includes('Summary by Tag'));
  assert.ok(md.includes('| TODO |'));
});

test('toMarkdown groups by file', () => {
  const annotations = [
    { file: 'src/app.js', line: 10, tag: 'TODO', author: 'john', message: 'fix' },
    { file: 'src/app.js', line: 20, tag: 'FIXME', author: null, message: 'broken' },
    { file: 'src/util.js', line: 5, tag: 'HACK', author: null, message: 'temp' },
  ];
  const md = scanner.toMarkdown(annotations);
  assert.ok(md.includes('### src/app.js'));
  assert.ok(md.includes('### src/util.js'));
  assert.ok(md.includes('@john'));
});

test('toMarkdown handles empty annotations', () => {
  const md = scanner.toMarkdown([]);
  assert.ok(md.includes('No annotations found'));
});

// --- toJSON ---

test('toJSON produces valid JSON', () => {
  const annotations = [
    { file: 'app.js', line: 1, tag: 'TODO', author: null, message: 'test' },
  ];
  const json = scanner.toJSON(annotations);
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.total, 1);
  assert.strictEqual(parsed.annotations[0].tag, 'TODO');
  assert.ok(parsed.generatedAt);
});

test('toJSON includes summary', () => {
  const annotations = [
    { file: 'a.js', line: 1, tag: 'TODO', author: null, message: 'x' },
    { file: 'b.js', line: 2, tag: 'TODO', author: null, message: 'y' },
    { file: 'c.js', line: 3, tag: 'FIXME', author: null, message: 'z' },
  ];
  const json = scanner.toJSON(annotations);
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.summary['TODO'], 2);
  assert.strictEqual(parsed.summary['FIXME'], 1);
});

test('toJSON handles empty annotations', () => {
  const json = scanner.toJSON([]);
  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.total, 0);
});

// --- shouldScanFile ---

test('shouldScanFile accepts source files', () => {
  assert.strictEqual(scanner.shouldScanFile('app.js'), true);
  assert.strictEqual(scanner.shouldScanFile('main.py'), true);
  assert.strictEqual(scanner.shouldScanFile('index.ts'), true);
  assert.strictEqual(scanner.shouldScanFile('server.go'), true);
});

test('shouldScanFile rejects minified files', () => {
  assert.strictEqual(scanner.shouldScanFile('app.min.js'), false);
  assert.strictEqual(scanner.shouldScanFile('vendor.min.css'), false);
});

test('shouldScanFile rejects lock files', () => {
  assert.strictEqual(scanner.shouldScanFile('package-lock.json'), false);
  assert.strictEqual(scanner.shouldScanFile('yarn.lock'), false);
});

test('shouldScanFile rejects binary files', () => {
  assert.strictEqual(scanner.shouldScanFile('logo.png'), false);
  assert.strictEqual(scanner.shouldScanFile('data.bin'), false);
});

// --- shouldExcludeDir ---

test('shouldExcludeDir excludes known dirs', () => {
  assert.strictEqual(scanner.shouldExcludeDir('node_modules', ['node_modules']), true);
  assert.strictEqual(scanner.shouldExcludeDir('.git', []), true);
});

test('shouldExcludeDir allows source dirs', () => {
  assert.strictEqual(scanner.shouldExcludeDir('src', []), false);
  assert.strictEqual(scanner.shouldExcludeDir('components', []), false);
});

// --- buildTagRegex ---

test('buildTagRegex creates valid regex', () => {
  const re = scanner.buildTagRegex(['TODO', 'FIXME'], true);
  assert.ok(re instanceof RegExp);
  assert.ok(re.test('// TODO: test'));
  assert.ok(re.test('// FIXME: test'));
});

test('buildTagRegex is case insensitive', () => {
  const re = scanner.buildTagRegex(['TODO']);
  assert.ok(re.test('// todo: test'));
  assert.ok(re.test('// Todo: test'));
});

// --- DEFAULT_TAGS ---

test('DEFAULT_TAGS includes common tags', () => {
  assert.ok(scanner.DEFAULT_TAGS.includes('TODO'));
  assert.ok(scanner.DEFAULT_TAGS.includes('FIXME'));
  assert.ok(scanner.DEFAULT_TAGS.includes('HACK'));
  assert.ok(scanner.DEFAULT_TAGS.includes('XXX'));
});
