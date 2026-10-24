import { describe, it, expect } from 'vitest';
import {
	tokenizeWords,
	findExcludedRanges,
	isWordBeingComposed,
	isWordSelected,
	clearTokenizerCache
} from '../src/tokenizer';
import { DEFAULT_SETTINGS } from '../src/types';

describe('Tokenizer - Word Processing', () => {
	it('extracts basic words with boundaries', () => {
		const doc = 'Hello world from Confitext';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Hello', 'world', 'from', 'Confitext']);
		expect(tokens[0]).toEqual({
			from: 0,
			to: 5,
			text: 'Hello',
			isCompleted: true
		});
		expect(tokens[1]).toEqual({
			from: 6,
			to: 11,
			text: 'world',
			isCompleted: true
		});
	});

	it('handles multiple spaces, tabs, and newlines', () => {
		const doc = 'First    second\t\tthird\n\n\nfourth';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['First', 'second', 'third', 'fourth']);
	});

	it('preserves punctuation outside words', () => {
		const doc = 'Wait! Is it true, "Matrix"? Yes: 100%.';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Wait', 'Is', 'it', 'true', 'Matrix', 'Yes', '100']);
	});

	it('handles internal apostrophes and hyphens in words', () => {
		const doc = "don't give up on state-of-the-art c'est la vie";
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual([
			"don't",
			'give',
			'up',
			'on',
			'state-of-the-art',
			"c'est",
			'la',
			'vie'
		]);
	});

	it('handles numbers and alphanumeric tokens', () => {
		const doc = 'Room 101 in 2026 and code X99';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Room', '101', 'in', '2026', 'and', 'code', 'X99']);
	});

	it('handles international Unicode text', () => {
		const doc = 'Bonjour le monde! こんにちは  welt Привет мир';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual([
			'Bonjour',
			'le',
			'monde',
			'こんにちは',
			'welt',
			'Привет',
			'мир'
		]);
	});

	it('handles empty documents without errors', () => {
		const tokens = tokenizeWords('', 0, 0, DEFAULT_SETTINGS);
		expect(tokens).toEqual([]);
	});

	it('handles large inputs efficiently', () => {
		const paragraph = 'The quick brown fox jumps over the lazy dog. ';
		const largeDoc = paragraph.repeat(500); // ~4,500 words
		const start = performance.now();
		const tokens = tokenizeWords(largeDoc, 0, largeDoc.length, DEFAULT_SETTINGS);
		const duration = performance.now() - start;

		expect(tokens.length).toBe(4500);
		expect(duration).toBeLessThan(100); // must process 4500 words in < 100ms
	});
});

describe('Tokenizer - Markdown Exclusions', () => {
	it('excludes YAML frontmatter', () => {
		const doc = `---\ntitle: Secret Note\ntags: [privacy, matrix]\n---\nHere is the actual body text.`;
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Here', 'is', 'the', 'actual', 'body', 'text']);
	});

	it('excludes fenced code blocks', () => {
		const doc = `Intro text.\n\`\`\`typescript\nconst hidden = true;\nconsole.log(hidden);\n\`\`\`\nOutro text.`;
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Intro', 'text', 'Outro', 'text']);
	});

	it('excludes inline code', () => {
		const doc = 'Run the command `npm run test` right now.';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Run', 'the', 'command', 'right', 'now']);
	});

	it('excludes URLs and markdown link destinations', () => {
		const doc = 'Visit https://obsidian.md or check [Obsidian Site](https://obsidian.md/download).';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		// 'Visit', 'or', 'check', 'Obsidian', 'Site' should be masked, but the URL itself excluded
		expect(tokens.map(t => t.text)).toEqual(['Visit', 'or', 'check', 'Obsidian', 'Site']);
	});

	it('preserves Markdown syntax prefixes (headings, lists, blockquotes, task items)', () => {
		const doc = `# Header One\n- List Item\n> Blockquote here\n- [ ] Unchecked Task`;
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		// Tokens should only be the words, not the syntax markers (#, -, >, [ ])
		expect(tokens.map(t => t.text)).toEqual([
			'Header',
			'One',
			'List',
			'Item',
			'Blockquote',
			'here',
			'Unchecked',
			'Task'
		]);
	});
});

