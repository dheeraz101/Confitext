/**
 * Confitext - Plugin Settings Tab
 * High-end Apple HIG / macOS Sequoia aesthetic with imperative display() lifecycle.
 */

import { App, PluginSettingTab, Setting, Notice, TFile, Platform } from 'obsidian';
import type ConfitextPlugin from './main';
import {
	ConfitextMode,
	MaskingScope,
	MaskTriggerMode,
	GlyphPaletteName,
	MaskColorTheme,
	AnimationSpeed,
	PerformanceMode,
	SensitivePatternConfig
} from './types';
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
		this.render();
	}

	private refreshTab(): void {
		this.render();
	}

	private render(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('confitext-settings-pane');

		// ----------------------------------------------------
		// 1. HERO HEADER & DYNAMIC ISLAND STATUS
		// ----------------------------------------------------
		this.renderHeroHeader(containerEl);

		// ----------------------------------------------------
		// 2. LIVE PRIVACY TERMINAL & INTERACTIVE SANDBOX
		// ----------------------------------------------------
		this.renderLiveSandbox(containerEl);

		// ----------------------------------------------------
		// 3. REDACTION STRATEGY & TARGETED WORDS (Req 1)
		// ----------------------------------------------------
		this.renderRedactionStrategyCard(containerEl);

		// ----------------------------------------------------
		// 4. SENSITIVE DATA SHIELD (Pattern/PII Masking - Req 2)
		// ----------------------------------------------------
		this.renderSensitiveShieldCard(containerEl);

		// ----------------------------------------------------
		// 5. BEHAVIOR & GLANCE INTERACTIONS
		// ----------------------------------------------------
		this.renderBehaviorCard(containerEl);

		// ----------------------------------------------------
		// 6. VISUAL AESTHETICS & GLYPH PALETTES
		// ----------------------------------------------------
		this.renderAppearanceCard(containerEl);

		// ----------------------------------------------------
		// 7. ANIMATION & MOTION
		// ----------------------------------------------------
		this.renderAnimationCard(containerEl);

		// ----------------------------------------------------
		// 8. IDLE, BLUR & FOCUS AUTOMATIONS
		// ----------------------------------------------------
		this.renderAutomationCard(containerEl);

		// ----------------------------------------------------
		// 9 & 10. PC DESKTOP PRO & MOBILE TOUCH SUITES (Platform Specific)
		// ----------------------------------------------------
		if (Platform.isMobile) {
			this.renderMobileShieldCard(containerEl);
		} else {
			this.renderDesktopProCard(containerEl);
		}

		// ----------------------------------------------------
		// 11. EXCLUSIONS & SYNTAX PRESERVATION
		// ----------------------------------------------------
		this.renderRulesAndSyntaxCard(containerEl);

		// ----------------------------------------------------
		// 12. SECURITY & PRIVACY ARCHITECTURE CALLOUT
		// ----------------------------------------------------
		this.renderSecurityCard(containerEl);

		// ----------------------------------------------------
		// 13. YABP FOOTER & LEGAL TRANSPARENCY
		// ----------------------------------------------------
		this.renderFooter(containerEl);
	}

	hide(): void {
		if (this.sandboxAnimRaf !== null) {
			window.cancelAnimationFrame(this.sandboxAnimRaf);
			this.sandboxAnimRaf = null;
		}
	}

	/**
	 * Creates an Apple HIG / Inset Grouped section header with a distinct
	 * category capsule pill on top and the section title cleanly on the line below.
	 */
	private createSectionHeader(
		containerEl: HTMLElement,
		title: string,
		badgeText: string,
		badgeModifierCls: string
	): Setting {
		const heading = new Setting(containerEl).setHeading();
		heading.setClass('confitext-section-header');
		heading.nameEl.empty();
		const badgeWrapper = heading.nameEl.createDiv({ cls: 'section-badge-wrapper' });
		badgeWrapper.createSpan({ cls: `section-badge ${badgeModifierCls}`, text: badgeText });
		heading.nameEl.createDiv({ cls: 'confitext-section-title', text: title });
		return heading;
	}

	// =========================================================================
	// 1. HERO HEADER & STATUS ISLAND
	// =========================================================================
	private renderHeroHeader(containerEl: HTMLElement): void {
		const hero = containerEl.createDiv({ cls: 'confitext-hero-card' });

		const topRow = hero.createDiv({ cls: 'confitext-hero-top' });
		const titleGroup = topRow.createDiv({ cls: 'confitext-hero-title-group' });

		const titleRow = titleGroup.createDiv({ cls: 'confitext-hero-title-row' });
		titleRow.createDiv({ cls: 'confitext-hero-title', text: 'Confitext' });
		titleRow.createSpan({ cls: 'confitext-pill-badge badge-version', text: `v${this.plugin.manifest.version}` });
		titleRow.createSpan({ cls: 'confitext-pill-badge badge-author', text: 'By Dheeraz' });

		titleGroup.createEl('p', {
			cls: 'confitext-hero-subtitle',
			text: 'Real-time visual privacy shield for distraction-free writing and shoulder-surfing deterrence.'
		});

		// Dynamic Island Status Banner
		const statusCard = hero.createDiv({ cls: 'confitext-island-card' });
		const statusLeft = statusCard.createDiv({ cls: 'confitext-island-left' });

		const isEnabled = this.plugin.settings.enabled;
		const mode = this.plugin.currentMode;
		const scope = this.plugin.settings.maskingScope;

		let dotClass = 'pulse-off';
		let statusLabel = 'INACTIVE • DISABLED';
		let statusDesc = 'Visual privacy veil is currently disabled.';

		if (!isEnabled) {
			dotClass = 'pulse-off';
			statusLabel = 'INACTIVE • DISABLED';
			statusDesc = 'Enable master switch to activate privacy masking.';
		} else if (mode === 'revealed') {
			dotClass = 'pulse-amber';
			statusLabel = 'REVEALED • ALL TEXT READABLE';
			statusDesc = 'All words are temporarily revealed for reading or presentations.';
		} else if (mode === 'paused') {
			dotClass = 'pulse-amber';
			statusLabel = 'PAUSED • MASKING SUSPENDED';
			statusDesc = 'Masking is paused and will resume on next toggle.';
		} else if (scope === 'targeted-only') {
			dotClass = 'pulse-cyan';
			statusLabel = 'PROTECTED • TARGETED REDACTION';
			statusDesc = `Selectively concealing ${this.plugin.settings.globalMaskedWords.length} remembered terms & sensitive patterns.`;
		} else {
			dotClass = 'pulse-green';
			statusLabel = 'PROTECTED • FULL SCREEN VEIL';
			statusDesc = 'Continuous visual mask applied across all completed words.';
		}

		statusLeft.createSpan({ cls: `confitext-pulse-dot ${dotClass}` });
		const statusTextGroup = statusLeft.createDiv({ cls: 'confitext-island-text' });
		statusTextGroup.createSpan({ cls: 'confitext-island-label', text: statusLabel });
		statusTextGroup.createSpan({ cls: 'confitext-island-desc', text: statusDesc });

		// Quick Action Buttons
		const actionGroup = statusCard.createDiv({ cls: 'confitext-island-actions' });

		const toggleModeBtn = actionGroup.createEl('button', {
			cls: 'confitext-btn confitext-btn-secondary',
			text: mode === 'masking' ? '👁️ Reveal All' : '🔒 Mask All'
		});
		toggleModeBtn.addEventListener('click', () => {
			if (this.plugin.currentMode === 'masking') {
				this.plugin.setMode('revealed');
			} else {
				this.plugin.setMode('masking');
			}
			this.refreshTab();
		});

		const panicBtn = actionGroup.createEl('button', {
			cls: 'confitext-btn confitext-btn-panic',
			text: '⚡ Panic Conceal'
		});
		panicBtn.title = 'Instantly mask all text and clear active selections';
		panicBtn.addEventListener('click', () => {
			this.plugin.panicHide();
			this.refreshTab();
		});

		const whatsNewBtn = actionGroup.createEl('button', {
			cls: 'confitext-btn confitext-btn-ghost',
			text: "What's New"
		});
		whatsNewBtn.addEventListener('click', () => {
			void this.plugin.openWhatsNewTab();
		});

		const websiteBtn = actionGroup.createEl('button', {
			cls: 'confitext-btn confitext-btn-ghost',
			text: '🌐 Website'
		});
		websiteBtn.title = 'Open official Confitext website and interactive documentation';
		websiteBtn.addEventListener('click', () => {
			window.open('https://dheeraz101.github.io/Confitext/', '_blank');
		});
	}

	// =========================================================================
	// 2. LIVE PRIVACY TERMINAL & INTERACTIVE SANDBOX
	// =========================================================================
	private renderLiveSandbox(containerEl: HTMLElement): void {
		const card = containerEl.createDiv({ cls: 'confitext-card confitext-sandbox-window' });

		// macOS Window Header
		const winHeader = card.createDiv({ cls: 'confitext-window-header' });
		const winHeaderLeft = winHeader.createDiv({ cls: 'confitext-window-header-left' });
		const lights = winHeaderLeft.createDiv({ cls: 'confitext-window-lights' });
		lights.createSpan({ cls: 'window-dot dot-close' });
		lights.createSpan({ cls: 'window-dot dot-min' });
		lights.createSpan({ cls: 'window-dot dot-max' });

		winHeaderLeft.createSpan({ cls: 'confitext-window-title', text: 'PRIVACY PREVIEW & SANDBOX' });

		this.sandboxPillEl = card.createDiv({ cls: 'confitext-window-pills' });
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

		const scrambleBtn = controls.createEl('button', {
			cls: 'confitext-btn confitext-btn-primary',
			text: '▶ Trigger Scramble Test'
		});
		scrambleBtn.addEventListener('click', () => {
			this.triggerSandboxScramble();
		});

		const revealBtn = controls.createEl('button', {
			cls: 'confitext-btn confitext-btn-secondary',
			text: this.sandboxRevealed ? '🔒 Mask Preview' : '👁️ Reveal Preview'
		});
		revealBtn.addEventListener('click', () => {
			this.sandboxRevealed = !this.sandboxRevealed;
			revealBtn.setText(this.sandboxRevealed ? '🔒 Mask Preview' : '👁️ Reveal Preview');
			this.updateSandboxDisplay();
		});

		// Editable Input for live typing
		const inputRow = card.createDiv({ cls: 'confitext-sandbox-input-row' });
		inputRow.createSpan({ cls: 'confitext-input-caption', text: 'Test input:' });
		const inputEl = inputRow.createEl('input', {
			cls: 'confitext-input-field',
			type: 'text',
			value: this.sandboxInput
		});
		inputEl.placeholder = 'Type words to test real-time masking & scramble...';
		inputEl.addEventListener('input', () => {
			this.sandboxInput = inputEl.value || ' ';
			this.updateSandboxDisplay();
		});

		this.updateSandboxDisplay();
	}

	private updateSandboxPills(): void {
		if (!this.sandboxPillEl) return;
		this.sandboxPillEl.empty();

		const palette = resolveGlyphPalette(this.plugin.settings.glyphStyle, this.plugin.settings.customGlyphs);
		const paletteName = this.plugin.settings.glyphStyle.toUpperCase();

		this.sandboxPillEl.createSpan({
			cls: 'confitext-tag-pill active',
			text: `STYLE: ${paletteName}`
		});

		this.sandboxPillEl.createSpan({
			cls: 'confitext-tag-pill',
			text: `GLYPHS: ${palette.length}`
		});

		const scopeShort = this.plugin.settings.maskingScope === 'all-words' ? 'ALL' : 'TARGETED';
		this.sandboxPillEl.createSpan({
			cls: 'confitext-tag-pill',
			text: `SCOPE: ${scopeShort}`
		});

		this.sandboxPillEl.createSpan({
			cls: 'confitext-tag-pill',
			text: `TRIGGER: ${(this.plugin.settings.maskTriggerMode || 'word').toUpperCase()}`
		});
	}

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

		const parts = this.sandboxInput.split(/(\s+|[.,!?;:"“”()[\]{}]+)/u);

		for (const part of parts) {
			if (!part) continue;
			if (/^(\s+|[.,!?;:"“”()[\]{}]+)$/u.test(part)) {
				this.sandboxDisplayEl.createSpan({
					cls: 'confitext-sandbox-delim',
					text: part
				});
			} else {
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

	// =========================================================================
	// 3. REDACTION STRATEGY & TARGETED WORDS (Requirement 1)
	// =========================================================================
	private renderRedactionStrategyCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Redaction Strategy & Targeted Words', 'STRATEGY', 'badge-strategy');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		// Segmented Control for Masking Scope
		const scopeSetting = new Setting(card)
			.setName('Masking scope')
			.setDesc('Choose between continuous full-screen privacy or selective redaction of sensitive terms.')
			.addDropdown(drop =>
				drop
					.addOption('all-words', 'All Words (Full Screen Veil)')
					.addOption('targeted-only', 'Targeted Words Only (Selective Redaction)')
					.setValue(this.plugin.settings.maskingScope)
					.onChange(async (val: string) => {
						this.plugin.settings.maskingScope = val as MaskingScope;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
						this.plugin.updateStatusBar();
						this.plugin.updateRibbonIcon();
						this.refreshTab();
					})
			);
		scopeSetting.setClass('confitext-setting-item');
		scopeSetting.setClass('confitext-setting-stacked');

		new Setting(card)
			.setName('Match case sensitive')
			.setDesc('When enabled, targeted words must match exact letter casing.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.caseSensitiveTargeting)
					.onChange(async val => {
						this.plugin.settings.caseSensitiveTargeting = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		// ----------------------------------------------------
		// Global Remembered Masked Words Manager
		// ----------------------------------------------------
		const globalSection = card.createDiv({ cls: 'confitext-token-manager' });
		const globalHeader = globalSection.createDiv({ cls: 'confitext-token-header' });
		globalHeader.createSpan({ cls: 'token-title', text: 'Global Remembered Words' });
		globalHeader.createSpan({
			cls: 'token-counter-pill',
			text: `${this.plugin.settings.globalMaskedWords.length} terms remembered`
		});

		globalSection.createEl('p', {
			cls: 'confitext-card-desc',
			text: 'Words and phrases listed here are remembered and automatically masked across all notes and pages in your vault, now and in the future.'
		});

		// Input row to add new global word
		const addRow = globalSection.createDiv({ cls: 'confitext-add-row' });
		const addInput = addRow.createEl('input', {
			cls: 'confitext-input-field',
			type: 'text',
			placeholder: 'Add confidential word or phrase (e.g. client name, secret project)...'
		});
		const addBtn = addRow.createEl('button', {
			cls: 'confitext-btn confitext-btn-primary',
			text: 'Add Word'
		});

		const commitAddWord = async () => {
			const val = addInput.value.trim();
			if (!val) return;
			await this.plugin.addMaskedWordGlobally(val);
			addInput.value = '';
			this.refreshTab();
		};

		addBtn.addEventListener('click', () => {
			void commitAddWord();
		});
		addInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				void commitAddWord();
			}
		});

		// Interactive Chips List
		const chipsContainer = globalSection.createDiv({ cls: 'confitext-chips-grid' });
		if (this.plugin.settings.globalMaskedWords.length === 0) {
			chipsContainer.createDiv({
				cls: 'confitext-empty-state',
				text: 'No global words added yet. Type a word above or right-click any selected text in the editor to remember it.'
			});
		} else {
			for (const word of this.plugin.settings.globalMaskedWords) {
				const chip = chipsContainer.createDiv({ cls: 'confitext-word-chip' });
				chip.createSpan({ cls: 'chip-icon', text: '🔒' });
				chip.createSpan({ cls: 'chip-text', text: word });
				const removeBtn = chip.createSpan({ cls: 'chip-remove', text: '×' });
				removeBtn.title = `Remove "${word}"`;
				removeBtn.addEventListener('click', (e: MouseEvent) => {
					e.stopPropagation();
					void (async () => {
						await this.plugin.removeMaskedWordGlobally(word);
						this.refreshTab();
					})();
				});
			}
		}

		if (this.plugin.settings.globalMaskedWords.length > 0) {
			const clearRow = globalSection.createDiv({ cls: 'confitext-clear-row' });
			const clearBtn = clearRow.createEl('button', {
				cls: 'confitext-btn confitext-btn-ghost-danger',
				text: 'Clear All Global Words'
			});
			clearBtn.addEventListener('click', () => {
				void (async () => {
					await this.plugin.clearGlobalMaskedWords();
					new Notice('Confitext: Cleared all globally remembered words');
					this.refreshTab();
				})();
			});
		}

		// ----------------------------------------------------
		// Active Note Frontmatter Words Manager
		// ----------------------------------------------------
		const noteSection = card.createDiv({ cls: 'confitext-token-manager note-level' });
		const activeFile = this.app.workspace.getActiveFile();

		const noteHeader = noteSection.createDiv({ cls: 'confitext-token-header' });
		noteHeader.createSpan({
			cls: 'token-title',
			text: activeFile ? `Active Note Words (${activeFile.basename})` : 'Active Note Words'
		});

		if (activeFile instanceof TFile) {
			noteSection.createEl('p', {
				cls: 'confitext-card-desc',
				text: `Words stored in the YAML frontmatter ("confitext-masked-words") of "${activeFile.basename}". Masked specifically within this note.`
			});

			const fm = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
			const rawWords: unknown = fm?.['confitext-masked-words'] ?? fm?.['confitext_masked_words'] ?? fm?.['masked-words'];
			let noteWords: string[] = [];
			if (Array.isArray(rawWords)) {
				noteWords = (rawWords as unknown[]).map(x => String(x).trim()).filter(Boolean);
			} else if (typeof rawWords === 'string') {
				noteWords = rawWords.split(',').map(s => s.trim()).filter(Boolean);
			}

			const noteAddRow = noteSection.createDiv({ cls: 'confitext-add-row' });
			const noteAddInput = noteAddRow.createEl('input', {
				cls: 'confitext-input-field',
				type: 'text',
				placeholder: `Add word specifically to "${activeFile.basename}"...`
			});
			const noteAddBtn = noteAddRow.createEl('button', {
				cls: 'confitext-btn confitext-btn-secondary',
				text: 'Add to Note'
			});

			const commitNoteWord = async () => {
				const val = noteAddInput.value.trim();
				if (!val) return;
				await this.plugin.addMaskedWordToNote(activeFile, val);
				noteAddInput.value = '';
				this.refreshTab();
			};

			noteAddBtn.addEventListener('click', () => {
				void commitNoteWord();
			});
			noteAddInput.addEventListener('keydown', (e: KeyboardEvent) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					void commitNoteWord();
				}
			});

			const noteChipsContainer = noteSection.createDiv({ cls: 'confitext-chips-grid' });
			if (noteWords.length === 0) {
				noteChipsContainer.createDiv({
					cls: 'confitext-empty-state',
					text: `No note-specific words in "${activeFile.basename}". Add words above or right-click text in the note.`
				});
			} else {
				for (const word of noteWords) {
					const chip = noteChipsContainer.createDiv({ cls: 'confitext-word-chip chip-note' });
					chip.createSpan({ cls: 'chip-icon', text: '📄' });
					chip.createSpan({ cls: 'chip-text', text: word });
					const removeBtn = chip.createSpan({ cls: 'chip-remove', text: '×' });
					removeBtn.title = `Remove "${word}" from note`;
					removeBtn.addEventListener('click', (e: MouseEvent) => {
						e.stopPropagation();
						void (async () => {
							await this.plugin.removeMaskedWordFromNote(activeFile, word);
							this.refreshTab();
						})();
					});
				}
			}
		} else {
			noteSection.createDiv({
				cls: 'confitext-empty-state',
				text: 'Open any Markdown note in the editor to inspect and manage its note-specific frontmatter words.'
			});
		}
	}

	// =========================================================================
	// 4. SENSITIVE DATA SHIELD (Pattern/PII Masking - Requirement 2)
	// =========================================================================
	private renderSensitiveShieldCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Sensitive Data Shield & Pattern Masking', 'SHIELD', 'badge-shield');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Enable sensitive data shield')
			.setDesc('Automatically detect and shield credentials, personal identifiers, and tokens across your notes.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enablePatternMasking)
					.onChange(async val => {
						this.plugin.settings.enablePatternMasking = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
						this.refreshTab();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		if (this.plugin.settings.enablePatternMasking) {
			const grid = card.createDiv({ cls: 'confitext-switch-grid' });

			new Setting(grid)
				.setName('✉️ Email addresses')
				.setDesc('Mask addresses like name@domain.com')
				.addToggle(toggle =>
					toggle.setValue(this.plugin.settings.maskEmails).onChange(async val => {
						this.plugin.settings.maskEmails = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			new Setting(grid)
				.setName('🔑 API keys & developer secrets')
				.setDesc('Shield OpenAI (sk-...), GitHub (ghp_...), AWS, and Bearer tokens')
				.addToggle(toggle =>
					toggle.setValue(this.plugin.settings.maskApiKeys).onChange(async val => {
						this.plugin.settings.maskApiKeys = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			new Setting(grid)
				.setName('💳 Payment card numbers')
				.setDesc('Conceal 13–19 digit grouped card numbers')
				.addToggle(toggle =>
					toggle.setValue(this.plugin.settings.maskCreditCards).onChange(async val => {
						this.plugin.settings.maskCreditCards = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			new Setting(grid)
				.setName('📞 Phone numbers')
				.setDesc('Shield domestic and international phone numbers')
				.addToggle(toggle =>
					toggle.setValue(this.plugin.settings.maskPhoneNumbers).onChange(async val => {
						this.plugin.settings.maskPhoneNumbers = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			new Setting(grid)
				.setName('🌐 IPv4 network addresses')
				.setDesc('Mask internal and external IP addresses')
				.addToggle(toggle =>
					toggle.setValue(this.plugin.settings.maskIpAddresses).onChange(async val => {
						this.plugin.settings.maskIpAddresses = val;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			// Custom Regex Patterns section
			const customRegexSection = card.createDiv({ cls: 'confitext-custom-regex-section' });
			customRegexSection.createSpan({ cls: 'token-title', text: 'Custom Regular Expression Patterns' });
			customRegexSection.createEl('p', {
				cls: 'confitext-card-desc',
				text: 'Define custom regular expressions to mask proprietary tokens, employee IDs, or ticket codes (e.g. "TICKET-\\d+").'
			});

			const regexAddRow = customRegexSection.createDiv({ cls: 'confitext-regex-add-row' });
			const nameInput = regexAddRow.createEl('input', {
				cls: 'confitext-input-field name-field',
				placeholder: 'Pattern Name (e.g. Employee ID)'
			});
			const patternInput = regexAddRow.createEl('input', {
				cls: 'confitext-input-field pattern-field',
				placeholder: 'Regular Expression (e.g. EMP-\\d{6})'
			});
			const addPatternBtn = regexAddRow.createEl('button', {
				cls: 'confitext-btn confitext-btn-secondary',
				text: 'Add Pattern'
			});

			addPatternBtn.addEventListener('click', () => {
				void (async () => {
					const name = nameInput.value.trim();
					const pattern = patternInput.value.trim();
					if (!name || !pattern) {
						new Notice('Confitext: Please provide both name and regular expression');
						return;
					}
					try {
						new RegExp(pattern);
					} catch {
						new Notice('Confitext: Invalid regular expression syntax');
						return;
					}
					const newConfig: SensitivePatternConfig = {
						id: `custom_${Date.now()}`,
						name,
						desc: '',
						pattern,
						flags: 'gu',
						enabled: true
					};
					this.plugin.settings.customPatterns.push(newConfig);
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
					this.refreshTab();
				})();
			});

			// Display list of active custom patterns
			if (this.plugin.settings.customPatterns.length > 0) {
				const patternList = customRegexSection.createDiv({ cls: 'confitext-regex-list' });
				for (const cp of this.plugin.settings.customPatterns) {
					const item = patternList.createDiv({ cls: 'confitext-regex-item' });
					const info = item.createDiv({ cls: 'regex-info' });
					info.createSpan({ cls: 'regex-name', text: cp.name });
					info.createSpan({ cls: 'regex-pattern', text: `/${cp.pattern}/` });

					const itemControls = item.createDiv({ cls: 'regex-controls' });
					const toggleBtn = itemControls.createEl('button', {
						cls: `confitext-btn ${cp.enabled ? 'confitext-btn-secondary' : 'confitext-btn-ghost'}`,
						text: cp.enabled ? 'Enabled' : 'Disabled'
					});
					toggleBtn.addEventListener('click', () => {
						void (async () => {
							cp.enabled = !cp.enabled;
							await this.plugin.saveSettings();
							this.plugin.dispatchSettingsToEditors();
							this.refreshTab();
						})();
					});

					const delBtn = itemControls.createEl('button', {
						cls: 'confitext-btn confitext-btn-ghost-danger',
						text: 'Delete'
					});
					delBtn.addEventListener('click', () => {
						void (async () => {
							this.plugin.settings.customPatterns = this.plugin.settings.customPatterns.filter(
								p => p.id !== cp.id
							);
							await this.plugin.saveSettings();
							this.plugin.dispatchSettingsToEditors();
							this.refreshTab();
						})();
					});
				}
			}
		}
	}

	// =========================================================================
	// 5. BEHAVIOR & GLANCE INTERACTIONS
	// =========================================================================
	private renderBehaviorCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Behavior & Glance Controls', 'BEHAVIOR', 'badge-behavior');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Enable Confitext')
			.setDesc('Master switch for real-time visual privacy masking.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async value => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
					this.plugin.updateStatusBar();
					this.refreshTab();
				})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Default mode')
			.setDesc('Mode to engage when opening Obsidian or launching new notes.')
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
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');

		// Apple HIG Segmented Control for Mask Trigger Mode
		const currentTriggerMode = this.plugin.settings.maskTriggerMode || 'word';

		const triggerSetting = new Setting(card)
			.setName('Mask trigger rhythm')
			.setDesc('Select when visual masking triggers: as you type words, when moving to a new line, or after completing a paragraph block.');
		triggerSetting.setClass('confitext-setting-item');
		triggerSetting.setClass('confitext-setting-stacked');

		// Apple HIG Segmented Control
		const segControl = triggerSetting.controlEl.createDiv({ cls: 'confitext-segmented-control' });
		const triggerModes: { id: MaskTriggerMode; label: string; desc: string }[] = [
			{
				id: 'word',
				label: 'Per Word',
				desc: 'Masks immediately as you complete each word with Space or punctuation.'
			},
			{
				id: 'line',
				label: 'Per Line',
				desc: 'Keeps the active line readable while typing; masks when moving cursor to another line.'
			},
			{
				id: 'paragraph',
				label: 'Per Paragraph',
				desc: 'Keeps the block readable; masks once you press Enter twice for a blank line gap.'
			}
		];

		for (const m of triggerModes) {
			const btn = segControl.createEl('button', {
				cls: `confitext-segment-btn${currentTriggerMode === m.id ? ' active' : ''}`,
				text: m.label
			});
			btn.title = m.desc;
			btn.addEventListener('click', () => {
				if (this.plugin.settings.maskTriggerMode === m.id) return;
				this.plugin.settings.maskTriggerMode = m.id;
				void (async () => {
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
					this.refreshTab();
				})();
			});
		}

		// Explanatory copy card for all 3 trigger modes with active highlight
		const triggerDescBox = card.createDiv({ cls: 'confitext-trigger-desc-box' });
		for (const m of triggerModes) {
			const item = triggerDescBox.createDiv({
				cls: `confitext-trigger-desc-item${currentTriggerMode === m.id ? ' is-active' : ''}`
			});
			item.createSpan({ cls: 'trigger-badge', text: m.label });
			item.createSpan({ cls: 'trigger-text', text: m.desc });
		}

		new Setting(card)
			.setName('Mask newly completed words')
			.setDesc('Apply visual masking automatically as soon as a word is completed by typing Space or delimiter.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.maskNewlyCompletedWords)
					.onChange(async value => {
						this.plugin.settings.maskNewlyCompletedWords = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Reveal selected text')
			.setDesc('Immediately reveal masked words when highlighted with mouse or keyboard.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.revealSelectedText)
					.onChange(async value => {
						this.plugin.settings.revealSelectedText = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Reveal entire word on selection')
			.setDesc('If a selection intersects part of a word, reveal the entire word for natural reading.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.revealEntireWordOnSelection)
					.onChange(async value => {
						this.plugin.settings.revealEntireWordOnSelection = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
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
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		if (Platform.isDesktop) {
			new Setting(card)
				.setName('Quick peek on hover')
				.setDesc('Temporarily reveal masked words by resting the mouse pointer over them.')
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.enableHoverReveal)
						.onChange(async value => {
							this.plugin.settings.enableHoverReveal = value;
							await this.plugin.saveSettings();
							this.plugin.dispatchSettingsToEditors();
							this.refreshTab();
						})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');

			if (this.plugin.settings.enableHoverReveal) {
				new Setting(card)
					.setName('Hover reveal delay (ms)')
					.setDesc('Milliseconds of hover before underlying text appears.')
					.addSlider(slider =>
						slider
							.setLimits(200, 2000, 100)
							.setValue(this.plugin.settings.hoverRevealDelayMs)
							.onChange(async value => {
								this.plugin.settings.hoverRevealDelayMs = value;
								await this.plugin.saveSettings();
								this.plugin.dispatchSettingsToEditors();
							})
					)
					.setClass('confitext-setting-item')
					.setClass('confitext-setting-stacked');
			}
		}
	}

	// =========================================================================
	// 6. VISUAL AESTHETICS & GLYPH PALETTES
	// =========================================================================
	private renderAppearanceCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Aesthetics & Glyph Palettes', 'APPEARANCE', 'badge-appearance');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Glyph palette')
			.setDesc('Visual character set utilized for masked words.')
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
						this.refreshTab();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');

		if (this.plugin.settings.glyphStyle === 'custom') {
			const customSection = card.createDiv({ cls: 'confitext-custom-importer' });
			const validation = validateCustomGlyphs(this.plugin.settings.customGlyphs);

			const customSetting = new Setting(customSection)
				.setName('Custom Unicode glyphs')
				.setDesc('Supply arbitrary Unicode symbols for thematic masking (requires at least 2 unique characters).')
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-stacked');

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
				cls:
					'confitext-validation-msg ' +
					(validation.valid ? 'confitext-validation-success' : 'confitext-validation-error'),
				text: validation.valid
					? `✓ Valid custom set: ${validation.count} unique glyphs.`
					: `⚠ ${validation.error || 'Invalid glyph set.'}`
			});

			const presetContainer = customSection.createDiv({ cls: 'confitext-preset-section' });
			presetContainer.createSpan({ cls: 'confitext-preset-label', text: 'Quick Thematic Presets:' });

			const btnRow = presetContainer.createDiv({ cls: 'confitext-preset-buttons' });
			for (const preset of Object.values(GLYPH_PRESETS)) {
				const btn = btnRow.createEl('button', {
					cls: 'confitext-btn confitext-btn-ghost',
					text: preset.name
				});
				btn.title = `${preset.description}: ${preset.glyphs.slice(0, 15)}...`;
				btn.addEventListener('click', () => {
					void (async () => {
						this.plugin.settings.customGlyphs = preset.glyphs;
						clearGlyphCache();
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
						this.refreshTab();
					})();
				});
			}
		}

		new Setting(card)
			.setName('Color theme')
			.setDesc('Color palette applied to masked characters.')
			.addDropdown(drop =>
				drop
					.addOption('matrix-green', 'Matrix Luminous Green')
					.addOption('theme-accent', 'Obsidian Theme Accent')
					.addOption('monochrome', 'Monochrome (Subtle)')
					.addOption('custom', 'Custom Accent Color')
					.setValue(this.plugin.settings.maskColorTheme)
					.onChange(async (value: string) => {
						this.plugin.settings.maskColorTheme = value as MaskColorTheme;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
						this.refreshTab();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');

		if (this.plugin.settings.maskColorTheme === 'custom') {
			new Setting(card)
				.setName('Custom accent color')
				.setDesc('Hex color used for visual masking.')
				.addColorPicker(color =>
					color.setValue(this.plugin.settings.customColor).onChange(async value => {
						this.plugin.settings.customColor = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-stacked');
		}

		new Setting(card)
			.setName('Subtle phosphor glow')
			.setDesc('Render a gentle luminescence around masked characters.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.subtleGlow).onChange(async value => {
					this.plugin.settings.subtleGlow = value;
					await this.plugin.saveSettings();
					this.plugin.applyCssVariables();
				})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Mask opacity')
			.setDesc('Adjust the visual density of masked glyphs.')
			.addSlider(slider =>
				slider
					.setLimits(0.4, 1.0, 0.05)
					.setValue(this.plugin.settings.maskOpacity)
					.onChange(async value => {
						this.plugin.settings.maskOpacity = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');
	}

	// =========================================================================
	// 7. ANIMATION & MOTION
	// =========================================================================
	private renderAnimationCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Animation & Scramble Effects', 'MOTION', 'badge-motion');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Enable scramble animation')
			.setDesc('Play a brief glyph-scrambling animation when a word is completed.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableAnimation)
					.onChange(async value => {
						this.plugin.settings.enableAnimation = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
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
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');

		new Setting(card)
			.setName('Respect reduced motion')
			.setDesc('Automatically suppress animations when OS reduced motion is active.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.respectReducedMotion)
					.onChange(async value => {
						this.plugin.settings.respectReducedMotion = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Device performance & battery mode')
			.setDesc('Optimize animation frame rate and GPU filter intensity for mobile devices and low-end hardware.')
			.addDropdown(drop =>
				drop
					.addOption('auto', 'Auto (Detect mobile / low-end)')
					.addOption('high', 'High fidelity (60 FPS, full glow)')
					.addOption('battery-saver', 'Battery saver (30 FPS, lightweight)')
					.setValue(this.plugin.settings.performanceMode || 'auto')
					.onChange((value: string) => {
						void (async () => {
							this.plugin.settings.performanceMode = value as PerformanceMode;
							await this.plugin.saveSettings();
							this.plugin.dispatchSettingsToEditors();
							this.plugin.applyCssVariables();
						})();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');
	}

	// =========================================================================
	// 8. IDLE, BLUR & FOCUS AUTOMATIONS
	// =========================================================================
	private renderAutomationCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Idle, Blur & Focus Automations', 'AUTOMATION', 'badge-automation');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Idle auto-masking timer')
			.setDesc('Automatically engage Masking mode when Obsidian has been idle.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.idleAutoMask)
					.onChange(async value => {
						this.plugin.settings.idleAutoMask = value;
						await this.plugin.saveSettings();
						this.refreshTab();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		if (this.plugin.settings.idleAutoMask) {
			new Setting(card)
				.setName('Idle timeout (minutes)')
				.setDesc('Minutes of inactivity before automatically masking.')
				.addSlider(slider =>
					slider
						.setLimits(1, 60, 1)
						.setValue(this.plugin.settings.idleTimeoutMinutes)
						.onChange(async value => {
							this.plugin.settings.idleTimeoutMinutes = value;
							await this.plugin.saveSettings();
						})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-stacked');

			new Setting(card)
				.setName('Auto-mask on window blur')
				.setDesc('Engage Masking mode as soon as Obsidian loses operating system focus.')
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.autoMaskOnBlur)
						.onChange(async value => {
							this.plugin.settings.autoMaskOnBlur = value;
							await this.plugin.saveSettings();
						})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');
		}
	}

	// =========================================================================
	// 9. MACOS SEQUOIA & PC DESKTOP PRO EXPERIENCE
	// =========================================================================
	private renderDesktopProCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'macOS Sequoia & PC Desktop Pro Experience', 'DESKTOP PRO SUITE', 'badge-desktop');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		const desc = card.createEl('p', { cls: 'confitext-card-desc' });
		desc.setText(
			'Workstation features tailored for PC and macOS. Precision peek delays, multi-display boundaries, and physical Escape key glance ergonomics.'
		);

		new Setting(card)
			.setName('Multi-monitor window blur & edge masking')
			.setDesc('Immediately engages Matrix masking when cursor leaves the Obsidian window boundaries or focus moves to a secondary monitor.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.multiMonitorBlur)
					.onChange(async value => {
						this.plugin.settings.multiMonitorBlur = value;
						await this.plugin.saveSettings();
						this.plugin.updateIdleManager();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Quick glance hover reveal delay')
			.setDesc('Duration the mouse pointer must rest over a masked word before cleartext is revealed.')
			.addDropdown(drop => {
				drop
					.addOption('200', '200 ms (Instant)')
					.addOption('350', '350 ms (Snappy)')
					.addOption('500', '500 ms (Balanced • Default)')
					.addOption('800', '800 ms (Relaxed)')
					.addOption('1200', '1200 ms (Deliberate)')
					.setValue(String(this.plugin.settings.hoverRevealDelayMs || 500))
					.onChange(async val => {
						this.plugin.settings.hoverRevealDelayMs = Number(val);
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					});
			})
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-dropdown');

		new Setting(card)
			.setName('Typography ligature & monospace kerning')
			.setDesc('Enables OpenType monospace font ligatures and zero-width kerning on SF Mono, JetBrains Mono, and Cascadia Code glyphs.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.enableFontLigatures)
					.onChange(async value => {
						this.plugin.settings.enableFontLigatures = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Hold Esc to peek cleartext')
			.setDesc('Press and hold the Escape key to temporarily reveal all masked text for a quick glance. Releasing Escape instantly re-engages privacy masking.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.holdEscToPeek)
					.onChange(async value => {
						this.plugin.settings.holdEscToPeek = value;
						await this.plugin.saveSettings();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		const hotkeyItem = new Setting(card)
			.setName('Quick reveal hotkey tips')
			.setDesc('Toggle masking, panic conceal, or reveal active selections instantly via keyboard shortcuts.')
			.setClass('confitext-setting-item');

		const hotkeyGroup = hotkeyItem.controlEl.createDiv({ cls: 'confitext-hotkey-group' });
		const pill1 = hotkeyGroup.createSpan({ cls: 'confitext-hotkey-pill' });
		pill1.createSpan({ cls: 'confitext-mac-kbd', text: '⌥' });
		pill1.createSpan({ text: ' / ' });
		pill1.createSpan({ cls: 'confitext-mac-kbd', text: 'Alt' });
		pill1.createSpan({ text: ' + ' });
		pill1.createSpan({ cls: 'confitext-mac-kbd', text: 'M' });
		pill1.createSpan({ text: ' Mask Toggle' });

		const pill2 = hotkeyGroup.createSpan({ cls: 'confitext-hotkey-pill' });
		pill2.createSpan({ cls: 'confitext-mac-kbd', text: 'Hold Esc' });
		pill2.createSpan({ text: ' Glance Peek' });
	}

	// =========================================================================
	// 10. IOS & ANDROID TOUCH EXPERIENCE & CORNER COMFORT
	// =========================================================================
	private renderMobileShieldCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'iOS & Android Touch Shield & Ergonomics', 'MOBILE TOUCH SHIELD', 'badge-mobile');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		const desc = card.createEl('p', { cls: 'confitext-card-desc' });
		desc.setText(
			'Mobile touch controls, tactile haptic ticks, battery-saving 30 FPS animation throttling, and Android circular corner safe zones.'
		);

		new Setting(card)
			.setName('Haptic touch feedback')
			.setDesc('Vibrates with subtle haptic ticks on Android and iOS when switching modes, revealing selections, or engaging panic conceal.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.mobileHapticFeedback)
					.onChange(async value => {
						this.plugin.settings.mobileHapticFeedback = value;
						await this.plugin.saveSettings();
						if (value) {
							this.plugin.triggerHaptic(20);
						}
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Battery-saver 30 FPS animation cap')
			.setDesc('Throttles scrambling animations from 60/120 FPS to 30 FPS on mobile, reducing battery drain and device heat.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.batterySaverFps)
					.onChange(async value => {
						this.plugin.settings.batterySaverFps = value;
						await this.plugin.saveSettings();
						this.plugin.applyCssVariables();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Touch gesture word reveal')
			.setDesc('Permits two-finger taps and long-presses to reveal masked words on touchscreens without moving the text cursor.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.mobileSwipeGestureReveal)
					.onChange(async value => {
						this.plugin.settings.mobileSwipeGestureReveal = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		const cornerItem = new Setting(card)
			.setName('Android circular corner comfort')
			.setDesc('Automatic 24px–26px inner padding and vertical clearances ensure text, switches, and buttons sit comfortably away from native Android circular card curvature.')
			.setClass('confitext-setting-item');

		const pill = cornerItem.controlEl.createSpan({ cls: 'section-badge badge-mobile' });
		pill.setText(Platform.isMobile ? 'Active on Android' : '26px Inset Active');
	}

	// =========================================================================
	// 11. EXCLUSIONS & SYNTAX PRESERVATION
	// =========================================================================
	private renderRulesAndSyntaxCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Workspace Rules & Syntax Preservation', 'RULES', 'badge-rules');

		const card = containerEl.createDiv({ cls: 'confitext-card' });

		new Setting(card)
			.setName('Respect YAML frontmatter exclusion')
			.setDesc('Disable masking for any note containing "confitext: false" in its frontmatter.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.respectFrontmatterExclusion)
					.onChange(async value => {
						this.plugin.settings.respectFrontmatterExclusion = value;
						await this.plugin.saveSettings();
						this.plugin.dispatchSettingsToEditors();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Excluded folder paths')
			.setDesc('Folders where visual masking is always disabled (one path per line).')
			.addTextArea(text => {
				text
					.setPlaceholder('Public\nShared/Team\nPresentations')
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
			})
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-stacked');

		new Setting(card)
			.setName('Show ribbon icon')
			.setDesc('Quick toggle icon in Obsidian activity ribbon.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.showRibbonIcon).onChange(async value => {
					this.plugin.settings.showRibbonIcon = value;
					await this.plugin.saveSettings();
					this.plugin.updateRibbonIcon();
				})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Show status bar indicator')
			.setDesc('Display current mode status in bottom status bar.')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.showStatusIndicator)
					.onChange(async value => {
						this.plugin.settings.showStatusIndicator = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBar();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		if (!Platform.isMobile) {
			new Setting(card)
				.setName('Show tab header shield button')
				.setDesc('Add a quick-toggle shield button to the title bar of note tabs (desktop only).')
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.showTabHeaderAction)
						.onChange(async value => {
							this.plugin.settings.showTabHeaderAction = value;
							await this.plugin.saveSettings();
							if (value) {
								this.plugin.setupAllTabHeaderActions();
							} else {
								this.plugin.removeTabHeaderActions();
							}
						})
				)
				.setClass('confitext-setting-item')
				.setClass('confitext-setting-toggle');
		}

		new Setting(card)
			.setName('Mask in Reading View')
			.setDesc('Extend visual masking to Reading View preview mode (click individual words to reveal).')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.maskReadingView)
					.onChange(async value => {
						this.plugin.settings.maskReadingView = value;
						await this.plugin.saveSettings();
						this.plugin.rerenderPreviewViews();
					})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
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
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
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
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');

		new Setting(card)
			.setName('Preserve URLs & links')
			.setDesc('Keep web URLs and Markdown link destinations readable.')
			.addToggle(toggle =>
				toggle.setValue(this.plugin.settings.preserveUrls).onChange(async value => {
					this.plugin.settings.preserveUrls = value;
					await this.plugin.saveSettings();
					this.plugin.dispatchSettingsToEditors();
				})
			)
			.setClass('confitext-setting-item')
			.setClass('confitext-setting-toggle');
	}

	// =========================================================================
	// 10. SECURITY & PRIVACY ARCHITECTURE CALLOUT
	// =========================================================================
	private renderSecurityCard(containerEl: HTMLElement): void {
		this.createSectionHeader(containerEl, 'Privacy & Architecture Guarantees', 'SECURITY', 'badge-security');

		const noticeBox = containerEl.createDiv({ cls: 'confitext-card confitext-security-card' });
		const headerRow = noticeBox.createDiv({ cls: 'security-header-row' });
		headerRow.createSpan({ cls: 'security-icon', text: '🛡️' });
		headerRow.createDiv({ cls: 'security-title', text: '100% Local Execution • Zero Telemetry' });

		noticeBox.createEl('p', {
			cls: 'security-desc',
			text: 'Confitext operates entirely within your local Obsidian environment. No network requests are made, no text is transmitted, and no analytics or telemetry are collected.'
		});

		const calloutList = noticeBox.createEl('ul', { cls: 'security-list' });
		calloutList.createEl('li', {
			text: 'Non-Destructive CodeMirror 6 Layer: Visual masking alters only screen presentation. Your underlying Markdown files remain untouched.'
		});
		calloutList.createEl('li', {
			text: 'Native Copying: Selecting and copying text extracts clean, readable Markdown.'
		});
		calloutList.createEl('li', {
			text: 'Shoulder-Surfing Deterrence: Confitext shields your screen from nearby observers in coffee shops, planes, or video calls. It is not cryptographic encryption for stored files.'
		});
	}

	// =========================================================================
	// 11. YABP INITIATIVE FOOTER & LEGAL TRANSPARENCY
	// =========================================================================
	private renderFooter(containerEl: HTMLElement): void {
		const footerCard = containerEl.createDiv({ cls: 'confitext-card confitext-footer-card' });

		const brandRow = footerCard.createDiv({ cls: 'confitext-footer-brand' });
		const yabpBadge = brandRow.createEl('a', {
			cls: 'confitext-footer-badge',
			href: 'https://yabp.netlify.app/'
		});
		yabpBadge.setAttribute('target', '_blank');
		yabpBadge.setAttribute('rel', 'noopener noreferrer');
		yabpBadge.createSpan({ cls: 'yabp-dot' });
		yabpBadge.createSpan({ text: 'AN YABP INITIATIVE' });

		brandRow.createEl('p', {
			cls: 'confitext-footer-tagline',
			text: 'Yet Another Boring Project • Thoughtful, distraction-free software.'
		});

		const creditRow = footerCard.createDiv({ cls: 'confitext-footer-credits' });
		creditRow.createSpan({ text: 'Crafted with care by ' });
		const authorLink = creditRow.createEl('a', {
			cls: 'confitext-footer-link author-link',
			text: 'Dheeraz',
			href: 'https://github.com/dheeraz101'
		});
		authorLink.setAttribute('target', '_blank');
		authorLink.setAttribute('rel', 'noopener noreferrer');

		// Legal & Transparency Links
		const legalRow = footerCard.createDiv({ cls: 'confitext-footer-legal' });

		const docsLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Docs & Guides',
			href: 'https://dheeraz101.github.io/Confitext/docs.html'
		});
		docsLink.setAttribute('target', '_blank');
		docsLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const privacyLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Privacy Policy',
			href: 'https://dheeraz101.github.io/Confitext/privacy.html'
		});
		privacyLink.setAttribute('target', '_blank');
		privacyLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const termsLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Terms of Use',
			href: 'https://dheeraz101.github.io/Confitext/terms.html'
		});
		termsLink.setAttribute('target', '_blank');
		termsLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const siteLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Website',
			href: 'https://dheeraz101.github.io/Confitext/'
		});
		siteLink.setAttribute('target', '_blank');
		siteLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const githubLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'GitHub',
			href: 'https://github.com/dheeraz101/Confitext'
		});
		githubLink.setAttribute('target', '_blank');
		githubLink.setAttribute('rel', 'noopener noreferrer');
	}
}
