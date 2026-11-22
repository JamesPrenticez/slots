/*#__PURE__*/
export function inElastic(period: number | undefined = undefined, amplitude = 0) {
	return (t: number, b: number, c: number, d: number) => {
		const uPeriod = period === undefined ? d * 0.3 : period;
		if (t === 0) return b;
		if ((t /= d) === 1) return b + c;
		const p = uPeriod;
		let s: number;
		let a = amplitude;
		if (!a || a < Math.abs(c)) {
			a = c;
			s = p / 4;
		} else {
			s = (p / (2 * Math.PI)) * Math.asin(c / a);
		}
		return -(a * 2 ** (10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b;
	};
}

/*#__PURE__*/
export function outElastic(period: number | undefined = undefined, amplitude = 0) {
	return (t: number, b: number, c: number, d: number) => {
		const uPeriod = period === undefined ? d * 0.3 : period;
		if (t === 0) return b;
		if ((t /= d) === 1) return b + c;
		const p = uPeriod;
		let s: number;
		let a = amplitude;
		if (!a || a < Math.abs(c)) {
			a = c;
			s = p / 4;
		} else {
			s = (p / (2 * Math.PI)) * Math.asin(c / a);
		}
		return a * 2 ** (-10 * t) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) + c + b;
	};
}

/*#__PURE__*/
export function inOutElastic(period: number | undefined = undefined, amplitude = 0) {
	return (t: number, b: number, c: number, d: number) => {
		const uPeriod = period === undefined ? d * 0.3 * 1.5 : period;
		if (t === 0) return b;
		if ((t /= d / 2) === 2) return b + c;
		const p = uPeriod;
		let s: number;
		let a = amplitude;
		if (!a || a < Math.abs(c)) {
			a = c;
			s = p / 4;
		} else {
			s = (p / (2 * Math.PI)) * Math.asin(c / a);
		}
		if (t < 1) return -0.5 * (a * 2 ** (10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p)) + b;
		return a * 2 ** (-10 * (t -= 1)) * Math.sin(((t * d - s) * (2 * Math.PI)) / p) * 0.5 + c + b;
	};
}

/*#__PURE__*/
export function outInElastic(period: number | undefined = undefined, amplitude = 0) {
	const outE = outElastic(period, amplitude);
	const inE = inElastic(period, amplitude);
	return (t: number, b: number, c: number, d: number) => {
		if (t < d / 2) return outE(t * 2, b, c / 2, d);
		return inE(t * 2 - d, b + c / 2, c / 2, d);
	};
}

/*#__PURE__*/
export function inBack(overshoot = 1.70158) {
	return (t: number, b: number, c: number, d: number) => {
		const s = overshoot;
		return c * (t /= d) * t * ((s + 1) * t - s) + b;
	};
}

/*#__PURE__*/
export function outBack(overshoot = 1.70158) {
	return (t: number, b: number, c: number, d: number) => {
		const s = overshoot;
		return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
	};
}

/*#__PURE__*/
export function inOutBack(overshoot = 1.70158) {
	return (t: number, b: number, c: number, d: number) => {
		let s = overshoot;
		if ((t /= d / 2) < 1) return (c / 2) * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
		return (c / 2) * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
	};
}

/*#__PURE__*/
export function outInBack(overshoot?: number | undefined) {
	const outB = outBack(overshoot);
	const inB = inBack(overshoot);
	return (t: number, b: number, c: number, d: number) => {
		if (t < d / 2) return outB(t * 2, b, c / 2, d);
		return inB(t * 2 - d, b + c / 2, c / 2, d);
	};
}

/**
 * A steps easing function. Similar to CSS's linear but with the coordinate arguments reversed
 * @param steps Array of `[number, number]` tupples.
 *              First value is linear factor and second value is transformed factor.
 * @returns
 */
/*#__PURE__*/
export function steps(steps: ReadonlyArray<[number, number]>): (t: number, b: number, c: number, d: number) => number {
	return (t: number, _b: number, _c: number, d: number) => {
		const factor = t / d;
		for (const [index, [currentX, currentY]] of steps.entries()) {
			const next = steps[index + 1];
			if (next === undefined) {
				return 1;
			}
			const [nextX, nextY] = next;
			if (factor > nextX) {
				continue;
			}
			const slope = (nextY - currentY) / (nextX - currentX);

			return slope * (factor - nextX) + nextY;
		}
		return 1;
	};
}

Object.assign(globalThis, { steps });
