import { describe, it, expect } from 'vitest';
import {
	getStableGlyphs,
	getScrambleGlyphs,
	clearGlyphCache,
	GLYPH_PALETTES,
	validateCustomGlyphs,
	fnv1a
} from '../src/glyphs';

describe('Glyphs - Deterministic Stable Mask Generation', () => {
	it('generates deterministic output for unchanged input', () => {
		const word = 'extraordinary';
		const glyphs1 = getStableGlyphs(word, 'matrix');
		const glyphs2 = getStableGlyphs(word, 'matrix');

		expect(glyphs1).toBe(glyphs2);
		expect(glyphs1.length).toBe(word.length);
	});

	it('produces exactly matching length for words to prevent layout shift', () => {
		const words = ['a', 'to', 'cat', 'privacy', 'confidentiality'];
		for (const w of words) {
			const g = getStableGlyphs(w, 'matrix');
			expect(g.length).toBe(w.length);
		}
	});

	it('handles empty input gracefully', () => {
		expect(getStableGlyphs('', 'matrix')).toBe('');
	});

	it('returns different glyphs for different words', () => {
		const g1 = getStableGlyphs('hello', 'matrix');
		const g2 = getStableGlyphs('world', 'matrix');
		expect(g1).not.toBe(g2);
	});

	it('supports all configured palettes including braille and morse', () => {
		const word = 'confitext';
		const palettes = ['matrix', 'runes', 'geometry', 'blocks', 'braille', 'morse'] as const;

		for (const palette of palettes) {
			const result = getStableGlyphs(word, palette);
			expect(result.length).toBe(word.length);

			// Verify characters belong to the palette
			const validChars = new Set(GLYPH_PALETTES[palette]);
			for (const char of result) {
				expect(validChars.has(char)).toBe(true);
			}
		}
	});

	it('cache clearing maintains deterministic output', () => {
		const word = 'persistence';
		const initial = getStableGlyphs(word, 'matrix');
		clearGlyphCache();
		const afterClear = getStableGlyphs(word, 'matrix');
		expect(afterClear).toBe(initial);
	});

	it('computes 32-bit FNV-1a hash consistently', () => {
		const h1 = fnv1a('matrix');
		const h2 = fnv1a('matrix');
		expect(h1).toBe(h2);
		expect(h1).toBeGreaterThan(0);
	});
});

describe('Glyphs - Custom Glyph Importer & Validation', () => {
	it('validates and accepts valid Unicode glyph strings', () => {
		const input = '⠁⠃⠉⠙⠑';
		const res = validateCustomGlyphs(input);
		expect(res.valid).toBe(true);
		expect(res.count).toBe(5);
		expect(res.glyphs).toEqual(['⠁', '⠃', '⠉', '⠙', '⠑']);
	});

	it('deduplicates repeating characters', () => {
		const input = 'AAABBBCCC';
		const res = validateCustomGlyphs(input);
		expect(res.valid).toBe(true);
		expect(res.count).toBe(3);
		expect(res.glyphs).toEqual(['A', 'B', 'C']);
	});

	it('ignores whitespace inside glyph string', () => {
		const input = ' • - / ~ ';
		const res = validateCustomGlyphs(input);
		expect(res.valid).toBe(true);
		expect(res.count).toBe(4);
		expect(res.glyphs).toEqual(['•', '-', '/', '~']);
	});

	it('rejects empty or whitespace-only inputs', () => {
		expect(validateCustomGlyphs('').valid).toBe(false);
		expect(validateCustomGlyphs('   \t\n  ').valid).toBe(false);
	});

	it('rejects glyph sets with fewer than 2 unique characters', () => {
		const res1 = validateCustomGlyphs('X');
		expect(res1.valid).toBe(false);
		expect(res1.error).toContain('at least 2');

		const res2 = validateCustomGlyphs('XXXXX');
		expect(res2.valid).toBe(false);
	});

	it('filters out control characters, lone surrogates, and zero-width characters', () => {
		const input = 'A\u0000B\u001FC\u200BD\u200CE\u200DF\uFEFFG'; // Includes control chars, ZWSP, ZWNJ, ZWJ, BOM
		const res = validateCustomGlyphs(input);
		expect(res.valid).toBe(true);
		expect(res.glyphs).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
	});

	it('includes dash and slash in Morse Code palette and preset', () => {
		const word = 'morse-test/code';
		const stable = getStableGlyphs(word, 'morse');
		expect(stable.length).toBe(word.length);

		// Morse palette contains - and /
		expect(GLYPH_PALETTES.morse.includes('-')).toBe(true);
		expect(GLYPH_PALETTES.morse.includes('/')).toBe(true);
	});

	it('correctly parses astral-plane Unicode characters and emojis', () => {
		const input = '🜂🜄🜁🜃';
		const res = validateCustomGlyphs(input);
		expect(res.valid).toBe(true);
		expect(res.count).toBe(4);
		expect(res.glyphs).toEqual(['🜂', '🜄', '🜁', '🜃']);
	});
});

