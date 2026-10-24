# Contributing to Confitext

Thank you for your interest in contributing to **Confitext**!  
Confitext is maintained by **YABP (Yet Another Boring Project)**.

---

## 1. Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+)
- `npm`

### Setup Instructions
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/dheeraz101/Confitext.git
   cd Confitext
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start live development watch mode:
   ```bash
   npm run dev
   ```
   This compiles `main.js` automatically whenever you edit files in `src/`.

---

## 2. Testing & Quality Standards

Before submitting any Pull Request:

1. **Strict Typecheck:**
   ```bash
   npm run typecheck
   ```
   Must pass with 0 errors.

2. **Automated Vitest Suite:**
   ```bash
   npm test
   ```
   All 159 tests must pass. When adding new features, include corresponding unit and integration tests in `tests/`.

3. **Production Bundle Verification:**
   ```bash
   npm run build
   ```

---

## 3. CodeMirror 6 Architecture Guidelines

To keep the writing experience smooth, reliable, and non-destructive:

- **Zero Text Mutation:** Never mutate note text in `update.state.doc` to achieve masking. All masking must use non-destructive `Decoration.replace` with `WidgetType`.
- **Viewport Line Expansion:** When tokenizing `view.visibleRanges`, always expand bounds backward to `lastIndexOf('\n')` and forward to `indexOf('\n')` to prevent truncating words on scroll.
- **Strict Monotonicity:** Always sort and pre-merge overlapping ranges before feeding them into `RangeSetBuilder`.
- **Animation Mapping:** Map active animation ranges through `update.changes.mapPos()` in `update.docChanged` so in-flight animations survive live typing.
- **Multi-Pane LRU Caches:** Never use module-level single variables for token caches; always use bounded LRU maps keyed by document text or file path.

---

## 4. Community Plugin Release Workflow

Releases are automated via GitHub Actions:
1. Bump version in `package.json`, `manifest.json`, and `versions.json`.
2. Commit with message: `Release x.y.z`.
3. Create and push Git tag:
   ```bash
   git tag x.y.z
   git push origin x.y.z
   ```
4. GitHub Actions will automatically bundle `main.js`, `manifest.json`, and `styles.css`, and create a release package.
