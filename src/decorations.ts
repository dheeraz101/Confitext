/**
 * Confitext - CodeMirror 6 Replacement Widgets and Decoration Builder
 */

import { WidgetType, Decoration, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, EditorSelection } from '@codemirror/state';
import { ConfitextMode, ConfitextSettings } from './types';
import { getStableGlyphs } from './glyphs';
import {
	tokenizeWords,
	findTargetedTokens,
	isWordSelected,
	isWordBeingComposed,
	findExcludedRanges,
	getLineRangeAt,
	getParagraphRangeAt
} from './tokenizer';
import { AnimationManager } from './animation';
import { isNoteMaskingDisabled, getNoteMaskedWords } from './rules';

export class MaskWidget extends WidgetType {
	constructor(
		readonly word: string,
		readonly glyphs: string,
		readonly stage: 'scramble' | 'settling' | 'stable',
		readonly settings: ConfitextSettings
	) {
		super();
	}

	toDOM(): HTMLElement {
		const span = createSpan({
			cls: 'confitext-glyph' + (this.stage !== 'stable' ? ` confitext-${this.stage}` : ''),
			attr: {
				'aria-label': 'hidden text',
				role: 'presentation',
				'data-confitext': 'mask',
				'data-word-len': String(this.word.length)
			},
			text: this.glyphs
		});

		if (this.settings.enableHoverReveal) {
			let hoverTimer: number | null = null;
			span.addEventListener('pointerenter', () => {
				hoverTimer = window.setTimeout(() => {
					span.textContent = this.word;
					span.addClass('confitext-hover-revealed');
				}, this.settings.hoverRevealDelayMs || 500);
			});
			span.addEventListener('pointerleave', () => {
				if (hoverTimer) {
					window.clearTimeout(hoverTimer);
					hoverTimer = null;
				}
				if (span.hasClass('confitext-hover-revealed')) {
					span.removeClass('confitext-hover-revealed');
					span.textContent = this.glyphs;
				}
			});
		}

		return span;
	}

	eq(other: MaskWidget): boolean {
		return (
			this.glyphs === other.glyphs &&
			this.stage === other.stage &&
			this.word === other.word &&
			this.settings.glyphStyle === other.settings.glyphStyle &&
			this.settings.customGlyphs === other.settings.customGlyphs &&
			this.settings.maskColorTheme === other.settings.maskColorTheme &&
			this.settings.customColor === other.settings.customColor &&
			this.settings.enableHoverReveal === other.settings.enableHoverReveal &&
			this.settings.hoverRevealDelayMs === other.settings.hoverRevealDelayMs
		);
	}

	ignoreEvent(): boolean {
		// Return false so CodeMirror natively handles selection, drag, and click events
		return false;
	}
}

/**
 * Builds the decoration set for masked words across visible document ranges
 */
export function buildMaskDecorations(
	docText: string,
	selection: EditorSelection,
	visibleRanges: readonly { from: number; to: number }[],
	mode: ConfitextMode,
	settings: ConfitextSettings,
	animationManager: AnimationManager | null,
	filePath?: string
): DecorationSet {
	// If plugin is disabled, paused, or in reveal-all mode, return no decorations
	if (!settings.enabled || mode !== 'masking') {
		return Decoration.none;
	}

	// Check if this note is excluded by folder path or YAML frontmatter (confitext: false)
	if (isNoteMaskingDisabled(docText, filePath, settings)) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	let lastTo = -1;

	// Merge contiguous or overlapping visible ranges (e.g. from folds)
	const mergedRanges: { from: number; to: number }[] = [];
	for (const range of visibleRanges) {
		const rFrom = Math.max(0, range.from);
		const rTo = Math.min(docText.length, range.to);
		if (rFrom >= rTo) continue;

		const last = mergedRanges[mergedRanges.length - 1];
		if (last && rFrom <= last.to) {
			last.to = Math.max(last.to, rTo);
		} else {
			mergedRanges.push({ from: rFrom, to: rTo });
		}
	}

	// Precompute/retrieve syntax exclusions once per document update pass
	const syntaxExcludedRanges = findExcludedRanges(docText, settings);

	// Retrieve note-specific frontmatter words
	const noteWords = getNoteMaskedWords(docText);

	// Precompute active unmasked ranges for line/paragraph trigger modes
	const activeTriggerRanges: { from: number; to: number }[] = [];
	if (settings.maskTriggerMode === 'line') {
		for (const range of selection.ranges) {
			const lineRange = getLineRangeAt(docText, range.head);
			activeTriggerRanges.push(lineRange);
			if (!range.empty) {
				const anchorLine = getLineRangeAt(docText, range.anchor);
				activeTriggerRanges.push(anchorLine);
			}
		}
	} else if (settings.maskTriggerMode === 'paragraph') {
		for (const range of selection.ranges) {
			const paraRange = getParagraphRangeAt(docText, range.head);
			if (paraRange) {
				activeTriggerRanges.push(paraRange);
			}
			if (!range.empty) {
				const anchorPara = getParagraphRangeAt(docText, range.anchor);
				if (anchorPara) {
					activeTriggerRanges.push(anchorPara);
				}
			}
		}
	}

	for (const range of mergedRanges) {
		const tokens =
			settings.maskingScope === 'targeted-only'
				? findTargetedTokens(docText, range.from, range.to, settings, noteWords, syntaxExcludedRanges)
				: tokenizeWords(docText, range.from, range.to, settings, syntaxExcludedRanges);

		for (const token of tokens) {
			// Ensure strictly monotonic order and avoid duplicate decorations across ranges
			if (token.from < lastTo || token.from >= token.to) {
				continue;
			}

			// 1. Selection Check: If word is selected, reveal it
			if (settings.revealSelectedText) {
				const isSelected = isWordSelected(
					token,
					selection.ranges,
					settings.revealEntireWordOnSelection
				);
				if (isSelected) {
					continue; // Do not mask; renders as readable plain text
				}
			}

			// 2. Trigger Mode & Composition Check
			if (settings.maskTriggerMode === 'line' || settings.maskTriggerMode === 'paragraph') {
				// In line/paragraph mode, if token is within any active cursor line/paragraph, keep unmasked
				const isActive = activeTriggerRanges.some(
					ar => token.from >= ar.from && token.to <= ar.to
				);
				if (isActive) {
					continue; // Do not mask; line or paragraph is active
				}
			} else {
				// Default 'word' mode: check if word is actively being composed/edited at ANY active caret
				const isComposing = selection.ranges.some(r =>
					r.empty && isWordBeingComposed(token, r.head, docText, settings.revealOnCursorInsideWord)
				);
				if (isComposing) {
					continue; // Do not mask; actively being typed
				}
			}

			// 3. Determine if word is in active scramble/settling animation
			let glyphs: string;
			let stage: 'scramble' | 'settling' | 'stable' = 'stable';

			const anim = animationManager?.getAnimation(token.from, token.to, token.text);
			if (anim) {
				glyphs = anim.glyphs;
				stage = anim.stage;
			} else {
				glyphs = getStableGlyphs(token.text, settings.glyphStyle, settings.customGlyphs);
			}

			// 4. Create atomic replacement decoration
			const widget = new MaskWidget(token.text, glyphs, stage, settings);
			builder.add(
				token.from,
				token.to,
				Decoration.replace({
					widget,
					inclusive: false
				})
			);
			lastTo = token.to;
		}
	}

	return builder.finish();
}
