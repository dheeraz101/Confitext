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
		return "What's New in Confitext v2.5.0";
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
		badgeRow.createSpan({ cls: 'confitext-pill confitext-pill-active', text: 'CONFITEXT v2.5.0' });
		badgeRow.createSpan({ cls: 'confitext-pill', text: 'RELEASE NOTES' });

		hero.createEl('h1', { text: "What's New in Confitext v2.5.0", cls: 'confitext-wn-title' });
		hero.createEl('p', {
			cls: 'confitext-wn-subtitle',
			text: 'Your thoughts. Your screen. Your code. Version 2.5.0 introduces platform-specific settings filtering for PC and Mobile, fixes the editor caret line-click reveal bug, brings real-time scramble animations to mobile virtual keyboard suggestions, and refines typography with Apple HIG bullet dividers.'
		});

		// Feature Grid
		const grid = container.createDiv({ cls: 'confitext-wn-grid' });

		// Card 1: Platform-Specific Settings Filtering
		const cardPlatform = grid.createDiv({ cls: 'confitext-wn-card' });
		const hPlatform = cardPlatform.createDiv({ cls: 'confitext-wn-card-header' });
		hPlatform.createSpan({ text: '📱', cls: 'confitext-wn-card-icon' });
		hPlatform.createEl('h3', { text: 'Platform-Specific Settings Filtering' });
		cardPlatform.createEl('p', {
			text: 'Settings are now intelligently filtered by device. Desktop-only features (hover peek, tab header actions, multi-monitor blur, Esc peek) are hidden on mobile, while touch-only controls (haptic feedback, 26px corner insets) are hidden on PC.'
		});

		// Card 2: Mobile Predictive Keyboard Animations
		const cardSuggest = grid.createDiv({ cls: 'confitext-wn-card' });
		const hSuggest = cardSuggest.createDiv({ cls: 'confitext-wn-card-header' });
		hSuggest.createSpan({ text: '✨', cls: 'confitext-wn-card-icon' });
		hSuggest.createEl('h3', { text: 'Predictive Keyboard Suggestion Animations' });
		cardSuggest.createEl('p', {
			text: 'Tapping autocomplete suggestions on mobile virtual keyboards (Gboard, iOS QuickType) now triggers smooth matrix scramble animations without requiring trailing space delimiters.'
		});

		// Card 3: Caret Click Line Reveal Fix
		const cardClick = grid.createDiv({ cls: 'confitext-wn-card' });
		const hClick = cardClick.createDiv({ cls: 'confitext-wn-card-header' });
		hClick.createSpan({ text: '🎯', cls: 'confitext-wn-card-icon' });
		hClick.createEl('h3', { text: 'Caret Line Click Reveal Defect Resolved' });
		cardClick.createEl('p', {
			text: 'Resolved the issue where clicking directly on a line or masked word caused it to stay hidden until space was pressed. Clicking anywhere on a masked word now reveals it immediately in cleartext.'
		});

		// Card 4: Official Live GitHub Pages Website & Documentation
		const cardWeb = grid.createDiv({ cls: 'confitext-wn-card' });
		const hWeb = cardWeb.createDiv({ cls: 'confitext-wn-card-header' });
		hWeb.createSpan({ text: '🌐', cls: 'confitext-wn-card-icon' });
		hWeb.createEl('h3', { text: 'Official Website Live on GitHub Pages' });
		cardWeb.createEl('p', {
			text: 'Confitext now features an official Apple HIG-inspired website and interactive documentation suite live at dheeraz101.github.io/Confitext with dark/light themes, mobile nav drawer, and live privacy studio.'
		});

		// Card 5: Hold Esc to Peek Cleartext
		const cardEsc = grid.createDiv({ cls: 'confitext-wn-card' });
		const hEsc = cardEsc.createDiv({ cls: 'confitext-wn-card-header' });
		hEsc.createSpan({ text: '⌨️', cls: 'confitext-wn-card-icon' });
		hEsc.createEl('h3', { text: 'Hold Esc to Peek (macOS & Windows)' });
		cardEsc.createEl('p', {
			text: 'Press and hold the physical Escape key for an instant momentary glance at your notes. Releasing Escape immediately restores privacy masking, with focus-loss protection on Alt-Tab / Cmd-Tab.'
		});

		// Card 6: Apple HIG Typography & Bullet Dividers
		const cardTypo = grid.createDiv({ cls: 'confitext-wn-card' });
		const hTypo = cardTypo.createDiv({ cls: 'confitext-wn-card-header' });
		hTypo.createSpan({ text: '💎', cls: 'confitext-wn-card-icon' });
		hTypo.createEl('h3', { text: 'Apple HIG Bullet Divider Typography' });
		cardTypo.createEl('p', {
			text: 'Replaced hyphens with refined Apple bullet symbols (•) across all status indicators, headers, badges, and documentation for a premium typographic aesthetic.'
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
