/**
 * Confitext - Plugin Settings Tab
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import type ConfitextPlugin from './main';
import { ConfitextMode, GlyphPaletteName, MaskColorTheme, AnimationSpeed } from './types';
import {
	validateCustomGlyphs,
	GLYPH_PRESETS,
	clearGlyphCache,
	getStableGlyphs,
	getScrambleGlyphs,
	resolveGlyphPalette
} from './glyphs';
import { DURATION_MAP } from './animation';

export class ConfitextSettingTab extends PluginSettingTab {
	plugin: ConfitextPlugin;
	private sandboxInput = 'Your thoughts. Your screen. Your code.';
	private sandboxRevealed = false;
	private sandboxAnimRaf: number | null = null;
	private sandboxDisplayEl: HTMLElement | null = null;
	private sandboxPillEl: HTMLElement | null = null;

	constructor(app: App, plugin: ConfitextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('confitext-settings');

		// Header
		new Setting(containerEl)
			.setName(`Confitext v${this.plugin.manifest.version}`)
			.setDesc('Your thoughts. Your screen. Your code. An animated, Matrix-inspired visual masking layer for private-feeling writing.')
			.setHeading();

		new Setting(containerEl)
			.setName("What's new in v1.3.0")
			.setDesc('Obsidian 1.7+ core API compatibility, native context menus, tab header shield action, Reading View masking, and emergency panic mode.')
			.addButton(btn =>
				btn
					.setButtonText("Open What's New Tab")
					.setCta()
					.onClick(async () => {
						await this.plugin.openWhatsNewTab();
					})
			);

		// ----------------------------------------------------
		// LIVE MATRIX SANDBOX & INTERACTIVE PREVIEW STATION
		// ----------------------------------------------------
		this.renderLiveSandbox(containerEl);

		// ----------------------------------------------------
		// GROUP A: BEHAVIOR
		// ----------------------------------------------------
		new Setting(containerEl).setName('Behavior').setHeading();

		new Setting(containerEl)
			.setName('Enable Confitext')
			.setDesc('Master switch for the Confitext visual masking layer.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async value => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
					this.plugin.updateStatusBar();
				})
			);

		new Setting(containerEl)
			.setName('Default mode')
			.setDesc('Mode to use when opening Obsidian or new notes.')
			.addDropdown(drop =>
				drop
					.addOption('masking', 'Masking ON')
					.addOption('revealed', 'Revealed (Readable)')
					.addOption('paused', 'Paused')
					.setValue(this.plugin.settings.defaultMode)
					.onChange(async (value: string) => {
						this.plugin.settings.defaultMode = value as ConfitextMode;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Mask newly completed words')
			.setDesc('Automatically apply visual masking as soon as a word is completed by typing Space or delimiter.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.maskNewlyCompletedWords)
					.onChange(async value => {
						this.plugin.settings.maskNewlyCompletedWords = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Reveal selected text')
			.setDesc('Immediately reveal masked words when selected with mouse or keyboard.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.revealSelectedText)
					.onChange(async value => {
						this.plugin.settings.revealSelectedText = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Reveal entire word on selection')
			.setDesc('If a selection intersects part of a word, reveal the whole word for natural reading.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.revealEntireWordOnSelection)
					.onChange(async value => {
						this.plugin.settings.revealEntireWordOnSelection = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Reveal on cursor inside word')
			.setDesc('Reveal a word when the caret is placed inside it for editing. Re-masks when the caret moves away.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.revealOnCursorInsideWord)
					.onChange(async value => {
						this.plugin.settings.revealOnCursorInsideWord = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		// ----------------------------------------------------
		// GROUP B: APPEARANCE & CUSTOM GLYPHS
		// ----------------------------------------------------
		new Setting(containerEl).setName('Appearance & glyph styles').setHeading();

		new Setting(containerEl)
			.setName('Glyph style')
			.setDesc('Choose the visual character set for masked words.')
			.addDropdown(drop =>
				drop
					.addOption('matrix', 'Matrix Code (ⵙ Ϟ ⟁ Ж ᚷ ⌁)')
					.addOption('runes', 'Cyber Runes (᚛ ᚜ ᚠ ᚢ ᚦ ᚨ)')
					.addOption('geometry', 'Abstract Geometry (⟁ ⟐ ⟡ ⟢ ⟤ ⌖)')
					.addOption('blocks', 'Digital Blocks (░ ▒ ▓ █ ▀ ▄)')
					.addOption('braille', 'Braille Script (⠁ ⠃ ⠉ ⠙ ⠑ ⠋)')
					.addOption('morse', 'Morse Code (• − – · ⎻ ⎼)')
					.addOption('custom', 'Custom Glyph Set (User-Defined)')
					.setValue(this.plugin.settings.glyphStyle)
					.onChange(async (value: string) => {
						this.plugin.settings.glyphStyle = value as GlyphPaletteName;
						clearGlyphCache();
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
						this.plugin.dispatchSettingsToEditors();
						this.display(); // Re-render to show/hide custom glyph importer
					})
			);

		// Custom Glyph Set Importer
		if (this.plugin.settings.glyphStyle === 'custom') {
			const customSection = containerEl.createDiv({ cls: 'confitext-custom-importer' });

			const validation = validateCustomGlyphs(this.plugin.settings.customGlyphs);

			const customSetting = new Setting(customSection)
				.setName('Custom Unicode glyphs')
				.setDesc('Supply arbitrary Unicode symbols for thematic masking (e.g. Braille, Morse, Alien, Elvish, Runes). Requires at least 2 unique characters.');

			let validationMsgEl: HTMLElement;

			customSetting.addTextArea(text => {
				text
					.setPlaceholder('Paste arbitrary Unicode symbols here...')
					.setValue(this.plugin.settings.customGlyphs)
					.onChange(async value => {
						this.plugin.settings.customGlyphs = value;
						const res = validateCustomGlyphs(value);
						if (validationMsgEl) {
							if (res.valid) {
								validationMsgEl.setText(`✓ Valid custom set: ${res.count} unique glyphs.`);
								validationMsgEl.className = 'confitext-validation-msg confitext-validation-success';
							} else {
								validationMsgEl.setText(`⚠ ${res.error || 'Invalid glyph set.'}`);
								validationMsgEl.className = 'confitext-validation-msg confitext-validation-error';
							}
						}
						clearGlyphCache();
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					});
				text.inputEl.rows = 3;
				text.inputEl.addClass('confitext-glyph-textarea');
			});

			validationMsgEl = customSection.createDiv({
				cls: 'confitext-validation-msg ' + (validation.valid ? 'confitext-validation-success' : 'confitext-validation-error'),
				text: validation.valid
					? `✓ Valid custom set: ${validation.count} unique glyphs.`
					: `⚠ ${validation.error || 'Invalid glyph set.'}`
			});

			// Preset Quick-Loader Buttons
			const presetContainer = customSection.createDiv({ cls: 'confitext-preset-section' });
			presetContainer.createSpan({ cls: 'confitext-preset-label', text: 'Quick Thematic Presets:' });

			const btnRow = presetContainer.createDiv({ cls: 'confitext-preset-buttons' });
			for (const preset of Object.values(GLYPH_PRESETS)) {
				const btn = btnRow.createEl('button', {
					cls: 'confitext-preset-btn',
					text: preset.name
				});
				btn.title = `${preset.description}: ${preset.glyphs.slice(0, 15)}...`;
				btn.addEventListener('click', () => {
					void (async () => {
						this.plugin.settings.customGlyphs = preset.glyphs;
						clearGlyphCache();
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
						this.display();
					})();
				});
			}
		}

		new Setting(containerEl)
			.setName('Mask color theme')
			.setDesc('Color scheme for the masked glyphs.')
			.addDropdown(drop =>
				drop
					.addOption('matrix-green', 'Matrix Luminous Green')
					.addOption('theme-accent', 'Obsidian Theme Accent')
					.addOption('monochrome', 'Monochrome (Subtle)')
					.addOption('custom', 'Custom Color')
					.setValue(this.plugin.settings.maskColorTheme)
					.onChange(async (value: string) => {
						this.plugin.settings.maskColorTheme = value as MaskColorTheme;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
						this.display(); // re-render to show/hide custom color picker
					})
			);

		if (this.plugin.settings.maskColorTheme === 'custom') {
			new Setting(containerEl)
				.setName('Custom accent color')
				.setDesc('Hex color for custom glyph masking.')
				.addColorPicker(color =>
					color.setValue(this.plugin.settings.customColor).onChange(async value => {
						this.plugin.settings.customColor = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
				);
		}

		new Setting(containerEl)
			.setName('Subtle glow effect')
			.setDesc('Add a slight luminous phosphor glow to masked glyphs.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.subtleGlow).onChange(async value => {
					this.plugin.settings.subtleGlow = value;
					await this.plugin.saveSettings();
					this.plugin.applyCssVariables();
				})
			);

		new Setting(containerEl)
			.setName('Mask opacity')
			.setDesc('Adjust visual intensity of the glyphs.')
			.addSlider(slider =>
				slider
					.setLimits(0.4, 1.0, 0.05)
					.setValue(this.plugin.settings.maskOpacity)
					.onChange(async value => {
						this.plugin.settings.maskOpacity = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
			);

		// ----------------------------------------------------
		// GROUP C: ANIMATION
		// ----------------------------------------------------
		new Setting(containerEl).setName('Animation').setHeading();

		new Setting(containerEl)
			.setName('Enable scramble animation')
			.setDesc('Play a brief, futuristic glyph-scrambling animation when a word is completed.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableAnimation)
					.onChange(async value => {
						this.plugin.settings.enableAnimation = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Animation speed')
			.setDesc('Scramble transition duration.')
			.addDropdown(drop =>
				drop
					.addOption('fast', 'Fast (180ms)')
					.addOption('normal', 'Standard (280ms)')
					.addOption('slow', 'Cinematic (420ms)')
					.setValue(this.plugin.settings.animationSpeed)
					.onChange(async (value: string) => {
						this.plugin.settings.animationSpeed = value as AnimationSpeed;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Respect reduced motion')
			.setDesc('Automatically disable animations when OS reduced motion is active.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.respectReducedMotion)
					.onChange(async value => {
						this.plugin.settings.respectReducedMotion = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		// ----------------------------------------------------
		// GROUP D: IDLE & AUTO-MASKING
		// ----------------------------------------------------
		new Setting(containerEl).setName('Idle & auto-masking timer').setHeading();

		new Setting(containerEl)
			.setName('Enable idle auto-masking')
			.setDesc('Automatically engage Masking mode if Obsidian is left idle or loses focus.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.idleAutoMask)
					.onChange(async value => {
						this.plugin.settings.idleAutoMask = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.idleAutoMask) {
			new Setting(containerEl)
				.setName('Idle timeout (minutes)')
				.setDesc('Duration of user inactivity (no typing or mouse movement) before automatically masking.')
				.addSlider(slider =>
					slider
						.setLimits(1, 60, 1)
						.setValue(this.plugin.settings.idleTimeoutMinutes)
						.onChange(async value => {
							this.plugin.settings.idleTimeoutMinutes = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Auto-mask on window blur')
				.setDesc('Automatically switch to Masking mode whenever Obsidian loses operating system focus.')
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.autoMaskOnBlur)
						.onChange(async value => {
							this.plugin.settings.autoMaskOnBlur = value;
							await this.plugin.saveSettings();
						})
				);
		}

		// ----------------------------------------------------
		// GROUP E: NOTE & FOLDER EXCLUSIONS
		// ----------------------------------------------------
		new Setting(containerEl).setName('Per-note & per-folder masking rules').setHeading();

		new Setting(containerEl)
			.setName('Respect YAML frontmatter exclusion')
			.setDesc('Automatically disable masking for any note containing "confitext: false" in its frontmatter.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.respectFrontmatterExclusion)
					.onChange(async value => {
						this.plugin.settings.respectFrontmatterExclusion = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Excluded folder paths')
			.setDesc('Vault folders where visual masking is always disabled. Enter one folder path per line (e.g. "Public", "Shared/Team").')
			.addTextArea(text => {
				text
					.setPlaceholder('Public\nShared\nPresentations')
					.setValue(this.plugin.settings.excludedFolders.join('\n'))
					.onChange(async value => {
						this.plugin.settings.excludedFolders = value
							.split('\n')
							.map(line => line.trim())
							.filter(line => line.length > 0);
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					});
				text.inputEl.rows = 4;
				text.inputEl.addClass('confitext-folders-textarea');
			});

		// ----------------------------------------------------
		// GROUP F: CONTROLS & SYNTAX PRESERVATION
		// ----------------------------------------------------
		new Setting(containerEl).setName('Controls & syntax preservation').setHeading();

		new Setting(containerEl)
			.setName('Show ribbon icon')
			.setDesc('Add quick-toggle button to the left activity ribbon.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showRibbonIcon).onChange(async value => {
					this.plugin.settings.showRibbonIcon = value;
					await this.plugin.saveSettings();
					this.plugin.updateRibbonIcon();
				})
			);

		new Setting(containerEl)
			.setName('Show status bar indicator')
			.setDesc('Display mode status in the bottom right status bar.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.showStatusIndicator)
					.onChange(async value => {
						this.plugin.settings.showStatusIndicator = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBar();
					})
			);

		new Setting(containerEl)
			.setName('Show tab header action button')
			.setDesc('Add a quick-toggle privacy shield button to the top title bar of note tabs.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.showTabHeaderAction)
					.onChange(async value => {
						this.plugin.settings.showTabHeaderAction = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Mask in Reading View')
			.setDesc('Extend visual masking to Reading View (Preview Mode). Click individual masked words in Reading View to toggle reveal.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.maskReadingView)
					.onChange(async value => {
						this.plugin.settings.maskReadingView = value;
						await this.plugin.saveSettings();
						this.plugin.rerenderPreviewViews();
					})
			);

		new Setting(containerEl)
			.setName('Preserve Markdown syntax')
			.setDesc('Keep headings (#), list bullets (-), quotes (>), and checkboxes readable.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.preserveMarkdownSyntax)
					.onChange(async value => {
						this.plugin.settings.preserveMarkdownSyntax = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Preserve code blocks')
			.setDesc('Do not mask fenced code blocks (```).')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.preserveCodeBlocks)
					.onChange(async value => {
						this.plugin.settings.preserveCodeBlocks = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			);

		new Setting(containerEl)
			.setName('Preserve URLs & links')
			.setDesc('Keep web URLs and Markdown link destinations readable.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.preserveUrls).onChange(async value => {
					this.plugin.settings.preserveUrls = value;
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
				})
			);

		// ----------------------------------------------------
		// GROUP G: INFORMATION & PRIVACY NOTICE
		// ----------------------------------------------------
		new Setting(containerEl).setName('Information & privacy').setHeading();

		const noticeBox = containerEl.createDiv({ cls: 'confitext-notice-box' });
		noticeBox.createEl('strong', { text: 'Important Privacy Notice:' });
		noticeBox.createEl('p', {
			text: 'Confitext is a visual presentation and shoulder-surfing deterrent. It changes how text appears on screen. It does NOT encrypt your notes or protect the underlying Markdown files. Anyone with access to the file system, clipboard, or developer console can read the underlying text.'
		});

		const infoList = containerEl.createEl('ul', { cls: 'confitext-info-list' });
		infoList.createEl('li', {
			text: 'How masking works: Completed words are visually replaced with deterministic glyphs using non-destructive CodeMirror 6 decorations.'
		});
		infoList.createEl('li', {
			text: 'How to reveal text: Simply select words with your mouse or keyboard, or run the "Confitext: Reveal all text" command.'
		});
		infoList.createEl('li', {
			text: 'Public Notes: Add "confitext: false" to YAML frontmatter to disable masking on designated public notes.'
		});
		infoList.createEl('li', {
			text: 'Copy & Paste: Selected text copies the original readable Markdown.'
		});
	}

	hide(): void {
		if (this.sandboxAnimRaf !== null) {
			window.cancelAnimationFrame(this.sandboxAnimRaf);
			this.sandboxAnimRaf = null;
		}
	}

	/**
	 * Renders the interactive Live Matrix Sandbox directly inside the settings tab
	 */
	private renderLiveSandbox(containerEl: HTMLElement): void {
		const card = containerEl.createDiv({ cls: 'confitext-sandbox-card' });

		// HUD Title Bar
		const hudBar = card.createDiv({ cls: 'confitext-sandbox-hud' });
		const hudLeft = hudBar.createDiv({ cls: 'confitext-sandbox-hud-left' });
		hudLeft.createSpan({ cls: 'confitext-hud-dot dot-red' });
		hudLeft.createSpan({ cls: 'confitext-hud-dot dot-yellow' });
		hudLeft.createSpan({ cls: 'confitext-hud-dot dot-green' });
		hudLeft.createSpan({ cls: 'confitext-sandbox-hud-title', text: '⚡ LIVE MATRIX PRIVACY SANDBOX' });

		this.sandboxPillEl = hudBar.createDiv({ cls: 'confitext-sandbox-pills' });
		this.updateSandboxPills();

		// Interactive Display Screen
		this.sandboxDisplayEl = card.createDiv({ cls: 'confitext-sandbox-screen' });
		this.sandboxDisplayEl.title = 'Click to toggle selection reveal';
		this.sandboxDisplayEl.addEventListener('click', () => {
			this.sandboxRevealed = !this.sandboxRevealed;
			this.updateSandboxDisplay();
		});

		// Controls Bar
		const controls = card.createDiv({ cls: 'confitext-sandbox-controls' });

		// Test Scramble Button
		const scrambleBtn = controls.createEl('button', {
			cls: 'confitext-sandbox-btn confitext-btn-primary',
			text: '▶ Trigger Scramble Test'
		});
		scrambleBtn.addEventListener('click', () => {
			this.triggerSandboxScramble();
		});

		// Toggle Reveal Button
		const revealBtn = controls.createEl('button', {
			cls: 'confitext-sandbox-btn',
			text: this.sandboxRevealed ? '🔒 Mask Preview' : '👁️ Reveal Preview'
		});
		revealBtn.addEventListener('click', () => {
			this.sandboxRevealed = !this.sandboxRevealed;
			revealBtn.setText(this.sandboxRevealed ? '🔒 Mask Preview' : '👁️ Reveal Preview');
			this.updateSandboxDisplay();
		});

		// Editable Input for custom words
		const inputRow = card.createDiv({ cls: 'confitext-sandbox-input-row' });
		inputRow.createSpan({ cls: 'confitext-sandbox-input-label', text: 'Test text:' });
		const inputEl = inputRow.createEl('input', {
			cls: 'confitext-sandbox-input',
			type: 'text',
			value: this.sandboxInput
		});
		inputEl.placeholder = 'Type anything to test live masking...';
		inputEl.addEventListener('input', () => {
			this.sandboxInput = inputEl.value || ' ';
			this.updateSandboxDisplay();
		});

		// Initial display render
		this.updateSandboxDisplay();
	}

	/**
	 * Updates the badges/pills displayed in the sandbox HUD
	 */
	private updateSandboxPills(): void {
		if (!this.sandboxPillEl) return;
		this.sandboxPillEl.empty();

		const palette = resolveGlyphPalette(this.plugin.settings.glyphStyle, this.plugin.settings.customGlyphs);
		const paletteName = this.plugin.settings.glyphStyle.toUpperCase();

		this.sandboxPillEl.createSpan({
			cls: 'confitext-pill confitext-pill-active',
			text: `STYLE: ${paletteName}`
		});

		this.sandboxPillEl.createSpan({
			cls: 'confitext-pill',
			text: `GLYPHS: ${palette.length}`
		});

		this.sandboxPillEl.createSpan({
			cls: 'confitext-pill',
			text: `SPEED: ${this.plugin.settings.animationSpeed.toUpperCase()}`
		});
	}

	/**
	 * Refreshes the visual text inside the sandbox screen
	 */
	private updateSandboxDisplay(
		stage: 'stable' | 'scramble' | 'settling' = 'stable',
		progress = 1.0,
		frameSeed = 0
	): void {
		if (!this.sandboxDisplayEl) return;
		this.sandboxDisplayEl.empty();
		this.updateSandboxPills();

		if (this.sandboxRevealed) {
			this.sandboxDisplayEl.createSpan({
				cls: 'confitext-sandbox-revealed-text',
				text: this.sandboxInput
			});
			return;
		}

		// Split text into words and delimiters
		const parts = this.sandboxInput.split(/(\s+|[.,!?;:"“”()[\]{}]+)/u);

		for (const part of parts) {
			if (!part) continue;
			if (/^(\s+|[.,!?;:"“”()[\]{}]+)$/u.test(part)) {
				// Delimiter: render as plain whitespace/punctuation
				this.sandboxDisplayEl.createSpan({
					cls: 'confitext-sandbox-delim',
					text: part
				});
			} else {
				// Word: render as masked glyphs
				const stable = getStableGlyphs(
					part,
					this.plugin.settings.glyphStyle,
					this.plugin.settings.customGlyphs
				);

				let glyphs = stable;
				if (stage !== 'stable') {
					glyphs = getScrambleGlyphs(
						part,
						stable,
						progress,
						frameSeed,
						this.plugin.settings.glyphStyle,
						this.plugin.settings.customGlyphs
					);
				}

				const stageCls = stage !== 'stable' ? ` confitext-${stage}` : '';
				const glyphSpan = this.sandboxDisplayEl.createSpan({
					cls: `confitext-glyph${stageCls}`,
					text: glyphs
				});
				glyphSpan.setAttribute('data-word', part);
			}
		}
	}

	/**
	 * Runs a live animation loop inside the sandbox display
	 */
	private triggerSandboxScramble(): void {
		if (this.sandboxAnimRaf !== null) {
			window.cancelAnimationFrame(this.sandboxAnimRaf);
			this.sandboxAnimRaf = null;
		}

		this.sandboxRevealed = false;
		const duration = DURATION_MAP[this.plugin.settings.animationSpeed] || 280;
		const startTime = performance.now();

		const step = () => {
			const elapsed = performance.now() - startTime;
			const progress = Math.min(1.0, elapsed / duration);
			const frameSeed = Math.floor(elapsed / 30);
			const stage = progress < 0.55 ? 'scramble' : (progress < 1.0 ? 'settling' : 'stable');

			this.updateSandboxDisplay(stage, progress, frameSeed);

			if (progress < 1.0) {
				this.sandboxAnimRaf = window.requestAnimationFrame(step);
			} else {
				this.sandboxAnimRaf = null;
				this.updateSandboxDisplay('stable', 1.0, 0);
			}
		};

		this.sandboxAnimRaf = window.requestAnimationFrame(step);
	}
}
