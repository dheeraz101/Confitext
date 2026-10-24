// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	getLineRangeAt,
	getParagraphRangeAt,
	tokenizeWords
} from '../src/tokenizer';
import { buildMaskDecorations, MaskWidget } from '../src/decorations';
import { DEFAULT_SETTINGS, ConfitextSettings } from '../src/types';

function getMaskedWords(doc: string, selection: EditorSelection, settings: ConfitextSettings): string[] {
	const visibleRanges = [{ from: 0, to: doc.length }];
	const decos = buildMaskDecorations(doc, selection, visibleRanges, 'masking', settings, null);
	const masked: string[] = [];
	const iter = decos.iter();
	while (iter.value) {
		const widget = iter.value.spec.widget as MaskWidget;
		if (widget?.word) {
			masked.push(widget.word);
		}
		iter.next();
	}
	return masked;
}

describe('Trigger Modes - getLineRangeAt Helper', () => {
	it('handles single line text', () => {
		const text = 'Hello world';
		expect(getLineRangeAt(text, 0)).toEqual({ from: 0, to: 11 });
		expect(getLineRangeAt(text, 5)).toEqual({ from: 0, to: 11 });
		expect(getLineRangeAt(text, 11)).toEqual({ from: 0, to: 11 });
	});

	it('handles multiple lines with LF newlines', () => {
		// "Line 1\nLine 2\nLine 3"
		// Line 1: 0..6, newline at 6
		// Line 2: 7..13, newline at 13
		// Line 3: 14..20
		const text = 'Line 1\nLine 2\nLine 3';
		expect(getLineRangeAt(text, 0)).toEqual({ from: 0, to: 6 });
		expect(getLineRangeAt(text, 6)).toEqual({ from: 0, to: 6 }); // at newline ending Line 1
		expect(getLineRangeAt(text, 7)).toEqual({ from: 7, to: 13 });
		expect(getLineRangeAt(text, 13)).toEqual({ from: 7, to: 13 });
		expect(getLineRangeAt(text, 14)).toEqual({ from: 14, to: 20 });
		expect(getLineRangeAt(text, 20)).toEqual({ from: 14, to: 20 });
	});

	it('handles CRLF newlines correctly', () => {
		// "Line 1\r\nLine 2"
		// Line 1: 0..6, \r at 6, \n at 7
		// Line 2: 8..14
		const text = 'Line 1\r\nLine 2';
		expect(getLineRangeAt(text, 0)).toEqual({ from: 0, to: 6 });
		expect(getLineRangeAt(text, 6)).toEqual({ from: 0, to: 6 }); // at \r
		expect(getLineRangeAt(text, 8)).toEqual({ from: 8, to: 14 });
	});

	it('handles empty line at end of document', () => {
		// "Line 1\n"
		// Line 1: 0..6, \n at 6
		// Line 2: 7..7 (empty)
		const text = 'Line 1\n';
		expect(getLineRangeAt(text, 7)).toEqual({ from: 7, to: 7 });
	});

	it('handles multiple consecutive blank lines', () => {
		// "A\n\nB"
		// 0: 'A', 1: '\n', 2: '\n', 3: 'B'
		const text = 'A\n\nB';
		expect(getLineRangeAt(text, 0)).toEqual({ from: 0, to: 1 });
		expect(getLineRangeAt(text, 1)).toEqual({ from: 0, to: 1 });
		expect(getLineRangeAt(text, 2)).toEqual({ from: 2, to: 2 });
		expect(getLineRangeAt(text, 3)).toEqual({ from: 3, to: 4 });
	});

	it('handles empty string gracefully', () => {
		expect(getLineRangeAt('', 0)).toEqual({ from: 0, to: 0 });
	});
});

