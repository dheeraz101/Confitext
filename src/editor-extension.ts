/**
 * Confitext - CodeMirror 6 Editor Extension & ViewPlugin
 */

import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	PluginValue,
	Decoration,
	DecorationSet
} from '@codemirror/view';
import { Extension } from '@codemirror/state';
import {
	confitextStateField,
	animationTickEffect,
	setModeEffect,
	setSettingsEffect,
	setFilePathEffect,
	initialEditorState,
	ConfitextEditorState
} from './state';
import { buildMaskDecorations } from './decorations';
import { AnimationManager } from './animation';
import { getStableGlyphs } from './glyphs';
import { getNoteMaskedWords } from './rules';
import { tokenizeWords, getLineRangeAt, getParagraphRangeAt } from './tokenizer';

export class ConfitextViewPlugin implements PluginValue {
	decorations: DecorationSet;
	private animationManager: AnimationManager;

	constructor(readonly view: EditorView) {
		const getState = (): ConfitextEditorState => {
			return view.state.field(confitextStateField, false) || initialEditorState;
		};

		this.animationManager = new AnimationManager(() => getState().settings);

		// Frame callback for scrambling animation ticks
		this.animationManager.setFrameCallback(() => {
			if (!this.view || !this.view.dom || !this.view.dom.isConnected) {
				this.animationManager.destroy();
				return;
			}
			try {
				this.view.dispatch({ effects: animationTickEffect.of() });
			} catch {
				// Suppress dispatch if editor is currently in a transaction
			}
		});

		// Build initial decorations
		const state = getState();
		this.decorations = buildMaskDecorations(
			view.state.doc.toString(),
			view.state.selection,
			view.visibleRanges,
			state.mode,
			state.settings,
			this.animationManager,
			state.filePath
		);
	}

