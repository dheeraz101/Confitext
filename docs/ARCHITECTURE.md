# Confitext: Architecture & Technical Design

## 1. Executive Summary

**Confitext** is a Matrix-inspired visual privacy plugin for Obsidian. It provides a visual presentation masking layer designed to deter shoulder-surfing while preserving 100% of the underlying Markdown document, selection ergonomics, undo/redo history, and native typing performance.

---

## 2. Core Architectural Principles

1. **Zero Text Mutation:**
   Under no circumstances does Confitext mutate the underlying Markdown text in the file. The original characters remain in the note document and are never substituted with random Unicode in storage.
2. **CodeMirror 6 Native Extensions:**
   Masking is achieved through CodeMirror 6 `Decoration.replace` replacement decorations containing atomic `WidgetType` DOM nodes.
3. **Decoupled View & State:**
   Editor state (`mode`, `settings`) is tracked per-editor via a `StateField` and updated transactionally through `StateEffect` dispatches.
4. **Deterministic Visual Stability:**
   Glyphs for words are generated through a 32-bit FNV-1a hash algorithm matching the word's character length. Identical words always yield identical glyph patterns, eliminating visual jitter and document reflow.
5. **Selection-First Revealing:**
   Any selection (mouse drag, keyboard `Shift+Arrow`, double-click) suppresses masking decorations for intersecting words, exposing the genuine underlying DOM text for readable inspection and native clipboard copying.

---

## 3. Subsystem Breakdown

