import { defaultSymbolAnim, type SymbolAnim } from "../../../slot/renderer/SymbolAnim.js";

/** Register new presets here; a pack selects one via `THEME.symbols.anim`. */
export const SYMBOL_ANIMS: Record<string, SymbolAnim> = { default: defaultSymbolAnim };

export function getSymbolAnim(name: string): SymbolAnim {
	const a = SYMBOL_ANIMS[name];
	if (!a) throw new Error(`Unknown symbols anim "${name}"`);
	return a;
}
