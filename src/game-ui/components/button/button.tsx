import { type ButtonHTMLAttributes, forwardRef } from "react";
import styled from "styled-components";

const StyledButton = styled.button`
	/* primary — the default */
	align-items: center;
	background: var(--ui-color-primary);
	border: none;
	border-radius: 0.8rem;
	box-shadow: var(--ui-button-shadow);
	color: var(--ui-color-black);
	cursor: pointer;
	display: inline-flex;
	flex-shrink: 0;
	font-family: var(--ui-font-primary);
	font-size: 1.6rem;
	font-weight: 600;
	justify-content: center;
	padding: 1.2rem 2rem;
	transition: filter 0.15s;

	&:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	&:active:not(:disabled) {
		filter: brightness(0.9);
	}

	&:focus-visible {
		outline: 2px solid var(--ui-color-primary);
		outline-offset: 2px;
	}

	&:disabled {
		background: var(--ui-button-disabled-bg-color);
		color: var(--ui-color-grey);
		cursor: not-allowed;
		filter: none;
	}

	&[data-variant="secondary"] {
		background: var(--ui-button-bg-color);
		border: 1px solid var(--ui-border-color);
		color: var(--ui-color-body);
	}

	&[data-variant="flat"] {
		background: var(--ui-button-bg-color);
		border: none;
		box-shadow: none;
		color: var(--ui-color-body);
	}

	&[data-variant="negative"] {
		background: var(--ui-color-error-red);
		color: var(--ui-color-white);
	}
`;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "negative" | "flat";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = "primary", ...props },
	ref
) {
	return <StyledButton ref={ref} type="button" data-variant={variant === "primary" ? undefined : variant} {...props} />;
});
