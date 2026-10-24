# Changelog

All notable changes to **Confitext** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.0] - 2026-10-24

### Fixed
- **Settings Page Display Recovery**: Restored full-fidelity, rock-solid settings tab rendering using Obsidian's native imperative lifecycle (`display()`). Fixed the blank/black screen issue that occurred when opening Confitext settings in Obsidian 1.14+.
- **Settings Architecture**: Replaced declarative interceptor with direct UI rendering, ensuring the interactive Live Matrix Sandbox, custom Unicode validator, preset loaders, and all 35 settings controls display immediately across all supported Obsidian versions.

### Added
- **Visual Preview Showcase**: Embedded high-resolution screenshots and feature previews (`assets/images/1.png` - `4.png`) illustrating before/after masking, paragraph selection reveal, and click-to-reveal word interactions in the README documentation.

---

## [1.4.0] - 2026-10-24

### Added
- **Declarative Settings API (getSettingDefinitions)**: Implemented Obsidian 1.13+ declarative settings schema on ConfitextSettingTab, enabling all Confitext options to be indexed and searchable via Obsidian's global settings search bar.

### Changed
- **Settings Re-rendering Architecture**: Replaced calls to deprecated this.display() with this.refreshTab() which seamlessly routes to this.update() on Obsidian 1.13+ or native imperative redraw on earlier versions.

### Fixed
- **Clean Release Distribution Package**: Removed auxiliary .zip asset from GitHub release assets to satisfy Obsidian Community Catalog distribution standards (main.js, manifest.json, styles.css only).
- Resolved @deprecated warnings and prefer-setting-definitions scanner suggestions.

---

## [1.3.0] - 2026-10-24

### Changed
- **Raised Minimum App Version**: Updated minAppVersion to 1.7.2 to guarantee complete runtime compatibility with Obsidian core APIs (Workspace.revealLeaf, FileManager.processFrontMatter, View.addAction).
- **Obsidian Native DOM Element Helpers**: Standardized all UI rendering in decorations, Reading View, Settings sandbox, and What's New tab to Obsidian's createDiv, createSpan, and createFragment helpers in strict compliance with obsidianmd/prefer-create-el.

### Fixed
- **Obsidian Community Review Compliance**:
  - Awaited Workspace.revealLeaf promises in openWhatsNewTab to resolve floating promise warnings.
  - Added strict type narrowing on MarkdownPostProcessorContext.frontmatter to resolve unsafe member access warnings.
  - Replaced all document.createDocumentFragment calls with Obsidian's createFragment.
  - Updated README links and badge anchors to remove placeholder warnings.

---

## [1.2.0] - 2026-10-24

### Added
- **Native Obsidian Right-Click Context Menus**:
  - **Editor Menu**: Right-click anywhere in an active note to toggle masking on/off, trigger Panic Hide, or toggle note frontmatter privacy.
  - **File Explorer Menu**: Right-click any note to toggle public/private status (`confitext: false`), or right-click any folder to instantly add or remove it from excluded folders.
- **Editor Tab Header Privacy Shield**:
  - Native action button (`addAction('shield')`) embedded in the top tab header bar of every open note for instant visual status and one-click masking toggling.
- **Reading View Markdown Post-Processor**:
  - Extends non-destructive visual masking into Obsidian Reading View (Preview Mode) with interactive click-to-reveal word controls.
- **Panic Mode Command**:
  - `Confitext: Panic: Instant hide & mask all text` immediately clears active selections, forces global masking mode, and masks the screen instantly.
- **Interactive "What's New" Tab**:
  - Native Obsidian view tab (`WhatsNewView`) dedicated to exploring release highlights, changelog items, and feature walkthroughs directly inside Obsidian.
- **Settings Shortcut**:
  - "What's new in v1.2.0" action in Settings to launch the release notes tab with one click.

### Changed
- Standardized all frontmatter rules and commands strictly to `confitext: false`.
- Unified status bar indicators to `⚡ CONFITEXT: ON / OFF / REVEALED / PAUSED`.
- Enhanced slider controls and popout window compatibility (`window.requestAnimationFrame`).

### Fixed
- Resolved Obsidian Community Plugin review scanner findings:
  - Updated `minAppVersion` to `1.4.0` for `processFrontMatter` API compatibility.
  - Replaced custom HTML headings with `new Setting(containerEl).setName().setHeading()`.
  - Added cryptographic artifact provenance attestations to GitHub release workflow.
  - Replaced `builtin-modules` package with Node native `node:module` `builtinModules`.
  - Replaced direct `document.createElement` calls with Obsidian's `createEl` DOM helper.
  - Eliminated unhandled promises and unsafe calls.

---

## [1.0.0] - 2026-10-24

### Added
- Initial production release of Confitext.
- CodeMirror 6 non-destructive replacement widget decoration engine.
- Instant spacebar word completion trigger with Matrix-inspired glyph scramble animations.
- Deterministic glyph caching guaranteeing zero note layout shifts or line jumps.
- Real-time mouse and keyboard selection reveal.
- Live Matrix Privacy Sandbox inside Settings for interactive testing.
- Idle auto-masking timer and OS window blur detection.
- Custom Unicode glyph set importer with validation and deduplication.
- Built-in thematic presets (Matrix Code, Cyber Runes, Abstract Geometry, Digital Blocks, Braille, Morse).
- Theme-aware color palettes (Matrix Green, Theme Accent, Monochrome, Custom Hex Picker).
- Markdown syntax preservation for headers, lists, quotes, checkboxes, code blocks, math formulas, and URLs.
- 100% test coverage with automated unit and integration test suite.
