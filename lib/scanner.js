'use strict';

/**
 * TODO Extract — Scanner
 * 
 * Finds TODO, FIXME, HACK, XXX, and other annotation comments in source code.
 * Designed to be fast, accurate, and multi-language.
 * 
 * Tag detection supports:
 * - Standard: // TODO: fix this
 * - With author: // TODO(john): fix this
 * - Multi-line: /* TODO: this is a\n   multi-line comment *\/
 * - Hash comments: # TODO: fix this
 * - Different positions: end-of-line, own-line, block
 */

const DEFAULT_TAGS = ['TODO', 'FIXME', 'HACK', 'XXX', 'BUG', 'NOTE', 'OPTIMIZE', 'REVIEW'];
const DEFAULT_EXCLUDE_DIRS = [
  'node_modules', '.git', 'vendor', 'dist', 'build', '.next', '.nuxt',
  'target', '__pycache__', '.venv', 'venv', 'env', '.env',
  'coverage', '.cache', '.turbo', '.svelte-kit',
];

// File extensions worth scanning (exclude binary/data/markup)
const SCANNABLE_EXTENSIONS = [
  '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.jsx', '.tsx',
  '.py', '.java', '.kt', '.scala', '.rb', '.rs', '.go', '.sh', '.bash',
  '.c', '.cpp', '.cc', '.h', '.hpp', '.cs', '.php', '.swift',
  '.sql', '.lua', '.pl', '.r', '.dart', '.vue', '.svelte',
  '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.html', '.htm', '.css', '.scss', '.less',
  '.md', '.txt',
];

/**
 * Build a regex to find annotation tags in source code.
 * Matches: TAG, TAG:, TAG(name), TAG(name):, TAG: text, TAG text
 * @param {string[]} tags - Tags to search for (e.g. ['TODO', 'FIXME'])
 * @param {boolean} includeAuthor - Whether to capture author in parentheses
 * @returns {RegExp} Compiled regex
 */
function buildTagRegex(tags, includeAuthor) {
  // Escape tags for regex safety
  const escapedTags = tags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const tagPattern = escapedTags.join('|');
  
  // Match the tag, optional author in parens, optional colon, then the message
  // Group 1: tag name
  // Group 2: author (only if wrapped in parens: TODO(name))
  // Group 3: message text
  // Author group uses (?:...) non-capturing outer with optional \s* so it
  // cleanly matches both "TODO: msg" and "TODO(name): msg"
  const authorPart = includeAuthor
    ? '(?:\\s*\\(([^)]+)\\))?'   // Optional (author) — whole group is optional
    : '';
  
  return new RegExp(
    '\\b(' + tagPattern + ')' +    // Tag name (group 1)
    authorPart +                    // Optional (author) (group 2 if included)
    '\\s*:?\\s*' +                  // Optional colon + whitespace
    '(.+)',                         // Message (last group)
    'i'                             // Case-insensitive
  );
}

/**
 * Scan a single line for annotation tags.
 * @param {string} line - Source code line
 * @param {RegExp} regex - Compiled tag regex
 * @param {boolean} hasAuthorGroup - Whether the regex includes the author capture group
 * @returns {Object|null} { tag, author, message } or null
 */
function scanLine(line, regex, hasAuthorGroup) {
  const match = regex.exec(line);
  if (!match) return null;

  const tag = match[1].toUpperCase();
  let author = null;
  let message = '';

  if (hasAuthorGroup) {
    author = match[2] ? match[2].trim() : null;
    message = match[3] ? match[3].trim() : '';
  } else {
    message = match[2] ? match[2].trim() : '';
  }

  return { tag, author, message };
}

/**
 * Scan full content for all annotations.
 * @param {string} content - Full source code
 * @param {string[]} tags - Tags to search for
 * @param {boolean} includeAuthor - Parse author from comments
 * @returns {Array} Array of { line, tag, author, message, fullLine }
 */