describe('Tokenizer - Composition & Selection Detection', () => {
	it('detects when a word is actively being composed at the cursor', () => {
		const doc = 'I am typing a wo';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);
		const lastWord = tokens[tokens.length - 1]; // "wo" from 14 to 16

		// Cursor is at pos 16 (right after 'wo' with no trailing space)
		expect(isWordBeingComposed(lastWord, 16, doc, true)).toBe(true);

		// But when space is added: "I am typing a wo "
		const docWithSpace = 'I am typing a wo ';
		const tokensWithSpace = tokenizeWords(docWithSpace, 0, docWithSpace.length, DEFAULT_SETTINGS);
		const completedWord = tokensWithSpace[tokensWithSpace.length - 1];
		// Cursor is now at 17 (after space)
		expect(isWordBeingComposed(completedWord, 17, docWithSpace, true)).toBe(false);
	});

	it('detects when a word is selected', () => {
		const doc = 'One Two Three';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);
		const twoWord = tokens[1]; // "Two" from 4 to 7

		// Selection covers "Two"
		expect(isWordSelected(twoWord, [{ from: 4, to: 7 }], true)).toBe(true);

		// Selection covers part of "Two" (e.g. 5 to 6) with revealEntireWord = true
		expect(isWordSelected(twoWord, [{ from: 5, to: 6 }], true)).toBe(true);

		// Selection is on "Three" (8 to 13), does not intersect "Two"
		expect(isWordSelected(twoWord, [{ from: 8, to: 13 }], true)).toBe(false);

		// Empty selection (just caret at pos 5) is ignored by selection check
		expect(isWordSelected(twoWord, [{ from: 5, to: 5 }], true)).toBe(false);
	});

	it('handles sub-range slicing gracefully without slicing words in half', () => {
		const doc = 'First line\nHello extraordinary world\nThird line';
		// Viewport begins inside "extraordinary" (pos 18) and ends at pos 26
		const tokens = tokenizeWords(doc, 18, 26, DEFAULT_SETTINGS);

		// Must expand to complete line and find whole words: "Hello", "extraordinary", "world"
		expect(tokens.map(t => t.text)).toEqual(['Hello', 'extraordinary', 'world']);
		const extra = tokens.find(t => t.text === 'extraordinary');
		expect(extra?.from).toBe(17);
		expect(extra?.to).toBe(30);
	});

	it('excludes LaTeX math blocks, inline math, and footnotes', () => {
		const doc = 'Formula $$E = mc^2$$ and inline $a + b = c$ with footnote[^1]. Text outside.';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Formula', 'and', 'inline', 'with', 'footnote', 'Text', 'outside']);
	});

	it('excludes Obsidian wikilink destinations and embeds', () => {
		const doc = 'Check [[Vault Note]] and [[Secret Document|Read This]] and ![[diagram.png]]. Prose here.';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		// 'Vault Note', 'Secret Document', and 'diagram.png' are excluded link destinations
		// 'Check', 'and', 'Read', 'This', 'and', 'Prose', 'here' are prose
		expect(tokens.map(t => t.text)).toEqual(['Check', 'and', 'Read', 'This', 'and', 'Prose', 'here']);
	});

	it('keeps compound words readable while typing internal apostrophe or hyphen', () => {
		const doc = "don't quit";
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);
		const dontToken = tokens[0]; // "don't" from 0 to 5

		// If user typed "don'" and caret is at 4 (right after apostrophe)
		const docIncomplete = "don'";
		const incompleteTokens = tokenizeWords(docIncomplete, 0, docIncomplete.length, DEFAULT_SETTINGS);
		const donToken = incompleteTokens[0]; // "don" from 0 to 3

		// Caret is at 4, directly following the apostrophe
		expect(isWordBeingComposed(donToken, 4, docIncomplete, true)).toBe(true);
	});

	it('excludes Obsidian comments (%% ... %%)', () => {
		const doc = 'Visible prose %% secret internal comment %% more prose';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		expect(tokens.map(t => t.text)).toEqual(['Visible', 'prose', 'more', 'prose']);
	});

	it('preserves callout box headers (> [!NOTE]) as Markdown syntax prefixes', () => {
		const doc = '> [!NOTE] Important Title\n> Body text inside callout';
		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

		// '[!NOTE]' should NOT be tokenized as a masked word; only 'Important', 'Title', 'Body', 'text', 'inside', 'callout'
		expect(tokens.map(t => t.text)).toEqual(['Important', 'Title', 'Body', 'text', 'inside', 'callout']);
	});

	it('excludes frontmatter containing UTF-8 BOM or ellipsis closing tag', () => {
		const docBOM = '\uFEFF---\ntitle: Secret\n---\nHello world';
		const tokensBOM = tokenizeWords(docBOM, 0, docBOM.length, DEFAULT_SETTINGS);
		expect(tokensBOM.map(t => t.text)).toEqual(['Hello', 'world']);

		const docDots = '---\ntitle: Secret\n...\nHello world';
		const tokensDots = tokenizeWords(docDots, 0, docDots.length, DEFAULT_SETTINGS);
		expect(tokensDots.map(t => t.text)).toEqual(['Hello', 'world']);
	});
});

describe('Tokenizer - Performance & Cache Memoization', () => {
	it('reuses cached excluded ranges when document text is unchanged', () => {
		const doc = 'Code `const x = 10;` and url https://obsidian.md in prose.';
		const first = findExcludedRanges(doc, DEFAULT_SETTINGS);
		const second = findExcludedRanges(doc, DEFAULT_SETTINGS);

		// Must return identical reference from cache
		expect(second).toBe(first);
	});

	it('clears tokenizer cache when clearTokenizerCache is invoked', () => {
		const doc = 'Code `const x = 10;`';
		const first = findExcludedRanges(doc, DEFAULT_SETTINGS);
		clearTokenizerCache();
		const second = findExcludedRanges(doc, DEFAULT_SETTINGS);

		// Equal contents, but different array reference
		expect(second).toEqual(first);
		expect(second).not.toBe(first);
	});

	it('accepts cachedExcludedRanges in tokenizeWords without recomputing', () => {
		const doc = 'Word `code` another word';
		const precomputed = findExcludedRanges(doc, DEFAULT_SETTINGS);

		const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS, precomputed);
		expect(tokens.map(t => t.text)).toEqual(['Word', 'another', 'word']);
	});

	it('retains caches across multiple different open documents without cache thrashing in split views', () => {
		const docA = 'Doc A with `code snippet` and https://obsidian.md';
		const docB = 'Doc B with `other snippet` and https://github.com';

		// First pass
		const refA1 = findExcludedRanges(docA, DEFAULT_SETTINGS);
		const refB1 = findExcludedRanges(docB, DEFAULT_SETTINGS);

		// Second pass (switching back to Doc A): must NOT have evicted Doc A!
		const refA2 = findExcludedRanges(docA, DEFAULT_SETTINGS);
		expect(refA2).toBe(refA1); // Exact same cached array reference!

		// Switching back to Doc B: must NOT have evicted Doc B!
		const refB2 = findExcludedRanges(docB, DEFAULT_SETTINGS);
		expect(refB2).toBe(refB1); // Exact same cached array reference!
	});
});