describe('Trigger Modes - getParagraphRangeAt Helper', () => {
	it('identifies single line paragraph', () => {
		const text = 'Paragraph text here';
		expect(getParagraphRangeAt(text, 0)).toEqual({ from: 0, to: 19 });
		expect(getParagraphRangeAt(text, 10)).toEqual({ from: 0, to: 19 });
	});

	it('identifies multiline paragraph connected by single newlines', () => {
		const text = 'Para 1 Line 1\nPara 1 Line 2\nPara 1 Line 3';
		// All 3 lines belong to the same paragraph
		expect(getParagraphRangeAt(text, 0)).toEqual({ from: 0, to: 41 });
		expect(getParagraphRangeAt(text, 20)).toEqual({ from: 0, to: 41 });
		expect(getParagraphRangeAt(text, 40)).toEqual({ from: 0, to: 41 });
	});

	it('distinguishes separate paragraphs delimited by double newlines', () => {
		// "Para 1\n\nPara 2"
		// Para 1: 0..6
		// Gap: 7 (index 7 is \n)
		// Para 2: 8..14
		const text = 'Para 1\n\nPara 2';
		expect(getParagraphRangeAt(text, 2)).toEqual({ from: 0, to: 6 });
		expect(getParagraphRangeAt(text, 10)).toEqual({ from: 8, to: 14 });
	});

	it('returns null when cursor is inside a blank line gap', () => {
		const text = 'Para 1\n\nPara 2';
		// Index 7 is on the blank line between 6 and 8
		expect(getParagraphRangeAt(text, 7)).toBeNull();
	});

	it('handles single Enter at end of document as paragraph continuation', () => {
		// User types "Para 1" and presses Enter once
		const text = 'Para 1\n';
		// Index 7 is on the empty line immediately following "Para 1" without a trailing newline
		expect(getParagraphRangeAt(text, 7)).toEqual({ from: 0, to: 6 });
	});

	it('returns null when double Enter is pressed at end of document (blank line gap formed)', () => {
		// User types "Para 1" and presses Enter twice
		const text = 'Para 1\n\n';
		// Index 8 is after the second newline: full blank line gap created
		expect(getParagraphRangeAt(text, 8)).toBeNull();
	});

	it('handles whitespace-only lines as blank line gaps', () => {
		const text = 'Para 1\n   \nPara 2';
		expect(getParagraphRangeAt(text, 2)).toEqual({ from: 0, to: 6 });
		expect(getParagraphRangeAt(text, 8)).toBeNull(); // inside whitespace line
		expect(getParagraphRangeAt(text, 14)).toEqual({ from: 11, to: 17 });
	});
});

describe('Trigger Modes - Word Mode Behavior', () => {
	const wordSettings: ConfitextSettings = {
		...DEFAULT_SETTINGS,
		maskTriggerMode: 'word'
	};

	it('masks completed words upon typing delimiter while typing word stays unmasked', () => {
		const doc = 'Hello world';
		// Caret at pos 11 (at end of "world", no trailing delimiter)
		const sel = EditorSelection.single(11);
		const masked = getMaskedWords(doc, sel, wordSettings);

		// "Hello" is completed by space -> masked
		// "world" is actively being typed at cursor pos 11 -> unmasked
		expect(masked).toEqual(['Hello']);
	});

	it('masks all words on a line once cursor moves away in word mode', () => {
		const doc = 'First second third';
		// Caret at pos 0 (inside or before "First")
		const sel = EditorSelection.single(0);
		const masked = getMaskedWords(doc, sel, wordSettings);

		// "second" and "third" are completed words away from cursor
		expect(masked).toContain('second');
		expect(masked).toContain('third');
	});
});

