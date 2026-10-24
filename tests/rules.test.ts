import { describe, it, expect, beforeEach } from 'vitest';
import {
	isFrontmatterDisabled,
	isPathExcluded,
	isNoteMaskingDisabled,
	clearRulesCache,
	normalizePath
} from '../src/rules';
import { DEFAULT_SETTINGS } from '../src/types';

describe('Rules - YAML Frontmatter Exclusion', () => {
	beforeEach(() => {
		clearRulesCache();
	});

	it('detects confitext: false in frontmatter', () => {
		const doc = `---\ntitle: Public Blog\nconfitext: false\n---\nHello world from public note`;
		expect(isFrontmatterDisabled(doc)).toBe(true);
	});

	it('handles boolean variations and quotes (false, "false", \'false\', off, no, 0)', () => {
		const variations = [
			'confitext: false',
			'confitext: "false"',
			"confitext: 'false'",
			'confitext: off',
			'confitext: no',
			'confitext: 0',
			'confitext: disabled',
			'confitext: none',
			'confitext: false   ',
			'  confitext: false',
			'confitext: false # public note inline comment'
		];

		for (const v of variations) {
			const doc = `---\n${v}\n---\nContent here`;
			expect(isFrontmatterDisabled(doc)).toBe(true);
		}
	});

	it('detects frontmatter ending with YAML ellipsis (...)', () => {
		const doc = `---\ntitle: Blog\nconfitext: false\n...\nHello from ellipsis document`;
		expect(isFrontmatterDisabled(doc)).toBe(true);
	});

	it('handles UTF-8 Byte Order Mark (BOM) gracefully', () => {
		const docWithBom = `\uFEFF---\nconfitext: false\n---\nContent with BOM`;
		expect(isFrontmatterDisabled(docWithBom)).toBe(true);
	});

	it('is case-insensitive for keys and values', () => {
		const doc1 = `---\nConfitext: False\n---\nContent`;
		const doc2 = `---\nCONFITEXT: FALSE\n---\nContent`;
		const doc3 = `---\nConfiText: OFF\n---\nContent`;

		expect(isFrontmatterDisabled(doc1)).toBe(true);
		expect(isFrontmatterDisabled(doc2)).toBe(true);
		expect(isFrontmatterDisabled(doc3)).toBe(true);
	});

	it('does NOT disable masking when confitext: true', () => {
		const doc1 = `---\ntitle: Secret Note\nconfitext: true\n---\nConfidential`;
		const doc2 = `---\ntitle: Secret Note\nconfitext: yes\n---\nConfidential`;
		const doc3 = `---\nconfitext: 1\n---\nConfidential`;

		expect(isFrontmatterDisabled(doc1)).toBe(false);
		expect(isFrontmatterDisabled(doc2)).toBe(false);
		expect(isFrontmatterDisabled(doc3)).toBe(false);
	});

	it('returns false when document has no frontmatter', () => {
		const doc = `Just normal markdown content without any YAML frontmatter.`;
		expect(isFrontmatterDisabled(doc)).toBe(false);
	});

	it('returns false for empty documents', () => {
		expect(isFrontmatterDisabled('')).toBe(false);
	});

	it('returns false when frontmatter has unrelated keys', () => {
		const doc = `---\ntitle: My Note\ntags: [privacy, note]\nauthor: Alice\n---\nContent`;
		expect(isFrontmatterDisabled(doc)).toBe(false);
	});

	it('memoizes frontmatter evaluation for instant repeated checks', () => {
		const doc = `---\nconfitext: false\n---\nContent`;

		// First check computes and caches
		const first = isFrontmatterDisabled(doc);
		expect(first).toBe(true);

		// Subsequent check hits memory cache
		const second = isFrontmatterDisabled(doc);
		expect(second).toBe(true);
	});
});

