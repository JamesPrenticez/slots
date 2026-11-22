import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])'
].join(",");

/**
 * Shared modal-dialog behaviour for any overlay component:
 *  - locks body scroll while open
 *  - moves focus into the dialog on open and restores it to the previously
 *    focused element on close
 *  - traps Tab / Shift+Tab focus within the dialog
 *
 * Attach the returned ref to the dialog's content element (the focus boundary).
 */
export function useModalDialog<T extends HTMLElement>(open: boolean) {
	const ref = useRef<T>(null);

	useEffect(() => {
		if (!open) return;

		const previouslyFocused = document.activeElement as HTMLElement | null;

		// Lock body scroll, restoring the prior value on close.
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		// Move focus into the dialog (first focusable element, else the container).
		const container = ref.current;
		const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
		(firstFocusable ?? container)?.focus();

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== "Tab" || !container) return;
			const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
			if (focusable.length === 0) {
				// Nothing focusable inside — keep focus on the container.
				e.preventDefault();
				container.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			if (e.shiftKey && (active === first || active === container)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && active === last) {
				e.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = prevOverflow;
			previouslyFocused?.focus?.();
		};
	}, [open]);

	return ref;
}
