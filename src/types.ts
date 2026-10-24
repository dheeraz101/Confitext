/**
 * Confitext - Types and Interfaces
 */

export type ConfitextMode = 'masking' | 'revealed' | 'paused';

export type GlyphPaletteName =
	| 'matrix'
	| 'runes'
	| 'geometry'
	| 'blocks'
	| 'braille'
	| 'morse'
	| 'custom';

export type MaskColorTheme = 'matrix-green' | 'theme-accent' | 'monochrome' | 'custom';

export type AnimationSpeed = 'fast' | 'normal' | 'slow';

export type AnimationIntensity = 'subtle' | 'standard' | 'intense';

export type MaskingScope = 'all-words' | 'targeted-only';

export type MaskTriggerMode = 'word' | 'line' | 'paragraph';

export interface SensitivePatternConfig {
	id: string;
	name: string;
	desc: string;
	pattern: string;
	flags: string;
	enabled: boolean;
}

export interface ConfitextSettings {
	// Group A - Behavior & Scope
	enabled: boolean;
	startAutomatically: boolean;
	defaultMode: ConfitextMode;
	maskingScope: MaskingScope;
	maskTriggerMode: MaskTriggerMode;
	maskNewlyCompletedWords: boolean;
	revealSelectedText: boolean;
	revealEntireWordOnSelection: boolean;
	restoreMaskingAfterSelection: boolean;
	revealOnCursorInsideWord: boolean;
	enableHoverReveal: boolean;
	hoverRevealDelayMs: number;

	// Targeted Word Masking & Memory
	globalMaskedWords: string[];
	caseSensitiveTargeting: boolean;

	// Sensitive Data Shield (Pattern & PII Masking)
	enablePatternMasking: boolean;
	maskEmails: boolean;
	maskApiKeys: boolean;
	maskCreditCards: boolean;
	maskPhoneNumbers: boolean;
	maskIpAddresses: boolean;
	customPatterns: SensitivePatternConfig[];

	// Group B - Appearance & Custom Glyphs
	glyphStyle: GlyphPaletteName;
	customGlyphs: string;
	maskColorTheme: MaskColorTheme;
	customColor: string;
	subtleGlow: boolean;
	maskOpacity: number;

	// Group C - Animation
	enableAnimation: boolean;
	animationSpeed: AnimationSpeed;
	animationIntensity: AnimationIntensity;
	respectReducedMotion: boolean;

	// Group D - Idle & Auto-Masking
	idleAutoMask: boolean;
	idleTimeoutMinutes: number;
	autoMaskOnBlur: boolean;

	// Group E - Controls
	showRibbonIcon: boolean;
	showStatusIndicator: boolean;
	showTabHeaderAction: boolean;
	maskReadingView: boolean;
	restoreStateOnStartup: boolean;

	// Group F - Exclusions & Rules
	excludedFolders: string[];
	respectFrontmatterExclusion: boolean;
	preserveMarkdownSyntax: boolean;
	preserveCodeBlocks: boolean;
	preserveInlineCode: boolean;
	preserveUrls: boolean;
}

export const DEFAULT_SETTINGS: ConfitextSettings = {
	enabled: true,
	startAutomatically: true,
	defaultMode: 'masking',
	maskingScope: 'all-words',
	maskTriggerMode: 'word',
	maskNewlyCompletedWords: true,
	revealSelectedText: true,
	revealEntireWordOnSelection: true,
	restoreMaskingAfterSelection: true,
	revealOnCursorInsideWord: true,
	enableHoverReveal: false,
	hoverRevealDelayMs: 500,

	globalMaskedWords: [],
	caseSensitiveTargeting: false,

	enablePatternMasking: true,
	maskEmails: true,
	maskApiKeys: true,
	maskCreditCards: false,
	maskPhoneNumbers: false,
	maskIpAddresses: false,
	customPatterns: [],

	glyphStyle: 'matrix',
	customGlyphs: '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵',
	maskColorTheme: 'matrix-green',
	customColor: '#65F59A',
	subtleGlow: true,
	maskOpacity: 0.95,

	enableAnimation: true,
	animationSpeed: 'normal',
	animationIntensity: 'standard',
	respectReducedMotion: true,

	idleAutoMask: false,
	idleTimeoutMinutes: 5,
	autoMaskOnBlur: false,

	showRibbonIcon: true,
	showStatusIndicator: true,
	showTabHeaderAction: true,
	maskReadingView: false,
	restoreStateOnStartup: true,

	excludedFolders: [],
	respectFrontmatterExclusion: true,
	preserveMarkdownSyntax: true,
	preserveCodeBlocks: true,
	preserveInlineCode: true,
	preserveUrls: true,
};

export interface WordToken {
	from: number;
	to: number;
	text: string;
	isCompleted: boolean;
}

export interface ExcludedRange {
	from: number;
	to: number;
	type: 'code-block' | 'inline-code' | 'frontmatter' | 'url' | 'markdown-syntax';
}

export interface ActiveAnimation {
	wordKey: string;
	from: number;
	to: number;
	word: string;
	stableGlyphs: string;
	startTime: number;
	duration: number;
}
