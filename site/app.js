/**
 * Confitext - Interactive Apple HIG Web Experience
 * Matrix Scrambler Engine, Playground, Theme Switcher & Showcase
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
		screenEl.innerHTML = '<span style="color:#ef4444; font-weight:700;">⚡ PANIC HIDE ENGAGED — SCREEN FULLY CONCEALED</span>';
		return;
	}

	if (!text || !text.trim()) {
		screenEl.innerHTML = '<span style="color:var(--text-muted); font-size: 0.95rem;">Type something in the box above to see real-time privacy masking...</span>';
		return;
	}

	const words = text.split(/(\s+|[.,!?;:"“”()[\]{}]+)/u);
	let html = '';

	for (const token of words) {
		if (/^[\p{L}\p{N}]+$/u.test(token)) {
			const masked = getStableGlyphs(token, currentGlyphStyle);
			html += `<span class="confitext-interactive-word" data-word="${token}" data-mask="${masked}">${isHoverGlanceActive ? token : masked}</span>`;
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
				el.style.color = 'var(--text-primary)';
				el.style.background = 'rgba(101, 245, 154, 0.2)';
				el.style.borderRadius = '3px';
				el.style.padding = '0 2px';
			}, 350);
		});
		el.addEventListener('mouseleave', () => {
			if (timer) clearTimeout(timer);
			if (!isHoverGlanceActive) {
				el.textContent = el.getAttribute('data-mask');
				el.style.color = '';
				el.style.background = '';
				el.style.padding = '';
			}
		});
		el.addEventListener('click', () => {
			const isRevealed = el.textContent === el.getAttribute('data-word');
			el.textContent = isRevealed ? el.getAttribute('data-mask') : el.getAttribute('data-word');
			el.style.color = isRevealed ? '' : 'var(--text-primary)';
			el.style.background = isRevealed ? '' : 'rgba(56, 189, 248, 0.25)';
		});
	});
}

// Initialize Playground on page load
document.addEventListener('DOMContentLoaded', () => {
	const inputEl = document.getElementById('playground-input');
	if (inputEl) {
		inputEl.addEventListener('input', (e) => {
			isPanicActive = false;
			renderSimulatedScreen(e.target.value);
		});
		renderSimulatedScreen(inputEl.value);
	}

	// Action buttons
	const toggleGlanceBtn = document.getElementById('btn-toggle-glance');
	if (toggleGlanceBtn) {
		toggleGlanceBtn.addEventListener('click', () => {
			isPanicActive = false;
			isHoverGlanceActive = !isHoverGlanceActive;
			toggleGlanceBtn.textContent = isHoverGlanceActive ? '🔒 Re-Mask Screen' : '👁️ Quick Glance (Reveal All)';
			if (inputEl) renderSimulatedScreen(inputEl.value);
		});
	}

	const panicBtn = document.getElementById('btn-panic-hide');
	if (panicBtn) {
		panicBtn.addEventListener('click', () => {
			isPanicActive = true;
			isHoverGlanceActive = false;
			if (toggleGlanceBtn) toggleGlanceBtn.textContent = '👁️ Quick Glance (Reveal All)';
			renderSimulatedScreen('');
		});
	}

	const glyphSelect = document.getElementById('glyph-palette-select');
	if (glyphSelect) {
		glyphSelect.addEventListener('change', (e) => {
			currentGlyphStyle = e.target.value;
			if (inputEl) renderSimulatedScreen(inputEl.value);
		});
	}

	// Theme Toggle
	const themeBtn = document.getElementById('theme-toggle-btn');
	if (themeBtn) {
		themeBtn.addEventListener('click', () => {
			const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-theme', newTheme);
			themeBtn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
		});
	}

	// PC vs Mobile Segmented Control Switcher
	const segBtns = document.querySelectorAll('.segment-btn');
	const desktopCard = document.getElementById('showcase-desktop');
	const mobileCard = document.getElementById('showcase-mobile');

	segBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			segBtns.forEach(b => b.classList.remove('active'));
			btn.classList.add('active');
			const target = btn.getAttribute('data-target');
			if (target === 'desktop') {
				if (desktopCard) desktopCard.style.display = 'flex';
				if (mobileCard) mobileCard.style.display = 'none';
			} else if (target === 'mobile') {
				if (desktopCard) desktopCard.style.display = 'none';
				if (mobileCard) mobileCard.style.display = 'flex';
			} else {
				if (desktopCard) desktopCard.style.display = 'flex';
				if (mobileCard) mobileCard.style.display = 'flex';
			}
		});
	});
});
