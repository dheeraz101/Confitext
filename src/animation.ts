/**
 * Confitext - Matrix Scramble & Settling Animation Engine
 */

import { ActiveAnimation, ConfitextSettings, AnimationSpeed } from './types';
import { getScrambleGlyphs } from './glyphs';

export const DURATION_MAP: Record<AnimationSpeed, number> = {
	fast: 180,
	normal: 280,
	slow: 420
};

export class AnimationManager {
	private activeAnimations = new Map<string, ActiveAnimation>();
	private rafId: number | null = null;
	private onFrameCallback: (() => void) | null = null;

	constructor(private getSettings: () => ConfitextSettings) {}

	/**
	 * Sets the callback invoked whenever an animation frame renders
	 */
	setFrameCallback(cb: () => void): void {
		this.onFrameCallback = cb;
	}

	/**
	 * Checks if reduced motion is preferred by the OS
	 */
	isReducedMotionPreferred(): boolean {
		if (typeof window === 'undefined' || !window.matchMedia) return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/**
	 * Registers a newly completed word for scrambling animation
	 */
	registerWordAnimation(
		from: number,
		to: number,
		word: string,
		stableGlyphs: string
	): void {
		const settings = this.getSettings();

		// Do not animate if disabled in settings or reduced motion is requested
		if (!settings.enableAnimation) return;
		if (settings.respectReducedMotion && this.isReducedMotionPreferred()) return;

		const duration = DURATION_MAP[settings.animationSpeed] || 280;
		const wordKey = `${from}:${to}:${word}`;

		// Don't restart if already actively animating
		if (this.activeAnimations.has(wordKey)) return;

		this.activeAnimations.set(wordKey, {
			wordKey,
			from,
			to,
			word,
			stableGlyphs,
			startTime: performance.now(),
			duration
		});

		this.startLoop();
	}

	/**
	 * Returns current animation state for a word if active, or null
	 */
	getAnimation(from: number, to: number, word: string): { glyphs: string; stage: 'scramble' | 'settling' } | null {
		const wordKey = `${from}:${to}:${word}`;
		const anim = this.activeAnimations.get(wordKey);
		if (!anim) return null;

		const elapsed = performance.now() - anim.startTime;
		const progress = Math.min(1.0, elapsed / anim.duration);

		const settings = this.getSettings();
		const frameSeed = Math.floor(elapsed / 30); // update flicker every 30ms
		const glyphs = getScrambleGlyphs(
			anim.word,
			anim.stableGlyphs,
			progress,
			frameSeed,
			settings.glyphStyle,
			settings.customGlyphs
		);

		// Scramble phase is first 55%, settling is 55%-100%
		const stage: 'scramble' | 'settling' = progress < 0.55 ? 'scramble' : 'settling';

		return { glyphs, stage };
	}

	/**
	 * Removes an animation
	 */
	removeAnimation(from: number, to: number, word: string): void {
		const wordKey = `${from}:${to}:${word}`;
		this.activeAnimations.delete(wordKey);
		if (this.activeAnimations.size === 0) {
			this.stopLoop();
		}
	}

	/**
	 * Maps active animation ranges through document changes so ongoing animations
	 * do not get lost or desynced when earlier edits occur
	 */
	mapPositions(changes: { mapPos: (pos: number, assoc?: number) => number }): void {
		if (this.activeAnimations.size === 0) return;
		const updated = new Map<string, ActiveAnimation>();

		for (const anim of this.activeAnimations.values()) {
			const newFrom = changes.mapPos(anim.from, 1);
			const newTo = changes.mapPos(anim.to, -1);
			if (newFrom < newTo) {
				anim.from = newFrom;
				anim.to = newTo;
				const newKey = `${newFrom}:${newTo}:${anim.word}`;
				anim.wordKey = newKey;
				updated.set(newKey, anim);
			}
		}

		this.activeAnimations = updated;
		if (this.activeAnimations.size === 0) {
			this.stopLoop();
		}
	}

	/**
	 * Clears all active animations
	 */
	clear(): void {
		this.activeAnimations.clear();
		this.stopLoop();
	}

	/**
	 * Disposes of the animation manager and cancels running RAF
	 */
	destroy(): void {
		this.clear();
		this.onFrameCallback = null;
	}

	private startLoop(): void {
		if (this.rafId !== null) return;
		this.rafLoop();
	}

	private stopLoop(): void {
		if (this.rafId !== null) {
			window.cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private rafLoop = (): void => {
		const now = performance.now();
		const toDelete: string[] = [];

		for (const [key, anim] of this.activeAnimations.entries()) {
			if (now - anim.startTime >= anim.duration) {
				toDelete.push(key);
			}
		}

		for (const key of toDelete) {
			this.activeAnimations.delete(key);
		}

		if (this.onFrameCallback) {
			this.onFrameCallback();
		}

		if (this.activeAnimations.size > 0) {
			this.rafId = window.requestAnimationFrame(this.rafLoop);
		} else {
			this.rafId = null;
		}
	};
}
