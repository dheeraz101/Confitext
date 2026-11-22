# Changelog

All notable changes to **Confitext** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.1] - 2026-11-22

### Added
- **Apple HIG & SF Symbols Complete Vector Iconography Upgrade**:
  - Expanded `src/icons.ts` with crisp, high-DPI Apple SF Symbols-inspired vector SVGs: `plus`, `trash`, `return` (line mode arrow), `pilcrow` (paragraph mode symbol), `text-cursor` (word mode icon), `warning`, `info`, `sun`, `moon`, and `menu`.
  - Replaced all remaining raw platform emojis and character fallbacks (`⚡`, `☰`, `✕`, `✓`, `⚠`, `◉`, `⏎`, `¶`) across the Obsidian status bar, settings buttons, chips, lists, and What's New view.
  - Obsidian status bar now dynamically renders an Apple HIG vector SVG (`shield`, `shield-check`, `eye`, `lock-open`) alongside native label text.
  - Replaced website dynamic toggle emojis (`🔒`, `👁️`, `🌙`, `☀️`, `☰`, `✕`) in `docs/app.js` with pure vector SVGs that scale cleanly without font rendering glitches.
  - Updated website favicons across all pages to high-resolution vector SVG shields with Apple dark glass styling.
  - Enriched Bento Grid cards and Documentation section headers (`<h2>`) with contextual Apple SF Symbols vector SVGs.

---

## [2.6.0] - 2026-11-22

### Added
- **Full-Width Un-Nested Settings Architecture**:
  - Removed enclosing big cards so individual setting controls utilize full width without nested padding squishing text or components against curved card corners.
  - Promoted "Global Remembered Words", "Active Note Words", and "Custom Regular Expression Patterns" to their own dedicated full-width cards with generous edge clearances.
- **Mobile Mask Trigger Rhythm Vertical Stack**:
  - Automatically transforms the 3-option segmented control (Per Word, Per Line, Per Paragraph) into a full-width vertical stack on phone screens with 44px touch targets.
  - Redesigned the hints explanation card with clean Apple HIG symbols (`◉`, `⏎`, `¶`) and active mode highlight tint.
- **Universal Mobile Keyboard Suggestion Scramble Animations**:
  - Enhanced prediction detection in `editor-extension.ts` to trigger scramble animations for both short and long suggestions from Gboard and iOS QuickType, including prefix replacements and auto-appended space delimiters.
- **Apple HIG Vector Iconography**:
  - Replaced standard platform emojis with a lightweight, high-DPI Apple SF Symbols-inspired SVG vector icon library across settings buttons, chips, headers, and the website.
- **Apple Cupertino Web Loading Spinner**:
  - Integrated a sleek Apple-style radial loading spinner on initial page load for the documentation and landing site.
- **Fast-Scroll Compositor Containment**:
  - Added CSS layout/style containment and min-height constraints to prevent black screen flashing during rapid scroll on mobile.
- **Website Mobile Horizontal Overflow Elimination**:
  - Fixed ambient glow and container boundaries, eliminating side scrolling and unwanted black space on small phone viewports.
  - Added high-contrast Apple HIG blue link styling and custom `::selection` theme styling.

---

## [2.5.1] - 2026-11-22

### Changed
- Bumped version references across all documentation, website, and legal pages for consistency.
- Refined What's New view subtitle copy for v2.5.1.
- Updated website hero badge, privacy policy, and terms of use to reflect v2.5.1.

---

## [2.5.0] - 2026-11-22

### Added
- **Platform-Specific Settings Filtering (PC Desktop Pro vs. Mobile Touch Shield)**:
  - Dynamically hides desktop-only controls on mobile devices: Hover peek on mouse rest, hover reveal delay slider, tab header shield button, multi-monitor window blur, physical Esc peek, and the entire "Desktop Pro Suite" card are now hidden on mobile phones and tablets.
  - Dynamically hides mobile-only controls on desktop devices: Android circular corner comfort insets, tactile haptic vibration feedback, 30 FPS battery-saver animation cap, and the entire "Mobile Touch Shield" card are cleanly hidden on macOS and Windows PC.
  - Ensures clean, clutter-free settings tailored strictly to the user's active device architecture.
- **Mobile Predictive Keyboard Autocomplete Scramble Animations**:
  - Added real-time detection for virtual keyboard autocomplete/suggestion word insertions (Gboard, Samsung Keyboard, iOS QuickType) that insert full words without trailing whitespace delimiters.
  - Triggers the digital Matrix scramble animation on inserted suggested words automatically, ensuring full visual continuity without requiring a manual spacebar stroke.
