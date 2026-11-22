/**
 * Confitext - Main Plugin Entrypoint
 */

import { Plugin, WorkspaceLeaf, MarkdownView, TFile, TFolder, Notice, View, Platform } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { ConfitextMode, ConfitextSettings, DEFAULT_SETTINGS } from './types';
import { ConfitextSettingTab } from './settings';
import { registerCommands } from './commands';
import { createConfitextExtension } from './editor-extension';
import {
	setModeEffect,
	setSettingsEffect,
	setFilePathEffect,
	confitextStateField,
	setInitialStateProvider
} from './state';
import { clearGlyphCache } from './glyphs';
import { clearRulesCache } from './rules';
import { clearTokenizerCache } from './tokenizer';
import { IdleManager } from './idle';
import { createPreviewMaskProcessor } from './preview';
import { WhatsNewView, VIEW_TYPE_WHATS_NEW } from './whats-new-view';
import { createAppleIconEl, AppleIconName } from './icons';

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
	private isEscPeeking = false;

	async onload(): Promise<void> {
		// 0. Synchronous instant startup: read fast local cache to eliminate startup plain-text exposure
		let fastSettings: ConfitextSettings = DEFAULT_SETTINGS;
		try {
			if (typeof localStorage !== 'undefined') {
				const cached = localStorage.getItem('confitext-cached-settings');
				if (cached) {
					fastSettings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(cached));
				}
			}
		} catch {
			fastSettings = DEFAULT_SETTINGS;
		}
		this.settings = fastSettings;

		let cachedMode = fastSettings.defaultMode || 'masking';
		try {
			if (typeof localStorage !== 'undefined') {
				const m = localStorage.getItem('confitext-cached-mode') as ConfitextMode | null;
				if (m && (m === 'masking' || m === 'revealed' || m === 'paused')) {
					cachedMode = m;
				}
			}
		} catch {}
		this.currentMode = cachedMode;

		// Initialize StateField initial state provider SYNCHRONOUSLY before registering extensions
		setInitialStateProvider(() => ({
			mode: this.currentMode,
			settings: this.settings,
			filePath: this.app.workspace.getActiveFile()?.path || ''
		}));

		// 1. Register CodeMirror 6 Editor Extension SYNCHRONOUSLY (Live Preview & Source Mode)
		this.registerEditorExtension(createConfitextExtension());

		// 2. Register Reading View Markdown Post-Processor SYNCHRONOUSLY (Preview Mode)
		this.registerMarkdownPostProcessor(createPreviewMaskProcessor(this));

		// Immediate pre-render visual privacy styling
		this.applyBodyClasses();
		this.applyCssVariables();

		// Immediate dispatch to any views already mounted during cold boot
		this.dispatchModeToEditors();
		this.dispatchSettingsToEditors();
		this.dispatchFilePathToEditors();
		this.rerenderPreviewViews();

		// Asynchronously load saved settings from Obsidian vault data.json
		await this.loadSettings();
		this.currentMode = this.settings.defaultMode;
		this.cacheSettingsSynchronously();
		this.applyBodyClasses();
		this.dispatchModeToEditors();
		this.dispatchSettingsToEditors();
		this.dispatchFilePathToEditors();
		this.rerenderPreviewViews();

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

		// 7. Setup Idle & Window Blur Auto-Masking Manager
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
		this.updateIdleManager();

		// 8. Register PC Desktop "Hold Esc to Peek" Key Handler
		this.registerEscPeekHandler();

		// Listen to workspace layout changes to instantly decorate mounted leaves
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.dispatchModeToEditors();
				this.dispatchSettingsToEditors();
				this.dispatchFilePathToEditors();
				this.rerenderPreviewViews();
			})
		);

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
						if (!currentState || currentState.mode !== this.currentMode || currentState.filePath !== filePath || currentState.settings !== this.settings) {
							try {
								cmView.dispatch({
									effects: [
										setModeEffect.of(this.currentMode),
										setSettingsEffect.of(this.settings),
										setFilePathEffect.of(filePath)
									]
								});
							} catch {
								// Guard against unmounted views
							}
						}
					}
					if (this.settings.maskReadingView) {
						const pv = leaf.view as unknown as { previewMode?: MarkdownPreviewWithRerender };
						pv.previewMode?.rerender?.(true);
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

		// Immediate dispatch to any editors already mounted on mobile/desktop startup
		this.dispatchModeToEditors();
		this.dispatchSettingsToEditors();
		this.dispatchFilePathToEditors();

		// Apply initial state and file paths to all already-loaded leaves
		this.app.workspace.onLayoutReady(() => {
			this.dispatchModeToEditors();
			this.dispatchSettingsToEditors();
			this.dispatchFilePathToEditors();
			this.setupAllTabHeaderActions();
		});
	}

	onunload(): void {
		setInitialStateProvider(null);
		this.removeTabHeaderActions();

		if (this.idleManager) {
			this.idleManager.destroy();
			this.idleManager = null;
		}

		clearGlyphCache();
		clearRulesCache();
		clearTokenizerCache();

		if (typeof document !== 'undefined' && document.body) {
			document.body.classList.remove('confitext-active');
			document.body.classList.remove('confitext-scope-all');
			document.body.classList.remove('confitext-revealed');
			document.body.classList.remove('confitext-paused');
			document.body.classList.remove('confitext-battery-saver');
			document.body.classList.remove('confitext-ligatures');
		}
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
		this.cacheSettingsSynchronously();
		this.applyBodyClasses();
		this.updateIdleManager();
	}

	/**
	 * Synchronously caches current settings and mode to localStorage for zero-latency startup
	 */
	cacheSettingsSynchronously(): void {
		try {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('confitext-cached-settings', JSON.stringify(this.settings));
				localStorage.setItem('confitext-cached-mode', this.currentMode);
			}
		} catch {}
	}

	/**
	 * Fires subtle mobile haptic feedback if enabled on Android / iOS
	 */
	triggerHaptic(pattern: number | number[] = 15): void {
		if (!this.settings.mobileHapticFeedback) return;
		if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
			try {
				navigator.vibrate(pattern);
			} catch {}
		}
	}

	/**
	 * Updates the idle manager state when settings are modified
	 */
	updateIdleManager(): void {
		if (!this.idleManager) return;
		if (this.settings.idleAutoMask || this.settings.multiMonitorBlur) {
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
		this.triggerHaptic(mode === 'masking' ? [12, 20, 12] : 18);
		if (mode === 'masking' && !this.settings.enabled) {
			this.settings.enabled = true;
			void this.saveSettings();
			this.dispatchSettingsToEditors();
		}
		this.cacheSettingsSynchronously();
		this.applyBodyClasses();
		this.dispatchModeToEditors();
		this.rerenderPreviewViews();
		this.updateStatusBar();
		this.updateRibbonIcon();
	}

	/**
	 * Instant emergency panic hide: masks all text, deselects editors, and engages masking mode
	 */
	panicHide(): void {
		this.triggerHaptic([30, 40, 30]);
		this.setMode('masking');
		this.iterateEditorViews(view => {
			const head = view.state.selection.main.head;
			view.dispatch({
				selection: { anchor: head, head: head },
				scrollIntoView: false
			});
		});
		new Notice('Confitext: Panic hide engaged. All text masked.');
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
		if (Platform.isPhone || !this.settings.showTabHeaderAction) {
			// On phones (no tabs) or when disabled, ensure no stray action buttons exist
			view.containerEl?.querySelectorAll('.confitext-tab-action, .view-action[aria-label*="Confitext"]').forEach(btn => btn.remove());
			return;
		}

		// Prevent duplicate action buttons in DOM
		const existingAction = view.containerEl?.querySelector('.confitext-tab-action, .view-action[aria-label*="Confitext"]');
		if (existingAction) {
			this.viewsWithAction.add(view);
			return;
		}

		if (this.viewsWithAction.has(view)) return;
		this.viewsWithAction.add(view);

		const actionBtn = view.addAction('shield', 'Confitext: Toggle masking', () => {
			if (this.currentMode === 'masking') {
				this.setMode('revealed');
				new Notice('Confitext: All text revealed');
			} else {
				this.setMode('masking');
				new Notice('Confitext: Masking enabled');
			}
		});
		actionBtn.addClass('confitext-tab-action');
	}

	/**
	 * Sets up tab header actions across all currently open leaves
	 */
	setupAllTabHeaderActions(): void {
		if (Platform.isPhone || !this.settings.showTabHeaderAction) {
			this.removeTabHeaderActions();
			return;
		}
		this.app.workspace.iterateAllLeaves(leaf => {
			if (leaf.view instanceof MarkdownView) {
				this.setupTabHeaderAction(leaf.view);
			}
		});
	}

	/**
	 * Removes all active tab header action buttons from open views
	 */
	removeTabHeaderActions(): void {
		this.viewsWithAction = new WeakSet<View>();
		if (typeof document !== 'undefined') {
			const btns = document.querySelectorAll('.confitext-tab-action, .view-action[aria-label*="Confitext"]');
			btns.forEach(btn => btn.remove());
		}
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
			if (typeof document !== 'undefined') {
				document.querySelectorAll('.confitext-ribbon-icon, .side-dock-ribbon-action[aria-label*="Confitext"]').forEach(el => el.remove());
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
			this.ribbonIconEl.addClass('confitext-ribbon-icon');
		}

		// Ensure no stray duplicate ribbon icons exist in the DOM
		if (typeof document !== 'undefined') {
			const ribbons = document.querySelectorAll('.confitext-ribbon-icon, .side-dock-ribbon-action[aria-label*="Confitext"]');
			if (ribbons.length > 1) {
				ribbons.forEach((r, idx) => {
					if (r !== this.ribbonIconEl || idx > 0) {
						r.remove();
					}
				});
			}
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
		let iconName: AppleIconName = 'shield';

		if (!this.settings.enabled) {
			label = 'CONFITEXT: OFF';
			statusClass = 'confitext-status-off';
			iconName = 'shield';
		} else if (this.currentMode === 'masking') {
			if (this.settings.maskingScope === 'targeted-only') {
				label = 'CONFITEXT: TARGETED';
				statusClass = 'confitext-status-targeted';
				iconName = 'shield-check';
			} else {
				label = 'CONFITEXT: ON';
				statusClass = 'confitext-status-masking';
				iconName = 'shield';
			}
		} else if (this.currentMode === 'revealed') {
			label = 'CONFITEXT: REVEALED';
			statusClass = 'confitext-status-revealed';
			iconName = 'eye';
		} else {
			label = 'CONFITEXT: PAUSED';
			statusClass = 'confitext-status-paused';
			iconName = 'lock-open';
		}

		this.statusBarItemEl.empty();
		createAppleIconEl(this.statusBarItemEl, iconName, 12, 'confitext-status-icon');
		this.statusBarItemEl.createSpan({ text: ' ' + label });
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

		this.applyBodyClasses();

		const isMobile = typeof document !== 'undefined' && (document.body?.classList.contains('is-mobile') || document.body?.classList.contains('is-phone') || document.body?.classList.contains('is-android'));
		const isBatterySaver =
			this.settings.performanceMode === 'battery-saver' ||
			(this.settings.performanceMode === 'auto' && isMobile) ||
			(this.settings.batterySaverFps && isMobile);

		const effectiveGlow = isBatterySaver ? 'none' : (this.settings.subtleGlow ? glow : 'none');
		root.style.setProperty('--confitext-glow', effectiveGlow);
		root.style.setProperty('--confitext-opacity', String(this.settings.maskOpacity));
	}

	/**
	 * Manages global body classes for instantaneous cold-boot privacy veil and platform styling
	 */
	applyBodyClasses(): void {
		if (typeof document === 'undefined' || !document.body) return;
		const isMaskingActive = this.currentMode === 'masking' && this.settings.enabled;
		document.body.classList.toggle('confitext-active', isMaskingActive);
		document.body.classList.toggle('confitext-scope-all', isMaskingActive && this.settings.maskingScope === 'all-words');
		document.body.classList.toggle('confitext-revealed', this.currentMode === 'revealed');
		document.body.classList.toggle('confitext-paused', this.currentMode === 'paused');
		const isMobile = document.body.classList.contains('is-mobile') || document.body.classList.contains('is-phone') || document.body.classList.contains('is-android');
		const isBatterySaver =
			this.settings.performanceMode === 'battery-saver' ||
			(this.settings.performanceMode === 'auto' && isMobile) ||
			(this.settings.batterySaverFps && isMobile);
		document.body.classList.toggle('confitext-battery-saver', isBatterySaver);
		document.body.classList.toggle('confitext-ligatures', !!this.settings.enableFontLigatures);
	}

	/**
	 * Registers global keyboard listeners for PC (macOS & Windows) "Hold Esc to Peek" cleartext glance.
	 * When user holds down Escape, text temporarily reveals; when released, masking instantly restores.
	 */
	registerEscPeekHandler(): void {
		this.registerDomEvent(window, 'keydown', (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (!this.settings.enabled || !this.settings.holdEscToPeek) return;
			// Ignore repeating keydown events while held down
			if (evt.repeat) return;
			// Do not intercept if a modal, prompt, suggestion, or command palette is open
			if (document.querySelector('.modal-container, .prompt, .suggestion-container')) return;
			// Do not intercept if active element is an input or standalone textarea outside editor
			const activeEl = document.activeElement;
			if (activeEl && (activeEl.tagName === 'INPUT' || (activeEl.tagName === 'TEXTAREA' && !activeEl.classList.contains('cm-content')))) {
				return;
			}
			// Only engage peek if currently in masking mode
			if (this.currentMode === 'masking') {
				this.isEscPeeking = true;
				this.setMode('revealed');
				if (this.settings.mobileHapticFeedback) {
					this.triggerHaptic(15);
				}
			}
		});

		this.registerDomEvent(window, 'keyup', (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (this.isEscPeeking) {
				this.isEscPeeking = false;
				this.setMode('masking');
				if (this.settings.mobileHapticFeedback) {
					this.triggerHaptic(15);
				}
			}
		});

		// If window loses focus while holding Escape (e.g. Alt+Tab / Cmd+Tab), immediately re-engage masking
		this.registerDomEvent(window, 'blur', () => {
			if (this.isEscPeeking) {
				this.isEscPeeking = false;
				this.setMode('masking');
			}
		});
	}
}
