/**
 * Confitext - Command Registration
 */

import { Notice } from 'obsidian';
import type ConfitextPlugin from './main';

interface SettingTabManager {
	open(): void;
	openTabById(tabId: string): void;
}

interface AppWithSetting {
	setting?: SettingTabManager;
}

export function registerCommands(plugin: ConfitextPlugin): void {
	// 1. Toggle masking
	plugin.addCommand({
		id: 'toggle-masking',
		name: 'Toggle masking',
		callback: () => {
			if (plugin.currentMode === 'masking') {
				plugin.setMode('revealed');
				new Notice('Confitext: All text revealed');
			} else {
				plugin.setMode('masking');
				new Notice('Confitext: Masking enabled');
			}
		}
	});

	// 2. Reveal all text
	plugin.addCommand({
		id: 'reveal-all',
		name: 'Reveal all text',
		callback: () => {
			plugin.setMode('revealed');
			new Notice('Confitext: All text revealed');
		}
	});

	// 3. Hide all text
	plugin.addCommand({
		id: 'hide-all',
		name: 'Hide all text',
		callback: () => {
			plugin.setMode('masking');
			new Notice('Confitext: All text masked');
		}
	});

	// 4. Pause masking
	plugin.addCommand({
		id: 'pause-masking',
		name: 'Pause masking',
		callback: () => {
			plugin.setMode('paused');
			new Notice('Confitext: Masking paused');
		}
	});

	// 5. Resume masking
	plugin.addCommand({
		id: 'resume-masking',
		name: 'Resume masking',
		callback: () => {
			plugin.setMode('masking');
			new Notice('Confitext: Masking resumed');
		}
	});

	// 6. Toggle animation
	plugin.addCommand({
		id: 'toggle-animation',
		name: 'Toggle animation',
		callback: async () => {
			plugin.settings.enableAnimation = !plugin.settings.enableAnimation;
			await plugin.saveSettings();
			plugin.dispatchSettingsToEditors();
			new Notice(
				plugin.settings.enableAnimation
					? 'Confitext: Animation enabled'
					: 'Confitext: Animation disabled'
			);
		}
	});

	// 7. Toggle idle auto-masking
	plugin.addCommand({
		id: 'toggle-idle-timer',
		name: 'Toggle idle auto-masking timer',
		callback: async () => {
			plugin.settings.idleAutoMask = !plugin.settings.idleAutoMask;
			await plugin.saveSettings();
			new Notice(
				plugin.settings.idleAutoMask
					? `Confitext: Idle auto-masking enabled (${plugin.settings.idleTimeoutMinutes}m)`
					: 'Confitext: Idle auto-masking disabled'
			);
		}
	});

	// 8. Toggle frontmatter exclusion for active note
	plugin.addCommand({
		id: 'toggle-note-exclusion',
		name: 'Toggle frontmatter exclusion for active note',
		checkCallback: (checking: boolean) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) return false;
			if (checking) return true;

			void plugin.app.fileManager
				.processFrontMatter(activeFile, (frontmatter: Record<string, unknown>) => {
					if (frontmatter['confitext'] === false) {
						delete frontmatter['confitext'];
						new Notice('Confitext: Masking enabled for this note (exclusion removed)');
					} else {
						frontmatter['confitext'] = false;
						new Notice('Confitext: Masking disabled for this note (marked public)');
					}
				})
				.catch((err: unknown) => {
					console.error('Confitext: Failed to process note frontmatter', err);
				});
			return true;
		}
	});

	// 9. Open settings
	plugin.addCommand({
		id: 'open-settings',
		name: 'Open settings',
		callback: () => {
			const extendedApp = plugin.app as unknown as AppWithSetting;
			extendedApp.setting?.open();
			extendedApp.setting?.openTabById(plugin.manifest.id);
		}
	});

	// 10. Panic: Instant hide & mask all text
	plugin.addCommand({
		id: 'panic-hide',
		name: 'Panic: Instant hide & mask all text',
		callback: () => {
			plugin.panicHide();
		}
	});

	// 11. Open What's New tab
	plugin.addCommand({
		id: 'open-whats-new',
		name: "What's new in v1.2.0 (Release Notes)",
		callback: async () => {
			await plugin.openWhatsNewTab();
		}
	});
}
