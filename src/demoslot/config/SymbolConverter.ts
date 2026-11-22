import { SYMBOL_DEFINITIONS, type SymbolDefinition } from "./GameConfig.js";

/**
 * SymbolConverter — maps symbol IDs to textures and payout data.
 *
 * Payout values (getPayout) are MOCK ONLY — the real RGS server is
 * the authoritative source for win amounts in production.
 */
export class SymbolConverter {
	private static readonly map = new Map<string, SymbolDefinition>(SYMBOL_DEFINITIONS.map(s => [s.id, s]));

	public static getDefinition(id: string): SymbolDefinition {
		const def = this.map.get(id);
		if (!def) throw new Error(`SymbolConverter: unknown symbol id "${id}"`);
		return def;
	}

	public static getTexture(id: string): string {
		return this.getDefinition(id).texture;
	}

	/**
	 * Tiered payout multiplier for a symbol at a given cluster count.
	 * 8–9 = tier 0, 10–11 = tier 1, 12+ = tier 2.
	 * MOCK ONLY — server sends actual win amounts in production.
	 */
	public static getPayout(id: string, count: number): number {
		const def = this.map.get(id);
		if (!def) return 0;
		const tier = count >= 12 ? 2 : count >= 10 ? 1 : 0;
		return def.payouts[tier];
	}

	public static isWild(id: string): boolean {
		return this.map.get(id)?.isWild ?? false;
	}

	public static isScatter(id: string): boolean {
		return this.map.get(id)?.isScatter ?? false;
	}

	public static isBomb(id: string): boolean {
		return this.map.get(id)?.isBomb ?? false;
	}

	/** Legacy — use getPayout() for tiered values */
	public static getValue(id: string): number {
		return this.map.get(id)?.payouts[0] ?? 0;
	}

	public static getAllIds(): string[] {
		return [...this.map.keys()];
	}
}
