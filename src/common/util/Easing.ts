export type EasingFunction = (
	currentTime: number,
	initialValue: number,
	targetValueDelta: number,
	duration: number
) => number;

/*#__PURE__*/
export function linear(t: number, b: number, c: number, d: number) {
	return (c * t) / d + b;
}

/*#__PURE__*/
export function inQuad(t: number, b: number, c: number, d: number) {
	return c * (t /= d) * t + b;
}

/*#__PURE__*/
export function outQuad(t: number, b: number, c: number, d: number) {
	return -c * (t /= d) * (t - 2) + b;
}

/*#__PURE__*/
export function inOutQuad(t: number, b: number, c: number, d: number) {
	if ((t /= d / 2) < 1) return (c / 2) * t * t + b;
	return (-c / 2) * (--t * (t - 2) - 1) + b;
}

/*#__PURE__*/
export function outInQuad(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outQuad(t * 2, b, c / 2, d);
	return inQuad(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inCubic(t: number, b: number, c: number, d: number) {
	return c * (t /= d) * t * t + b;
}

/*#__PURE__*/
export function outCubic(t: number, b: number, c: number, d: number) {
	return c * ((t = t / d - 1) * t * t + 1) + b;
}

/*#__PURE__*/
export function inOutCubic(t: number, b: number, c: number, d: number) {
	if ((t /= d / 2) < 1) return (c / 2) * t * t * t + b;
	return (c / 2) * ((t -= 2) * t * t + 2) + b;
}

/*#__PURE__*/
export function outInCubic(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outCubic(t * 2, b, c / 2, d);
	return inCubic(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inQuart(t: number, b: number, c: number, d: number) {
	return c * (t /= d) * t * t * t + b;
}

/*#__PURE__*/
export function outQuart(t: number, b: number, c: number, d: number) {
	return -c * ((t = t / d - 1) * t * t * t - 1) + b;
}

/*#__PURE__*/
export function inOutQuart(t: number, b: number, c: number, d: number) {
	if ((t /= d / 2) < 1) return (c / 2) * t * t * t * t + b;
	return (-c / 2) * ((t -= 2) * t * t * t - 2) + b;
}

/*#__PURE__*/
export function outInQuart(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outQuart(t * 2, b, c / 2, d);
	return inQuart(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inQuint(t: number, b: number, c: number, d: number) {
	return c * (t /= d) * t * t * t * t + b;
}

/*#__PURE__*/
export function outQuint(t: number, b: number, c: number, d: number) {
	return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
}

/*#__PURE__*/
export function inOutQuint(t: number, b: number, c: number, d: number) {
	if ((t /= d / 2) < 1) return (c / 2) * t * t * t * t * t + b;
	return (c / 2) * ((t -= 2) * t * t * t * t + 2) + b;
}

/*#__PURE__*/
export function outInQuint(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outQuint(t * 2, b, c / 2, d);
	return inQuint(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inSine(t: number, b: number, c: number, d: number) {
	return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
}

/*#__PURE__*/
export function outSine(t: number, b: number, c: number, d: number) {
	return c * Math.sin((t / d) * (Math.PI / 2)) + b;
}

/*#__PURE__*/
export function inOutSine(t: number, b: number, c: number, d: number) {
	return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
}

/*#__PURE__*/
export function outInSine(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outSine(t * 2, b, c / 2, d);
	return inSine(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inExpo(t: number, b: number, c: number, d: number) {
	return t === 0 ? b : c * 2 ** (10 * (t / d - 1)) + b - c * 0.001;
}

/*#__PURE__*/
export function outExpo(t: number, b: number, c: number, d: number) {
	return t === d ? b + c : c * 1.001 * (-(2 ** ((-10 * t) / d)) + 1) + b;
}

/*#__PURE__*/
export function inOutExpo(t: number, b: number, c: number, d: number) {
	if (t === 0) return b;
	if (t === d) return b + c;
	if ((t /= d / 2) < 1) return (c / 2) * 2 ** (10 * (t - 1)) + b - c * 0.0005;
	return (c / 2) * 1.0005 * (-(2 ** (-10 * (t - 1))) + 2) + b;
}

/*#__PURE__*/
export function outInExpo(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outExpo(t * 2, b, c / 2, d);
	return inExpo(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inCirc(t: number, b: number, c: number, d: number) {
	return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
}

/*#__PURE__*/
export function outCirc(t: number, b: number, c: number, d: number) {
	return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
}

/*#__PURE__*/
export function inOutCirc(t: number, b: number, c: number, d: number) {
	if ((t /= d / 2) < 1) return (-c / 2) * (Math.sqrt(1 - t * t) - 1) + b;
	return (c / 2) * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
}

/*#__PURE__*/
export function outInCirc(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outCirc(t * 2, b, c / 2, d);
	return inCirc(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function inBounce(t: number, b: number, c: number, d: number) {
	return c - outBounce(d - t, 0, c, d) + b;
}

/*#__PURE__*/
export function outBounce(t: number, b: number, c: number, d: number) {
	if ((t /= d) < 1 / 2.75) {
		return c * (7.5625 * t * t) + b;
	}
	if (t < 2 / 2.75) {
		return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75) + b;
	}
	if (t < 2.5 / 2.75) {
		return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375) + b;
	}
	return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375) + b;
}

/*#__PURE__*/
export function inOutBounce(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return inBounce(t * 2, 0, c, d) * 0.5 + b;
	return outBounce(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
}

/*#__PURE__*/
export function outInBounce(t: number, b: number, c: number, d: number) {
	if (t < d / 2) return outBounce(t * 2, b, c / 2, d);
	return inBounce(t * 2 - d, b + c / 2, c / 2, d);
}

/*#__PURE__*/
export function crossFadeEase(t: number, _b: number, _c: number, d: number): number {
	return Math.sqrt(1 - (1 - t / d) ** 2);
}
/** Gravity fall — starts slow, accelerates */
export const gravityIn: EasingFunction = (t, b, c, d): number => {
	t /= d;
	return c * t * t * t + b;
};

/** Subtle bounce — overshoots 5% then settles */
export const subtleBounce: EasingFunction = (t, b, c, d): number => {
	t /= d;
	return t < 0.8
		? c * (1 - Math.pow(1 - t / 0.8, 3)) * 1.05 + b
		: c * (1.05 - 0.05 * (1 - Math.pow(1 - (t - 0.8) / 0.2, 2))) + b;
};

export const outElastic: EasingFunction = (t, b, c, d): number => {
	if (t === 0) return b;

	const progress = t / d;

	if (progress === 1) return b + c;

	const amplitude = 1;
	const period = d * 0.45;
	const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);

	return amplitude * 2 ** (-10 * progress) * Math.sin(((progress * d - s) * (2 * Math.PI)) / period) * c + c + b;
};
