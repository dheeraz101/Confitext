/**
 * Confitext - Glyph System & Deterministic Generators
 */

import { GlyphPaletteName } from './types';

export const GLYPH_PALETTES: Record<GlyphPaletteName, readonly string[]> = {
	matrix: [
		'ⵙ', 'Ϟ', '⟁', 'Ж', 'ᚷ', '⌁', '░', '✦', 'ⵣ', 'Ξ',
		'Ψ', '⍜', '⍝', '⌖', '⌘', '⌬', '⏣', '⟐', '⟡', '⟢',
		'⟤', '⊞', '⊡', '∷', 'ᚙ', 'ᚦ', 'ᛟ', 'ᛝ', 'ᚹ', 'ᛗ', 'ᛚ'
	],
	runes: [
		'᚛', '᚜', 'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ',
		'ᚺ', 'ᚻ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ',
		'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛟ', 'ᛞ'
	],
	geometry: [
		'⟁', '⟐', '⟡', '⟢', '⟤', '⌖', '⌬', '⏣', '⊞', '⊡',
		'∷', '◈', '◇', '◆', '◬', '◭', '◮', '☵', '☲', '☳',
		'☴', '☶', '☱', '☰', '☷'
	],
	blocks: [
		'░', '▒', '▓', '█', '▀', '▄', '▌', '▐', '■', '□',
		'▢', '▣', '▤', '▥', '▦', '▧', '▨', '▩'
	],
	braille: [
		'⠁', '⠃', '⠉', '⠙', '⠑', '⠋', '⠛', '⠓', '⠊', '⠚',
		'⠅', '⠇', '⠍', '⠝', '⠕', '⠏', '⠟', '⠗', '⠎', '⠞',
		'⠥', '⠧', '⠺', '⠭', '⠽', '⠵', '⠮', '⠯', '⠰', '⠱',
		'⠲', '⠳', '⠴', '⠶', '⠷', '⠸', '⠹', '⠺', '⠻', '⠿'
	],
	morse: [
		'•', '−', '–', '·', '-', '/', '⎻', '⎼', '⎽', '▪', '▫'
	],
	custom: [
		'⠁', '⠃', '⠉', '⠙', '⠑', '⠋', '⠛', '⠓', '⠊', '⠚'
	]
};

export interface GlyphPreset {
	name: string;
	glyphs: string;
	description: string;
}

export const GLYPH_PRESETS: Record<string, GlyphPreset> = {
	braille: {
		name: 'Braille Script',
		glyphs: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵⠮⠯⠰⠱⠲⠳⠴⠶⠷⠸⠹⠺⠻⠿',
		description: 'Tactile dot matrix patterns'
	},
	morse: {
		name: 'Morse Code',
		glyphs: '• − – · - / ⎻ ⎼ ⎽ ▪ ▫',
		description: 'Dits, dahs, dashes, and pulse bars'
	},
	runes: {
		name: 'Cyber Runes',
		glyphs: '᚛᚜ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚻᚾᛁᛃᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ',
		description: 'Elder Futhark and Ogham cyber-runes'
	},
	geometry: {
		name: 'Abstract Geometry',
		glyphs: '⟁⟐⟡⟢⟤⌖⌬⏣⊞⊡∷◈◇◆◬◭◮☵☲☳☴☶☱☰☷',
		description: 'Mathematical and sacred geometric symbols'
	},
	matrix: {
		name: 'Matrix Code',
		glyphs: 'ⵙϞ⟁Жᚷ⌁░✦ⵣΞΨ⍜⍝⌖⌘⌬⏣⟐⟡⟢⟤⊞⊡∷ᚙᚦᛟᛝᚹᛗᛚ',
		description: 'Original phosphor hacker rain symbols'
	},
	blocks: {
		name: 'Digital Blocks',
		glyphs: '░▒▓█▀▄▌▐■□▢▣▤▥▦▧▨▩',
		description: 'Terminal shade blocks and ASCII cells'
	},
	elvish: {
		name: 'Elvish / Tengwar',
		glyphs: 'ñðþȝƿᵹɼſᶄᶅ',
		description: 'Archaic script and insular glyphs'
	},
	klingon: {
		name: 'Klingon / Alien',
		glyphs: '',
		description: 'Extraterrestrial private-use glyphs'
	},
	alchemical: {
		name: 'Alchemical & Celestial',
		glyphs: '🜂🜄🜁🜃🜔🜖🜍🝆☉☽☿♀♂♃♄♅♆♇',
		description: 'Occult planetary and elemental glyphs'
	}
};

export interface GlyphValidationResult {
	valid: boolean;
	glyphs: string[];
	count: number;
	error?: string;
}

/**
 * Validates arbitrary Unicode glyph input strings:
 * - Deduplicates characters
 * - Filters whitespace
 * - Strips control characters and lone surrogates
 * - Requires at least 2 unique characters
 */
