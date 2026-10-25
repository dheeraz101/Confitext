// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { getNoteMaskedWords, clearRulesCache } from '../src/rules';
import { findTargetedTokens, SENSITIVE_PATTERNS } from '../src/tokenizer';
import { buildMaskDecorations, MaskWidget } from '../src/decorations';
import { maskElementNodes } from '../src/preview';
import { DEFAULT_SETTINGS, ConfitextSettings } from '../src/types';
import type ConfitextPlugin from '../src/main';

if (typeof (globalThis as any).createEl === 'undefined') {
	(globalThis as any).createEl = (tag: string, o?: any) => {
		const el = document.createElement(tag);
		if (o?.cls) el.className = o.cls;
		if (o?.text) el.textContent = o.text;
		if (o?.attr) {
			for (const [k, v] of Object.entries(o.attr)) {
				el.setAttribute(k, String(v));
			}
		}
		return el;
	};
}
if (typeof (globalThis as any).createSpan === 'undefined') {
	(globalThis as any).createSpan = (o?: any) => (globalThis as any).createEl('span', o);
}

describe('Targeted Word Masking - YAML Frontmatter Parsing', () => {
	beforeEach(() => {
		clearRulesCache();
	});

	it('extracts note-specific masked words from inline YAML array', () => {
		const doc = `---\ntitle: Secret Report\nconfitext-masked-words: [Acme, "Project Titan", secret]\n---\nHere is the report.`;
		const words = getNoteMaskedWords(doc);
		expect(words).toEqual(['Acme', 'Project Titan', 'secret']);
	});

	it('extracts note-specific masked words from bulleted YAML list', () => {
		const doc = `---\ntitle: Confidential\nconfitext-masked-words:\n  - Apple\n  - "Top Secret"\n  - $500,000\n---\nMeeting notes.`;
		const words = getNoteMaskedWords(doc);
		expect(words).toEqual(['Apple', 'Top Secret', '$500,000']);
	});

	it('extracts comma-separated masked words from YAML string', () => {
		const doc = `---\nconfitext-masked-words: confidential, internal, "Jane Doe"\n---\nBody text.`;
		const words = getNoteMaskedWords(doc);
		expect(words).toEqual(['confidential', 'internal', 'Jane Doe']);
	});

	it('handles UTF-8 BOM, comments, and snake_case alias', () => {
		const docWithBom = `\uFEFF---\nconfitext_masked_words: [Omega, Psi] # inline comment\n---\nHello.`;
		const words = getNoteMaskedWords(docWithBom);
		expect(words).toEqual(['Omega', 'Psi']);
	});

	it('returns empty array when note has no frontmatter or no masked-words key', () => {
		expect(getNoteMaskedWords('')).toEqual([]);
		expect(getNoteMaskedWords('Just plain markdown')).toEqual([]);
		expect(getNoteMaskedWords('---\ntitle: Public\n---\nText')).toEqual([]);
	});
});

describe('Targeted Word Masking - Tokenizer & Pattern Detection', () => {
	const baseSettings: ConfitextSettings = {
		...DEFAULT_SETTINGS,
		maskingScope: 'targeted-only',
		globalMaskedWords: ['classified', 'Project Apollo'],
		caseSensitiveTargeting: false,
		enablePatternMasking: true
	};

	it('matches single words and multi-word phrases as whole terms', () => {
		const doc = 'This is classified information regarding Project Apollo and something unclassified.';
		const tokens = findTargetedTokens(doc, 0, doc.length, baseSettings);

		// "classified" and "Project Apollo" should match; "unclassified" must NOT match!
		const matches = tokens.map(t => ({ text: t.text, from: t.from, to: t.to }));
		expect(matches).toEqual([
			{ text: 'classified', from: 8, to: 18 },
			{ text: 'Project Apollo', from: 41, to: 55 }
		]);
	});

	it('respects case-sensitivity when enabled', () => {
		const caseSensitiveSettings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: ['Secret'],
			caseSensitiveTargeting: true
		};
		const doc = 'Secret and secret and SECRET';
		const tokens = findTargetedTokens(doc, 0, doc.length, caseSensitiveSettings);

		expect(tokens.length).toBe(1);
		expect(tokens[0].text).toBe('Secret');
		expect(tokens[0].from).toBe(0);
	});

	it('combines note-specific words with global masked words', () => {
		const doc = 'Global classified with note-level Quantum data.';
		const noteWords = ['Quantum'];
		const tokens = findTargetedTokens(doc, 0, doc.length, baseSettings, noteWords);

		const texts = tokens.map(t => t.text);
		expect(texts).toContain('classified');
		expect(texts).toContain('Quantum');
	});

	it('detects and masks email addresses when pattern masking is enabled', () => {
		const settings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: [],
			maskEmails: true
		};
		const doc = 'Contact security officer at sec-ops@example.com for credentials.';
		const tokens = findTargetedTokens(doc, 0, doc.length, settings);

		expect(tokens.length).toBe(1);
		expect(tokens[0].text).toBe('sec-ops@example.com');
	});

	it('detects and masks API keys and secrets', () => {
		const settings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: [],
			maskApiKeys: true
		};
		const doc = 'Use key sk-proj1234567890abcdef1234567890 to authenticate.';
		const tokens = findTargetedTokens(doc, 0, doc.length, settings);

		expect(tokens.length).toBe(1);
		expect(tokens[0].text).toBe('sk-proj1234567890abcdef1234567890');
	});

	it('detects and masks credit cards, phone numbers, and IPv4 addresses', () => {
		const settings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: [],
			maskCreditCards: true,
			maskPhoneNumbers: true,
			maskIpAddresses: true
		};
		const doc = 'Card: 4111 2222 3333 4444, Phone: 555-867-5309, Server: 192.168.1.100.';
		const tokens = findTargetedTokens(doc, 0, doc.length, settings);

		const texts = tokens.map(t => t.text);
		expect(texts).toContain('4111 2222 3333 4444');
		expect(texts).toContain('555-867-5309');
		expect(texts).toContain('192.168.1.100');
	});

	it('supports custom user-defined regex patterns', () => {
		const settings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: [],
			customPatterns: [
				{
					id: 'c1',
					name: 'Ticket',
					desc: '',
					pattern: 'TICKET-\\d+',
					flags: 'gu',
					enabled: true
				}
			]
		};
		const doc = 'Fixed in TICKET-9481 and reviewed.';
		const tokens = findTargetedTokens(doc, 0, doc.length, settings);

		expect(tokens.length).toBe(1);
		expect(tokens[0].text).toBe('TICKET-9481');
	});

	it('never masks inside code blocks or URLs', () => {
		const doc = 'Normal confidential text\n```\nconst confidential = true;\n```\nhttps://example.com/confidential';
		const settings: ConfitextSettings = {
			...baseSettings,
			globalMaskedWords: ['confidential'],
			preserveCodeBlocks: true,
			preserveUrls: true
		};
		const tokens = findTargetedTokens(doc, 0, doc.length, settings);

		// Only the first 'confidential' outside code and URL should match
		expect(tokens.length).toBe(1);
		expect(tokens[0].from).toBe(7);
	});
});

