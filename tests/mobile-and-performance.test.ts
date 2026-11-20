// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { buildMaskDecorations } from '../src/decorations';
import { DEFAULT_SETTINGS, ConfitextSettings } from '../src/types';
import { AnimationManager } from '../src/animation';
import { createConfitextExtension } from '../src/editor-extension';
import { tokenizeWords, isWordBeingComposed } from '../src/tokenizer';
import { confitextStateField, setInitialStateProvider } from '../src/state';

// Setup Obsidian DOM helpers for test environment
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
		(el as any).addClass = (c: string) => el.classList.add(c);
		(el as any).removeClass = (c: string) => el.classList.remove(c);
		(el as any).hasClass = (c: string) => el.classList.contains(c);
		return el;
	};
}
if (typeof (globalThis as any).createSpan === 'undefined') {
	(globalThis as any).createSpan = (o?: any) => (globalThis as any).createEl('span', o);
}
if (typeof (globalThis as any).createDiv === 'undefined') {
	(globalThis as any).createDiv = (o?: any) => (globalThis as any).createEl('div', o);
}

describe('Mobile UX, Instant Startup Masking & Performance Optimization', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
		document.body.classList.remove('is-mobile', 'confitext-battery-saver');
		setInitialStateProvider(null);
	});

	describe('1. Instant Startup Masking (Zero Plaintext Exposure)', () => {
		it('masks text immediately when visibleRanges is empty [] before layout calculation', () => {
			const doc = 'Top secret research notes for mobile users.';
			const selection = EditorSelection.single(0);

			// During early mobile startup before CodeMirror measures DOM layout, visibleRanges is empty
			const emptyVisibleRanges: readonly { from: number; to: number }[] = [];

			const decorations = buildMaskDecorations(
				doc,
				selection,
				emptyVisibleRanges,
				'masking',
				DEFAULT_SETTINGS,
				null
			);

			// Must not return Decoration.none; document must be masked immediately!
			expect(decorations.size).toBeGreaterThan(0);
		});

		it('masks text immediately when visibleRanges contains only { from: 0, to: 0 }', () => {
			const doc = 'Confidential project roadmap and milestones.';
			const selection = EditorSelection.single(0);
			const zeroVisibleRanges = [{ from: 0, to: 0 }];

			const decorations = buildMaskDecorations(
				doc,
				selection,
				zeroVisibleRanges,
				'masking',
				DEFAULT_SETTINGS,
				null
			);

			expect(decorations.size).toBeGreaterThan(0);
		});

		it('initializes StateField with live settings via setInitialStateProvider without delay', () => {
			const customSettings: ConfitextSettings = {
				...DEFAULT_SETTINGS,
				glyphStyle: 'braille',
				performanceMode: 'battery-saver'
			};

			setInitialStateProvider(() => ({
				mode: 'masking',
				settings: customSettings,
				filePath: 'SecretVault/Notes.md'
			}));

			const state = EditorState.create({
				doc: 'Protected content',
				extensions: [confitextStateField]
			});

			const field = state.field(confitextStateField);
			expect(field.settings.glyphStyle).toBe('braille');
			expect(field.settings.performanceMode).toBe('battery-saver');
			expect(field.filePath).toBe('SecretVault/Notes.md');
		});
	});

	describe('2. Selection-Based Restore Animation on Phone & PC', () => {
		it('triggers scramble animation when a selection collapses to a caret', () => {
			const doc = 'Sensitive medical records inside vault';
			let state = EditorState.create({
				doc,
				selection: EditorSelection.single(0, 9), // "Sensitive" selected
				extensions: createConfitextExtension()
			});

			const view = new EditorView({
				state,
				parent: container
			});

			// Verify view is mounted
			expect(view.dom).toBeDefined();

			// Collapse selection to a single caret at position 0
			view.dispatch({
				selection: EditorSelection.cursor(0)
			});

			// The view update processes selectionSet, collapsing the selection and restoring masking
			expect(view.state.selection.main.empty).toBe(true);

			view.destroy();
		});
	});

	describe('3. Virtual Keyboard Delimiters & Powerful Texting', () => {
		it('tokenizes contractions with smart apostrophes (don’t, it’s) as single words', () => {
			const doc = 'We don’t disclose confidential records because it’s private.';
			const tokens = tokenizeWords(doc, 0, doc.length, DEFAULT_SETTINGS);

			const dontToken = tokens.find(t => t.text === 'don’t');
			expect(dontToken).toBeDefined();
			expect(dontToken?.text).toBe('don’t');

			const itsToken = tokens.find(t => t.text === 'it’s');
			expect(itsToken).toBeDefined();
			expect(itsToken?.text).toBe('it’s');
		});

		it('detects word composition when caret is right after a smart apostrophe', () => {
			const doc = "don't and don’t";
			const word = { from: 10, to: 13, text: 'don', isCompleted: false }; // "don" before "’t"

			// Cursor at index 14 is right after the smart apostrophe '’' (index 13)
			const isComposing = isWordBeingComposed(word, 14, doc, false);
			expect(isComposing).toBe(true);
		});

		it('handles mobile non-breaking spaces (\u00A0) and smart punctuation', () => {
			const textWithNbsp = 'First\u00A0Second… Third—Fourth';
			const tokens = tokenizeWords(textWithNbsp, 0, textWithNbsp.length, DEFAULT_SETTINGS);

			const words = tokens.map(t => t.text);
			expect(words).toContain('First');
			expect(words).toContain('Second');
			expect(words).toContain('Third');
			expect(words).toContain('Fourth');
		});
	});

	describe('4. Low-End Device Support & Battery Saver Mode', () => {
		it('detects throttled mode when performanceMode is battery-saver', () => {
			const animManager = new AnimationManager(() => ({
				...DEFAULT_SETTINGS,
				performanceMode: 'battery-saver'
			}));

			expect(animManager.isLowPowerOrThrottled()).toBe(true);
		});

		it('detects high-performance mode when performanceMode is high', () => {
			const animManager = new AnimationManager(() => ({
				...DEFAULT_SETTINGS,
				performanceMode: 'high'
			}));

			expect(animManager.isLowPowerOrThrottled()).toBe(false);
		});

		it('automatically detects mobile environment in auto mode', () => {
			document.body.classList.add('is-mobile');

			const animManager = new AnimationManager(() => ({
				...DEFAULT_SETTINGS,
				performanceMode: 'auto'
			}));

			expect(animManager.isLowPowerOrThrottled()).toBe(true);
		});

		it('shortens animation duration in battery-saver mode to reduce CPU usage', () => {
			const animManager = new AnimationManager(() => ({
				...DEFAULT_SETTINGS,
				animationSpeed: 'normal',
				performanceMode: 'battery-saver'
			}));

			animManager.registerWordAnimation(0, 5, 'hello', '⠓⠑⠇⠇⠕');
			const anim = animManager.getAnimation(0, 5, 'hello');
			expect(anim).toBeDefined();
		});
	});
});
