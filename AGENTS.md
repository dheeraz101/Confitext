# CodeMirror 6 & Obsidian Plugin Engineering Guidelines

## 1. Viewport Range Slicing & Word Tokenization
- CodeMirror 6's `view.visibleRanges` can begin or end mid-word or mid-line during scrolling.
- Never perform a naive `slice(range.from, range.to)` when tokenizing words or syntax structures.
- Always expand range bounds backward to the start of the line (`lastIndexOf('\n', rangeFrom - 1) + 1`) and forward to the next newline (`indexOf('\n', rangeTo)`). This prevents truncated word tokens, character-length mismatches, broken line prefixes, and layout shift glitches.

## 2. Strictly Monotonic Decorations & Range Pre-Merging
- `RangeSetBuilder` in CodeMirror 6 requires strictly monotonic start offsets (`token.from >= lastTo`) and cannot accept overlapping ranges.
- When editor folds or overlapping viewport ranges are active, pre-merge contiguous or intersecting visible ranges before constructing decorations.

## 3. Live Animation Position Mapping
- In-flight animations (e.g. scrambling glyphs, fade transitions) must survive document edits made earlier in the document.
- Listen for `update.docChanged` in `ViewPlugin.update()` and map active animation ranges through `update.changes.mapPos(pos)`.

## 4. Nested Scroll Capture for Inactivity & Idle Timers
- Standard `window.addEventListener('scroll', ...)` fails to detect scrolling inside CodeMirror 6's `.cm-scroller` because the DOM `scroll` event does not bubble (`bubbles: false`).
- Always register scroll listeners with `{ capture: true }` and include `wheel`, `pointerdown`, and `pointermove` to reliably capture reading and scrolling activity inside nested panes.

## 5. Multi-Pane Split View Cache Isolation
- In Obsidian, users frequently open multiple notes in split panes.
- Never use single module-level variables (e.g. `cachedDocText`, `cachedRanges`) for document-level syntax or token caches.
- Use bounded LRU maps keyed by document text or file path to avoid 100% cache thrashing between concurrent editor panes.

## 6. Robust YAML Frontmatter Matching
- Notes may contain UTF-8 Byte Order Marks (`\uFEFF`), leading indentation, trailing spaces, inline comments, or alternative YAML closing tags (`...` as well as `---`).
- Ensure frontmatter detection handles both boolean strings (`false`, `off`, `no`, `disabled`, `none`) and raw booleans, strips BOM, and tolerates whitespace.

## 7. Obsidian Community Review & UI Guidelines
- **Heading Standardization**: Never create HTML heading elements (`h1`–`h6`) directly in settings or UI panes. Always use `new Setting(containerEl).setName('...').setHeading()`.
- **Command Naming**: Never prefix command names with the plugin name in `addCommand({ name: '...' })`. The plugin name is prepended automatically by Obsidian in the command palette UI.
- **Void Event Listeners**: Never return a Promise in standard DOM event listeners (e.g. `addEventListener('click', async () => ...)`). Always wrap async logic in `() => { void (async () => { ... })(); }`.
- **Zero `!important` in CSS**: Avoid `!important` in plugin stylesheets; override styles by increasing selector specificity (e.g. `.cm-editor .confitext-glyph`) or CSS variables.
- **Native DOM Helpers**: Always use Obsidian's `createEl`, `createSpan`, `createDiv`, and `createFragment` helpers instead of native `document.createElement`.

