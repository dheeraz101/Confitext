/**
 * Confitext - Main Plugin Entrypoint
 */

import { Plugin, WorkspaceLeaf, MarkdownView, TFile, TFolder, Notice, View } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ConfitextMode, ConfitextSettings, DEFAULT_SETTINGS } from './types';
import { ConfitextSettingTab } from './settings';
import { registerCommands } from './commands';
import { createConfitextExtension } from './editor-extension';
import { setModeEffect, setSettingsEffect, setFilePathEffect, confitextStateField } from './state';
import { clearGlyphCache } from './glyphs';
import { clearRulesCache } from './rules';
import { clearTokenizerCache } from './tokenizer';
import { IdleManager } from './idle';
import { createPreviewMaskProcessor } from './preview';
import { WhatsNewView, VIEW_TYPE_WHATS_NEW } from './whats-new-view';

interface EditorWithCm {
	cm?: EditorView;
}

interface MarkdownPreviewWithRerender {
	rerender?(full?: boolean): void;
}

export default class ConfitextPlugin extends Plugin {
	settings: ConfitextSettings = DEFAULT_SETTINGS;
	currentMode: ConfitextMode = 'masking';
	statusBarItemEl: HTMLElement | null = null;
	ribbonIconEl: HTMLElement | null = null;
	idleManager: IdleManager | null = null;
	private viewsWithAction = new WeakSet<View>();

