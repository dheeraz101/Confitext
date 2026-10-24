/**
 * Confitext - Reading View Markdown Post-Processor
 * Extends visual masking to Obsidian's Reading View (Preview Mode)
 */

import { MarkdownPostProcessorContext } from 'obsidian';
import type ConfitextPlugin from './main';
import { getStableGlyphs } from './glyphs';
import { isPathExcluded } from './rules';

const WORD_SPLIT_REGEX = /(\s+|[.,!?;:"“”()[\]{}]+)/u;
const EXCLUDED_TAGS = new Set(['PRE', 'CODE', 'A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE']);

/**
 * Creates the Markdown Post-Processor callback for Obsidian's Reading View
 */
export function createPreviewMaskProcessor(plugin: ConfitextPlugin) {
	return (element: HTMLElement, context: MarkdownPostProcessorContext): void => {
		if (!plugin.settings.enabled || !plugin.settings.maskReadingView) {
			return;
		}

		if (plugin.currentMode === 'revealed') {
			return;
		}

		// Check folder exclusion
		const sourcePath = context.sourcePath || '';
		if (sourcePath && isPathExcluded(sourcePath, plugin.settings.excludedFolders)) {
			return;
		}

		// Check frontmatter exclusion
		if (plugin.settings.respectFrontmatterExclusion && context.frontmatter) {
			if (context.frontmatter['confitext'] === false) {
				return;
			}
		}

		// Mask text nodes in this container
		maskElementNodes(element, plugin);
	};
}

/**
 * Recursively inspects and masks text nodes in an element
 */
export function maskElementNodes(element: HTMLElement, plugin: ConfitextPlugin): void {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
		acceptNode(node: Node) {
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;

			// Skip excluded tags
			if (EXCLUDED_TAGS.has(parent.tagName)) {
				return NodeFilter.FILTER_REJECT;
			}

			// Skip already masked elements or syntax containers
			if (
				parent.classList.contains('confitext-glyph') ||
				parent.classList.contains('confitext-preview-revealed') ||
				parent.classList.contains('math') ||
				parent.classList.contains('frontmatter')
			) {
				return NodeFilter.FILTER_REJECT;
			}

			if (!node.textContent || !node.textContent.trim()) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		}
	});

	const textNodes: Text[] = [];
	let currentNode = walker.nextNode();
	while (currentNode) {
		textNodes.push(currentNode as Text);
		currentNode = walker.nextNode();
	}

	for (const textNode of textNodes) {
		const text = textNode.textContent;
		if (!text) continue;

		const parts = text.split(WORD_SPLIT_REGEX);
		if (parts.length <= 1 && !text.trim()) continue;

		const fragment = document.createDocumentFragment();
		let hasMaskedWord = false;

		for (const part of parts) {
			if (!part) continue;

			if (WORD_SPLIT_REGEX.test(part)) {
				// Delimiter or whitespace
				fragment.appendChild(document.createTextNode(part));
			} else {
				// Word to mask
				hasMaskedWord = true;
				const glyphs = getStableGlyphs(
					part,
					plugin.settings.glyphStyle,
					plugin.settings.customGlyphs
				);

				const span = createEl('span', {
					cls: 'confitext-glyph confitext-preview-glyph',
					attr: {
						'aria-label': 'hidden text',
						role: 'presentation',
						'data-confitext': 'preview-mask',
						'data-word': part
					},
					text: glyphs
				});

				// Click-to-reveal interaction in Reading View
				span.addEventListener('click', (e: MouseEvent) => {
					e.stopPropagation();
					if (span.classList.contains('confitext-preview-revealed')) {
						span.classList.remove('confitext-preview-revealed');
						span.textContent = glyphs;
					} else {
						span.classList.add('confitext-preview-revealed');
						span.textContent = part;
					}
				});

				fragment.appendChild(span);
			}
		}

		if (hasMaskedWord && textNode.parentNode) {
			textNode.parentNode.replaceChild(fragment, textNode);
		}
	}
}