describe('Glyphs - Custom Palette Generation & Scrambling', () => {
	it('generates stable glyphs using custom glyph set', () => {
		const customSet = '⠁⠃⠉⠙⠑';
		const word = 'confidential';

		const g1 = getStableGlyphs(word, 'custom', customSet);
		const g2 = getStableGlyphs(word, 'custom', customSet);

		expect(g1).toBe(g2);
		expect(g1.length).toBe(word.length);

		// Every character in g1 must be from customSet
		const allowed = new Set(Array.from(customSet));
		for (const char of g1) {
			expect(allowed.has(char)).toBe(true);
		}
	});

	it('falls back safely to default palette if custom set is invalid or empty', () => {
		const word = 'fallback';
		const result = getStableGlyphs(word, 'custom', '');
		expect(result.length).toBe(word.length);
		expect(result).toBeTruthy();
	});

	it('in-flight scramble flickers and settles using custom glyphs', () => {
		const customSet = '•−–·⎻';
		const word = 'morsecode';
		const stable = getStableGlyphs(word, 'custom', customSet);

		// Settles at 1.0
		const settled = getScrambleGlyphs(word, stable, 1.0, 50, 'custom', customSet);
		expect(settled).toBe(stable);

		// Flickering at 0.0 uses characters from customSet
		const flick = getScrambleGlyphs(word, stable, 0.0, 10, 'custom', customSet);
		expect(flick.length).toBe(word.length);
		const allowed = new Set(Array.from(customSet));
		for (const char of flick) {
			expect(allowed.has(char)).toBe(true);
		}
	});
});

describe('Glyphs - In-Flight Scrambling Animation', () => {
	it('settles fully into stable glyphs when progress is 1.0', () => {
		const word = 'cyberpunk';
		const stable = getStableGlyphs(word, 'matrix');

		const scramble = getScrambleGlyphs(word, stable, 1.0, 100, 'matrix');
		expect(scramble).toBe(stable);
	});

	it('settles partially at intermediate progress levels', () => {
		const word = 'confidential';
		const stable = getStableGlyphs(word, 'matrix');

		// At 50% progress, the first 6 characters should be settled
		const midScramble = getScrambleGlyphs(word, stable, 0.5, 42, 'matrix');
		expect(midScramble.length).toBe(word.length);
		expect(midScramble.slice(0, 6)).toBe(stable.slice(0, 6));
	});

	it('flickers unsettled characters across different frame seeds', () => {
		const word = 'unsettled';
		const stable = getStableGlyphs(word, 'matrix');

		const frame1 = getScrambleGlyphs(word, stable, 0.0, 1, 'matrix');
		const frame2 = getScrambleGlyphs(word, stable, 0.0, 2, 'matrix');

		expect(frame1.length).toBe(word.length);
		expect(frame2.length).toBe(word.length);
		// With different frame seeds, the scramble state should flicker
		expect(frame1).not.toBe(frame2);
	});
});
