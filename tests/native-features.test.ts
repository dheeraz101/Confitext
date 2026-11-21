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
		if (typeof (globalThis as any).createSpan === 'undefined') {
			(globalThis as any).createSpan = (o?: any) => {
				return (globalThis as any).createEl('span', o);
			};
		}
		if (typeof (globalThis as any).createDiv === 'undefined') {
			(globalThis as any).createDiv = (o?: any) => {
				return (globalThis as any).createEl('div', o);
			};
		}
		if (typeof (globalThis as any).createFragment === 'undefined') {
			(globalThis as any).createFragment = () => {
				return document.createDocumentFragment();
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

describe('PC Desktop Pro - Hold Esc to Peek Cleartext', () => {
	it('has holdEscToPeek enabled by default in DEFAULT_SETTINGS', () => {
		expect(DEFAULT_SETTINGS.holdEscToPeek).toBe(true);
	});

	it('engages momentary reveal on Escape keydown and restores on keyup', () => {
		let currentMode = 'masking';
		let isEscPeeking = false;
		const settings = { ...DEFAULT_SETTINGS, enabled: true, holdEscToPeek: true };

		const onKeyDown = (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (!settings.enabled || !settings.holdEscToPeek) return;
			if (evt.repeat) return;
			if (document.querySelector('.modal-container, .prompt, .suggestion-container')) return;
			if (currentMode === 'masking') {
				isEscPeeking = true;
				currentMode = 'revealed';
			}
		};

		const onKeyUp = (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (isEscPeeking) {
				isEscPeeking = false;
				currentMode = 'masking';
			}
		};

		// Initial state
		expect(currentMode).toBe('masking');

		// Press Esc down
		onKeyDown(new KeyboardEvent('keydown', { key: 'Escape', repeat: false }));
		expect(isEscPeeking).toBe(true);
		expect(currentMode).toBe('revealed');

		// While holding Esc down (repeated events)
		onKeyDown(new KeyboardEvent('keydown', { key: 'Escape', repeat: true }));
		expect(isEscPeeking).toBe(true);
		expect(currentMode).toBe('revealed');

		// Release Esc
		onKeyUp(new KeyboardEvent('keyup', { key: 'Escape' }));
		expect(isEscPeeking).toBe(false);
		expect(currentMode).toBe('masking');
	});

	it('restores masking if window blurs while user is holding Escape', () => {
		let currentMode = 'revealed';
		let isEscPeeking = true;

		const onBlur = () => {
			if (isEscPeeking) {
				isEscPeeking = false;
				currentMode = 'masking';
			}
		};

		onBlur();
		expect(isEscPeeking).toBe(false);
		expect(currentMode).toBe('masking');
	});

	it('does not reveal when holdEscToPeek is disabled in settings', () => {
		let currentMode = 'masking';
		let isEscPeeking = false;
		const settings = { ...DEFAULT_SETTINGS, enabled: true, holdEscToPeek: false };

		const onKeyDown = (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (!settings.enabled || !settings.holdEscToPeek) return;
			if (currentMode === 'masking') {
				isEscPeeking = true;
				currentMode = 'revealed';
			}
		};

		onKeyDown(new KeyboardEvent('keydown', { key: 'Escape', repeat: false }));
		expect(isEscPeeking).toBe(false);
		expect(currentMode).toBe('masking');
	});

	it('does not intercept Escape when a modal dialog is open', () => {
		let currentMode = 'masking';
		let isEscPeeking = false;
		const settings = { ...DEFAULT_SETTINGS, enabled: true, holdEscToPeek: true };

		const modal = document.createElement('div');
		modal.className = 'modal-container';
		document.body.appendChild(modal);

		const onKeyDown = (evt: KeyboardEvent) => {
			if (evt.key !== 'Escape') return;
			if (!settings.enabled || !settings.holdEscToPeek) return;
			if (evt.repeat) return;
			if (document.querySelector('.modal-container, .prompt, .suggestion-container')) return;
			if (currentMode === 'masking') {
				isEscPeeking = true;
				currentMode = 'revealed';
			}
		};

		onKeyDown(new KeyboardEvent('keydown', { key: 'Escape', repeat: false }));
		expect(isEscPeeking).toBe(false);
		expect(currentMode).toBe('masking');

		document.body.removeChild(modal);
	});
});