describe('Rules - Folder Path Exclusions', () => {
	beforeEach(() => {
		clearRulesCache();
	});

	it('normalizes paths across Windows and Unix separators', () => {
		expect(normalizePath('Public\\Notes\\')).toBe('public/notes');
		expect(normalizePath('/Public/Notes/')).toBe('public/notes');
		expect(normalizePath('  Shared/Team  ')).toBe('shared/team');
	});

	it('matches notes directly inside excluded folder', () => {
		const excluded = ['Public', 'Shared/'];
		expect(isPathExcluded('Public/Note.md', excluded)).toBe(true);
		expect(isPathExcluded('Public/Subfolder/Note.md', excluded)).toBe(true);
		expect(isPathExcluded('Shared/Team/Doc.md', excluded)).toBe(true);
	});

	it('matches notes with Windows backslashes', () => {
		const excluded = ['Public'];
		expect(isPathExcluded('Public\\Sub\\Note.md', excluded)).toBe(true);
	});

	it('matches nested folder segments', () => {
		const excluded = ['Public'];
		expect(isPathExcluded('Archive/Public/Note.md', excluded)).toBe(true);
		expect(isPathExcluded('Vault/Shared/Public/Doc.md', excluded)).toBe(true);
	});

	it('does NOT match false positives where folder name is a prefix of another folder', () => {
		const excluded = ['Public'];
		expect(isPathExcluded('Publication/Note.md', excluded)).toBe(false);
		expect(isPathExcluded('Publicity/PressRelease.md', excluded)).toBe(false);
	});

	it('does NOT exclude notes outside specified folders', () => {
		const excluded = ['Public', 'Shared'];
		expect(isPathExcluded('Private/Secrets.md', excluded)).toBe(false);
		expect(isPathExcluded('Daily/2026-10-24.md', excluded)).toBe(false);
		expect(isPathExcluded('RootNote.md', excluded)).toBe(false);
	});

	it('handles empty or undefined inputs gracefully', () => {
		expect(isPathExcluded('', ['Public'])).toBe(false);
		expect(isPathExcluded(undefined, ['Public'])).toBe(false);
		expect(isPathExcluded(null, ['Public'])).toBe(false);
		expect(isPathExcluded('Public/Note.md', [])).toBe(false);
		expect(isPathExcluded('Public/Note.md', null)).toBe(false);
	});

	it('memoizes path exclusion lookups', () => {
		const excluded = ['Public'];
		const first = isPathExcluded('Public/Note.md', excluded);
		expect(first).toBe(true);

		const second = isPathExcluded('Public/Note.md', excluded);
		expect(second).toBe(true);
	});
});

describe('Rules - Integrated isNoteMaskingDisabled', () => {
	beforeEach(() => {
		clearRulesCache();
	});

	it('disables masking when note path is in excluded folder', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			excludedFolders: ['Public']
		};
		const doc = 'Normal body text without frontmatter';
		expect(isNoteMaskingDisabled(doc, 'Public/MyNote.md', settings)).toBe(true);
	});

	it('disables masking when note frontmatter has confitext: false', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			respectFrontmatterExclusion: true,
			excludedFolders: []
		};
		const doc = `---\nconfitext: false\n---\nHello public world`;
		expect(isNoteMaskingDisabled(doc, 'Private/Note.md', settings)).toBe(true);
	});

	it('keeps masking enabled when respectFrontmatterExclusion is toggled off', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			respectFrontmatterExclusion: false,
			excludedFolders: []
		};
		const doc = `---\nconfitext: false\n---\nHello world`;
		expect(isNoteMaskingDisabled(doc, 'Private/Note.md', settings)).toBe(false);
	});

	it('keeps masking enabled when note is neither in excluded folder nor has disabling frontmatter', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			excludedFolders: ['Public'],
			respectFrontmatterExclusion: true
		};
		const doc = `---\ntitle: Secret\n---\nSecret content`;
		expect(isNoteMaskingDisabled(doc, 'Private/Secret.md', settings)).toBe(false);
	});

	it('memoizes exclusion per file path and updates dynamically when frontmatter changes', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			respectFrontmatterExclusion: true,
			excludedFolders: ['Public']
		};

		const filePath = 'Notes/DynamicNote.md';

		// Initial: private note with no frontmatter
		const doc1 = 'Just private thoughts.';
		expect(isNoteMaskingDisabled(doc1, filePath, settings)).toBe(false);

		// Edits in body: still private, hits per-file cache instantly
		const doc2 = 'Just private thoughts with more text appended.';
		expect(isNoteMaskingDisabled(doc2, filePath, settings)).toBe(false);

		// User adds confitext: false in frontmatter: immediately disables masking!
		const doc3 = `---\nconfitext: false\n---\nJust private thoughts with more text appended.`;
		expect(isNoteMaskingDisabled(doc3, filePath, settings)).toBe(true);

		// User types more into body: stays disabled via cached frontmatter snippet
		const doc4 = `---\nconfitext: false\n---\nJust private thoughts with more text appended and new words.`;
		expect(isNoteMaskingDisabled(doc4, filePath, settings)).toBe(true);

		// User removes confitext: false: immediately re-enables masking!
		const doc5 = `---\ntitle: Re-enabled\n---\nJust private thoughts with more text appended and new words.`;
		expect(isNoteMaskingDisabled(doc5, filePath, settings)).toBe(false);
	});
});
