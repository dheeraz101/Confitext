/**
 * Confitext - Markdown-Aware Word Tokenizer
 */

import { WordToken, ExcludedRange, ConfitextSettings } from './types';

// Regex for Frontmatter at start of document (supports UTF-8 BOM, --- and ... closing tags)
const FRONTMATTER_REGEX = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;

// Regex for fenced code blocks
const FENCED_CODE_REGEX = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g;

// Regex for inline code
const INLINE_CODE_REGEX = /`[^`\r\n]+`/g;

// Regex for URLs
const URL_REGEX = /(?:https?|ftp|obsidian):\/\/[^\s)\]>"']+/gi;

// Regex for Markdown links [text](url) -> capture the destination
const MD_LINK_DEST_REGEX = /\]\(([^)]+)\)/g;

// Regex for Markdown image tags ![alt](url)
const MD_IMAGE_REGEX = /!\[[^\]]*\]\([^)]+\)/g;

// Obsidian wikilinks: [[link]] or [[link|alias]]
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Obsidian embeds: ![[link]] or ![[image.png]]
const OBSIDIAN_EMBED_REGEX = /!\[\[[^\]]+\]\]/g;

// Obsidian comments: %% comment %%
const OBSIDIAN_COMMENT_REGEX = /%%[\s\S]*?(?:%%|$)/g;

// LaTeX block math: $$...$$
const MATH_BLOCK_REGEX = /\$\$[\s\S]*?(?:\$\$|$)/g;

// Inline math: $...$
const INLINE_MATH_REGEX = /(?<!\$)\$[^$\r\n]+\$(?!\$)/g;

// Footnote references: [^1]
const FOOTNOTE_REGEX = /\[\^[^\]\r\n]+\]/g;

// HTML tags: <div ...> or </span> or <br>
const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>\r\n]*>/g;

// Regex for Markdown block syntax prefixes (headers, list items, quotes, checkboxes, callouts)
const LINE_PREFIX_REGEX = /^([ \t]*)(#{1,6}\s+|[-*+]\s+(?:\[[ xX-]\]\s+)?|\d+\.\s+(?:\[[ xX-]\]\s+)?|>+\s*(?:\[![a-zA-Z0-9_-]+\][+-]?\s*)?)/;

// Performance memoization cache for full-doc syntax exclusions (supports multi-leaf / split view)
interface SyntaxCacheEntry {
	settingsKey: string;
	ranges: ExcludedRange[];
}
const SYNTAX_EXCLUSION_CACHE = new Map<string, SyntaxCacheEntry>();
const MAX_SYNTAX_CACHE_SIZE = 30;

/**
 * Clears the tokenizer excluded range cache
 */
export function clearTokenizerCache(): void {
	SYNTAX_EXCLUSION_CACHE.clear();
}

/**
 * Finds all excluded ranges in the given text (code blocks, inline code, frontmatter, URLs, math, wikilinks)
 */
export function findExcludedRanges(text: string, settings: ConfitextSettings): ExcludedRange[] {
	if (!text) return [];

	const settingsKey = `${settings.preserveCodeBlocks}:${settings.preserveInlineCode}:${settings.preserveMarkdownSyntax}:${settings.preserveUrls}`;
	const cached = SYNTAX_EXCLUSION_CACHE.get(text);
	if (cached && cached.settingsKey === settingsKey) {
		return cached.ranges;
	}

	const ranges: ExcludedRange[] = [];

	// Frontmatter
	const fmMatch = text.match(FRONTMATTER_REGEX);
	if (fmMatch && fmMatch.index !== undefined) {
		ranges.push({
			from: 0,
			to: fmMatch[0].length,
			type: 'frontmatter'
		});
	}

	// Fenced Code Blocks
	if (settings.preserveCodeBlocks) {
		let match: RegExpExecArray | null;
		FENCED_CODE_REGEX.lastIndex = 0;
		while ((match = FENCED_CODE_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'code-block'
			});
		}
	}

	// Inline code
	if (settings.preserveInlineCode) {
		let match: RegExpExecArray | null;
		INLINE_CODE_REGEX.lastIndex = 0;
		while ((match = INLINE_CODE_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'inline-code'
			});
		}
	}

	// Markdown syntax: Math, HTML tags, footnotes
	if (settings.preserveMarkdownSyntax) {
		let match: RegExpExecArray | null;

		// Math blocks $$...$$
		MATH_BLOCK_REGEX.lastIndex = 0;
		while ((match = MATH_BLOCK_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// Inline math $...$
		INLINE_MATH_REGEX.lastIndex = 0;
		while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// Footnotes [^1]
		FOOTNOTE_REGEX.lastIndex = 0;
		while ((match = FOOTNOTE_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// HTML tags
		HTML_TAG_REGEX.lastIndex = 0;
		while ((match = HTML_TAG_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// Obsidian comments %% ... %%
		OBSIDIAN_COMMENT_REGEX.lastIndex = 0;
		while ((match = OBSIDIAN_COMMENT_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}
	}

	// URLs and Obsidian Links
	if (settings.preserveUrls) {
		let match: RegExpExecArray | null;
		URL_REGEX.lastIndex = 0;
		while ((match = URL_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'url'
			});
		}

		// Markdown link destinations
		MD_LINK_DEST_REGEX.lastIndex = 0;
		while ((match = MD_LINK_DEST_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index + 1, // Start at '('
				to: match.index + match[0].length,
				type: 'url'
			});
		}

		// Markdown images completely excluded
		MD_IMAGE_REGEX.lastIndex = 0;
		while ((match = MD_IMAGE_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// Obsidian embeds ![[image.png]]
		OBSIDIAN_EMBED_REGEX.lastIndex = 0;
		while ((match = OBSIDIAN_EMBED_REGEX.exec(text)) !== null) {
			ranges.push({
				from: match.index,
				to: match.index + match[0].length,
				type: 'markdown-syntax'
			});
		}

		// Obsidian wikilinks [[Target]] or [[Target|Alias]]
		WIKILINK_REGEX.lastIndex = 0;
		while ((match = WIKILINK_REGEX.exec(text)) !== null) {
			if (match[0].includes('|')) {
				// [[Target|Alias]] -> exclude [[Target| and ]]
				const pipeIdx = match[0].indexOf('|');
				ranges.push({
					from: match.index,
					to: match.index + pipeIdx + 1,
					type: 'url'
				});
				ranges.push({
					from: match.index + match[0].length - 2,
					to: match.index + match[0].length,
					type: 'markdown-syntax'
				});
			} else {
				// [[Target]] -> whole wikilink is preserved destination
				ranges.push({
					from: match.index,
					to: match.index + match[0].length,
					type: 'url'
				});
			}
		}
	}

	// Sort ranges by start position
	ranges.sort((a, b) => a.from - b.from);

	if (SYNTAX_EXCLUSION_CACHE.size >= MAX_SYNTAX_CACHE_SIZE) {
		const firstKey = SYNTAX_EXCLUSION_CACHE.keys().next().value;
		if (firstKey !== undefined) {
			SYNTAX_EXCLUSION_CACHE.delete(firstKey);
		}
	}
	SYNTAX_EXCLUSION_CACHE.set(text, { settingsKey, ranges });

	return ranges;
}

/**
 * Checks if a position or range is within an excluded range
 */
export function isRangeExcluded(from: number, to: number, excludedRanges: ExcludedRange[]): boolean {
	for (const range of excludedRanges) {
		if (from < range.to && to > range.from) {
			return true;
		}
	}
	return false;
}

/**
 * Regex matching words: Unicode letters, digits, and allowed internal apostrophes/hyphens.
 * e.g. "Matrix", "don't", "state-of-the-art", "2026"
 */
const WORD_REGEX = /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu;

/**
 * Tokenizes text within [sliceFrom, sliceTo] into WordTokens.
 * Preserves syntax elements like #, *, _, -, >, |, backticks.
 */
export function tokenizeWords(
	fullDocText: string,
	rangeFrom: number = 0,
	rangeTo: number = fullDocText.length,
	settings: ConfitextSettings,
	cachedExcludedRanges?: ExcludedRange[]
): WordToken[] {
	if (!fullDocText || rangeFrom >= rangeTo) return [];

	const excludedRanges = cachedExcludedRanges ?? findExcludedRanges(fullDocText, settings);
	const tokens: WordToken[] = [];

	// Expand rangeFrom backward to line start, and rangeTo forward to line end
	// so words and line prefixes are never sliced in half at viewport boundaries
	const safeFrom = rangeFrom <= 0 ? 0 : fullDocText.lastIndexOf('\n', rangeFrom - 1) + 1;
	const nextNl = fullDocText.indexOf('\n', rangeTo);
	const safeTo = nextNl === -1 ? fullDocText.length : nextNl;

	let currentPos = safeFrom;
	const textSlice = fullDocText.slice(safeFrom, safeTo);
	const lines = textSlice.split(/\r?\n/);

	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx];
		const lineStart = currentPos;
		const lineEnd = lineStart + line.length;

		let searchStartInLine = 0;

		// Check for line prefix (heading, list, blockquote, task)
		if (settings.preserveMarkdownSyntax) {
			const prefixMatch = line.match(LINE_PREFIX_REGEX);
			if (prefixMatch) {
				searchStartInLine = prefixMatch[0].length;
			}
		}

		// Search for words in the line
		WORD_REGEX.lastIndex = 0;
		const lineContent = line.slice(searchStartInLine);
		let match: RegExpExecArray | null;

		while ((match = WORD_REGEX.exec(lineContent)) !== null) {
			const word = match[0];
			const wordFrom = lineStart + searchStartInLine + match.index;
			const wordTo = wordFrom + word.length;

			// Skip if word falls in excluded range
			if (isRangeExcluded(wordFrom, wordTo, excludedRanges)) {
				continue;
			}

			// Check if word is completed (followed by space, delimiter, newline, or end of doc)
			let isCompleted = false;
			if (wordTo < fullDocText.length) {
				const nextChar = fullDocText[wordTo];
				// Delimiters include space, tab, newline, and punctuation
				isCompleted = /[\s\p{P}]/u.test(nextChar);
			} else {
				// At end of document
				isCompleted = true;
			}

			tokens.push({
				from: wordFrom,
				to: wordTo,
				text: word,
				isCompleted
			});
		}

		// Account for newline character length
		const isLastLine = lineIdx === lines.length - 1;
		if (!isLastLine) {
			const newlineLen = (fullDocText[lineEnd] === '\r' && fullDocText[lineEnd + 1] === '\n') ? 2 : 1;
			currentPos = lineEnd + newlineLen;
		} else {
			currentPos = lineEnd;
		}
	}

	return tokens;
}

/**
 * Checks if a word is actively being composed at the cursor position.
 * If the cursor is at wordTo or inside [wordFrom, wordTo], or directly after
 * an internal apostrophe/hyphen, the word is currently being typed/edited.
 */
export function isWordBeingComposed(
	word: WordToken,
	cursorPos: number,
	fullDocText: string,
	revealOnCursor: boolean
): boolean {
	// If cursor is strictly inside the word
	if (cursorPos > word.from && cursorPos < word.to) {
		return revealOnCursor;
	}

	// If cursor is at the end of the word
	if (cursorPos === word.to) {
		// If reveal on cursor is active, caret resting at end of word reveals it
		if (revealOnCursor) return true;
		// If at end of document without trailing space, user is typing it
		if (word.to >= fullDocText.length) return true;
		return false;
	}

	// If cursor is right after an internal apostrophe or hyphen (e.g. typing "don't" or "state-of-the-art")
	if (cursorPos === word.to + 1 && word.to < fullDocText.length) {
		const charAfterWord = fullDocText[word.to];
		if (charAfterWord === "'" || charAfterWord === '-') {
			return true; // Still composing the compound word
		}
	}

	return false;
}

/**
 * Checks if a word intersects any selection range
 */
export function isWordSelected(
	word: WordToken,
	selectionRanges: readonly { from: number; to: number }[],
	revealEntireWord: boolean = true
): boolean {
	for (const sel of selectionRanges) {
		// Empty selection (just caret) is handled separately by cursor checks
		if (sel.from === sel.to) continue;

		// Any intersection with selection reveals the word for readable display
		// and native clipboard copying
		if (word.from < sel.to && word.to > sel.from) {
			return true;
		}
	}
	return false;
}
