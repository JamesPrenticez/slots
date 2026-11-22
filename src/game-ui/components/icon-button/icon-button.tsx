import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import styled from "styled-components";

const StyledButton = styled.button`
	align-items: center;
	background: var(--ui-black-transparent);
	border: 1px solid transparent;
	border-radius: 0.8rem;
	color: var(--ui-color-white);
	cursor: pointer;
	display: flex;
	flex-shrink: 0;
	justify-content: center;
	margin: 0;
	padding: calc(1rem - 1px);
	transition:
		background 0.15s,
		border-color 0.15s,
		color 0.15s;

	:where(svg) {
		height: 2.8rem;
		width: 2.8rem;
	}

	&:hover:not(:disabled) {
		border-color: var(--ui-color-primary);
	}

	&[aria-pressed="true"] {
		color: var(--ui-color-primary);
	}

	&:focus-visible {
		outline: 1px solid var(--ui-color-focus);
		outline-offset: -1px;
	}

	&:disabled {
		cursor: default;
	}

	&:disabled > * {
		opacity: 0.7;
	}
`;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/** The icon, drawn in `currentColor`. An `<svg>` is sized to 2.8rem. */
	children: ReactNode;
	/** Toggled-on state: renders `aria-pressed` and colours the icon primary. */
	active?: boolean;
	/** Accessible name — the button has no visible text. */
	"aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ active, ...props }, ref) => (
	<StyledButton ref={ref} type="button" aria-pressed={active} {...props} />
));
