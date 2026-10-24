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

export interface ConfitextSettings {
	// Group A - Behavior
	enabled: boolean;
	startAutomatically: boolean;
	defaultMode: ConfitextMode;
	maskNewlyCompletedWords: boolean;
	revealSelectedText: boolean;
	revealEntireWordOnSelection: boolean;
	restoreMaskingAfterSelection: boolean;
	revealOnCursorInsideWord: boolean;

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
	maskNewlyCompletedWords: true,
	revealSelectedText: true,
	revealEntireWordOnSelection: true,
	restoreMaskingAfterSelection: true,
	revealOnCursorInsideWord: true,

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
