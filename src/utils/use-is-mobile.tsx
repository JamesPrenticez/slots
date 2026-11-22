import { useEffect, useState } from "react";

// Mobile-first breakpoints: unprefixed styles across the app should target
// the smallest/most constrained viewport (a narrow phone). `breakpoint.*`
// queries progressively ADD/override styles as more space becomes
// available - the opposite cascade direction from the old max-width
// "device" queries this replaces.
const BREAKPOINT_PX = {
	tablet: "768px",
	desktop: "1024px"
};

// A landscape phone is routinely *wider* than 768px (an iPhone in landscape
// is ~812px) but stays short (<=600px tall) — so width alone can't tell a
// landscape phone apart from a landscape tablet/desktop. Gating `tablet`/
// `desktop` on height too means a short-but-wide landscape phone still falls
// through to the mobile base styles, while an actually roomy landscape
// viewport (tablet+) gets promoted. Mirrors the old device.mobileLandscape's
// `max-height: 600px` half of its condition, just inverted.
const MIN_ROOMY_HEIGHT = "601px";

export const breakpoint = {
	tablet: `(min-width: ${BREAKPOINT_PX.tablet}) and (min-height: ${MIN_ROOMY_HEIGHT})`,
	desktop: `(min-width: ${BREAKPOINT_PX.desktop}) and (min-height: ${MIN_ROOMY_HEIGHT})`,
	landscape: `(orientation: landscape)`,
	portrait: `(orientation: portrait)`,
	// Bottom bar only: tablet portrait keeps the phone-portrait bar layout.
	tabletLandscape: `(min-width: ${BREAKPOINT_PX.tablet}) and (min-height: ${MIN_ROOMY_HEIGHT}) and (orientation: landscape)`,
	// Summary/cash-out modals: tablet portrait picks up the desktop design.
	landscapeOrTablet: `(orientation: landscape), (min-width: ${BREAKPOINT_PX.tablet}) and (min-height: ${MIN_ROOMY_HEIGHT})`,
	desktopOrTabletPortrait: `(min-width: ${BREAKPOINT_PX.desktop}) and (min-height: ${MIN_ROOMY_HEIGHT}), (min-width: ${BREAKPOINT_PX.tablet}) and (min-height: ${MIN_ROOMY_HEIGHT}) and (orientation: portrait)`
};

// JS-side "is this viewport cramped" detection. This is a plain boolean
// check (not a CSS cascade), so it stays width/height-based regardless of
// which direction the CSS media queries read in.
const MOBILE_MAX_WIDTH = `(max-width: ${BREAKPOINT_PX.tablet})`;
const SHORT_HEIGHT = "(max-height: 600px)";

export const isPortrait = () => window.matchMedia("(orientation: portrait)").matches;

export const isLandscape = () => window.matchMedia("(orientation: landscape)").matches;

export type isMobileType = undefined | { landscape: boolean; portrait: boolean };

const getMobileState = (): isMobileType => {
	const mobile = window.matchMedia(`${MOBILE_MAX_WIDTH}, ${SHORT_HEIGHT}`).matches;
	if (!mobile) return undefined;
	return { landscape: isLandscape(), portrait: isPortrait() };
};

export const useIsMobile = (): isMobileType => {
	const [state, setState] = useState<isMobileType>(getMobileState);

	useEffect(() => {
		const width = window.matchMedia(MOBILE_MAX_WIDTH);
		const height = window.matchMedia(SHORT_HEIGHT);
		const orientation = window.matchMedia("(orientation: portrait)");

		const update = () => setState(getMobileState());

		width.addEventListener("change", update);
		height.addEventListener("change", update);
		orientation.addEventListener("change", update);

		return () => {
			width.removeEventListener("change", update);
			height.removeEventListener("change", update);
			orientation.removeEventListener("change", update);
		};
	}, []);

	return state;
};
