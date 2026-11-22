/**
 * Confitext — Apple HIG Interactive Studio & Matrix Scrambler Engine
 * Live In-Browser Simulation with "Hold Esc to Peek", Scramble Animations & Theme Switcher
 */

// Apple HIG / SF Symbols SVG Icon Library
const ICONS = {
	lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
	eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
	bolt: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
	moon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
	sun: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
	menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
	close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; display:inline-block;"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`
};

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
		screenEl.innerHTML = `<span style="color:#ff453a; font-weight:700; display:inline-flex; align-items:center; gap:6px;">${ICONS.bolt} PANIC CONCEAL ENGAGED — SCREEN FULLY CONCEALED</span>`;
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

// Dismiss Apple Cupertino Loading Spinner when components ready
window.addEventListener('load', () => {
	const loader = document.getElementById('cupertino-loader');
	if (loader) {
		loader.classList.add('is-hidden');
		setTimeout(() => loader.remove(), 400);
	}
});
setTimeout(() => {
	const loader = document.getElementById('cupertino-loader');
	if (loader) {
		loader.classList.add('is-hidden');
		setTimeout(() => loader.remove(), 400);
	}
}, 1200);

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
			toggleGlanceBtn.innerHTML = isHoverGlanceActive
				? `${ICONS.lock} Re-Mask Screen`
				: `${ICONS.eye} Reveal All`;
			if (inputEl) renderSimulatedScreen(inputEl.value);
		});
	}

	// Panic Conceal Button
	const panicBtn = document.getElementById('btn-panic-hide');
	if (panicBtn) {
		panicBtn.addEventListener('click', () => {
			isPanicActive = true;
			isHoverGlanceActive = false;
			if (toggleGlanceBtn) toggleGlanceBtn.innerHTML = `${ICONS.eye} Reveal All`;
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
		if (themeBtn) themeBtn.innerHTML = savedTheme === 'dark' ? ICONS.moon : ICONS.sun;
	}

	if (themeBtn) {
		themeBtn.addEventListener('click', () => {
			const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
			const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
			document.documentElement.setAttribute('data-theme', newTheme);
			localStorage.setItem('confitext-web-theme', newTheme);
			themeBtn.innerHTML = newTheme === 'dark' ? ICONS.moon : ICONS.sun;
		});
	}

	// Mobile Menu Drawer Toggle
	const mobileMenuBtn = document.getElementById('mobile-menu-btn');
	const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
	if (mobileMenuBtn && mobileNavDrawer) {
		mobileMenuBtn.addEventListener('click', () => {
			const isOpen = mobileNavDrawer.classList.toggle('is-open');
			mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			mobileMenuBtn.innerHTML = isOpen ? ICONS.close : ICONS.menu;
			if (navigator.vibrate) {
				try { navigator.vibrate(10); } catch (_) {}
			}
		});

		mobileNavDrawer.querySelectorAll('a').forEach(link => {
			link.addEventListener('click', () => {
				mobileNavDrawer.classList.remove('is-open');
				mobileMenuBtn.setAttribute('aria-expanded', 'false');
				mobileMenuBtn.innerHTML = ICONS.menu;
			});
		});
	}

	// Documentation Sidebar Scrollspy & Smooth Active Tracking
	const docSections = document.querySelectorAll('.doc-section');
	const sidebarLinks = document.querySelectorAll('.doc-nav-links a');
	if (docSections.length > 0 && sidebarLinks.length > 0) {
		const sectionObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const id = entry.target.getAttribute('id');
					sidebarLinks.forEach(link => {
						const href = link.getAttribute('href');
						if (href === `#${id}`) {
							link.classList.add('active');
						} else {
							link.classList.remove('active');
						}
					});
				}
			});
		}, {
			rootMargin: '-72px 0px -70% 0px',
			threshold: 0
		});

		docSections.forEach(sec => sectionObserver.observe(sec));
	}
});