export function validateCustomGlyphs(input: string): GlyphValidationResult {
	if (!input || typeof input !== 'string') {
		return {
			valid: false,
			glyphs: [],
			count: 0,
			error: 'Custom glyph string cannot be empty.'
		};
	}

	// Split by Unicode codepoints (handles astral plane and surrogate pairs properly)
	const rawChars = Array.from(input);
	const seen = new Set<string>();
	const filtered: string[] = [];

	for (const char of rawChars) {
		// Filter out whitespace
		if (!char || char.trim() === '' || /\s/u.test(char)) {
			continue;
		}

		// Filter out control characters (0x00-0x1F, 0x7F-0x9F)
		const code = char.codePointAt(0);
		if (code !== undefined) {
			if ((code >= 0 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) {
				continue;
			}
			// Filter out zero-width and invisible format characters (ZWSP, ZWNJ, ZWJ, BOM, etc.)
			if (
				(code >= 0x200b && code <= 0x200f) ||
				(code >= 0x2028 && code <= 0x202f) ||
				(code >= 0x2060 && code <= 0x206f) ||
				code === 0xfeff ||
				(code >= 0xfff0 && code <= 0xffff)
			) {
				continue;
			}
		}

		// Filter out lone/corrupt surrogates if any slipped through
		if (char.length === 1) {
			const c = char.charCodeAt(0);
			if (c >= 0xd800 && c <= 0xdfff) {
				continue;
			}
		}

		// Deduplicate
		if (!seen.has(char)) {
			seen.add(char);
			filtered.push(char);
		}
	}

	if (filtered.length < 2) {
		return {
			valid: false,
			glyphs: filtered,
			count: filtered.length,
			error: 'Glyph set must contain at least 2 unique, non-whitespace characters.'
		};
	}

	return {
		valid: true,
		glyphs: filtered,
		count: filtered.length
	};
}

/**
 * Resolves a palette name (and optional custom glyph string) to an array of glyph strings
 */
export function resolveGlyphPalette(
	paletteName: GlyphPaletteName,
	customGlyphs?: string
): readonly string[] {
	if (paletteName === 'custom') {
		if (customGlyphs) {
			const validation = validateCustomGlyphs(customGlyphs);
			if (validation.valid && validation.glyphs.length >= 2) {
				return validation.glyphs;
			}
		}
		return GLYPH_PALETTES.custom;
	}

	return GLYPH_PALETTES[paletteName] || GLYPH_PALETTES.matrix;
}

// 32-bit FNV-1a hash implementation
export function fnv1a(str: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		// 32-bit FNV prime: 16777619
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

// Bounded in-memory cache for deterministic glyph mappings
const GLYPH_CACHE = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

/**
 * Clear the deterministic glyph cache
 */
export function clearGlyphCache(): void {
	GLYPH_CACHE.clear();
}

/**
 * Deterministically generates a stable string of glyphs for a given word.
 * - Same word + same palette = always same glyph string.
 * - Output length matches input length to prevent document reflow.
 */
export function getStableGlyphs(
	word: string,
	paletteName: GlyphPaletteName = 'matrix',
	customGlyphs?: string
): string {
	if (!word || word.length === 0) return '';

	const palette = resolveGlyphPalette(paletteName, customGlyphs);
	const paletteKey = paletteName === 'custom' ? `custom:${palette.join('')}` : paletteName;
	const cacheKey = `${paletteKey}:${word}`;

	const cached = GLYPH_CACHE.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	const paletteLen = palette.length;
	const baseHash = fnv1a(word);

	const chars: string[] = [];
	for (let i = 0; i < word.length; i++) {
		// Scramble position with multiplier to avoid repeating patterns
		const charHash = (baseHash ^ Math.imul(i + 1, 0x5bd1e995)) >>> 0;
		const index = (charHash + i * 7) % paletteLen;
		chars.push(palette[index]);
	}

	const result = chars.join('');

	// Evict oldest entries if cache grows too large
	if (GLYPH_CACHE.size >= MAX_CACHE_SIZE) {
		const firstKey = GLYPH_CACHE.keys().next().value;
		if (firstKey !== undefined) {
			GLYPH_CACHE.delete(firstKey);
		}
	}

	GLYPH_CACHE.set(cacheKey, result);
	return result;
}

/**
 * Generates an in-flight animated scramble string.
 * As progress moves from 0 to 1:
 * - Settled characters transition into their stable glyphs.
 * - Unsettled characters flicker dynamically based on frameSeed.
 */
export function getScrambleGlyphs(
	word: string,
	stableGlyphs: string,
	progress: number,
	frameSeed: number,
	paletteName: GlyphPaletteName = 'matrix',
	customGlyphs?: string
): string {
	if (progress >= 1.0) {
		return stableGlyphs;
	}

	const palette = resolveGlyphPalette(paletteName, customGlyphs);
	const paletteLen = palette.length;
	const stableChars = Array.from(stableGlyphs);
	const len = stableChars.length;
	const settledCount = Math.floor(progress * len);

	const result: string[] = [];
	for (let i = 0; i < len; i++) {
		if (i < settledCount) {
			// Already settled into stable glyph
			result.push(stableChars[i] || palette[0]);
		} else {
			// Flickering glyph during scramble
			const flickHash = (fnv1a(word) ^ Math.imul(frameSeed + i * 13, 0x27d4eb2d)) >>> 0;
			const flickIndex = flickHash % paletteLen;
			result.push(palette[flickIndex]);
		}
	}

	return result.join('');
}