- **Apple HIG Bullet Divider Typography (`•`)**:
  - Replaced hyphens (`-` or ` - `) across Dynamic Island status labels, hero headers, settings descriptions, and status bars with Apple HIG bullet symbols (`•`): `PROTECTED • FULL SCREEN VEIL`, `REVEALED • ALL TEXT READABLE`, `PAUSED • MASKING SUSPENDED`.
  - Upgraded badge and pill formatting for a minimal, premium aesthetic.

### Fixed
- **Caret Line Click Masking Defect**:
  - Resolved a defect where clicking or tapping directly onto a masked word or line left it hidden/masked until space was pressed.
  - Updated `isWordBeingComposed()` in `src/tokenizer.ts` to evaluate `(cursorPos > word.from || (cursorPos === word.from && word.from > 0)) && cursorPos <= word.to`, ensuring instant cleartext reveal upon cursor placement while preserving masking at position 0 on cold document open.
- **Website Architecture Consolidation (`docs/` vs `site/`)**:
  - Consolidated the web documentation and landing site under the single canonical `/docs` directory required by GitHub Pages, removing the redundant `/site` duplicate to eliminate drift.

---

## [2.3.0] - 2026-11-22

### Added
- **Hold Esc to Peek Cleartext (macOS & Windows PC Pro)**:
  - Added physical keyboard press-and-hold `Escape` key handling on desktop: holding down Esc momentarily reveals full underlying text for a quick glance, and releasing Esc immediately restores Matrix privacy masking.
  - Added a toggle in settings under "macOS Sequoia & PC Desktop Pro Experience" (`holdEscToPeek`) to enable or disable this shortcut.
  - Safeguarded with window `blur` listener: switching windows (Alt+Tab/Cmd+Tab) while holding Esc automatically re-engages masking to prevent cleartext exposure.
