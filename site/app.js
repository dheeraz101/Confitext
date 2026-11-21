/**
 * Confitext — Apple HIG Interactive Studio & Matrix Scrambler Engine
 * Live In-Browser Simulation with "Hold Esc to Peek", Scramble Animations & Theme Switcher
 */

// Glyph Palettes matching the Obsidian plugin
const GLYPH_SETS = {
	matrix: ['0', '1', 'Ξ', 'Ж', '░', '▒', '▓', '⌁', '⟁', '⌂', 'ⵙ', 'Ϟ', 'ᚷ', 'ⵣ'],
	braille: ['⠁', '⠃', '⠉', '⠙', '⠑', '⠋', '⠛', '⠓', '⠊', '⠚', '⠅', '⠇', '⠍', '⠝', '⠕', '⠏', '⠟', '⠗', '⠎', '⠞', '⠥', '⠧', '⠺', '⠭', '⠽', '⠵'],
	runes: ['᚛', '᚜', 'ᚠ', 'ᚡ', 'ᚢ', 'ᚣ', 'ᚤ', 'ᚥ', 'ᚦ', 'ᚧ', 'ᚨ', 'ᚩ', 'ᚪ', 'ᚫ', 'ᚬ', 'ᚭ', 'ᚮ', 'ᚯ', 'ᚰ', 'ᚱ', 'ᚲ', 'ᚳ', 'ᚴ', 'ᚵ', 'ᚶ', 'ᚷ', 'ᚸ', 'ᚹ', 'ᚺ'],
	morse: ['•', '−', '⬝', '—', '·'],
	geometry: ['▲', '▼', '◆', '◇', '○', '●', '◈', '■', '□', '▰', '▱', '◬', '◭']
};

let currentGlyphStyle = 'matrix';
let isHoverGlanceActive = false;
let isPanicActive = false;
let isEscHeld = false;

