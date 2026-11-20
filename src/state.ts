/**
 * Confitext - State Management & CodeMirror StateField
 */

import { StateEffect, StateField } from '@codemirror/state';
import { ConfitextMode, ConfitextSettings, DEFAULT_SETTINGS } from './types';

export interface ConfitextEditorState {
	mode: ConfitextMode;
	settings: ConfitextSettings;
	filePath?: string;
}

// Effects for transactional updates to editor state
export const setModeEffect = StateEffect.define<ConfitextMode>();
export const setSettingsEffect = StateEffect.define<ConfitextSettings>();
export const setFilePathEffect = StateEffect.define<string>();
export const animationTickEffect = StateEffect.define<void>();

// Default editor state
export const initialEditorState: ConfitextEditorState = {
	mode: DEFAULT_SETTINGS.defaultMode,
	settings: DEFAULT_SETTINGS
};

let globalInitialStateProvider: (() => ConfitextEditorState) | null = null;

export function setInitialStateProvider(provider: (() => ConfitextEditorState) | null): void {
	globalInitialStateProvider = provider;
}

// CodeMirror StateField tracking Confitext mode, settings, and note path per editor
export const confitextStateField = StateField.define<ConfitextEditorState>({
	create() {
		if (globalInitialStateProvider) {
			try {
				return globalInitialStateProvider();
			} catch {
				return initialEditorState;
			}
		}
		return initialEditorState;
	},
	update(value, tr) {
		let current = value;
		for (const effect of tr.effects) {
			if (effect.is(setModeEffect)) {
				current = { ...current, mode: effect.value };
			} else if (effect.is(setSettingsEffect)) {
				current = { ...current, settings: effect.value };
			} else if (effect.is(setFilePathEffect)) {
				current = { ...current, filePath: effect.value };
			}
		}
		return current;
	}
});
