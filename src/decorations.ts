/**
 * Confitext - CodeMirror 6 Replacement Widgets and Decoration Builder
 */

import { WidgetType, Decoration, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, EditorSelection } from '@codemirror/state';
import { ConfitextMode, ConfitextSettings } from './types';
import { getStableGlyphs } from './glyphs';
import { tokenizeWords, isWordSelected, isWordBeingComposed, findExcludedRanges } from './tokenizer';
import { AnimationManager } from './animation';
import { isNoteMaskingDisabled } from './rules';

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
		return createSpan({
			cls: 'confitext-glyph' + (this.stage !== 'stable' ? ` confitext-${this.stage}` : ''),
			attr: {
				'aria-label': 'hidden text',
				role: 'presentation',
				'data-confitext': 'mask',
				'data-word-len': String(this.word.length)
			},
			text: this.glyphs
		});
	}

	eq(other: MaskWidget): boolean {
		return (
			this.glyphs === other.glyphs &&
			this.stage === other.stage &&
			this.word === other.word &&
			this.settings.glyphStyle === other.settings.glyphStyle &&
			this.settings.customGlyphs === other.settings.customGlyphs &&
			this.settings.maskColorTheme === other.settings.maskColorTheme &&
			this.settings.customColor === other.settings.customColor
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

	for (const range of mergedRanges) {
		const tokens = tokenizeWords(docText, range.from, range.to, settings, syntaxExcludedRanges);

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

			// 2. Composition Check: If word is being composed/edited at ANY active caret
			const isComposing = selection.ranges.some(r =>
				r.empty && isWordBeingComposed(token, r.head, docText, settings.revealOnCursorInsideWord)
			);
			if (isComposing) {
				continue; // Do not mask; actively being typed
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
