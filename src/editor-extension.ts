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
import { Extension, EditorSelection } from '@codemirror/state';
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
import { getNoteMaskedWords, isNoteMaskingDisabled } from './rules';
import { tokenizeWords, findTargetedTokens, getLineRangeAt, getParagraphRangeAt } from './tokenizer';

export class ConfitextViewPlugin implements PluginValue {
	decorations: DecorationSet;
	private animationManager: AnimationManager;
	private prevSelection: EditorSelection;

	constructor(readonly view: EditorView) {
		const getState = (): ConfitextEditorState => {
			return view.state.field(confitextStateField, false) || initialEditorState;
		};

		this.prevSelection = view.state.selection;
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
						const trimmedWord = insertedStr.trim();
						const isWordSuggestion =
							trimmedWord.length >= 2 &&
							/^[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*$/u.test(trimmedWord) &&
							(toA > fromA || toB - fromB >= 2);

						// Delimiters that complete a word (space, non-breaking space, newline, or clause/sentence punctuation)
						// Excludes internal apostrophes and hyphens
						if (/[\s\u00A0\u2000-\u200B\u202F.,!?;:"“”‘’„‟…—–\u3000-\u303F\uFF00-\uFF0F()[\]{}>/\\]/u.test(insertedStr) && fromB > 0) {
							// Look backwards from fromB to find the completed word
							const textBefore = fullDoc.slice(0, fromB);
							const wordMatch = textBefore.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*$/u);
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
						} else if (isWordSuggestion) {
							// Mobile predictive text / autocomplete suggestion insertion without trailing delimiter
							const word = trimmedWord;
							const wordFrom = fromB;
							const wordTo = fromB + word.length;

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

			// Selection restore animation: if user had selected text and now selection collapsed to an empty caret,
			// trigger scramble animations for the previously revealed words if restoreMaskingAfterSelection is enabled.
			if (
				state.mode === 'masking' &&
				state.settings.restoreMaskingAfterSelection &&
				state.settings.enableAnimation &&
				this.prevSelection &&
				!this.prevSelection.main.empty &&
				update.state.selection.main.empty
			) {
				const fullDoc = update.state.doc.toString();
				const noteWords = getNoteMaskedWords(fullDoc);
				for (const selRange of this.prevSelection.ranges) {
					if (selRange.from < selRange.to) {
						const revealedTokens =
							state.settings.maskingScope === 'targeted-only'
								? findTargetedTokens(
										fullDoc,
										selRange.from,
										selRange.to,
										state.settings,
										noteWords
								  )
								: tokenizeWords(fullDoc, selRange.from, selRange.to, state.settings);

						for (const token of revealedTokens) {
							const stable = getStableGlyphs(
								token.text,
								state.settings.glyphStyle,
								state.settings.customGlyphs
							);
							this.animationManager.registerWordAnimation(
								token.from,
								token.to,
								token.text,
								stable
							);
						}
					}
				}
			}

			this.prevSelection = update.state.selection;
		} else if (update.docChanged) {
			this.prevSelection = update.state.selection;
		}

		// 3. Viewport scrolling, geometry measurement & layout height changes
		if (update.viewportChanged || update.geometryChanged || update.heightChanged) {
			shouldRebuild = true;
		}

		// 4. Zero-decoration recovery fallback (ensures cold boot layout measure builds decorations immediately)
		if (this.decorations.size === 0 && update.state.doc.length > 0) {
			shouldRebuild = true;
		}

		// 5. Confitext State Effects
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
		EditorView.editorAttributes.compute([confitextStateField], state => {
			const cState = state.field(confitextStateField, false) || initialEditorState;
			const isExcluded = isNoteMaskingDisabled(state.doc.toString(), cState.filePath, cState.settings);
			const attrs: Record<string, string> = isExcluded ? { class: 'confitext-note-excluded' } : {};
			return attrs;
		}),
		ViewPlugin.fromClass(ConfitextViewPlugin, {
			decorations: v => v.decorations
		})
	];
}
