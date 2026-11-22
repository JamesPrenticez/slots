import type { RefObject } from "react";
import { useLayoutEffect, useState } from "react";

/** Fixed-position coordinates for a panel anchored above its trigger. */
export interface AnchoredPosition {
	left: number;
	bottom: number;
}

interface AnchoredPositionOptions {
	/** Gap between the anchor element and the panel. */
	anchorGap?: number;
	/** Viewport edge padding when clamping the panel horizontally. */
	edgePadding?: number;
}

/**
 * Positions a floating panel above an anchor element, clamped to the viewport,
 * and keeps it in sync on resize/scroll. For floating (anchored) modals only —
 * fullscreen/centered modals don't need it.
 *
 * Pass the panel's ref (the element being positioned) so its rendered width can
 * be measured for horizontal clamping. Returns `null` until measured, or when
 * closed / unanchored — render a sensible fallback position for that case.
 */
export function useAnchoredPosition(
	open: boolean,
	anchorEl: HTMLElement | null | undefined,
	panelRef: RefObject<HTMLElement | null>,
	{ anchorGap = 16, edgePadding = 16 }: AnchoredPositionOptions = {}
): AnchoredPosition | null {
	const [pos, setPos] = useState<AnchoredPosition | null>(null);

	useLayoutEffect(() => {
		if (!open || !anchorEl) return;
		const update = () => {
			const rect = anchorEl.getBoundingClientRect();
			// Measure the actual rendered width so a retheme of the panel width stays
			// in sync when clamping to the viewport.
			const panelWidth = panelRef.current?.offsetWidth ?? window.innerWidth - edgePadding * 2;
			const maxLeft = window.innerWidth - edgePadding - panelWidth;
			setPos({
				left: Math.round(Math.max(edgePadding, Math.min(rect.left, maxLeft))),
				bottom: Math.round(window.innerHeight - rect.top + anchorGap)
			});
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [open, anchorEl, panelRef, anchorGap, edgePadding]);

	// Derived rather than reset in the effect; a stale pos is re-measured before paint on reopen.
	return open && anchorEl ? pos : null;
}
