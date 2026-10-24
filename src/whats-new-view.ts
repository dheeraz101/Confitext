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
		return "What's New in Confitext v1.4.0";
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
		badgeRow.createSpan({ cls: 'confitext-pill confitext-pill-active', text: 'CONFITEXT v1.4.0' });
		badgeRow.createSpan({ cls: 'confitext-pill', text: 'RELEASE NOTES' });

		hero.createEl('h1', { text: "What's New in Confitext v1.4.0", cls: 'confitext-wn-title' });
		hero.createEl('p', {
			cls: 'confitext-wn-subtitle',
			text: 'Your thoughts. Your screen. Your code. Version 1.4.0 brings declarative settings API support for native Obsidian settings search, tab header shields, Reading View masking, and emergency panic controls.'
		});

		// Feature Grid
		const grid = container.createDiv({ cls: 'confitext-wn-grid' });

		// Card 1: Right-Click Context Menus
		const card1 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h1 = card1.createDiv({ cls: 'confitext-wn-card-header' });
		h1.createSpan({ text: '⚡', cls: 'confitext-wn-card-icon' });
		h1.createEl('h3', { text: 'Native Right-Click Context Menus' });
		card1.createEl('p', {
			text: 'Confitext is now deeply infused into Obsidian menus. Right-click anywhere in an active note to toggle masking, trigger Panic Hide, or toggle note privacy. Right-click any folder or note in the File Navigation pane to exclude or include it immediately.'
		});

		// Card 2: Tab Header Shield Action
		const card2 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h2 = card2.createDiv({ cls: 'confitext-wn-card-header' });
		h2.createSpan({ text: '🛡️', cls: 'confitext-wn-card-icon' });
		h2.createEl('h3', { text: 'Tab Header Privacy Shield' });
		card2.createEl('p', {
			text: 'Every note tab now features an action button directly in its title bar. A single click toggles masking between Masked and Revealed modes for rapid visual privacy control.'
		});

		// Card 3: Reading View Post-Processor
		const card3 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h3 = card3.createDiv({ cls: 'confitext-wn-card-header' });
		h3.createSpan({ text: '👁️', cls: 'confitext-wn-card-icon' });
		h3.createEl('h3', { text: 'Reading View Visual Masking' });
		card3.createEl('p', {
			text: 'Visual masking is no longer limited to editing. Confitext now non-destructively masks text in Reading View (Preview Mode) as well! Click any masked word in Reading View to reveal it in-place, and click again to re-mask.'
		});

		// Card 4: Panic Mode Command
		const card4 = grid.createDiv({ cls: 'confitext-wn-card' });
		const h4 = card4.createDiv({ cls: 'confitext-wn-card-header' });
		h4.createSpan({ text: '🚨', cls: 'confitext-wn-card-icon' });
		h4.createEl('h3', { text: 'Emergency Panic Mode' });
		card4.createEl('p', {
			text: 'Need to hide your screen instantly? Run "Confitext: Panic: Instant hide & mask all text" or bind it to a hotkey. It immediately collapses active selections, enforces masking mode, and secures your display.'
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
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}
}
