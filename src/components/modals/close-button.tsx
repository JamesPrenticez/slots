import type { ButtonHTMLAttributes } from "react";
import styled from "styled-components";

const StyledButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: none;
	background: transparent;
	color: var(--modal-close-color);
	cursor: pointer;

	svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	&:hover,
	&:focus-visible {
		color: var(--modal-close-hover-color);
	}
`;

const CloseIcon = () => (
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<line x1="6" y1="6" x2="18" y2="18" />
		<line x1="18" y1="6" x2="6" y2="18" />
	</svg>
);

/**
 * Dismiss button rendering the standard ✕ icon. Sizing/positioning come from
 * the base styles here; wrap with `styled(CloseButton)` to override per modal.
 */
const CloseButton = ({ "aria-label": ariaLabel = "Close", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
	<StyledButton aria-label={ariaLabel} {...props}>
		<CloseIcon />
	</StyledButton>
);

export { CloseButton };
