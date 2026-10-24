/**
 * Confitext - Idle & Window Blur Auto-Masking Manager
 */

import { ConfitextSettings } from './types';

export class IdleManager {
	private timerId: number | null = null;
	private lastActivityTime = Date.now();
	private isRunning = false;

	private activityListener: () => void;
	private blurListener: () => void;
	private focusListener: () => void;

	constructor(
		private getSettings: () => ConfitextSettings,
		private onIdleTimeout: () => void,
		private onBlurAutoMask: () => void
	) {
		// Throttled activity listener (500ms)
		this.activityListener = () => {
			const now = Date.now();
			if (now - this.lastActivityTime > 500) {
				this.lastActivityTime = now;
				this.resetTimer();
			}
		};

		this.blurListener = () => {
			const settings = this.getSettings();
			if (settings.idleAutoMask && settings.autoMaskOnBlur) {
				this.onBlurAutoMask();
			}
		};

		this.focusListener = () => {
			this.lastActivityTime = Date.now();
			this.resetTimer();
		};
	}

	/**
	 * Starts the idle timer and attaches interaction listeners
	 */
	start(): void {
		if (this.isRunning) {
			this.resetTimer();
			return;
		}

		this.isRunning = true;
		this.lastActivityTime = Date.now();

		if (typeof window !== 'undefined') {
			window.addEventListener('mousemove', this.activityListener, { passive: true });
			window.addEventListener('mousedown', this.activityListener, { passive: true });
			window.addEventListener('pointerdown', this.activityListener, { passive: true });
			window.addEventListener('pointermove', this.activityListener, { passive: true });
			window.addEventListener('keydown', this.activityListener, { passive: true });
			window.addEventListener('touchstart', this.activityListener, { passive: true });
			window.addEventListener('wheel', this.activityListener, { passive: true });
			window.addEventListener('scroll', this.activityListener, { passive: true, capture: true });
			window.addEventListener('blur', this.blurListener);
			window.addEventListener('focus', this.focusListener);
		}

		this.resetTimer();
	}

	/**
	 * Stops the timer and removes all window event listeners
	 */
	stop(): void {
		if (!this.isRunning) return;
		this.isRunning = false;

		if (this.timerId !== null) {
			window.clearTimeout(this.timerId);
			this.timerId = null;
		}

		if (typeof window !== 'undefined') {
			window.removeEventListener('mousemove', this.activityListener);
			window.removeEventListener('mousedown', this.activityListener);
			window.removeEventListener('pointerdown', this.activityListener);
			window.removeEventListener('pointermove', this.activityListener);
			window.removeEventListener('keydown', this.activityListener);
			window.removeEventListener('touchstart', this.activityListener);
			window.removeEventListener('wheel', this.activityListener);
			window.removeEventListener('scroll', this.activityListener, { capture: true });
			window.removeEventListener('blur', this.blurListener);
			window.removeEventListener('focus', this.focusListener);
		}
	}

	/**
	 * Resets the idle countdown timer based on configured timeout
	 */
	resetTimer(): void {
		if (this.timerId !== null) {
			window.clearTimeout(this.timerId);
			this.timerId = null;
		}

		const settings = this.getSettings();
		if (!this.isRunning || !settings.idleAutoMask) {
			return;
		}

		const minutes = Math.max(1, Math.min(60, settings.idleTimeoutMinutes || 5));
		const ms = minutes * 60 * 1000;

		this.timerId = window.setTimeout(() => {
			this.timerId = null;
			this.onIdleTimeout();
		}, ms);
	}

	/**
	 * Returns whether the idle tracking is currently active
	 */
	isIdleRunning(): boolean {
		return this.isRunning;
	}

	/**
	 * Cleans up and destroys the idle manager
	 */
	destroy(): void {
		this.stop();
	}
}