describe('Trigger Modes - Line Mode Behavior', () => {
	const lineSettings: ConfitextSettings = {
		...DEFAULT_SETTINGS,
		maskTriggerMode: 'line'
	};

	it('keeps ALL words on active line unmasked while typing, even after spaces and punctuation', () => {
		const doc = 'First, second, third.\nLine two text';
		// Cursor is on Line 1 at position 15
		const sel = EditorSelection.single(15);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Line 1 words ('First', 'second', 'third') must remain UNMASKED because cursor is on Line 1
		expect(masked).not.toContain('First');
		expect(masked).not.toContain('second');
		expect(masked).not.toContain('third');

		// Words on Line 2 ('Line', 'two', 'text') must be MASKED
		expect(masked).toEqual(['Line', 'two', 'text']);
	});

	it('masks Line 1 words once the cursor moves to Line 2', () => {
		const doc = 'Line one text\nLine two text';
		// Cursor moves to Line 2 (e.g. on Enter or navigation)
		const sel = EditorSelection.single(16); // on Line 2
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Line 1 words are now MASKED
		expect(masked).toContain('Line');
		expect(masked).toContain('one');
		expect(masked).toContain('text');

		// Line 2 words are UNMASKED
		expect(masked).not.toContain('two');
	});

	it('masks previous lines when cursor moves to an empty newly created line', () => {
		// User types "Line one text" and presses Enter
		const doc = 'Line one text\n';
		// Cursor is at offset 14 (on Line 2)
		const sel = EditorSelection.single(14);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Line 1 words are now MASKED
		expect(masked).toEqual(['Line', 'one', 'text']);
	});

	it('supports multiple cursors across different lines', () => {
		const doc = 'Line 1\nLine 2\nLine 3';
		// Cursors on Line 1 (pos 2) and Line 3 (pos 16)
		const sel = EditorSelection.create([
			EditorSelection.cursor(2),
			EditorSelection.cursor(16)
		]);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Line 1 and Line 3 are unmasked; Line 2 is masked
		expect(masked).toContain('Line');
		expect(masked).toContain('2');
		expect(masked).not.toContain('1');
		expect(masked).not.toContain('3');
	});
});

describe('Trigger Modes - Paragraph Mode Behavior', () => {
	const paraSettings: ConfitextSettings = {
		...DEFAULT_SETTINGS,
		maskTriggerMode: 'paragraph'
	};

	it('keeps all words in multiline paragraph unmasked while cursor is active within it', () => {
		const doc = 'BlockOne Alpha\nBlockOne Beta\n\nBlockTwo Gamma';
		// Cursor is on line 2 of Paragraph 1 (pos 20)
		const sel = EditorSelection.single(20);
		const masked = getMaskedWords(doc, sel, paraSettings);

		// All words of Paragraph 1 ('BlockOne', 'Alpha', 'Beta') remain unmasked
		expect(masked).not.toContain('Alpha');
		expect(masked).not.toContain('Beta');

		// Words of Paragraph 2 ('BlockTwo', 'Gamma') must be masked
		expect(masked).toEqual(['BlockTwo', 'Gamma']);
	});

	it('keeps paragraph unmasked after single Enter (soft line break in same paragraph)', () => {
		const doc = 'Para 1 words\n';
		// Cursor is on line 2 after single Enter
		const sel = EditorSelection.single(13);
		const masked = getMaskedWords(doc, sel, paraSettings);

		// Paragraph 1 words remain unmasked
		expect(masked).toEqual([]);
	});

	it('masks paragraph once a full blank line gap is created via double Enter', () => {
		const doc = 'Para 1 words\n\n';
		// Cursor is on line 3 after double Enter (offset 14)
		const sel = EditorSelection.single(14);
		const masked = getMaskedWords(doc, sel, paraSettings);

		// Blank line gap created -> Paragraph 1 words become masked!
		expect(masked).toEqual(['Para', '1', 'words']);
	});

	it('masks paragraph 1 when cursor moves to paragraph 2', () => {
		const doc = 'Para one words.\n\nPara two words.';
		// Cursor in Paragraph 2
		const sel = EditorSelection.single(25);
		const masked = getMaskedWords(doc, sel, paraSettings);

		// Paragraph 1 is masked
		expect(masked).toContain('one');

		// Paragraph 2 is unmasked
		expect(masked).not.toContain('two');
	});

	it('masks both paragraphs when cursor rests on the blank line gap between them', () => {
		const doc = 'Alpha Beta\n\nGamma Delta';
		// Offset 11 is on the empty line between the two newlines
		const sel = EditorSelection.single(11);
		const masked = getMaskedWords(doc, sel, paraSettings);

		// Both paragraphs are masked
		expect(masked).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
	});

	it('unmasks paragraph when cursor moves back into it from another paragraph', () => {
		const doc = 'First block\n\nSecond block';
		// Cursor in First block
		const sel1 = EditorSelection.single(3);
		const masked1 = getMaskedWords(doc, sel1, paraSettings);
		expect(masked1).toEqual(['Second', 'block']);

		// Cursor in Second block
		const sel2 = EditorSelection.single(18);
		const masked2 = getMaskedWords(doc, sel2, paraSettings);
		expect(masked2).toEqual(['First', 'block']);
	});
});