// Deterministic hashing for stable word glyph mapping
function hashWord(word) {
	let h = 2166136261;
	for (let i = 0; i < word.length; i++) {
		h ^= word.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function getStableGlyphs(word, style) {
	const glyphs = GLYPH_SETS[style] || GLYPH_SETS.matrix;
	let hash = hashWord(word);
	let res = '';
	for (let i = 0; i < word.length; i++) {
		hash = (hash * 1664525 + 1013904223) >>> 0;
		res += glyphs[hash % glyphs.length];
	}
	return res;
}

// Scramble text generator for live screen
function renderSimulatedScreen(text) {
	const screenEl = document.getElementById('playground-screen');
	if (!screenEl) return;

	if (isPanicActive) {
		screenEl.innerHTML = '<span style="color:#ff453a; font-weight:700;">⚡ PANIC CONCEAL ENGAGED — SCREEN FULLY CONCEALED</span>';
		return;
	}

	if (!text || !text.trim()) {
		screenEl.innerHTML = '<span style="color:var(--text-muted); font-size: 0.95rem;">Type something in the input below to see real-time privacy masking...</span>';
		return;
	}

	const isRevealedMode = isHoverGlanceActive || isEscHeld;
	const words = text.split(/(\s+|[.,!?;:"“”()[\]{}]+)/u);
	let html = '';

	for (const token of words) {
		if (/^[\p{L}\p{N}]+$/u.test(token)) {
			const masked = getStableGlyphs(token, currentGlyphStyle);
			const activeText = isRevealedMode ? token : masked;
			const extraCls = isRevealedMode ? ' is-revealed' : '';
			html += `<span class="confitext-interactive-word${extraCls}" data-word="${token}" data-mask="${masked}">${activeText}</span>`;
		} else {
			// Preserve spaces, punctuation and line breaks
			html += token.replace(/\n/g, '<br>');
		}
	}

	screenEl.innerHTML = html;
	attachWordHoverListeners();
}

function attachWordHoverListeners() {
	const wordEls = document.querySelectorAll('.confitext-interactive-word');
	wordEls.forEach(el => {
		let timer = null;
		el.addEventListener('mouseenter', () => {
			timer = setTimeout(() => {
				el.textContent = el.getAttribute('data-word');
				el.classList.add('is-revealed');
			}, 250);
		});
		el.addEventListener('mouseleave', () => {
			if (timer) clearTimeout(timer);
			if (!isHoverGlanceActive && !isEscHeld) {
				el.textContent = el.getAttribute('data-mask');
				el.classList.remove('is-revealed');
			}
		});
		el.addEventListener('click', () => {
			const isRevealed = el.classList.contains('is-revealed');
			if (isRevealed) {
				el.textContent = el.getAttribute('data-mask');
				el.classList.remove('is-revealed');
			} else {
				el.textContent = el.getAttribute('data-word');
				el.classList.add('is-revealed');
			}
		});
	});
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
	const inputEl = document.getElementById('playground-input');
	if (inputEl) {
		inputEl.addEventListener('input', (e) => {
			isPanicActive = false;
			renderSimulatedScreen(e.target.value);
		});
		renderSimulatedScreen(inputEl.value);
	}

	// Hold Esc to Peek Button Handler (Hold down mouse/touch to peek, release to re-mask)
	const holdEscBtn = document.getElementById('btn-hold-esc');
	if (holdEscBtn) {
		const startPeek = () => {
			isEscHeld = true;
			holdEscBtn.classList.add('is-active');
			if (inputEl) renderSimulatedScreen(inputEl.value);
		};
		const endPeek = () => {
			if (isEscHeld) {
				isEscHeld = false;
				holdEscBtn.classList.remove('is-active');
				if (inputEl) renderSimulatedScreen(inputEl.value);
			}
		};

		holdEscBtn.addEventListener('mousedown', startPeek);
		window.addEventListener('mouseup', endPeek);
		holdEscBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPeek(); });
		window.addEventListener('touchend', endPeek);
	}

	// Physical Keyboard "Hold Esc to Peek" Support directly in browser window!
	window.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && !e.repeat) {
			const activeTag = document.activeElement ? document.activeElement.tagName : '';
			if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
				document.activeElement.blur();
			}
			isEscHeld = true;
			if (holdEscBtn) holdEscBtn.classList.add('is-active');
			if (inputEl) renderSimulatedScreen(inputEl.value);
		}
	});

	window.addEventListener('keyup', (e) => {
		if (e.key === 'Escape') {
			isEscHeld = false;
			if (holdEscBtn) holdEscBtn.classList.remove('is-active');
			if (inputEl) renderSimulatedScreen(inputEl.value);
		}
	});

	// Quick Glance / Reveal All Toggle Button
	const toggleGlanceBtn = document.getElementById('btn-toggle-glance');
	if (toggleGlanceBtn) {
		toggleGlanceBtn.addEventListener('click', () => {
			isPanicActive = false;
			isHoverGlanceActive = !isHoverGlanceActive;
			toggleGlanceBtn.innerHTML = isHoverGlanceActive ? '<span>🔒</span> Re-Mask Screen' : '<span>👁️</span> Reveal All';
			if (inputEl) renderSimulatedScreen(inputEl.value);
		});
	}

	// Panic Conceal Button
	const panicBtn = document.getElementById('btn-panic-hide');
	if (panicBtn) {
		panicBtn.addEventListener('click', () => {
			isPanicActive = true;
			isHoverGlanceActive = false;
			if (toggleGlanceBtn) toggleGlanceBtn.innerHTML = '<span>👁️</span> Reveal All';
			renderSimulatedScreen('');
		});
	}

	// Glyph Palette Selector
	const glyphSelect = document.getElementById('glyph-palette-select');
	if (glyphSelect) {
		glyphSelect.addEventListener('change', (e) => {
			currentGlyphStyle = e.target.value;
			if (inputEl) renderSimulatedScreen(inputEl.value);
		});
	}

	// Theme Toggle with LocalStorage persistence
	const themeBtn = document.getElementById('theme-toggle-btn');
	const savedTheme = localStorage.getItem('confitext-web-theme');
	if (savedTheme) {
		document.documentElement.setAttribute('data-theme', savedTheme);
		if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
	}

	if (themeBtn) {
		themeBtn.addEventListener('click', () => {
			const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-theme', newTheme);
			localStorage.setItem('confitext-web-theme', newTheme);
			themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
		});
	}
});
