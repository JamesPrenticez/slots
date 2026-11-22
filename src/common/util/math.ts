/**
 * @param min Min value (incluseive), only integers
 * @param max Max value (incluseive), only integers
 * @returns
 */
/*#__PURE__*/
export function randomInt(min: number, max: number): number {
	return (min + Math.random() * (max - min)) | 0;
}

/*#__PURE__*/
export function clamp(min: number, max: number, value: number): number {
	return Math.max(min, Math.min(value, max));
}

/*#__PURE__*/
export function clampFactor(factor: number): number {
	return clamp(0, 1, factor);
}

/*#__PURE__*/
export function unClampedLinear(from: number, to: number, factor: number): number {
	return from * (1 - factor) + to * factor;
}

/*#__PURE__*/
export function clampedLinear(from: number, to: number, factor: number): number {
	return unClampedLinear(from, to, clampFactor(factor));
}

/*#__PURE__*/
export function mapRange(value: number, lowFrom: number, highFrom: number, lowTo = 0, highTo = 1): number {
	return lowTo + ((highTo - lowTo) * (value - lowFrom)) / (highFrom - lowFrom);
}

/*#__PURE__*/
export function getMedian(numbers: ReadonlyArray<number | undefined>): number | undefined {
	const internal = [...numbers].filter((e): e is number => e !== undefined && !Number.isNaN(e));
	if (!internal.length) {
		return undefined;
	}

	internal.sort((a, b) => a - b);
	const mid = (internal.length / 2) | 0;
	return internal.length % 2 === 0 ? (internal[mid] + internal[mid - 1]) / 2 : internal[mid];
}