function scanContent(content, tags, includeAuthor) {
  const hasAuthor = includeAuthor !== false;
  const regex = buildTagRegex(tags || DEFAULT_TAGS, hasAuthor);
  const results = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const found = scanLine(lines[i], regex, hasAuthor);
    if (found) {
      results.push({
        line: i + 1,
        tag: found.tag,
        author: found.author,
        message: found.message,
        fullLine: lines[i].trim(),
      });
    }
  }

  return results;
}

/**
 * Group annotations by tag for summary display.
 * @param {Array} annotations - Array of annotation objects
 * @returns {Object} Map of tag -> count
 */
function groupByTag(annotations) {
  const groups = {};
  for (const a of annotations) {
    groups[a.tag] = (groups[a.tag] || 0) + 1;
  }
  return groups;
}

/**
 * Group annotations by author.
 * @param {Array} annotations - Array of annotation objects
 * @returns {Object} Map of author -> count (null author = 'unassigned')
 */
function groupByAuthor(annotations) {
  const groups = {};
  for (const a of annotations) {
    const key = a.author || 'unassigned';
    groups[key] = (groups[key] || 0) + 1;
  }
  return groups;
}

/**
 * Generate a Markdown report from annotations.
 * @param {Array} annotations - Array of { file, line, tag, author, message }
 * @param {Object} fileMap - Map of filePath -> relativePath
 * @returns {string} Markdown report
 */
function toMarkdown(annotations) {
  if (annotations.length === 0) {
    return '# TODO Extract Report\n\nNo annotations found. 🎉\n';
  }

  const byTag = groupByTag(annotations);
  const lines = [
    '# TODO Extract Report',
    '',
    `**Total annotations:** ${annotations.length}`,
    '',
    '## Summary by Tag',
    '',
    '| Tag | Count |',
    '|-----|-------|',
  ];

  for (const [tag, count] of Object.entries(byTag).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${tag} | ${count} |`);
  }

  lines.push('', '## Details', '');

  // Group by file
  const byFile = {};
  for (const a of annotations) {
    if (!byFile[a.file]) byFile[a.file] = [];
    byFile[a.file].push(a);
  }

  for (const [file, items] of Object.entries(byFile).sort()) {
    lines.push(`### ${file}`, '');
    for (const a of items) {
      const authorStr = a.author ? ` @${a.author}` : '';
      lines.push(`- **${a.tag}** (L${a.line})${authorStr}: ${a.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a JSON report from annotations.
 * @param {Array} annotations - Array of annotation objects
 * @returns {string} JSON string
 */
function toJSON(annotations) {
  const report = {
    generatedAt: new Date().toISOString(),
    total: annotations.length,
    summary: groupByTag(annotations),
    annotations: annotations.map(a => ({
      file: a.file,
      line: a.line,
      tag: a.tag,
      author: a.author,
      message: a.message,
    })),
  };
  return JSON.stringify(report, null, 2);
}

/**
 * Check if a file should be scanned.
 * @param {string} fileName
 * @returns {boolean}
 */
function shouldScanFile(fileName) {
  // Skip minified and lock files
  if (fileName.includes('.min.') || fileName.endsWith('-lock.json') || fileName.endsWith('lock')) {
    return false;
  }
  for (const ext of SCANNABLE_EXTENSIONS) {
    if (fileName.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Check if a directory should be excluded.
 * @param {string} dirName
 * @param {string[]} excludeDirs
 * @returns {boolean}
 */
function shouldExcludeDir(dirName, excludeDirs) {
  if (dirName.startsWith('.')) return true;
  return (excludeDirs || DEFAULT_EXCLUDE_DIRS).includes(dirName);
}

module.exports = {
  buildTagRegex,
  scanLine,
  scanContent,
  groupByTag,
  groupByAuthor,
  toMarkdown,
  toJSON,
  shouldScanFile,
  shouldExcludeDir,
  DEFAULT_TAGS,
  SCANNABLE_EXTENSIONS,
  DEFAULT_EXCLUDE_DIRS,
};
