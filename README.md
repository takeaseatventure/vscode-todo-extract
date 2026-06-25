# 📝 TODO Extract

### Find every TODO, FIXME, and HACK — then export, assign, and track your technical debt.


**TODO Extract** scans your entire codebase, finds every code annotation, and gives you clean, exportable reports. Track technical debt across 20+ file types with author detection, custom tags, and team-ready exports.

> ⚡ **Zero runtime dependencies. Privacy-first — all scanning is local.**

---

## ✨ Features

- ✅ **Full Workspace Scan** — Finds all annotations across 20+ file types (JS, TS, Python, Go, Rust, Java, C/C++, Ruby, PHP, and more)
- ✅ **Current File Scan** — Instantly check the active file for all TODO/FIXME/HACK comments
- ✅ **Markdown Export** — Beautiful reports with summary tables, grouped by file, with author tags — perfect for PRs and sprint planning
- ✅ **JSON Export** — Machine-readable output for CI/CD pipelines, dashboards, and custom tooling
- ✅ **Author Detection** — Automatically parses `TODO(name)` syntax to assign ownership
- ✅ **8 Configurable Tags** — TODO, FIXME, HACK, XXX, BUG, NOTE, OPTIMIZE, REVIEW — add your own

---

## 📸 Screenshots

![Workspace Scan Results](images/scan.png)

![Markdown Export](images/markdown.png)

![Author Detection](images/authors.png)

---

## 📥 Installation

1. Open **VS Code**
2. Go to the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **TODO Extract**
4. Click **Install**

Or install from the command line:

```bash
code --install-extension devforge.todo-extract
```

---

## 🚀 Usage

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

| Command | Shortcut | Description |
|---------|----------|-------------|
| **TODO Extract: Scan Workspace** | `Ctrl+Alt+T` / `Cmd+Alt+T` | Scan your entire codebase for all annotations |
| **TODO Extract: Scan Current File** | `Ctrl+Alt+F` / `Cmd+Alt+F` | Quick-scan the active file |
| **TODO Extract: Export as Markdown** | `Ctrl+Alt+M` / `Cmd+Alt+M` | Generate a shareable Markdown report |
| **TODO Extract: Export as JSON** | `Ctrl+Alt+J` / `Cmd+Alt+J` | Export machine-readable JSON |

---

## 🏷️ Supported Tags

| Tag | Meaning |
|-----|---------|
| `TODO` | Something that needs to be done |
| `FIXME` | Something is broken and needs fixing |
| `HACK` | A workaround that should be cleaned up |
| `XXX` | Warning — needs attention |
| `BUG` | Known bug |
| `NOTE` | Important note for maintainers |
| `OPTIMIZE` | Performance improvement opportunity |
| `REVIEW` | Needs code review |

*All tags are fully configurable in settings — add your own!*

---

## 👤 Author Detection

Automatically parses author from standard comment syntax:

```javascript
// TODO(john): refactor authentication flow
// FIXME(sarah): memory leak in event handler
// HACK: temporary fix until v2  ← no author, marked "unassigned"
```

---

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `todoextract.tags` | `["TODO", "FIXME", "HACK", "XXX", "BUG", "NOTE", "OPTIMIZE", "REVIEW"]` | Comment tags to search for |
| `todoextract.excludeDirs` | `["node_modules", ".git", "vendor", ...]` | Directories to exclude from scanning |
| `todoextract.excludeGlobs` | `["**/*.min.js", "**/package-lock.json", ...]` | Glob patterns for files to exclude |
| `todoextract.includeAuthor` | `true` | Parse and display author from `TODO(name)` syntax |

---

## 🎯 What Makes This Different?

Most TODO scanners just show a panel. **TODO Extract is built for teams that need reports:**

- 📤 **Export-focused** — Markdown and JSON outputs for PRs, standups, sprint planning, and CI/CD
- 👥 **Author tracking** — Know exactly who owns each piece of debt
- ⚙️ **Deeply configurable** — Custom tags, exclusion patterns, author parsing
- 🔒 **Privacy-first** — All scanning is local. Nothing leaves your machine
- 🌐 **Multi-language** — Works across your entire polyglot codebase
- ⚡ **Zero dependencies** — Pure JavaScript, no npm bloat

---

## 💎 Pro Features

Upgrade to **Pro** for advanced technical debt management:

- 📊 **Debt dashboard** — Interactive panel with charts showing debt trends over time
- 🔁 **Sprint tracking** — Compare debt between commits, branches, or tags to measure progress
- 🏷️ **Priority levels** — Assign severity (critical, high, medium, low) to each annotation
- 🔗 **Issue tracker sync** — Push TODOs directly to GitHub Issues, Jira, or Linear
- ⏰ **Stale detection** — Highlight annotations older than 30/60/90 days with git blame dates
- 📤 **CSV export** — Spreadsheet-ready output for reporting and stakeholders

**Upgrade to Pro for the debt dashboard, sprint tracking, priority levels, issue-tracker sync, and CSV export — $4/month (or $12/month for teams). Visit [https://devforge.dev](https://devforge.dev) to get your license key.**

---

## 📄 License

MIT — free for personal and commercial use.

---

**Built by [DevForge](https://devforge.dev)** — developer tools that solve real daily pain.
