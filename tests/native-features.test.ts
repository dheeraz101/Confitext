// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { maskElementNodes, createPreviewMaskProcessor } from '../src/preview';
import { DEFAULT_SETTINGS, ConfitextSettings } from '../src/types';
import type ConfitextPlugin from '../src/main';

describe('Native Infusion Features - Reading View Post-Processor', () => {
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
		mockPlugin = {
			settings: {
				...DEFAULT_SETTINGS,
				enabled: true,
				maskReadingView: true,
				glyphStyle: 'matrix',
				customGlyphs: DEFAULT_SETTINGS.customGlyphs
			},
			currentMode: 'masking'
		} as unknown as ConfitextPlugin;
	});

	it('masks text nodes in standard paragraphs into glyph spans', () => {
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Confidential client data';
		container.appendChild(p);

		maskElementNodes(container, mockPlugin);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(3);
		expect(glyphs[0].getAttribute('data-word')).toBe('Confidential');
		expect(glyphs[1].getAttribute('data-word')).toBe('client');
		expect(glyphs[2].getAttribute('data-word')).toBe('data');
	});

	it('preserves code blocks, inline code, and links from preview masking', () => {
		const container = document.createElement('div');

		const pre = document.createElement('pre');
		const code = document.createElement('code');
		code.textContent = 'const apiKey = "secret";';
		pre.appendChild(code);
		container.appendChild(pre);

		const a = document.createElement('a');
		a.textContent = 'https://example.com';
		container.appendChild(a);

		maskElementNodes(container, mockPlugin);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(0);
		expect(code.textContent).toBe('const apiKey = "secret";');
		expect(a.textContent).toBe('https://example.com');
	});

	it('toggles reveal when a reading view glyph is clicked', () => {
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Secret';
		container.appendChild(p);

		maskElementNodes(container, mockPlugin);

		const glyph = container.querySelector('.confitext-preview-glyph') as HTMLElement;
		expect(glyph).not.toBeNull();
		const originalGlyphs = glyph.textContent;

		// First click reveals original text
		glyph.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(glyph.classList.contains('confitext-preview-revealed')).toBe(true);
		expect(glyph.textContent).toBe('Secret');

		// Second click re-masks to glyphs
		glyph.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(glyph.classList.contains('confitext-preview-revealed')).toBe(false);
		expect(glyph.textContent).toBe(originalGlyphs);
	});

	it('respects frontmatter confitext: false in preview processor', () => {
		const processor = createPreviewMaskProcessor(mockPlugin);
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Public note text';
		container.appendChild(p);

		const mockCtx = {
			sourcePath: 'Notes/Public.md',
			frontmatter: { confitext: false }
		} as any;

		processor(container, mockCtx);

		// Frontmatter is false, so no glyphs should be created
		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(0);
		expect(p.textContent).toBe('Public note text');
	});

	it('respects excluded folders in preview processor', () => {
		mockPlugin.settings.excludedFolders = ['Public'];
		const processor = createPreviewMaskProcessor(mockPlugin);
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Public folder text';
		container.appendChild(p);

		const mockCtx = {
			sourcePath: 'Public/Documentation.md',
			frontmatter: {}
		} as any;

		processor(container, mockCtx);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(0);
	});

	it('does not mask preview when maskReadingView is false', () => {
		mockPlugin.settings.maskReadingView = false;
		const processor = createPreviewMaskProcessor(mockPlugin);
		const container = document.createElement('div');
		const p = document.createElement('p');
		p.textContent = 'Unmasked preview';
		container.appendChild(p);

		const mockCtx = {
			sourcePath: 'Notes/Daily.md',
			frontmatter: {}
		} as any;

		processor(container, mockCtx);

		const glyphs = container.querySelectorAll('.confitext-glyph');
		expect(glyphs.length).toBe(0);
	});
});
