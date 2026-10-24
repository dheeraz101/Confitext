/**
 * Confitext - Per-Folder and Per-Note Frontmatter Exclusion Rules
 */

import { ConfitextSettings } from './types';

// Regex matching YAML frontmatter block at start of document (supports --- and ... closing tags)
const FRONTMATTER_BLOCK_REGEX = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;

// Matches confitext: false (case-insensitive, handles indentation, quotes, trailing spaces, YAML booleans & inline comments)
const DISABLED_KEY_REGEX = /^\s*confitext\s*:\s*(?:false|off|0|no|disabled|none|['"]false['"]|['"]off['"]|['"]no['"]|['"]disabled['"]|['"]none['"])\s*(?:#.*)?$/im;

// Bounded caches for fast memoized lookups
const FRONTMATTER_CACHE = new Map<string, boolean>();
const PATH_CACHE = new Map<string, boolean>();

interface FileNoteCacheEntry {
	excludedFoldersKey: string;
	isFolderExcluded: boolean;
	respectFm: boolean;
	fmSnippet: string;
	isDisabled: boolean;
}
const FILE_NOTE_CACHE = new Map<string, FileNoteCacheEntry>();
const MAX_CACHE_ENTRIES = 1000;

/**
 * Clears all rule memoization caches
 */
export function clearRulesCache(): void {
	FRONTMATTER_CACHE.clear();
	PATH_CACHE.clear();
	FILE_NOTE_CACHE.clear();
}

/**
 * Checks if a note's YAML frontmatter contains `confitext: false`
 */
export function isFrontmatterDisabled(docText: string): boolean {
	if (!docText) {
		return false;
	}

	// Handle optional UTF-8 BOM
	const text = docText.charCodeAt(0) === 0xfeff ? docText.slice(1) : docText;
	if (!text.startsWith('---')) {
		return false;
	}

	const match = text.match(FRONTMATTER_BLOCK_REGEX);
	if (!match) {
		return false;
	}

	const fmContent = match[1];

	// Check memoized cache
	const cached = FRONTMATTER_CACHE.get(fmContent);
	if (cached !== undefined) {
		return cached;
	}

	const isDisabled = DISABLED_KEY_REGEX.test(fmContent);

	if (FRONTMATTER_CACHE.size >= MAX_CACHE_ENTRIES) {
		const firstKey = FRONTMATTER_CACHE.keys().next().value;
		if (firstKey !== undefined) {
			FRONTMATTER_CACHE.delete(firstKey);
		}
	}

	FRONTMATTER_CACHE.set(fmContent, isDisabled);
	return isDisabled;
}

/**
 * Normalizes a path string by replacing backslashes, trimming whitespace,
 * converting to lowercase, and stripping leading/trailing slashes.
 */
export function normalizePath(pathStr: string): string {
	return pathStr
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '')
		.toLowerCase();
}

/**
 * Checks if a vault file path falls within any user-configured excluded folder.
 * Matches:
 * - Direct folder prefix (e.g. "Public/Note.md" matches "Public")
 * - Subfolder nesting (e.g. "Shared/Team/Note.md" matches "Shared" or "Shared/Team")
 * - Any path segment (e.g. "Archive/Public/Note.md" matches "Public")
 */
export function isPathExcluded(
	filePath: string | undefined | null,
	excludedFolders: readonly string[] | undefined | null
): boolean {
	if (!filePath || !excludedFolders || excludedFolders.length === 0) {
		return false;
	}

	const normPath = normalizePath(filePath);
	if (!normPath) return false;

	const cacheKey = `${normPath}::${excludedFolders.join('|')}`;
	const cached = PATH_CACHE.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	let excluded = false;
	for (const rawFolder of excludedFolders) {
		const folder = normalizePath(rawFolder);
		if (!folder) continue;

		if (
			normPath === folder ||
			normPath.startsWith(folder + '/') ||
			normPath.includes('/' + folder + '/')
		) {
			excluded = true;
			break;
		}
	}

	if (PATH_CACHE.size >= MAX_CACHE_ENTRIES) {
		const firstKey = PATH_CACHE.keys().next().value;
		if (firstKey !== undefined) {
			PATH_CACHE.delete(firstKey);
		}
	}

	PATH_CACHE.set(cacheKey, excluded);
	return excluded;
}

/**
 * Checks if visual masking should be completely disabled for a given note
 * due to folder exclusion or YAML frontmatter rule.
 * Optimally memoized per note file path to avoid redundant metadata parsing on keystrokes.
 */
export function isNoteMaskingDisabled(
	docText: string,
	filePath: string | undefined | null,
	settings: ConfitextSettings
): boolean {
	const excludedFoldersKey = settings.excludedFolders ? settings.excludedFolders.join('|') : '';
	const respectFm = settings.respectFrontmatterExclusion;

	// Per-file-path memoization
	if (filePath) {
		const cached = FILE_NOTE_CACHE.get(filePath);

		// Extract quick frontmatter snippet up to 8KB to check if frontmatter changed
		let currentFmSnippet = '';
		if (docText) {
			const text = docText.charCodeAt(0) === 0xfeff ? docText.slice(1) : docText;
			if (text.startsWith('---')) {
				const endIdx = text.indexOf('\n---', 3);
				const endDotsIdx = text.indexOf('\n...', 3);
				const closeIdx = endIdx !== -1 && endDotsIdx !== -1
					? Math.min(endIdx, endDotsIdx)
					: (endIdx !== -1 ? endIdx : endDotsIdx);
				currentFmSnippet = closeIdx !== -1 ? text.slice(0, closeIdx + 4) : text.slice(0, 1024);
			}
		}

		if (
			cached &&
			cached.excludedFoldersKey === excludedFoldersKey &&
			cached.respectFm === respectFm &&
			cached.fmSnippet === currentFmSnippet
		) {
			return cached.isDisabled;
		}

		// 1. Folder path exclusion
		const isFolderExcluded =
			settings.excludedFolders &&
			settings.excludedFolders.length > 0 &&
			isPathExcluded(filePath, settings.excludedFolders);

		if (isFolderExcluded) {
			const entry: FileNoteCacheEntry = {
				excludedFoldersKey,
				isFolderExcluded: true,
				respectFm,
				fmSnippet: currentFmSnippet,
				isDisabled: true
			};
			if (FILE_NOTE_CACHE.size >= MAX_CACHE_ENTRIES) {
				const firstKey = FILE_NOTE_CACHE.keys().next().value;
				if (firstKey !== undefined) FILE_NOTE_CACHE.delete(firstKey);
			}
			FILE_NOTE_CACHE.set(filePath, entry);
			return true;
		}

		// 2. Per-note YAML frontmatter (confitext: false)
		const isFmDisabled = respectFm && isFrontmatterDisabled(docText);
		const isDisabled = !!isFmDisabled;

		const entry: FileNoteCacheEntry = {
			excludedFoldersKey,
			isFolderExcluded: false,
			respectFm,
			fmSnippet: currentFmSnippet,
			isDisabled
		};
		if (FILE_NOTE_CACHE.size >= MAX_CACHE_ENTRIES) {
			const firstKey = FILE_NOTE_CACHE.keys().next().value;
			if (firstKey !== undefined) FILE_NOTE_CACHE.delete(firstKey);
		}
		FILE_NOTE_CACHE.set(filePath, entry);
		return isDisabled;
	}

	// Fallback if no filePath is provided (e.g. untracked test buffers)
	if (
		settings.excludedFolders &&
		settings.excludedFolders.length > 0 &&
		isPathExcluded(filePath, settings.excludedFolders)
	) {
		return true;
	}

	if (respectFm && isFrontmatterDisabled(docText)) {
		return true;
	}

	return false;
}