	async onload(): Promise<void> {
		await this.loadSettings();
		this.currentMode = this.settings.defaultMode;

		// 1. Register CodeMirror 6 Editor Extension (Live Preview & Source Mode)
		this.registerEditorExtension(createConfitextExtension());

		// 2. Register Reading View Markdown Post-Processor (Preview Mode)
		this.registerMarkdownPostProcessor(createPreviewMaskProcessor(this));

		// 3. Register What's New View Tab
		this.registerView(VIEW_TYPE_WHATS_NEW, leaf => new WhatsNewView(leaf, this));

		// 4. Register Commands
		registerCommands(this);

		// 5. Register Settings Tab
		this.addSettingTab(new ConfitextSettingTab(this.app, this));

		// 6. Setup Visual Status & Ribbon Indicators
		this.updateRibbonIcon();
		this.updateStatusBar();
		this.applyCssVariables();

		// 6. Setup Idle & Window Blur Auto-Masking Manager
		this.idleManager = new IdleManager(
			() => this.settings,
			() => {
				if (this.currentMode !== 'masking' && this.settings.enabled) {
					this.setMode('masking');
				}
			},
			() => {
				if (this.currentMode !== 'masking' && this.settings.enabled) {
					this.setMode('masking');
				}
			}
		);
		if (this.settings.idleAutoMask) {
			this.idleManager.start();
		}

		// Update CSS variables when user toggles light/dark theme
		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				this.applyCssVariables();
			})
		);

		// Track active file path changes across editor views for folder exclusion rules
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.dispatchFilePathToEditors();
			})
		);

		// Setup tab header action and file path synchronization
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', leaf => {
				if (leaf?.view instanceof MarkdownView) {
					this.setupTabHeaderAction(leaf.view);
					const cmView = (leaf.view.editor as unknown as EditorWithCm)?.cm;
					const filePath = leaf.view.file?.path || '';
					if (cmView && typeof cmView.dispatch === 'function') {
						const currentState = cmView.state.field(confitextStateField, false);
						if (currentState?.filePath !== filePath) {
							try {
								cmView.dispatch({ effects: setFilePathEffect.of(filePath) });
							} catch {
								// Guard against unmounted views
							}
						}
					}
				}
			})
		);

		// Register native right-click editor context menu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				menu.addSeparator();

				// Targeted word masking on current selection or word under cursor
				const selection = editor.getSelection().trim();
				let targetWord = selection;
				if (!targetWord) {
					const cursor = editor.getCursor();
					const wordRange = editor.wordAt(cursor);
					if (wordRange) {
						targetWord = editor.getRange(wordRange.from, wordRange.to).trim();
					}
				}

				if (targetWord) {
					const displayWord = targetWord.length > 25 ? targetWord.slice(0, 22) + '...' : targetWord;
					const isGlobal = this.settings.globalMaskedWords.some(
						w => w.trim().toLowerCase() === targetWord.toLowerCase()
					);

					if (isGlobal) {
						menu.addItem(item => {
							item
								.setTitle(`Confitext: Unmask "${displayWord}" (remove from global)`)
								.setIcon('unlock')
								.onClick(async () => {
									await this.removeMaskedWordGlobally(targetWord);
									new Notice(`Confitext: "${displayWord}" removed from global masked words`);
								});
						});
					} else {
						menu.addItem(item => {
							item
								.setTitle(`Confitext: Mask "${displayWord}" globally`)
								.setIcon('globe')
								.onClick(async () => {
									await this.addMaskedWordGlobally(targetWord);
									new Notice(`Confitext: "${displayWord}" added to global masked words`);
								});
						});
					}

					const file = view.file;
					if (file) {
						const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
						const rawWords: unknown = fm?.['confitext-masked-words'] ?? fm?.['confitext_masked_words'] ?? fm?.['masked-words'];
						let noteWordsList: string[] = [];
						if (Array.isArray(rawWords)) {
							noteWordsList = (rawWords as unknown[]).map(x => String(x).trim().toLowerCase());
						} else if (typeof rawWords === 'string') {
							noteWordsList = rawWords.split(',').map(s => s.trim().toLowerCase());
						}
						const isLocal = noteWordsList.includes(targetWord.toLowerCase());

						if (isLocal) {
							menu.addItem(item => {
								item
									.setTitle(`Confitext: Unmask "${displayWord}" in active note`)
									.setIcon('file-minus')
									.onClick(async () => {
										await this.removeMaskedWordFromNote(file, targetWord);
										new Notice(`Confitext: "${displayWord}" removed from note masked words`);
									});
							});
						} else {
							menu.addItem(item => {
								item
									.setTitle(`Confitext: Mask "${displayWord}" in active note`)
									.setIcon('file-lock')
									.onClick(async () => {
										await this.addMaskedWordToNote(file, targetWord);
										new Notice(`Confitext: "${displayWord}" added to note masked words`);
									});
							});
						}
					}
					menu.addSeparator();
				}

				// Scope Toggle
				menu.addItem(item => {
					item
						.setTitle(
							this.settings.maskingScope === 'targeted-only'
								? 'Confitext: Scope is TARGETED (Switch to All Words)'
								: 'Confitext: Scope is ALL WORDS (Switch to Targeted Only)'
						)
						.setIcon('sliders')
						.onClick(async () => {
							this.settings.maskingScope =
								this.settings.maskingScope === 'targeted-only' ? 'all-words' : 'targeted-only';
							await this.saveSettings();
							this.dispatchSettingsToEditors();
							new Notice(
								`Confitext: Masking scope set to ${
									this.settings.maskingScope === 'targeted-only'
										? 'Targeted Words Only'
										: 'All Words'
								}`
							);
						});
				});

				menu.addItem(item => {
					item
						.setTitle(this.currentMode === 'masking' ? 'Confitext: Reveal all text' : 'Confitext: Mask all text')
						.setIcon('binary')
						.onClick(() => {
							if (this.currentMode === 'masking') {
								this.setMode('revealed');
							} else {
								this.setMode('masking');
							}
						});
				});

				menu.addItem(item => {
					item
						.setTitle('Confitext: Panic hide & mask all text')
						.setIcon('shield-alert')
						.onClick(() => {
							this.panicHide();
						});
				});

				const file = view.file;
				if (file) {
					menu.addItem(item => {
						item
							.setTitle('Confitext: Toggle note privacy (frontmatter)')
							.setIcon('shield')
							.onClick(() => {
								void this.toggleFileExclusion(file);
							});
					});
				}
			})
		);

		// Register native right-click file explorer context menu
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFolder) {
					const folderPath = file.path;
					const isExcluded = this.settings.excludedFolders.includes(folderPath);
					menu.addSeparator();
					menu.addItem(item => {
						item
							.setTitle(isExcluded ? 'Confitext: Remove folder exclusion' : 'Confitext: Exclude folder from masking')
							.setIcon('folder')
							.onClick(async () => {
								if (isExcluded) {
									this.settings.excludedFolders = this.settings.excludedFolders.filter(p => p !== folderPath);
									new Notice(`Confitext: Masking enabled for folder "${file.name}"`);
								} else {
									this.settings.excludedFolders.push(folderPath);
									new Notice(`Confitext: Masking excluded for folder "${file.name}"`);
								}
								await this.saveSettings();
								this.dispatchSettingsToEditors();
							});
					});
				} else if (file instanceof TFile && file.extension === 'md') {
					menu.addSeparator();
					menu.addItem(item => {
						item
							.setTitle('Confitext: Toggle note privacy (frontmatter)')
							.setIcon('shield')
							.onClick(() => {
								void this.toggleFileExclusion(file);
							});
					});
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', () => {
				clearRulesCache();
				this.dispatchFilePathToEditors();
			})
		);

		// Apply initial state and file paths to all already-loaded leaves
		this.app.workspace.onLayoutReady(() => {
			this.dispatchModeToEditors();
			this.dispatchSettingsToEditors();
			this.dispatchFilePathToEditors();
			this.setupAllTabHeaderActions();
		});
	}

	onunload(): void {
		if (this.idleManager) {
			this.idleManager.destroy();
			this.idleManager = null;
		}

		clearGlyphCache();
		clearRulesCache();
		clearTokenizerCache();

		document.body.classList.remove('confitext-active');
		const root = document.documentElement;
		root.style.removeProperty('--confitext-color');
		root.style.removeProperty('--confitext-bright');
		root.style.removeProperty('--confitext-glow');
		root.style.removeProperty('--confitext-opacity');

		if (this.statusBarItemEl) {
			this.statusBarItemEl.remove();
			this.statusBarItemEl = null;
		}
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<ConfitextSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.updateIdleManager();
	}

	/**
	 * Updates the idle manager state when settings are modified
	 */
	updateIdleManager(): void {
		if (!this.idleManager) return;
		if (this.settings.idleAutoMask) {
			this.idleManager.start();
		} else {
			this.idleManager.stop();
		}
	}

	/**
	 * Opens What's New release notes in a dedicated native Obsidian tab
	 */
	async openWhatsNewTab(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_WHATS_NEW);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf('tab');
		await leaf.setViewState({
			type: VIEW_TYPE_WHATS_NEW,
			active: true
		});
		await this.app.workspace.revealLeaf(leaf);
	}

	/**
	 * Sets the global masking mode and updates editors and indicators
	 */
	setMode(mode: ConfitextMode): void {
		this.currentMode = mode;
		if (mode === 'masking' && !this.settings.enabled) {
			this.settings.enabled = true;
			void this.saveSettings();
			this.dispatchSettingsToEditors();
		}
		this.dispatchModeToEditors();
		this.rerenderPreviewViews();
		this.updateStatusBar();
		this.updateRibbonIcon();
	}

	/**
	 * Instant emergency panic hide: masks all text, deselects editors, and engages masking mode
	 */
	panicHide(): void {
		this.setMode('masking');
		this.iterateEditorViews(view => {
			const head = view.state.selection.main.head;
			view.dispatch({
				selection: { anchor: head, head: head },
				scrollIntoView: false
			});
		});
		new Notice('⚡ Confitext: Panic hide engaged. All text masked.');
	}

	/**
	 * Toggles note frontmatter exclusion (confitext: false)
	 */
	async toggleFileExclusion(file: TFile): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			if (frontmatter['confitext'] === false) {
				delete frontmatter['confitext'];
				new Notice(`Confitext: Masking enabled for "${file.basename}"`);
			} else {
				frontmatter['confitext'] = false;
				new Notice(`Confitext: Masking disabled for "${file.basename}" (marked public)`);
			}
		});
	}

	/**
	 * Dispatches mode change to all active CodeMirror 6 editor views
	 */
	dispatchModeToEditors(): void {
		this.iterateEditorViews(view => {
			view.dispatch({ effects: setModeEffect.of(this.currentMode) });
		});
	}

	/**
	 * Rerenders open Reading View preview modes when masking mode changes
	 */
	rerenderPreviewViews(): void {
		if (!this.settings.maskReadingView) return;
		this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			if (leaf.view instanceof MarkdownView) {
				const pv = leaf.view as unknown as { previewMode?: MarkdownPreviewWithRerender };
				pv.previewMode?.rerender?.(true);
			}
		});
	}

	/**
	 * Dispatches updated settings to all active CodeMirror 6 editor views
	 */
	dispatchSettingsToEditors(): void {
		clearRulesCache();
		clearTokenizerCache();
		this.iterateEditorViews((view, leaf) => {
			const filePath = (leaf.view as MarkdownView).file?.path || '';
			view.dispatch({
				effects: [
					setSettingsEffect.of(this.settings),
					setFilePathEffect.of(filePath)
				]
			});
		});
		this.rerenderPreviewViews();
	}

	/**
	 * Dispatches note file path to all open editor views for folder exclusion rules
	 */
	dispatchFilePathToEditors(): void {
		this.iterateEditorViews((view, leaf) => {
			const filePath = (leaf.view as MarkdownView).file?.path || '';
			const currentState = view.state.field(confitextStateField, false);
			if (currentState?.filePath !== filePath) {
				view.dispatch({ effects: setFilePathEffect.of(filePath) });
			}
		});
	}

	/**
	 * Configures privacy action button on a MarkdownView tab header
	 */
	setupTabHeaderAction(view: MarkdownView): void {
		if (!this.settings.showTabHeaderAction) return;
		if (this.viewsWithAction.has(view)) return;
		this.viewsWithAction.add(view);

		view.addAction('shield', 'Confitext: Toggle masking', () => {
			if (this.currentMode === 'masking') {
				this.setMode('revealed');
				new Notice('Confitext: All text revealed');
			} else {
				this.setMode('masking');
				new Notice('Confitext: Masking enabled');
			}
		});
	}

	/**
	 * Sets up tab header actions across all currently open leaves
	 */
	private setupAllTabHeaderActions(): void {
		if (!this.settings.showTabHeaderAction) return;
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof MarkdownView) {
				this.setupTabHeaderAction(leaf.view);
			}
		});
	}

	/**
	 * Helper to iterate across all open markdown editor views
	 */
	private iterateEditorViews(callback: (view: EditorView, leaf: WorkspaceLeaf) => void): void {
		this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			if (leaf.view instanceof MarkdownView) {
				const cmView = (leaf.view.editor as unknown as EditorWithCm)?.cm;
				if (cmView && typeof cmView.dispatch === 'function') {
					try {
						callback(cmView, leaf);
					} catch {
						// Guard against destroyed or unmounted views
					}
				}
			}
		});
	}

	/**
	 * Adds a word or phrase to global remembered masked words
	 */
	async addMaskedWordGlobally(word: string): Promise<void> {
		const clean = word.trim();
		if (!clean) return;
		if (!this.settings.globalMaskedWords.some(w => w.toLowerCase() === clean.toLowerCase())) {
			this.settings.globalMaskedWords.push(clean);
			await this.saveSettings();
			this.dispatchSettingsToEditors();
		}
	}

	/**
	 * Removes a word from global remembered masked words
	 */
	async removeMaskedWordGlobally(word: string): Promise<void> {
		const clean = word.trim().toLowerCase();
		this.settings.globalMaskedWords = this.settings.globalMaskedWords.filter(
			w => w.trim().toLowerCase() !== clean
		);
		await this.saveSettings();
		this.dispatchSettingsToEditors();
	}

	/**
	 * Clears all globally remembered masked words
	 */
	async clearGlobalMaskedWords(): Promise<void> {
		this.settings.globalMaskedWords = [];
		await this.saveSettings();
		this.dispatchSettingsToEditors();
	}

	/**
	 * Adds a word to the active note's frontmatter confitext-masked-words list
	 */
	async addMaskedWordToNote(file: TFile, word: string): Promise<void> {
		const clean = word.trim();
		if (!clean) return;
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			let list: string[] = [];
			const existing =
				frontmatter['confitext-masked-words'] ??
				frontmatter['confitext_masked_words'] ??
				frontmatter['masked-words'];
			if (Array.isArray(existing)) {
				list = existing.map(x => String(x).trim()).filter(Boolean);
			} else if (typeof existing === 'string') {
				list = existing.split(',').map(s => s.trim()).filter(Boolean);
			}
			if (!list.some(w => w.toLowerCase() === clean.toLowerCase())) {
				list.push(clean);
			}
			frontmatter['confitext-masked-words'] = list;
		});
		clearRulesCache();
		this.dispatchSettingsToEditors();
	}

	/**
	 * Removes a word from the active note's frontmatter confitext-masked-words list
	 */
	async removeMaskedWordFromNote(file: TFile, word: string): Promise<void> {
		const clean = word.trim().toLowerCase();
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			const existing =
				frontmatter['confitext-masked-words'] ??
				frontmatter['confitext_masked_words'] ??
				frontmatter['masked-words'];
			if (Array.isArray(existing)) {
				const updated = existing
					.map(x => String(x).trim())
					.filter(x => x && x.toLowerCase() !== clean);
				if (updated.length > 0) {
					frontmatter['confitext-masked-words'] = updated;
				} else {
					delete frontmatter['confitext-masked-words'];
					delete frontmatter['confitext_masked_words'];
					delete frontmatter['masked-words'];
				}
			}
		});
		clearRulesCache();
		this.dispatchSettingsToEditors();
	}

	/**
	 * Updates the ribbon icon with current state tooltip and icon
	 */
	updateRibbonIcon(): void {
		if (!this.settings.showRibbonIcon) {
			if (this.ribbonIconEl) {
				this.ribbonIconEl.remove();
				this.ribbonIconEl = null;
			}
			return;
		}

		if (!this.ribbonIconEl) {
			this.ribbonIconEl = this.addRibbonIcon('binary', 'Confitext', () => {
				if (this.currentMode === 'masking') {
					this.setMode('revealed');
				} else {
					this.setMode('masking');
				}
			});
		}

		const scopeLabel = this.settings.maskingScope === 'targeted-only' ? ' (Targeted)' : '';
		const tooltip =
			this.currentMode === 'masking'
				? `Confitext: Masking ON${scopeLabel} (Click to reveal all)`
				: this.currentMode === 'revealed'
					? 'Confitext: REVEALED (Click to mask)'
					: 'Confitext: PAUSED (Click to resume)';

		this.ribbonIconEl.setAttribute('aria-label', tooltip);
		this.ribbonIconEl.toggleClass('is-active', this.currentMode === 'masking');
	}

	/**
	 * Updates the status bar item badge
	 */
	updateStatusBar(): void {
		if (!this.settings.showStatusIndicator) {
			if (this.statusBarItemEl) {
				this.statusBarItemEl.remove();
				this.statusBarItemEl = null;
			}
			return;
		}

		if (!this.statusBarItemEl) {
			this.statusBarItemEl = this.addStatusBarItem();
			this.statusBarItemEl.addClass('confitext-status-bar');
			this.statusBarItemEl.addEventListener('click', () => {
				if (this.currentMode === 'masking') {
					this.setMode('revealed');
				} else {
					this.setMode('masking');
				}
			});
		}

		let label = '';
		let statusClass = '';

		if (!this.settings.enabled) {
			label = '⚡ CONFITEXT: OFF';
			statusClass = 'confitext-status-off';
		} else if (this.currentMode === 'masking') {
			if (this.settings.maskingScope === 'targeted-only') {
				label = '⚡ CONFITEXT: TARGETED';
				statusClass = 'confitext-status-targeted';
			} else {
				label = '⚡ CONFITEXT: ON';
				statusClass = 'confitext-status-masking';
			}
		} else if (this.currentMode === 'revealed') {
			label = '⚡ CONFITEXT: REVEALED';
			statusClass = 'confitext-status-revealed';
		} else {
			label = '⚡ CONFITEXT: PAUSED';
			statusClass = 'confitext-status-paused';
		}

		this.statusBarItemEl.setText(label);
		this.statusBarItemEl.className = 'confitext-status-bar ' + statusClass;
		this.statusBarItemEl.setAttribute(
			'aria-label',
			`Confitext mode: ${this.currentMode.toUpperCase()}${this.settings.maskingScope === 'targeted-only' ? ' (TARGETED)' : ''}. Click to toggle.`
		);
	}

	/**
	 * Injects CSS custom properties for theme colors, opacity, and glow
	 */
	applyCssVariables(): void {
		const root = document.documentElement;
		const isLight = typeof document !== 'undefined' && document.body.classList.contains('theme-light');

		let color = '#65F59A';
		let bright = '#B5FFC8';
		let glow = '0 0 5px rgba(101, 245, 154, 0.5)';

		switch (this.settings.maskColorTheme) {
			case 'matrix-green':
				if (isLight) {
					color = '#0b7a3e';
					bright = '#055026';
					glow = '0 0 3px rgba(11, 122, 62, 0.3)';
				} else {
					color = '#65F59A';
					bright = '#B5FFC8';
					glow = '0 0 5px rgba(101, 245, 154, 0.5)';
				}
				break;
			case 'theme-accent':
				color = 'var(--text-accent)';
				bright = 'var(--text-accent-hover, var(--text-accent))';
				glow = 'rgba(var(--accent-rgb, 101, 245, 154), 0.35)';
				break;
			case 'monochrome':
				color = 'var(--text-muted)';
				bright = 'var(--text-normal)';
				glow = 'none';
				break;
			case 'custom':
				color = this.settings.customColor || (isLight ? '#0b7a3e' : '#65F59A');
				bright = color;
				glow = this.settings.customColor ? `0 0 5px ${this.settings.customColor}66` : 'none';
				break;
		}

		root.style.setProperty('--confitext-color', color);
		root.style.setProperty('--confitext-bright', bright);
		root.style.setProperty('--confitext-glow', this.settings.subtleGlow ? glow : 'none');
		root.style.setProperty('--confitext-opacity', String(this.settings.maskOpacity));
	}
}
