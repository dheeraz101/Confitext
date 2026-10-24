// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleManager } from '../src/idle';
import { DEFAULT_SETTINGS } from '../src/types';

describe('Idle Auto-Masking Timer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('triggers onIdleTimeout after configured timeout period', () => {
		let timeoutTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			idleTimeoutMinutes: 5
		};

		const manager = new IdleManager(
			() => settings,
			() => {
				timeoutTriggered = true;
			},
			() => {}
		);

		manager.start();
		expect(manager.isIdleRunning()).toBe(true);

		// Advance 4 minutes: should NOT have triggered yet
		vi.advanceTimersByTime(4 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		// Advance past 5 minutes: should trigger
		vi.advanceTimersByTime(1 * 60 * 1000 + 100);
		expect(timeoutTriggered).toBe(true);

		manager.destroy();
	});

	it('resets countdown when user interaction occurs', () => {
		let timeoutTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			idleTimeoutMinutes: 5
		};

		const manager = new IdleManager(
			() => settings,
			() => {
				timeoutTriggered = true;
			},
			() => {}
		);

		manager.start();

		// Advance 4 minutes
		vi.advanceTimersByTime(4 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		// Simulate user keystroke or mouse movement (throttled at 500ms)
		window.dispatchEvent(new Event('mousemove'));

		// Advance another 3 minutes (total 7 minutes since start, but only 3 since activity)
		vi.advanceTimersByTime(3 * 60 * 1000);
		expect(timeoutTriggered).toBe(false); // Still not triggered!

		// Advance 2 more minutes (5 minutes after mouse movement) -> now triggers!
		vi.advanceTimersByTime(2 * 60 * 1000 + 100);
		expect(timeoutTriggered).toBe(true);

		manager.destroy();
	});

	it('resets countdown when wheel or nested element scroll occurs', () => {
		let timeoutTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			idleTimeoutMinutes: 3
		};

		const manager = new IdleManager(
			() => settings,
			() => {
				timeoutTriggered = true;
			},
			() => {}
		);

		manager.start();

		// Advance 2 minutes
		vi.advanceTimersByTime(2 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		// Dispatch wheel event on window
		window.dispatchEvent(new Event('wheel'));

		// Advance another 2 minutes (4m total, but 2m since wheel)
		vi.advanceTimersByTime(2 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		// Dispatch scroll on a nested scroll container (e.g. .cm-scroller)
		const scroller = document.createElement('div');
		document.body.appendChild(scroller);
		scroller.dispatchEvent(new Event('scroll', { bubbles: false }));
		scroller.remove();

		// Advance 2 minutes (4m since wheel, but 2m since nested scroll)
		vi.advanceTimersByTime(2 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		// Advance 1m100ms -> 3m after nested scroll -> triggers!
		vi.advanceTimersByTime(1 * 60 * 1000 + 100);
		expect(timeoutTriggered).toBe(true);

		manager.destroy();
	});

	it('triggers onBlurAutoMask on window blur if autoMaskOnBlur is enabled', () => {
		let blurTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			autoMaskOnBlur: true
		};

		const manager = new IdleManager(
			() => settings,
			() => {},
			() => {
				blurTriggered = true;
			}
		);

		manager.start();

		// Simulate window blur
		window.dispatchEvent(new Event('blur'));
		expect(blurTriggered).toBe(true);

		manager.destroy();
	});

	it('does NOT trigger onBlurAutoMask if autoMaskOnBlur is disabled', () => {
		let blurTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			autoMaskOnBlur: false
		};

		const manager = new IdleManager(
			() => settings,
			() => {},
			() => {
				blurTriggered = true;
			}
		);

		manager.start();

		window.dispatchEvent(new Event('blur'));
		expect(blurTriggered).toBe(false);

		manager.destroy();
	});

	it('cleans up all listeners and cancels timers on stop or destroy', () => {
		let timeoutTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: true,
			idleTimeoutMinutes: 2
		};

		const manager = new IdleManager(
			() => settings,
			() => {
				timeoutTriggered = true;
			},
			() => {}
		);

		manager.start();
		expect(manager.isIdleRunning()).toBe(true);

		manager.stop();
		expect(manager.isIdleRunning()).toBe(false);

		// Advance well past the timeout
		vi.advanceTimersByTime(10 * 60 * 1000);
		expect(timeoutTriggered).toBe(false); // stopped, must never fire
	});

	it('does nothing when idleAutoMask is disabled in settings', () => {
		let timeoutTriggered = false;
		const settings = {
			...DEFAULT_SETTINGS,
			idleAutoMask: false,
			idleTimeoutMinutes: 5
		};

		const manager = new IdleManager(
			() => settings,
			() => {
				timeoutTriggered = true;
			},
			() => {}
		);

		manager.start();

		vi.advanceTimersByTime(10 * 60 * 1000);
		expect(timeoutTriggered).toBe(false);

		manager.destroy();
	});
});
