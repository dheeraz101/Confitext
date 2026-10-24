import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
	confitextStateField,
	setModeEffect,
	setSettingsEffect,
	setFilePathEffect,
	initialEditorState
} from '../src/state';
import { DEFAULT_SETTINGS } from '../src/types';

describe('State Management - CodeMirror StateField & Effects', () => {
	it('initializes with default mode and settings', () => {
		const state = EditorState.create({
			doc: 'Test document',
			extensions: [confitextStateField]
		});

		const pluginState = state.field(confitextStateField);
		expect(pluginState.mode).toBe('masking');
		expect(pluginState.settings.enabled).toBe(true);
		expect(pluginState.settings.glyphStyle).toBe('matrix');
	});

	it('transitions mode on setModeEffect (masking -> revealed -> paused)', () => {
		let state = EditorState.create({
			doc: 'Secret notes',
			extensions: [confitextStateField]
		});

		// 1. Transition to revealed
		state = state.update({
			effects: setModeEffect.of('revealed')
		}).state;
		expect(state.field(confitextStateField).mode).toBe('revealed');

		// 2. Transition to paused
		state = state.update({
			effects: setModeEffect.of('paused')
		}).state;
		expect(state.field(confitextStateField).mode).toBe('paused');

		// 3. Return to masking
		state = state.update({
			effects: setModeEffect.of('masking')
		}).state;
		expect(state.field(confitextStateField).mode).toBe('masking');
	});

	it('updates settings on setSettingsEffect', () => {
		let state = EditorState.create({
			doc: 'Notes',
			extensions: [confitextStateField]
		});

		const newSettings = {
			...DEFAULT_SETTINGS,
			glyphStyle: 'runes' as const,
			enableAnimation: false,
			subtleGlow: false
		};

		state = state.update({
			effects: setSettingsEffect.of(newSettings)
		}).state;

		const field = state.field(confitextStateField);
		expect(field.settings.glyphStyle).toBe('runes');
		expect(field.settings.enableAnimation).toBe(false);
		expect(field.settings.subtleGlow).toBe(false);
	});

	it('updates note file path on setFilePathEffect', () => {
		let state = EditorState.create({
			doc: 'Document in Public Folder',
			extensions: [confitextStateField]
		});

		expect(state.field(confitextStateField).filePath).toBeUndefined();

		state = state.update({
			effects: setFilePathEffect.of('Public/Notes/Test.md')
		}).state;

		expect(state.field(confitextStateField).filePath).toBe('Public/Notes/Test.md');
	});

	it('maintains independent states across multiple editor instances', () => {
		let editorA = EditorState.create({
			doc: 'Document A',
			extensions: [confitextStateField]
		});

		let editorB = EditorState.create({
			doc: 'Document B',
			extensions: [confitextStateField]
		});

		// Change mode in Editor A only
		editorA = editorA.update({
			effects: setModeEffect.of('revealed')
		}).state;

		expect(editorA.field(confitextStateField).mode).toBe('revealed');
		expect(editorB.field(confitextStateField).mode).toBe('masking'); // unaffected!
	});
});