	update(update: ViewUpdate): void {
		const state: ConfitextEditorState =
			update.state.field(confitextStateField, false) || initialEditorState;

		// Fast-path: if plugin is disabled or in revealed/paused mode, clear decorations and return
		if (!state.settings.enabled || state.mode !== 'masking') {
			if (this.decorations.size > 0) {
				this.decorations = Decoration.none;
			}
			return;
		}

		let shouldRebuild = false;

		// 1. Check for document changes and word completion delimiter typing
		if (update.docChanged) {
			shouldRebuild = true;
			this.animationManager.mapPositions(update.changes);

			if (
				state.mode === 'masking' &&
				state.settings.maskNewlyCompletedWords &&
				state.settings.enableAnimation &&
				!update.view.composing
			) {
				const fullDoc = update.state.doc.toString();

				const triggerMode = state.settings.maskTriggerMode || 'word';

				update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
					const insertedStr = inserted.toString();

					if (triggerMode === 'word') {
						// Delimiters that complete a word (space, newline, or clause/sentence punctuation)
						// Excludes internal apostrophes and hyphens
						if (/[\s.,!?;:"“”()[\]{}>/\\]/u.test(insertedStr) && fromB > 0) {
							// Look backwards from fromB to find the completed word
							const textBefore = fullDoc.slice(0, fromB);
							const wordMatch = textBefore.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*$/u);
							if (wordMatch && wordMatch.index !== undefined) {
								const word = wordMatch[0];
								const wordFrom = wordMatch.index;
								const wordTo = fromB;

								// If in targeted-only mode, only animate if word is in targeted list
								if (state.settings.maskingScope === 'targeted-only') {
									const noteWords = getNoteMaskedWords(fullDoc);
									const targetSet = new Set<string>();
									for (const w of state.settings.globalMaskedWords || []) {
										const t = w.trim();
										if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
									}
									for (const w of noteWords || []) {
										const t = w.trim();
										if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
									}
									const checkKey = state.settings.caseSensitiveTargeting ? word : word.toLowerCase();
									if (!targetSet.has(checkKey)) {
										return;
									}
								}

								const stable = getStableGlyphs(
									word,
									state.settings.glyphStyle,
									state.settings.customGlyphs
								);
								this.animationManager.registerWordAnimation(wordFrom, wordTo, word, stable);
							}
						}
					} else if (triggerMode === 'line') {
						// Line mode: Trigger masking/animation when user completes a line via newline (Enter)
						if (/[\r\n]/u.test(insertedStr) && fromB > 0) {
							const prevLine = getLineRangeAt(fullDoc, fromB - 1);
							if (prevLine.from < prevLine.to) {
								const lineTokens = tokenizeWords(fullDoc, prevLine.from, prevLine.to, state.settings);
								for (const token of lineTokens) {
									if (state.settings.maskingScope === 'targeted-only') {
										const noteWords = getNoteMaskedWords(fullDoc);
										const targetSet = new Set<string>();
										for (const w of state.settings.globalMaskedWords || []) {
											const t = w.trim();
											if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
										}
										for (const w of noteWords || []) {
											const t = w.trim();
											if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
										}
										const checkKey = state.settings.caseSensitiveTargeting ? token.text : token.text.toLowerCase();
										if (!targetSet.has(checkKey)) continue;
									}
									const stable = getStableGlyphs(
										token.text,
										state.settings.glyphStyle,
										state.settings.customGlyphs
									);
									this.animationManager.registerWordAnimation(token.from, token.to, token.text, stable);
								}
							}
						}
					} else if (triggerMode === 'paragraph') {
						// Paragraph mode: Trigger masking/animation when user creates a blank line gap
						if (/[\r\n]/u.test(insertedStr) && fromB > 0) {
							const textBefore = fullDoc.slice(0, fromB);
							if (/\n[ \t]*$/u.test(textBefore)) {
								// Preceding line was blank: a blank line gap is now formed!
								const nonBlankIdx = textBefore.search(/\S[^\S\r\n]*\r?\n[ \t]*$/u);
								if (nonBlankIdx !== -1) {
									const paraRange = getParagraphRangeAt(fullDoc, nonBlankIdx);
									if (paraRange) {
										const paraTokens = tokenizeWords(fullDoc, paraRange.from, paraRange.to, state.settings);
										for (const token of paraTokens) {
											if (state.settings.maskingScope === 'targeted-only') {
												const noteWords = getNoteMaskedWords(fullDoc);
												const targetSet = new Set<string>();
												for (const w of state.settings.globalMaskedWords || []) {
													const t = w.trim();
													if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
												}
												for (const w of noteWords || []) {
													const t = w.trim();
													if (t) targetSet.add(state.settings.caseSensitiveTargeting ? t : t.toLowerCase());
												}
												const checkKey = state.settings.caseSensitiveTargeting ? token.text : token.text.toLowerCase();
												if (!targetSet.has(checkKey)) continue;
											}
											const stable = getStableGlyphs(
												token.text,
												state.settings.glyphStyle,
												state.settings.customGlyphs
											);
											this.animationManager.registerWordAnimation(token.from, token.to, token.text, stable);
										}
									}
								}
							}
						}
					}
				});
			}
		}

		// 2. Selection changes (reveals selected words / restores masking on clear)
		if (update.selectionSet) {
			shouldRebuild = true;
		}

		// 3. Viewport scrolling (virtualized rendering for huge documents)
		if (update.viewportChanged) {
			shouldRebuild = true;
		}

		// 4. Confitext State Effects
		for (const trEffect of update.transactions.flatMap(t => t.effects)) {
			if (
				trEffect.is(setModeEffect) ||
				trEffect.is(setSettingsEffect) ||
				trEffect.is(setFilePathEffect) ||
				trEffect.is(animationTickEffect)
			) {
				shouldRebuild = true;
				break;
			}
		}

		if (shouldRebuild) {
			this.decorations = buildMaskDecorations(
				update.state.doc.toString(),
				update.state.selection,
				update.view.visibleRanges,
				state.mode,
				state.settings,
				this.animationManager,
				state.filePath
			);
		}
	}

	destroy(): void {
		this.animationManager.destroy();
	}
}

/**
 * Creates the combined CodeMirror 6 extension for Confitext
 */
export function createConfitextExtension(): Extension {
	return [
		confitextStateField,
		ViewPlugin.fromClass(ConfitextViewPlugin, {
			decorations: v => v.decorations
		})
	];
}