describe('Trigger Modes - Interaction with Other Settings', () => {
	it('reveals selected words even across lines when revealSelectedText is true', () => {
		const lineSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'line',
			revealSelectedText: true
		};

		const doc = 'Line 1 words\nLine 2 words';
		// Cursor is on Line 2, but selection highlights "Line 1" (0 to 6)
		const sel = EditorSelection.single(0, 6);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Selected words on Line 1 are revealed
		expect(masked).not.toContain('1');
	});

	it('respects targeted-only scope in line mode', () => {
		const targetedLineSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'line',
			maskingScope: 'targeted-only',
			globalMaskedWords: ['secret']
		};

		const doc = 'Line with secret here\nAnother secret on line 2';
		// Cursor is on Line 1
		const sel = EditorSelection.single(5);
		const masked = getMaskedWords(doc, sel, targetedLineSettings);

		// "secret" on Line 1 is unmasked because Line 1 is active
		// "secret" on Line 2 is masked because Line 2 is inactive
		expect(masked).toEqual(['secret']);
	});

	it('respects targeted-only scope in paragraph mode', () => {
		const targetedParaSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'paragraph',
			maskingScope: 'targeted-only',
			globalMaskedWords: ['classified']
		};

		const doc = 'Block 1 with classified\nand more text\n\nBlock 2 has classified';
		// Cursor is in Block 1
		const sel = EditorSelection.single(10);
		const masked = getMaskedWords(doc, sel, targetedParaSettings);

		// Only "classified" in Block 2 is masked
		expect(masked).toEqual(['classified']);
	});

	it('preserves Markdown headings and list prefixes in line and paragraph modes', () => {
		const lineSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'line'
		};
		const doc = '# Header One\n- Item two';
		// Cursor on line 2
		const sel = EditorSelection.single(16);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// Header One words are masked, but prefix '#' is preserved by tokenizer
		expect(masked).toEqual(['Header', 'One']);
	});

	it('handles UTF-8 BOM without crashing or offset mismatch in line and paragraph modes', () => {
		const paraSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'paragraph'
		};
		const doc = '\uFEFFParagraph with BOM\n\nSecond block';
		const sel = EditorSelection.single(doc.length); // in Second block
		const masked = getMaskedWords(doc, sel, paraSettings);

		// First paragraph masked, second unmasked
		expect(masked).toEqual(['Paragraph', 'with', 'BOM']);
	});

	it('preserves fenced code blocks in line and paragraph modes', () => {
		const lineSettings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskTriggerMode: 'line'
		};
		const doc = 'Normal line\n```ts\nconst x = 1;\n```\nAnother line';
		// Cursor on first line
		const sel = EditorSelection.single(3);
		const masked = getMaskedWords(doc, sel, lineSettings);

		// 'Another' and 'line' are masked, code block contents are never masked
		expect(masked).toEqual(['Another', 'line']);
	});
});

