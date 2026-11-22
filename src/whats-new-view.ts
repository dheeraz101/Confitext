/**
 * Confitext - What's New & Release Notes Tab View
 * Opens natively in an Obsidian tab to display interactive release updates
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import type ConfitextPlugin from './main';
import { createAppleIconEl } from './icons';

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
		return "What's New in Confitext v2.6.2";
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
		badgeRow.createSpan({ cls: 'confitext-pill confitext-pill-active', text: 'CONFITEXT v2.6.2' });
		badgeRow.createSpan({ cls: 'confitext-pill', text: 'RELEASE NOTES' });

		hero.createEl('h1', { text: "What's New in Confitext v2.6.2", cls: 'confitext-wn-title' });
		hero.createEl('p', {
			cls: 'confitext-wn-subtitle',
			text: 'Confitext v2.6.2 introduces full compliance with Obsidian Community Review standards, eliminates mobile settings double-card nesting, delivers instant frame-0 cold-boot visual privacy, and optimizes vault-scoped storage.'
		});

		// Feature Grid
		const grid = container.createDiv({ cls: 'confitext-wn-grid' });

		// Card 1: Obsidian Review Compliance & Clean DOM
		const cardLayout = grid.createDiv({ cls: 'confitext-wn-card' });
		const hLayout = cardLayout.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hLayout, 'shield-check', 16, 'confitext-wn-card-icon');
		hLayout.createEl('h3', { text: 'Community Review Compliance' });
		cardLayout.createEl('p', {
			text: 'Achieved strict compliance with Obsidian review guidelines: 100% elimination of innerHTML/outerHTML, safe vault-unique App#loadLocalStorage caching, and removal of expensive :has CSS selectors.'
		});

		// Card 2: Un-Nested Mobile Settings Architecture
		const cardTrigger = grid.createDiv({ cls: 'confitext-wn-card' });
		const hTrigger = cardTrigger.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hTrigger, 'iphone', 16, 'confitext-wn-card-icon');
		hTrigger.createEl('h3', { text: 'Standalone Full-Width Mobile Cards' });
		cardTrigger.createEl('p', {
			text: 'Eliminated outer card wrappers on phone screens. Individual settings now render as independent, full-width Apple iOS-style inset grouped cards with comfortable edge clearances.'
		});

		// Card 3: Instant Cold-Boot Masking & Privacy Veil
		const cardSuggest = grid.createDiv({ cls: 'confitext-wn-card' });
		const hSuggest = cardSuggest.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hSuggest, 'eye-slash', 16, 'confitext-wn-card-icon');
		hSuggest.createEl('h3', { text: 'Instant Cold-Boot Masking' });
		cardSuggest.createEl('p', {
			text: 'Eliminated cleartext glimpses during app cold start on mobile and desktop using a hardware-accelerated privacy veil and bounded frame-0 initial decoration mounting.'
		});

		// Card 4: Apple HIG Vector Icons
		const cardIcons = grid.createDiv({ cls: 'confitext-wn-card' });
		const hIcons = cardIcons.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hIcons, 'sparkles', 16, 'confitext-wn-card-icon');
		hIcons.createEl('h3', { text: 'Apple HIG Vector Iconography' });
		cardIcons.createEl('p', {
			text: 'Replaced standard platform emojis across the plugin and website with crisp, high-DPI Apple SF Symbols-inspired vector SVGs rendered safely through DOMParser.'
		});

		// Card 5: Fast-Scroll Compositor Containment
		const cardScroll = grid.createDiv({ cls: 'confitext-wn-card' });
		const hScroll = cardScroll.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hScroll, 'bolt', 16, 'confitext-wn-card-icon');
		hScroll.createEl('h3', { text: 'Fast-Scroll Compositor Containment' });
		cardScroll.createEl('p', {
			text: 'Added CSS compositor layout/style containment and min-height constraints to eliminate momentary black screen flashes during rapid scrolling on mobile.'
		});

		// Card 6: Cupertino Web Loading & Mobile Scroll Fix
		const cardWeb = grid.createDiv({ cls: 'confitext-wn-card' });
		const hWeb = cardWeb.createDiv({ cls: 'confitext-wn-card-header' });
		createAppleIconEl(hWeb, 'globe', 16, 'confitext-wn-card-icon');
		hWeb.createEl('h3', { text: 'Cupertino Web Loader & Mobile Scroll Fix' });
		cardWeb.createEl('p', {
			text: 'Official documentation and website now feature an Apple Cupertino loading spinner, zero horizontal mobile overflow, and sleek custom selection styling.'
		});

		// Actions Bar
		const actionsBar = container.createDiv({ cls: 'confitext-wn-actions' });

		const settingsBtn = actionsBar.createEl('button', {
			cls: 'confitext-sandbox-btn confitext-btn-primary'
		});
		createAppleIconEl(settingsBtn, 'sliders', 14);
		settingsBtn.createSpan({ text: ' Open Confitext Settings' });
		settingsBtn.addEventListener('click', () => {
			const extendedApp = this.app as unknown as { setting?: { open(): void; openTabById(id: string): void } };
			extendedApp.setting?.open();
			extendedApp.setting?.openTabById(this.plugin.manifest.id);
		});

		const closeBtn = actionsBar.createEl('button', {
			cls: 'confitext-sandbox-btn'
		});
		createAppleIconEl(closeBtn, 'xmark', 14);
		closeBtn.createSpan({ text: ' Close Tab' });
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
			text: 'Yet Another Boring Project • Thoughtful, distraction-free software.'
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
