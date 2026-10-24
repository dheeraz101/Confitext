# Confitext: Testing Guide & Verification Strategy

## 1. Overview

Confitext maintains an automated test suite executed with Vitest and JSDOM, covering unit, integration, and performance aspects without requiring a live Electron/Obsidian desktop environment.

---

## 2. Test Suites

### 2.1 Tokenizer Suite (`tests/tokenizer.test.ts`)
- **Word Boundary Verification:**
  - Standard words, space delimiters, punctuation separation.
  - Multi-space, multi-tab, and multi-newline sequences.
  - Contractions (`don't`, `c'est`) and hyphenated compounds (`state-of-the-art`).
  - Numbers and alphanumeric symbols (`Room 101`, `code X99`).
  - International multilingual text (French, Japanese, German, Russian).
  - Empty text boundary cases.
- **Markdown Preservation:**
  - Frontmatter exclusion.
  - Fenced code block preservation (```).
  - Inline code preservation (`...`).
  - External and internal URLs preservation.
  - Header, list, quote, and task checkbox prefix preservation.
- **Performance Benchmarking & Split View Cache Retention:**
  - Benchmarks 4,500 words across a simulated long note; executes in <15ms.
  - Multi-document cache retention test verifies independent cache persistence for side-by-side split view panes without eviction thrashing.

### 2.2 Glyphs & Custom Importer Suite (`tests/glyphs.test.ts`)
- **Deterministic Output:** Verifies identical words always produce identical glyph strings.
- **Length Invariance:** Validates output glyph string length strictly matches input word length.
- **Palette Integrity:** Verifies Matrix, Cyber Runes, Abstract Geometry, Digital Blocks, Braille, and Morse palettes contain valid characters.
- **Custom Glyph Validation:**
  - Verifies minimum 2 unique character constraint.
  - Verifies character deduplication (`AAABBB` -> `['A', 'B']`).
  - Verifies whitespace stripping and control character filtering.
  - Verifies astral plane Unicode and emoji handling (`🜂🜄🜁🜃`).
- **Custom Palette Generation & Scramble:**
  - Stable glyph output with custom glyph sets.
  - In-flight flickering using custom glyphs.
  - Graceful fallback to default palette when custom string is empty/invalid.
- **Animation Scrambling:**
  - Progress 1.0 matches stable glyphs exactly.
  - Intermediate progress settles leading characters while flickering trailing characters.
  - Differing frame seeds produce dynamic flicker effects.

### 2.3 Rules Suite (`tests/rules.test.ts`)
- **Frontmatter Exclusion:**
  - Detects `confitext: false` in YAML frontmatter.
  - Handles string quotes (`'false'`, `"false"`), `off`, `no`, `0`, and inline comments (`# ...`).
  - Case-insensitivity (`Confitext: False`, `CONFITEXT: OFF`).
  - Ensures `confitext: true` does NOT disable masking.
  - Ignores unrelated frontmatter keys.
  - Validates `respectFrontmatterExclusion` setting toggle.
  - Validates memoization cache for frontmatter checks.
- **Folder Exclusion:**
  - Matches notes directly in excluded folder (`Public/Note.md`).
  - Matches notes in subfolders (`Public/2026/Note.md`).
  - Handles Windows backslashes (`Public\Sub\Note.md`).
  - Matches nested folder segments (`Archive/Public/Note.md`).
  - Prevents false positive substring matches (`Public` does not match `Publication`).
  - Validates memoization cache for path lookups.
- **Integrated Note Exclusion:**
  - Validates `isNoteMaskingDisabled` combining folder and frontmatter rules.

### 2.4 Idle Auto-Masking Suite (`tests/idle.test.ts`)
- **Inactivity Timer:**
  - Validates `onIdleTimeout` triggers after configured minutes (e.g. 5 minutes) using fake timers.
  - Validates user interactions (`mousemove`, `keydown`, `wheel`, `pointerdown`, and nested container `scroll` with capture phase) reset the countdown timer.
- **Window Blur Auto-Masking:**
  - Validates `onBlurAutoMask` triggers on window `blur` when enabled.
  - Validates window `blur` is ignored when `autoMaskOnBlur` is disabled.
- **Lifecycle & Cleanup:**
  - Validates all listeners and timers are cleanly removed on `stop()` or `destroy()`.
  - Ensures zero timer leaks when idle auto-masking is disabled.

### 2.5 State Management Suite (`tests/state.test.ts`)
- **Field Initialization:** Ensures default mode is `masking` and default settings are populated.
- **Mode Transitions:** Validates `masking` -> `revealed` -> `paused` -> `masking`.
- **Settings Propagation:** Checks live updates to settings.
- **File Path Tracking:** Validates `setFilePathEffect` updates note path in editor state.
- **Multi-Editor Independence:** Tests that multiple CodeMirror editor instances maintain isolated states.

### 2.6 Editor Behavior Suite (`tests/editor-behavior.test.ts`)
- **Zero Document Mutation:** Confirms `doc.toString()` is never altered by masking.
- **Space Key Integrity:** Verifies space insertions insert exactly 1 space character and advance the cursor.
- **Selection Reveal:** Confirms selected words are omitted from mask decorations.
- **Selection Restoration:** Confirms collapsing selection immediately restores visual masking.
- **Frontmatter Exclusion Integration:** Verifies notes with `confitext: false` render zero mask decorations.
- **Folder Exclusion Integration:** Verifies notes in excluded folders render zero mask decorations.
- **Custom Glyph Rendering:** Verifies `glyphStyle: 'custom'` renders widgets using custom glyphs.
- **Braille & Morse Palettes:** Verifies widgets render Braille and Morse characters properly.
- **Invertible Transactions:** Validates that CM6 history/undo/redo operates cleanly over masked text.
- **Stability After Edits:** Confirms untouched words retain identical glyph masks when earlier words are edited.
- **Lifecycle Cleanup:** Tests `AnimationManager.destroy()` shuts down RAF loops without leaving dangling callbacks.

---

## 3. Running the Tests

To run the complete automated test suite:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

To run TypeScript verification:

```bash
npm run typecheck
```