- **GitHub Pages Official Website Hosting**:
  - Live deployment of the Apple HIG-styled Confitext web suite and interactive Matrix playground at [https://dheeraz101.github.io/Confitext/](https://dheeraz101.github.io/Confitext/).
  - Added direct "🌐 Website" action button in the plugin settings hero header and linked in the footer and README.
- **Mobile Setting-Item Full-Surface Inset Comfort**:
  - Expanded 22px–26px horizontal insets to `.setting-item` on Android and phone layouts, eliminating boundary collisions on native circular card corners.
  - Stacked category pill badges cleanly above section titles on mobile to avoid horizontal text wrapping.

---

## [2.2.0] - 2026-11-21

### Added
- **Instant Cold-Boot Startup Privacy Veil**:
  - Implemented immediate synchronous pre-render CSS visual privacy veil (`body.confitext-active.confitext-scope-all .cm-editor:not(.confitext-note-excluded) .cm-line:not(:has(.confitext-glyph))`), eliminating the 2–5 second plain-text startup vulnerability on Android mobile cold boots.
  - Added synchronous `localStorage` cache hydration on plugin `onload()`, applying active masking mode and settings before notes or CodeMirror extensions mount.
  - Added `update.geometryChanged` and `update.heightChanged` observers plus zero-decoration fallback recovery in `src/editor-extension.ts`.
- **Platform Feature Divergence (PC Desktop Pro vs. Mobile Touch Shield)**:
  - **macOS & PC Desktop Pro**: Added multi-monitor window blur & edge masking, customizable hover glance reveal delays (200ms–1200ms), OpenType monospace font ligatures (SF Mono, JetBrains Mono, Cascadia Code), and Apple HIG 3D keyboard shortcut tips (`⌥ / Alt + M`, `Esc`).
  - **iOS & Android Touch Shield**: Added tactile haptic feedback (`navigator.vibrate`), battery-saver 30 FPS animation throttling, touch gesture word reveal, and active platform device pills.
- **Apple HIG Web Landing & Documentation Suite**:
  - Published interactive dark/light web landing page (`docs/index.html`) featuring live Matrix typing playground, feature showcase, and platform comparison.
  - Published comprehensive interactive documentation guide (`docs/docs.html`).
  - Published formal web versions of the Privacy Policy (`docs/privacy.html`) and Terms of Use (`docs/terms.html`) with GDPR/CCPA alignment and HIPAA display discretion framing.
- **YABP Initiative & Transparency Center**:
  - Integrated dedicated footer card supporting **An YABP Initiative** ([yabp.netlify.app](https://yabp.netlify.app/)) — "Yet Another Boring Project".
  - Added official author attribution to **Dheeraz** ([github.com/dheeraz101](https://github.com/dheeraz101)).
  - Published comprehensive **Privacy Policy** (`PRIVACY.md`) confirming 100% local execution, zero network requests, and zero telemetry collection.
  - Published open-source **Terms of Use** (`TERMS.md`) with explicit security scope guidelines and MIT licensing terms.

### Changed
- **Android Native Circular Card Corner Accommodation**:
  - Accommodated native Android app circular card curvature by implementing generous `24px–26px` horizontal padding (`padding: 24px 26px`) on `.confitext-card`.
  - Added top and bottom margin and padding clearances on first/last children (`.confitext-card > :first-child`, `.confitext-card > :last-child`), `.setting-item`, `.setting-item-control`, `.confitext-add-row`, and `.confitext-chips-grid`, ensuring text, inputs, switches, and buttons sit comfortably away from curved borders.

---

## [2.1.0] - 2026-11-20

### Added
- **Refined Apple HIG Settings & Pill-on-Top Architecture**:
  - Restructured all section headers to position category pills (`STRATEGY`, `SHIELD`, `APPEARANCE`, etc.) cleanly on top, with section titles on the line below.
  - Added thematic color accenting for each individual section capsule pill.
  - Stacked Sandbox controls (`▶ Trigger Scramble Test` and `👁️ Reveal Preview`) vertically on mobile displays to eliminate button clipping and screen-edge overflow.
  - Added safe word-wrapping for Matrix terminal preview characters on narrow displays.
  - Enforced 10px–12px outer card margins and 16px internal padding on mobile devices, ensuring no text or buttons touch card borders.

---

## [2.0.0] - 2026-11-20

### Added
- **Apple HIG / iOS Inset Grouped Settings Architecture**:
  - Redesigned settings UI with iOS Inset Grouped cards featuring 14px rounded corners and subtle border dividers.
  - Implemented `.confitext-setting-stacked` layout for dropdowns, sliders, segmented controls, and textareas, eliminating squished vertical text wrapping on mobile phone screens.
  - Full-width controls with 44px minimum touch targets compliant with Apple Human Interface Guidelines.
  - Native iOS horizontal toggle switch rows (`.confitext-setting-toggle`) with clear visual hierarchy.
  - Added smooth horizontal momentum touch scrolling (`-webkit-overflow-scrolling: touch`) for badge pills, tag clouds, and thematic presets.

### Fixed
- **Mobile Phone Action Button Deduplication**:
  - Suppressed tab header action button on mobile phones via Obsidian `Platform.isPhone`, preventing duplicate and competing buttons on phone screens where note tabs do not exist.
  - Implemented DOM deduplication and cleanup routines for tab header actions and mobile ribbon icons.
  - Toggling "Show tab header shield button" off in settings now immediately removes all tab header buttons across all leaves without requiring a vault reload.

---

## [1.7.0] - 2026-10-25

### Fixed
- **Instant Mobile & Desktop Startup Masking (Zero Plaintext Exposure)**:
  - Fixed a critical issue on mobile app launch where notes displayed in plain cleartext for ~1 second before abruptly snapping into masked glyphs.
  - Implemented safe early viewport fallback in `buildMaskDecorations`: when CodeMirror has not yet completed DOM layout measurement (`visibleRanges` is empty `[]` or `0..0`), the document is immediately masked on frame 0.
  - Connected `setInitialStateProvider` to `confitextStateField` so newly instantiated editors immediately receive user saved settings, mode, and active file path without waiting for `onLayoutReady`.
  - Added immediate state dispatch in `onload()` to existing editor leaves.

### Added
- **Selection-Based Restore Scramble Animation**:
  - When tapping or clicking away from a selection to read text, previously revealed words now smoothly scramble and cascade back into matrix glyphs instead of snapping instantly.
  - Fully compatible with `settings.restoreMaskingAfterSelection` on mobile and desktop.
- **iOS Human Interface Guidelines (HIG) & Mobile UI/UX Overhaul**:
  - Enforced Apple HIG 44px minimum touch targets across all buttons, segmented controls, chips, and quick-add inputs on mobile touch screens (`@media (max-width: 768px)`, `.is-mobile`, `.is-phone`).
  - Added 16px font-size guarantee on mobile text inputs to eliminate annoying iOS Safari automatic viewport zoom on focus.
  - Designed responsive single-column adaptors for Hero Island, Live Matrix Sandbox, Tag Cloud, and What's New view with zero horizontal overflow or clipping on phones (320px–390px screens).
  - Cleaned up inset grouped card styles with iOS-native 12px radii.
- **Powerful Mobile & Virtual Keyboard Texting**:
  - Expanded word delimiters to support Unicode non-breaking spaces (`\u00A0`, `\u202F`), thin spaces (`\u2009`), zero-width spaces (`\u200B`), smart quotes (`“`, `”`, `„`), ellipses (`…`), em-dashes (`—`), and CJK punctuation.
  - Added support for contractions with smart apostrophes (`don’t`, `it’s`, `we’re`) as cohesive single tokens in `tokenizer.ts` and `editor-extension.ts`.
  - Enhanced IME composition tracking to ensure seamless typing without dropped frames or cursor jumps.
- **Low-End Hardware & Mobile Battery Saver Mode**:
  - Added new `performanceMode` setting: `'auto'` (default), `'high'`, and `'battery-saver'`.
  - Dynamic frame throttling to 30 FPS (~33ms intervals) on mobile or low-end hardware (detected via `hardwareConcurrency <= 4` or `.is-mobile`).
  - Shortened scramble duration (140ms) and bypassed expensive GPU filter compositing / text-shadow blurs when battery saver mode is active.
  - Added CSS hardware acceleration (`transform: translateZ(0)`).

---

## [1.6.1] - 2026-10-25

### Fixed
- **Obsidian Review Compliance**:
  - Replaced all manual HTML heading elements (`h2`, `h3`, `h4`) in `settings.ts` with Obsidian's native `new Setting(containerEl).setName(...).setHeading()` component API for theme-consistent UI rendering.
  - Removed plugin name prefix from command name in `commands.ts` ("What's new (Release Notes)") per Obsidian command naming guidelines.
  - Replaced fallback `document.createElement` in `decorations.ts` with Obsidian's native `createSpan` helper (`obsidianmd/prefer-create-el`).
  - Resolved `@typescript-eslint/no-unsafe-assignment` warnings in `main.ts` and `settings.ts` for frontmatter metadata cache reads.
  - Eliminated `Promise returned where void was expected` warnings across all interactive event listeners in `settings.ts`.
  - Removed redundant escape characters (`\-`) in API key tokenization regular expressions in `tokenizer.ts`.
  - Cleaned up unused imports (`clearRulesCache`, `getNoteMaskedWords`) in `settings.ts`.
  - Removed all `!important` flags in `styles.css` in favor of enhanced selector specificity.

---

## [1.6.0] - 2026-10-25

### Added
- **Targeted Word & Phrase Masking**:
  - Mask individual target words or phrases while leaving the rest of the document readable, or mask entire documents while maintaining targeted rules.
  - **Global Memory**: Words added globally are automatically masked across all current and future notes in your vault.
  - **Note-Level Memory**: Words added locally are saved directly to the note's YAML frontmatter (`confitext-masked-words: [secret, credential]`).
  - **Native Context Menus**: Right-click any selected word or phrase to "Mask this word globally" or "Mask this word in active note".
  - **Command Palette Integration**: Added quick commands to mask/unmask selected words with immediate reactive redraw.
  - **Configurable Sensitivity**: Optional toggle for case-sensitive targeting.
- **Granular Hide Triggers (Typing Flow Modes)**:
  - Added `maskTriggerMode` setting with three distinct typing rhythms:
    - **Word (Default)**: Automatically hides completed words upon delimiter entry (space, comma, period, or punctuation).
    - **Line**: Keeps the current line unmasked while actively typing; masks the line the moment the cursor moves away to another line.
    - **Paragraph**: Keeps the current paragraph block unmasked while typing; masks the paragraph once a full blank line gap (`\n\n`) is formed or cursor navigates outside the paragraph block.
  - Smooth animation integration: Scramble transitions trigger automatically when boundaries are crossed.
- **Sensitive Data Shield (Automated PII Masking)**:
  - Instant preset regex patterns for detecting and masking sensitive credentials and data on screen:
    - Email addresses (`alice@example.com`)
    - API keys and authorization tokens (OpenAI, GitHub, AWS, Bearer tokens)
    - Credit card numbers (Visa, Mastercard, Amex, Discover)
    - Phone numbers (international and national formats)
    - IPv4 addresses
  - **Custom Regex Engine**: Define custom regex patterns with a real-time syntax validator directly within settings.
- **Apple HIG & macOS Sequoia Settings Redesign**:
  - Rebuilt the entire settings experience following Apple Human Interface Guidelines:
    - Frosted glass hero card with Dynamic Island real-time status pill badges.
    - macOS Terminal Sandbox window with interactive preview controls.
    - Apple-style segmented controls for Trigger Modes (`Word` / `Line` / `Paragraph`).
    - Inset grouped cards with clean visual hierarchy, iconography, and documentation.
    - Interactive token chips for managing global and note-level target words.
- **Quick Glance Hover Reveal**:
  - Option to peek at masked words by hovering over them with configurable hover delay (100ms - 2000ms).

### Changed
- Expanded automated unit test suite from 110 to 159 tests covering all targeted masking, trigger modes, and CodeMirror 6 edge cases.

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
