/**
 * Confitext - What's New & Release Notes Tab View
 * Opens natively in an Obsidian tab to display interactive release updates
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ConfitextPlugin from './main';

export const VIEW_TYPE_WHATS_NEW = 'confitext-whats-new';

export class WhatsNewView extends ItemView {
	plugin: ConfitextPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ConfitextPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_WHATS_NEW;
	}

	getDisplayText(): string {
		return "What's New in Confitext v2.3.0";
	}

	getIcon(): string {
		return 'sparkles';
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass('confitext-whats-new-container');

		// Header Hero Card
		const hero = container.createDiv({ cls: 'confitext-wn-hero' });
		const badgeRow = hero.createDiv({ cls: 'confitext-wn-badge-row' });
		badgeRow.createSpan({ cls: 'confitext-pill confitext-pill-active', text: 'CONFITEXT v2.3.0' });
		badgeRow.createSpan({ cls: 'confitext-pill', text: 'RELEASE NOTES' });

		hero.createEl('h1', { text: "What's New in Confitext v2.3.0", cls: 'confitext-wn-title' });
		hero.createEl('p', {
			cls: 'confitext-wn-subtitle',
			text: 'Your thoughts. Your screen. Your code. Version 2.3.0 brings official GitHub Pages live website hosting, complete mobile card insets, stacked category headers, and cross-platform desktop/mobile experience.'
		});

		// Feature Grid
		const grid = container.createDiv({ cls: 'confitext-wn-grid' });

		// Card 0: Official GitHub Pages Website & Docs
		const cardWeb = grid.createDiv({ cls: 'confitext-wn-card' });
		const hWeb = cardWeb.createDiv({ cls: 'confitext-wn-card-header' });
		hWeb.createSpan({ text: '🌐', cls: 'confitext-wn-card-icon' });
		hWeb.createEl('h3', { text: 'Official Website Live on GitHub Pages' });
		cardWeb.createEl('p', {
			text: 'Confitext now has an official Apple HIG-inspired showcase and interactive documentation suite hosted live at dheeraz101.github.io/Confitext, complete with an interactive Matrix playground.'
		});

		// Card 1: Instant Startup Masking
		const card0 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h0 = card0.createDiv({ cls: 'confitext-wn-card-header' });
		h0.createSpan({ text: '⚡', cls: 'confitext-wn-card-icon' });
		h0.createEl('h3', { text: 'Instant Startup Masking' });
		card0.createEl('p', {
			text: 'Resolved the 1-second plaintext exposure flash on mobile and desktop startup. Notes are now visually masked into matrix glyphs on the very first frame before layout measurement finishes.'
		});

		// Card 2: Selection Restore Scramble Animation
		const card1 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h1 = card1.createDiv({ cls: 'confitext-wn-card-header' });
		h1.createSpan({ text: '✨', cls: 'confitext-wn-card-icon' });
		h1.createEl('h3', { text: 'Selection Restore Animation' });
		card1.createEl('p', {
			text: 'When tapping or clicking away from a selection to read text, previously revealed words now smoothly scramble and cascade back into glyphs instead of snapping instantly.'
		});

		// Card 3: iOS HIG & Touch Target Standardization
		const card2 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h2 = card2.createDiv({ cls: 'confitext-wn-card-header' });
		h2.createSpan({ text: '📱', cls: 'confitext-wn-card-icon' });
		h2.createEl('h3', { text: 'iOS HIG Mobile Design & Touch Targets' });
		card2.createEl('p', {
			text: 'Enforced Apple Human Interface Guidelines across phone and tablet screens: 44px minimum touch targets, inset grouped cards, 16px inputs to prevent iOS auto-zoom, and zero horizontal clipping.'
		});

		// Card 4: Powerful Mobile Virtual Keyboard Texting
		const card3 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h3 = card3.createDiv({ cls: 'confitext-wn-card-header' });
		h3.createSpan({ text: '⌨️', cls: 'confitext-wn-card-icon' });
		h3.createEl('h3', { text: 'Powerful Virtual Keyboard Texting' });
		card3.createEl('p', {
			text: 'Full compatibility with mobile virtual keyboards: non-breaking spaces (\u00A0), smart contractions (don’t, it’s), ellipses (…), em-dashes (—), and safe IME composition tracking without dropped frames.'
		});

		// Card 5: Battery Saver & Low-End PC Support
		const card4 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h4 = card4.createDiv({ cls: 'confitext-wn-card-header' });
		h4.createSpan({ text: '🔋', cls: 'confitext-wn-card-icon' });
		h4.createEl('h3', { text: 'Low-End PC & Mobile Battery Saver' });
		card4.createEl('p', {
			text: 'Added performanceMode setting ("Auto", "High Fidelity", "Battery Saver"). Throttles animation to 30 FPS on mobile/low-end CPUs and disables expensive GPU filter compositing to maximize battery life.'
		});

		// Card 5: Live Matrix Sandbox & Thematic Presets
		const card5 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h5 = card5.createDiv({ cls: 'confitext-wn-card-header' });
		h5.createSpan({ text: '🎨', cls: 'confitext-wn-card-icon' });
		h5.createEl('h3', { text: 'Live Matrix Sandbox & Presets' });
		card5.createEl('p', {
			text: 'Test scrambles and explore custom palettes live inside Settings. Choose from Matrix Code, Cyber Runes, Abstract Geometry, Digital Blocks, Braille, and Morse code, or supply your own custom Unicode symbols.'
		});

		// Card 6: Idle Auto-Masking & Window Blur
		const card6 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h6 = card6.createDiv({ cls: 'confitext-wn-card-header' });
		h6.createSpan({ text: '⏳', cls: 'confitext-wn-card-icon' });
		h6.createEl('h3', { text: 'Idle Auto-Masking Timer' });
		card6.createEl('p', {
			text: 'Leaving your desk? Confitext automatically engages masking mode when Obsidian is left idle for N minutes or whenever Obsidian loses operating system window focus.'
		});

		// Actions Bar
		const actionsBar = container.createDiv({ cls: 'confitext-wn-actions' });

		const settingsBtn = actionsBar.createEl('button', {
			cls: 'confitext-sandbox-btn confitext-btn-primary',
			text: '⚙️ Open Confitext Settings'
		});
		settingsBtn.addEventListener('click', () => {
			const extendedApp = this.app as unknown as { setting?: { open(): void; openTabById(id: string): void } };
			extendedApp.setting?.open();
			extendedApp.setting?.openTabById(this.plugin.manifest.id);
		});

		const closeBtn = actionsBar.createEl('button', {
			cls: 'confitext-sandbox-btn',
			text: '✕ Close Tab'
		});
		closeBtn.addEventListener('click', () => {
			this.leaf.detach();
		});

		// YABP Footer & Legal Transparency
		const footer = container.createDiv({ cls: 'confitext-card confitext-footer-card' });
		const brandRow = footer.createDiv({ cls: 'confitext-footer-brand' });
		const yabpBadge = brandRow.createEl('a', {
			cls: 'confitext-footer-badge',
			href: 'https://yabp.netlify.app/'
		});
		yabpBadge.setAttribute('target', '_blank');
		yabpBadge.setAttribute('rel', 'noopener noreferrer');
		yabpBadge.createSpan({ cls: 'yabp-dot' });
		yabpBadge.createSpan({ text: 'AN YABP INITIATIVE' });

		brandRow.createEl('p', {
			cls: 'confitext-footer-tagline',
			text: 'Yet Another Boring Project — Thoughtful, distraction-free software.'
		});

		const creditRow = footer.createDiv({ cls: 'confitext-footer-credits' });
		creditRow.createSpan({ text: 'Crafted with care by ' });
		const authorLink = creditRow.createEl('a', {
			cls: 'confitext-footer-link author-link',
			text: 'Dheeraz',
			href: 'https://github.com/dheeraz101'
		});
		authorLink.setAttribute('target', '_blank');
		authorLink.setAttribute('rel', 'noopener noreferrer');

		const legalRow = footer.createDiv({ cls: 'confitext-footer-legal' });
		const privacyLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Privacy Policy',
			href: 'https://github.com/dheeraz101/Confitext/blob/main/PRIVACY.md'
		});
		privacyLink.setAttribute('target', '_blank');
		privacyLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const termsLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'Terms of Use',
			href: 'https://github.com/dheeraz101/Confitext/blob/main/TERMS.md'
		});
		termsLink.setAttribute('target', '_blank');
		termsLink.setAttribute('rel', 'noopener noreferrer');

		legalRow.createSpan({ cls: 'footer-sep', text: '•' });

		const githubLink = legalRow.createEl('a', {
			cls: 'confitext-footer-link',
			text: 'GitHub',
			href: 'https://github.com/dheeraz101/Confitext'
		});
		githubLink.setAttribute('target', '_blank');
		githubLink.setAttribute('rel', 'noopener noreferrer');
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}
}
