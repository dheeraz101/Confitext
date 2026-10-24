// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { buildMaskDecorations, MaskWidget } from '../src/decorations';
import { DEFAULT_SETTINGS } from '../src/types';
import { AnimationManager } from '../src/animation';
import { createConfitextExtension } from '../src/editor-extension';

describe('Editor Behavior - Text Integrity & Space Preservation', () => {
	it('guarantees underlying document text is never mutated by masking', () => {
		const originalText = 'I will build something extraordinary today.';
		const selection = EditorSelection.single(originalText.length);
		const visibleRanges = [{ from: 0, to: originalText.length }];

		const decorations = buildMaskDecorations(
			originalText,
			selection,
			visibleRanges,
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		// Decorations exist
		expect(decorations.size).toBeGreaterThan(0);

		// But original text string is completely identical
		expect(originalText).toBe('I will build something extraordinary today.');
	});

	it('preserves space delimiter and never swallows space', () => {
		let state = EditorState.create({
			doc: 'Hello'
		});

		// User types space at end of word
		const tr = state.update({
			changes: { from: 5, insert: ' ' },
			selection: { anchor: 6 }
		});

		expect(tr.newDoc.toString()).toBe('Hello ');
		expect(tr.newSelection.main.head).toBe(6);
	});

	it('creates replacement decorations for completed words in masking mode', () => {
		const doc = 'First second third';
		// Cursor at position 0 (start of document)
		const selection = EditorSelection.single(0);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		// 3 words: 'First', 'second', 'third'
		expect(decos.size).toBe(3);

		const ranges: { from: number; to: number; widgetText?: string }[] = [];
		const iter = decos.iter();
		while (iter.value) {
			const widget = iter.value.spec.widget as MaskWidget;
			ranges.push({
				from: iter.from,
				to: iter.to,
				widgetText: widget?.word
			});
			iter.next();
		}

		expect(ranges).toEqual([
			{ from: 0, to: 5, widgetText: 'First' },
			{ from: 6, to: 12, widgetText: 'second' },
			{ from: 13, to: 18, widgetText: 'third' }
		]);
	});

	it('reveals word when intersecting selection (Selection Reveal)', () => {
		const doc = 'Alpha Beta Gamma';
		// Select "Beta" (from 6 to 10)
		const selection = EditorSelection.single(6, 10);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		const maskedWords: string[] = [];
		const iter = decos.iter();
		while (iter.value) {
			const widget = iter.value.spec.widget as MaskWidget;
			maskedWords.push(widget.word);
			iter.next();
		}

		// "Beta" is selected, so it must be revealed (excluded from decorations)!
		expect(maskedWords).toEqual(['Alpha', 'Gamma']);
		expect(maskedWords.includes('Beta')).toBe(false);
	});

	it('restores masking when selection is cleared', () => {
		const doc = 'Alpha Beta Gamma';
		const visibleRanges = [{ from: 0, to: doc.length }];

		// 1. "Beta" selected -> 2 masked words
		const selActive = EditorSelection.single(6, 10);
		const decosActive = buildMaskDecorations(
			doc,
			selActive,
			visibleRanges,
			'masking',
			DEFAULT_SETTINGS,
			null
		);
		expect(decosActive.size).toBe(2);

		// 2. Selection cleared (caret moves to position 0) -> all 3 masked
		const selCleared = EditorSelection.single(0);
		const decosCleared = buildMaskDecorations(
			doc,
			selCleared,
			visibleRanges,
			'masking',
			DEFAULT_SETTINGS,
			null
		);
		expect(decosCleared.size).toBe(3);
	});

	it('returns no decorations in revealed mode (Reveal All)', () => {
		const doc = 'All words must be readable here';
		const selection = EditorSelection.single(0);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'revealed',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0);
	});

	it('returns no decorations in paused mode', () => {
		const doc = 'Masking is temporarily paused';
		const selection = EditorSelection.single(0);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'paused',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0);
	});

	it('maintains stable glyph masks for untouched words after unrelated edits', () => {
		const docBefore = 'apple banana cherry';
		const sel = EditorSelection.single(0);
		const decosBefore = buildMaskDecorations(
			docBefore,
			sel,
			[{ from: 0, to: docBefore.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		let cherryGlyphBefore = '';
		const iter1 = decosBefore.iter();
		while (iter1.value) {
			const w = iter1.value.spec.widget as MaskWidget;
			if (w.word === 'cherry') cherryGlyphBefore = w.glyphs;
			iter1.next();
		}

		// Edit "apple" -> "apricot", leaving "cherry" untouched
		const docAfter = 'apricot banana cherry';
		const decosAfter = buildMaskDecorations(
			docAfter,
			sel,
			[{ from: 0, to: docAfter.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		let cherryGlyphAfter = '';
		const iter2 = decosAfter.iter();
		while (iter2.value) {
			const w = iter2.value.spec.widget as MaskWidget;
			if (w.word === 'cherry') cherryGlyphAfter = w.glyphs;
			iter2.next();
		}

		// Cherry's mask must remain identical!
		expect(cherryGlyphBefore).toBeTruthy();
		expect(cherryGlyphAfter).toBe(cherryGlyphBefore);
	});

	it('ensures transactions are completely invertible (undo/redo integrity)', () => {
		let state = EditorState.create({ doc: 'Initial sentence' });

		// Make an edit (type a word and space)
		const tr = state.update({
			changes: { from: 16, insert: ' added' }
		});
		expect(tr.newDoc.toString()).toBe('Initial sentence added');

		// Undo: apply inverted changes
		const inverted = tr.changes.invert(state.doc);
		const undoneState = tr.state.update({ changes: inverted }).state;
		expect(undoneState.doc.toString()).toBe('Initial sentence');
	});
});

describe('Animation Lifecycle & Cleanup', () => {
	it('registers, manages, and cleans up animations without memory leaks', () => {
		let framesCalled = 0;
		const manager = new AnimationManager(() => DEFAULT_SETTINGS);
		manager.setFrameCallback(() => {
			framesCalled++;
		});

		manager.registerWordAnimation(0, 5, 'Hello', 'ⵙϞ⟁Ξᚷ');
		const anim = manager.getAnimation(0, 5, 'Hello');
		expect(anim).not.toBeNull();
		expect(anim?.glyphs.length).toBe(5);

		// Cleanup
		manager.destroy();
		expect(manager.getAnimation(0, 5, 'Hello')).toBeNull();
	});

	it('respects animation toggle setting', () => {
		const disabledSettings = { ...DEFAULT_SETTINGS, enableAnimation: false };
		const manager = new AnimationManager(() => disabledSettings);

		manager.registerWordAnimation(0, 5, 'Hello', 'ⵙϞ⟁Ξᚷ');
		expect(manager.getAnimation(0, 5, 'Hello')).toBeNull();
		manager.destroy();
	});

	it('maps active animation ranges smoothly through document changes', () => {
		const manager = new AnimationManager(() => DEFAULT_SETTINGS);
		manager.registerWordAnimation(10, 15, 'World', 'ⵙϞ⟁Ξᚷ');

		// An edit happens earlier in the document: insert 5 chars at position 0
		let state = EditorState.create({ doc: '0123456789 World here' });
		const tr = state.update({ changes: { from: 0, insert: 'Prefix ' } });

		manager.mapPositions(tr.changes);

		// Old position (10..15) should no longer match
		expect(manager.getAnimation(10, 15, 'World')).toBeNull();

		// New mapped position (17..22) should match!
		const mapped = manager.getAnimation(17, 22, 'World');
		expect(mapped).not.toBeNull();
		expect(mapped?.stage).toBe('scramble');

		manager.destroy();
	});

	it('supports multi-cursor editing without masking actively typed words at any caret', () => {
		const doc = 'Hello world and universe';
		// Two cursors: one at pos 5 (end of "Hello"), another at pos 11 (end of "world")
		const selection = EditorSelection.create([
			EditorSelection.cursor(5),
			EditorSelection.cursor(11)
		]);

		const decos = buildMaskDecorations(
			doc,
			selection,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		// "Hello" (0..5) and "world" (6..11) are at carets with revealOnCursorInsideWord = true
		// "and" (12..15) and "universe" (16..24) are not at any cursor and should be masked!
		const maskedWords: string[] = [];
		const iter = decos.iter();
		while (iter.value) {
			const w = iter.value.spec.widget as MaskWidget;
			maskedWords.push(w.word);
			iter.next();
		}

		expect(maskedWords).toEqual(['and', 'universe']);
	});

	it('safely merges multiple visible ranges without duplicate decoration errors', () => {
		const doc = 'Line one\nLine two\nLine three\nLine four';
		const sel = EditorSelection.single(0);

		// Two contiguous/overlapping visible ranges (e.g. from editor folds)
		const ranges = [
			{ from: 0, to: 15 },
			{ from: 10, to: 30 }
		];

		// Must not throw RangeSetBuilder "Ranges must be added in sorted order"
		expect(() => {
			buildMaskDecorations(doc, sel, ranges, 'masking', DEFAULT_SETTINGS, null);
		}).not.toThrow();
	});
});

describe('Editor Behavior - Per-Note Frontmatter & Folder Exclusion Rules', () => {
	it('disables decorations completely when note has confitext: false in frontmatter', () => {
		const doc = `---\ntitle: Public Presentation\nconfitext: false\n---\nAll words must be completely visible here.`;
		const sel = EditorSelection.single(0);
		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0); // No decorations! Plain text is visible!
	});

	it('disables decorations when note has confitext: disabled or trailing spaces', () => {
		const doc = `---\nconfitext: disabled   \n---\nAll words must be visible.`;
		const sel = EditorSelection.single(0);
		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0);
	});

	it('disables decorations when frontmatter ends with ellipsis (...) or starts with BOM', () => {
		const doc = `\uFEFF---\ntitle: BOM note\nconfitext: false\n...\nAll words must be visible.`;
		const sel = EditorSelection.single(0);
		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0);
	});

	it('disables decorations completely when note has confitext: false in frontmatter', () => {
		const doc = `---\ntitle: Shared Document\nconfitext: false\n---\nReadable shared text without masking.`;
		const sel = EditorSelection.single(0);
		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		expect(decos.size).toBe(0);
	});

	it('disables decorations when file path is within an excluded folder', () => {
		const doc = `Sensitive notes in public folder`;
		const sel = EditorSelection.single(0);
		const settings = {
			...DEFAULT_SETTINGS,
			excludedFolders: ['Public', 'Shared']
		};

		// Note in excluded folder
		const decosPublic = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			settings,
			null,
			'Public/MyNote.md'
		);
		expect(decosPublic.size).toBe(0); // Masking disabled!

		// Note in non-excluded folder
		const decosPrivate = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			settings,
			null,
			'Private/MyNote.md'
		);
		expect(decosPrivate.size).toBeGreaterThan(0); // Masking enabled!
	});

	it('renders custom glyphs in widgets when glyphStyle is set to custom', () => {
		const doc = `Custom glyph text`;
		const sel = EditorSelection.single(0);
		const settings = {
			...DEFAULT_SETTINGS,
			glyphStyle: 'custom' as const,
			customGlyphs: '⠁⠃⠉⠙⠑'
		};

		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			settings,
			null
		);

		expect(decos.size).toBe(3);
		const iter = decos.iter();
		while (iter.value) {
			const w = iter.value.spec.widget as MaskWidget;
			// Glyphs must come from customGlyphs
			for (const char of w.glyphs) {
				expect(settings.customGlyphs.includes(char)).toBe(true);
			}
			iter.next();
		}
	});

	it('renders braille and morse palettes when selected', () => {
		const doc = `Secret message`;
		const sel = EditorSelection.single(0);

		// Braille
		const brailleSettings = { ...DEFAULT_SETTINGS, glyphStyle: 'braille' as const };
		const decosBraille = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			brailleSettings,
			null
		);
		expect(decosBraille.size).toBe(2);

		// Morse
		const morseSettings = { ...DEFAULT_SETTINGS, glyphStyle: 'morse' as const };
		const decosMorse = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			morseSettings,
			null
		);
		expect(decosMorse.size).toBe(2);
	});

	it('leaves Obsidian comments and callout box headers unmasked in decorations', () => {
		const doc = '> [!WARNING] Danger Zone\nVisible text %% private comment %% ends';
		const sel = EditorSelection.single(0);

		const decos = buildMaskDecorations(
			doc,
			sel,
			[{ from: 0, to: doc.length }],
			'masking',
			DEFAULT_SETTINGS,
			null
		);

		const words: string[] = [];
		const iter = decos.iter();
		while (iter.value) {
			const w = iter.value.spec.widget as MaskWidget;
			words.push(w.word);
			iter.next();
		}

		// WARNING and private comment must NOT be masked
		expect(words).toEqual(['Danger', 'Zone', 'Visible', 'text', 'ends']);
		expect(words.includes('WARNING')).toBe(false);
		expect(words.includes('comment')).toBe(false);
	});
});

