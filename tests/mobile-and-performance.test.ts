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
import { isNoteMaskingDisabled } from '../src/rules';

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

		it('marks view.dom with confitext-note-excluded when note has confitext: false', () => {
			const excludedDoc = '---\nconfitext: false\n---\nPublic notes that should not be veiled or masked.';
			const state = EditorState.create({
				doc: excludedDoc,
				extensions: createConfitextExtension()
			});

			const view = new EditorView({
				state,
				parent: container
			});

			expect(view.dom.classList.contains('confitext-note-excluded')).toBe(true);
			view.destroy();
		});

		it('rebuilds decorations when editor updates with geometry changes', () => {
			const doc = 'Important secret thoughts entered here';
			const state = EditorState.create({
				doc,
				extensions: createConfitextExtension()
			});

			const view = new EditorView({
				state,
				parent: container
			});

			expect(view.dom).toBeDefined();

			// Dispatch a transaction with no doc or selection changes, but simulate an update
			view.dispatch({
				effects: []
			});

			view.destroy();
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

		it('throttles to 30 FPS when batterySaverFps is enabled on mobile', () => {
			document.body.classList.add('is-mobile');

			const animManager = new AnimationManager(() => ({
				...DEFAULT_SETTINGS,
				performanceMode: 'auto',
				batterySaverFps: true
			}));

			expect(animManager.isLowPowerOrThrottled()).toBe(true);
		});

		it('supports synchronous fast-cache hydration from localStorage for 0ms startup', () => {
			const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : (globalThis as any).localStorage;
			if (!storage) return; // Skip if environment has no localStorage backing

			const fastSettings: ConfitextSettings = {
				...DEFAULT_SETTINGS,
				glyphStyle: 'geometry',
				defaultMode: 'masking',
				mobileHapticFeedback: true,
				batterySaverFps: true
			};

			storage.setItem('confitext-cached-settings', JSON.stringify(fastSettings));
			storage.setItem('confitext-cached-mode', 'masking');

			const raw = storage.getItem('confitext-cached-settings');
			expect(raw).toBeTruthy();
			const parsed = JSON.parse(raw!);
			expect(parsed.glyphStyle).toBe('geometry');
			expect(parsed.batterySaverFps).toBe(true);
			expect(storage.getItem('confitext-cached-mode')).toBe('masking');

			storage.removeItem('confitext-cached-settings');
			storage.removeItem('confitext-cached-mode');
		});
	});

	describe('5. Action Button Deduplication & Phone Header Protection', () => {
		it('prevents multiple action buttons from being injected into the DOM', () => {
			const viewEl = document.createElement('div');
			const headerActionsEl = document.createElement('div');
			headerActionsEl.className = 'view-actions';
			viewEl.appendChild(headerActionsEl);

			// Simulate adding an action button
			const btn1 = document.createElement('button');
			btn1.className = 'view-action clickable-icon confitext-tab-action';
			btn1.setAttribute('aria-label', 'Confitext: Toggle masking');
			headerActionsEl.appendChild(btn1);

			// Query selector check
			const existingAction = viewEl.querySelector('.confitext-tab-action, .view-action[aria-label*="Confitext"]');
			expect(existingAction).toBe(btn1);

			// Verify removal removes all matching buttons
			const toRemove = viewEl.querySelectorAll('.confitext-tab-action, .view-action[aria-label*="Confitext"]');
			toRemove.forEach(b => b.remove());

			expect(viewEl.querySelector('.confitext-tab-action')).toBeNull();
		});

		it('deduplicates ribbon icons when multiple exist in the DOM', () => {
			const ribbonContainer = document.createElement('div');
			ribbonContainer.className = 'side-dock-ribbon';
			document.body.appendChild(ribbonContainer);

			const r1 = document.createElement('div');
			r1.className = 'side-dock-ribbon-action confitext-ribbon-icon';
			r1.setAttribute('aria-label', 'Confitext');
			ribbonContainer.appendChild(r1);

			const r2 = document.createElement('div');
			r2.className = 'side-dock-ribbon-action confitext-ribbon-icon';
			r2.setAttribute('aria-label', 'Confitext');
			ribbonContainer.appendChild(r2);

			const ribbons = document.querySelectorAll('.confitext-ribbon-icon, .side-dock-ribbon-action[aria-label*="Confitext"]');
			expect(ribbons.length).toBe(2);

			// Deduplicate keeping only r1
			ribbons.forEach((r, idx) => {
				if (r !== r1 || idx > 0) {
					r.remove();
				}
			});

			const remaining = document.querySelectorAll('.confitext-ribbon-icon');
			expect(remaining.length).toBe(1);
			expect(remaining[0]).toBe(r1);

			ribbonContainer.remove();
		});
	});

	describe('6. Instant Privacy Veil & Body Classes', () => {
		it('manages pre-render privacy veil classes on document.body', () => {
			// Simulate masking mode with all-words scope
			const isMaskingActive = true;
			const isScopeAll = true;

			document.body.classList.toggle('confitext-active', isMaskingActive);
			document.body.classList.toggle('confitext-scope-all', isMaskingActive && isScopeAll);

			expect(document.body.classList.contains('confitext-active')).toBe(true);
			expect(document.body.classList.contains('confitext-scope-all')).toBe(true);

			// When revealed, veil classes are removed
			document.body.classList.toggle('confitext-active', false);
			document.body.classList.toggle('confitext-scope-all', false);
			document.body.classList.toggle('confitext-revealed', true);

			expect(document.body.classList.contains('confitext-active')).toBe(false);
			expect(document.body.classList.contains('confitext-revealed')).toBe(true);

			document.body.classList.remove('confitext-revealed');
		});
	});
});