### 3.1 Tokenizer (`src/tokenizer.ts`)
- **Word Identification:** Identifies Unicode words matching `[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*` to properly preserve contractions (`don't`) and compound words (`state-of-the-art`).
- **Markdown Preservation:**
  - Frontmatter (`--- ... ---`) is excluded from masking.
  - Fenced code blocks (```` ``` ```` and `~~~`) are preserved.
  - Inline code (`` `code` ``) is preserved.
  - Web URLs (`https://...`, `obsidian://...`) and Markdown link targets (`](...)`) remain visible.
  - Line syntax prefixes (headers `#`, lists `-`, blockquotes `>`, task checkboxes `[ ]`) remain untouched.
- **Composition Boundary Detection:** Evaluates whether a word is actively being composed at the cursor. If the caret is at the end of a word without a trailing delimiter (space/newline/punctuation), the word remains unmasked until completed.

### 3.2 Deterministic & Custom Glyphs (`src/glyphs.ts`)
- **Palettes:**
  - `matrix`: Matrix Code (`ⵙ Ϟ ⟁ Ж ᚷ ⌁ ░ ✦ ⵣ Ξ Ψ ⍜ ⍝ ⌖ ⌘ ⌬ ⏣ ⟐ ⟡ ⟢ ⟤ ⊞ ⊡ ∷ ᚙ ᚦ ᛟ ᛝ ᚹ ᛗ ᛚ`)
  - `runes`: Cyber Runes (`᚛ ᚜ ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚻ ᚾ ᛁ ᛃ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛟ ᛞ`)
  - `geometry`: Abstract Geometry (`⟁ ⟐ ⟡ ⟢ ⟤ ⌖ ⌬ ⏣ ⊞ ⊡ ∷ ◈ ◇ ◆ ◬ ◭ ◮ ☵ ☲ ☳ ☴ ☶ ☱ ☰ ☷`)
  - `blocks`: Digital Blocks (`░ ▒ ▓ █ ▀ ▄ ▌ ▐ ■ □ ▢ ▣ ▤ ▥ ▦ ▧ ▨ ▩`)
  - `braille`: Braille Script (`⠁ ⠃ ⠉ ⠙ ⠑ ⠋ ⠛ ⠓ ⠊ ⠚ ⠅ ⠇ ⠍ ⠝ ⠕ ⠏ ⠟ ⠗ ⠎ ⠞...`)
  - `morse`: Morse Code (`• − – · - / ⎻ ⎼ ⎽ ▪ ▫`)
  - `custom`: Arbitrary user-defined Unicode character sets.
- **Custom Glyph Importer & Validator:**
  - Validates character sets to ensure >= 2 unique, non-whitespace characters.
  - Automatically deduplicates and filters corrupt/lone UTF-16 surrogates and control characters.
  - Includes 9 quick presets: Braille, Morse, Cyber Runes, Geometry, Matrix, Blocks, Elvish/Tengwar, Klingon, and Alchemical symbols.
- **Hashing:** Fast 32-bit FNV-1a hashing ensures deterministic mapping with an LRU cache (`MAX_CACHE_SIZE = 5000`).
- **Length Invariance:** Output glyph strings match the exact character length of the source word, preventing layout shifts or line-wrapping jumps.

### 3.3 Exclusion Rules Engine (`src/rules.ts`)
- **Per-Note YAML Frontmatter:**
  - Detects `confitext: false` in document YAML frontmatter.
  - Supports booleans, strings (`'false'`, `"false"`), `off`, `no`, `0`, `disabled`, `none`, and inline comments.
  - Handles UTF-8 BOM (`\uFEFF`) and YAML closing ellipsis (`...`) terminators.
  - Memoized via `FILE_NOTE_CACHE` per file path so repeated typing in the note body bypasses YAML re-parsing completely in O(1).
- **Per-Folder Path Matching:**
  - Case-insensitive, slash-normalized path matching against user-specified excluded folders.
  - Matches folder prefixes, subfolders, and segments while preventing substring false positives (`Public` does not match `Publication`).
  - Memoized via `PATH_CACHE` and integrated into per-path note resolution.

### 3.4 Idle & Window Blur Manager (`src/idle.ts`)
- **Activity Tracking:**
  - Throttled (500ms) event listeners for `mousemove`, `mousedown`, `pointerdown`, `pointermove`, `keydown`, `touchstart`, `wheel`, and nested container `scroll` (using event capture phase).
  - Resets a configurable countdown timer (1 to 60 minutes).
- **Blur Auto-Masking:**
  - Automatically engages masking mode immediately when Obsidian loses OS window focus if enabled.
- **Zero-Leak Lifecycle:**
  - All window listeners and timeouts are explicitly removed upon disabling or plugin unload.

### 3.5 Animation Manager (`src/animation.ts`)
- **Multi-Stage Transition:**
  1. *Stage A (Composition):* Word is typed normally as readable text.
  2. *Stage B (Scramble, 0–55% progress):* Rapid character flickering based on frame seeds.
  3. *Stage C (Settling, 55–100% progress):* Glyphs lock into deterministic stable symbols from left to right.
  4. *Stage D (Stable):* Final masked state.
- **Lifecycle:** Managed by a single `requestAnimationFrame` loop that fires only when animations are active. Automatically cleans up and shuts down when all words settle.
- **Reduced Motion:** Fully honors `prefers-reduced-motion: reduce` and user configuration by bypassing the scramble loop.

### 3.6 Decorations & Widgets (`src/decorations.ts`)
- `MaskWidget` extends CodeMirror 6 `WidgetType`:
  - `toDOM()` returns `<span class="confitext-glyph" aria-label="hidden text" role="presentation">...</span>`.
  - `eq()` performs deep equality checks on glyphs, stage, word, glyphStyle, customGlyphs, and color settings to avoid DOM churn.
  - `ignoreEvent()` returns `false` so CodeMirror handles selection, dragging, and cursor navigation seamlessly.
- `buildMaskDecorations`: Generates decorations for visible viewport ranges, enabling high-performance scrolling across documents with thousands of words.

### 3.7 Extension & State (`src/state.ts`, `src/editor-extension.ts`)
- `confitextStateField` stores `{ mode: ConfitextMode, settings: ConfitextSettings, filePath?: string }`.
- `ConfitextViewPlugin` listens for:
  - Document changes (typing Space or delimiters triggers animation for the completed word).
  - Selection changes (instantly reveals selected ranges).
  - Viewport changes (scrolling).
  - State effects (`setModeEffect`, `setSettingsEffect`, `setFilePathEffect`, `animationTickEffect`).

### 3.8 Targeted Word Masking & Sensitive Data Shield (`src/tokenizer.ts`, `src/rules.ts`)
- **Targeted Scope Tokenizer (`findTargetedTokens`):**
  - Scans document text against combined targets (global word list, note-level frontmatter words, and sensitive regex patterns).
  - Enforces word boundaries for plain words while allowing punctuation within phrases.
  - Case-sensitivity is configurable (`caseSensitiveTargeting`).
  - Strict overlap elimination and candidate sorting by start offset guarantees strictly monotonic decoration ranges in CodeMirror 6's `RangeSetBuilder`.
- **Note-Level Frontmatter Memory (`getNoteMaskedWords`):**
  - Extracts note-specific target words from `confitext-masked-words` YAML frontmatter (supporting inline YAML arrays, bulleted lists, and comma-separated strings).
  - Memoized via `NOTE_WORDS_CACHE` LRU map keyed by document text slice.
- **Sensitive Data Shield (`SENSITIVE_PATTERNS`):**
  - High-precision regular expression presets for Emails, API keys (OpenAI, GitHub PATs, AWS, Bearer tokens), Credit Cards, Phone Numbers, and IPv4 addresses.
  - Custom user regex engine with real-time compilation and syntax error validation.

### 3.9 Granular Trigger Modes (`src/tokenizer.ts`, `src/decorations.ts`, `src/editor-extension.ts`)
- **Mask Trigger Mode (`maskTriggerMode: 'word' | 'line' | 'paragraph'`):**
  - `word`: Word delimiter entry (space, comma, punctuation) completes words immediately.
  - `line`: Words on the line containing active selection carets remain unmasked while typing; moving the cursor off the line (`getLineRangeAt`) triggers masking and animation transitions.
  - `paragraph`: Words in the paragraph block containing the cursor remain unmasked while drafting; masks only once a full blank line gap (`\n\n`) is formed or cursor navigates outside the paragraph (`getParagraphRangeAt`).
- **Monotonic Range Merging:** Precomputes active trigger ranges and pre-merges overlapping/contiguous spans before decoration construction to prevent CM6 range builder exceptions.

### 3.10 Apple HIG Settings Architecture (`src/settings.ts`, `styles.css`)
- **macOS Sequoia Aesthetic:**
  - Frosted glass hero card with Dynamic Island pulse indicators reflecting live protection mode and active trigger mode.
  - Interactive macOS Terminal Sandbox with real-time typing simulation, character length verification, and selection reveal testing.
  - Native Apple HIG segmented controls for trigger modes and glyph themes.
  - Inset grouped cards (`confitext-card-group`, `confitext-setting-item`) with subtle borders, blur backgrounds, and responsive layouts.
  - Token chip manager UI for adding and removing global and note-level target words.
- **Zero Black Screen Invariant:** Uses pure imperative `display(): void` lifecycle calling internal `this.render()`, ensuring full compatibility across Obsidian 1.13, 1.14+, and future versions without relying on deprecated declarative interceptors.

---

## 4. Performance & Resource Characteristics

- **Memory:** Zero persistent heap retention of note text. All state is held in ephemeral CodeMirror transactions.
- **CPU:** Zero background timers when idle. `requestAnimationFrame` runs only during active 180–420ms transitions.
- **Syntax Range Memoization:** Syntax exclusion calculations (`findExcludedRanges`) are cached by document content and settings, reducing decoration rebuild time during animation frames and cursor navigation to sub-millisecond speeds.
- **Viewport Virtualization:** Only visible lines in the viewport are decorated during scrolling.
