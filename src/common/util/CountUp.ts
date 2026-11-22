/**
 * CountUp: animates a number from 0 to target over duration.
 * Returns a cancel function to stop the animation early.
 *
 * Usage:
 *   const cancel = countUp(1500, 2000, (value) => {
 *     this.text.text = `$${value.toFixed(2)}`;
 *   });
 *
 *   // To stop early:
 *   cancel();
 */
export function countUp(
	target: number,
	duration: number,
	onUpdate: (current: number, progress: number) => void,
	onComplete?: () => void,
	from = 0
): () => void {
	const startTime = performance.now();
	let rafId: number;
	let stopped = false;
	let completed = false;

	const tick = () => {
		if (stopped || completed) return;

		const progress = Math.min((performance.now() - startTime) / duration, 1);
		const eased = progress < 0.6 ? (progress / 0.6) * 0.95 : 0.95 + ((progress - 0.6) / 0.4) * 0.05;

		onUpdate(from + (target - from) * eased, progress);

		if (progress >= 1) {
			completed = true;
			onUpdate(target, 1);
			onComplete?.();
			return;
		}
		rafId = requestAnimationFrame(tick);
	};

	rafId = requestAnimationFrame(tick);
	return () => {
		stopped = true;
		completed = true;
		cancelAnimationFrame(rafId);
	};
}
