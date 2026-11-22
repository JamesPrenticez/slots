/**
 * ReelWindow — a circular sliding window over a symbol strip.
 *
 * A slot reel is an infinite loop of symbols. Physically the reel strip
 * wraps around — symbol index 0 comes after the last symbol. ReelWindow
 * models this by treating the underlying array as a circular buffer.
 *
 * shift(n) moves the window n positions forward through the strip —
 * equivalent to the reel physically spinning past n symbols.
 *
 * get(i) returns the symbol at position i relative to the current window
 * start, wrapping around automatically. This is used by the Reel to know
 * which symbol sprite to display at each visible row.
 *
 * Used in two ways inside Reel:
 *   this.symbols — the data strip (string symbol IDs)
 *   this.display — the view strip (SymbolView objects)
 */
export class ReelWindow<T> {
	private shiftOffset = 0;
	public readonly length: number;

	constructor(private readonly members: ReadonlyArray<T>) {
		this.length = members.length;
	}

	/** Advance the window by n positions (negative = backwards) */
	public shift(steps: number): void {
		this.shiftOffset -= steps;
	}

	/** Jump the window to an absolute position */
	public setShift(newShift: number): void {
		this.shiftOffset = newShift % this.length;
	}

	/** Get the item at position index, wrapping around the strip */
	public get(index: number): T {
		return this.members[(index + this.safeOffset()) % this.length]!;
	}

	/** Returns a copy of all members in their original order */
	public getMembers(): T[] {
		return [...this.members];
	}

	private safeOffset(): number {
		if (this.shiftOffset === 0) return 0;
		if (this.shiftOffset > 0) return this.shiftOffset % this.length;
		return this.length + (this.shiftOffset % this.length);
	}
}