describe('Targeted Word Masking - CodeMirror 6 Decorations', () => {
	it('masks only targeted words and leaves untargeted words readable', () => {
		const doc = 'Hello world, this is a secret document with classified plans.';
		const settings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskingScope: 'targeted-only',
			globalMaskedWords: ['secret', 'classified'],
			revealSelectedText: true
		};
		const selection = EditorSelection.single(0);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'masking',
			settings,
			null
		);

		// Only 2 words should be masked ('secret' and 'classified')
		expect(decos.size).toBe(2);

		const maskedWords: string[] = [];
		const iter = decos.iter();
		while (iter.value) {
			const widget = iter.value.spec.widget as MaskWidget;
			maskedWords.push(widget.word);
			iter.next();
		}

		expect(maskedWords).toEqual(['secret', 'classified']);
	});

	it('reveals targeted word when selected with cursor or mouse', () => {
		const doc = 'A secret plan.';
		const settings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			maskingScope: 'targeted-only',
			globalMaskedWords: ['secret'],
			revealSelectedText: true
		};

		// Select "secret" (indices 2 to 8)
		const selection = EditorSelection.single(2, 8);
		const visibleRanges = [{ from: 0, to: doc.length }];

		const decos = buildMaskDecorations(
			doc,
			selection,
			visibleRanges,
			'masking',
			settings,
			null
		);

		// Should not be masked because it is selected
		expect(decos.size).toBe(0);
	});

	it('attaches hover reveal listeners to MaskWidget when enableHoverReveal is on', () => {
		const settings: ConfitextSettings = {
			...DEFAULT_SETTINGS,
			enableHoverReveal: true,
			hoverRevealDelayMs: 300
		};
		const widget = new MaskWidget('confidential', '⠁⠃⠉', 'stable', settings);
		const span = widget.toDOM();

		expect(span.classList.contains('confitext-glyph')).toBe(true);
		expect(span.getAttribute('data-word-len')).toBe('12');
	});
});

describe('Targeted Word Masking - Reading View Post-Processor', () => {
	let mockPlugin: ConfitextPlugin;

	beforeEach(() => {
		if (typeof (globalThis as any).createEl === 'undefined') {
			(globalThis as any).createEl = (tag: string, o?: any) => {
				const el = document.createElement(tag);
				if (o?.cls) el.className = o.cls;
				if (o?.text) el.textContent = o.text;
				if (o?.attr) {
					for (const [k, v] of Object.entries(o.attr)) {
						el.setAttribute(k, String(v));
					}
				}
				return el;
			};
		}
		if (typeof (globalThis as any).createSpan === 'undefined') {
			(globalThis as any).createSpan = (o?: any) => (globalThis as any).createEl('span', o);
		}
		if (typeof (globalThis as any).createFragment === 'undefined') {
			(globalThis as any).createFragment = () => document.createDocumentFragment();
		}
		mockPlugin = {
			settings: {
				...DEFAULT_SETTINGS,
				enabled: true,
				maskReadingView: true,
				maskingScope: 'targeted-only',
				globalMaskedWords: ['Secret', 'Classified'],
				glyphStyle: 'matrix',
				customGlyphs: DEFAULT_SETTINGS.customGlyphs
			},
			currentMode: 'masking'
		} as unknown as ConfitextPlugin;
	});

	it('in targeted mode, only masks specified words in reading view', () => {
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'This Secret document is Classified and public';
		container.appendChild(p);

		maskElementNodes(container, mockPlugin);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		// Only 'Secret' and 'Classified' should be glyphs; 'This', 'document', 'is', 'and', 'public' remain text
		expect(glyphs.length).toBe(2);
		expect(glyphs[0].getAttribute('data-word')).toBe('Secret');
		expect(glyphs[1].getAttribute('data-word')).toBe('Classified');
	});

	it('masks note-specific words passed to reading view post-processor', () => {
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Project Apollo is ongoing.';
		container.appendChild(p);

		const noteWords = ['Apollo'];
		maskElementNodes(container, mockPlugin, noteWords);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(1);
		expect(glyphs[0].getAttribute('data-word')).toBe('Apollo');
	});
});
