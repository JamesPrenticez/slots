import styled from "styled-components";

const Input = styled.input`
	-webkit-appearance: none;
	appearance: none;
	width: 160px;
	height: var(--slider-thumb-size);
	background: transparent;
	cursor: pointer;
	margin: 0;

	/* Track */
	&::-webkit-slider-runnable-track {
		height: var(--slider-height);
		border-radius: calc(var(--slider-height) / 2);
		background: linear-gradient(
			to right,
			var(--slider-fill-bg) var(--_pct, 0%),
			var(--slider-track-bg) var(--_pct, 0%)
		);
	}
	&::-moz-range-track {
		height: var(--slider-height);
		border-radius: calc(var(--slider-height) / 2);
		background: var(--slider-track-bg);
	}
	&::-moz-range-progress {
		height: var(--slider-height);
		border-radius: calc(var(--slider-height) / 2);
		background: var(--slider-fill-bg);
	}

	/* Thumb */
	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: var(--slider-thumb-size);
		height: var(--slider-thumb-size);
		margin-top: calc((var(--slider-height) - var(--slider-thumb-size)) / 2);
		border: none;
		border-radius: 50%;
		background: var(--slider-thumb-bg);
	}
	&::-moz-range-thumb {
		width: var(--slider-thumb-size);
		height: var(--slider-thumb-size);
		border: none;
		border-radius: 50%;
		background: var(--slider-thumb-bg);
	}
`;

interface SliderProps {
	/** Current value, 0–1. */
	value: number;
	/** Called with the new value, 0–1. */
	onChange: (value: number) => void;
	ariaLabel?: string;
}

const Slider = ({ value, onChange, ariaLabel }: SliderProps) => {
	const pct = `${Math.round(value * 100)}%`;
	return (
		<Input
			type="range"
			min={0}
			max={1}
			step={0.01}
			value={value}
			aria-label={ariaLabel}
			style={{ ["--_pct" as string]: pct }}
			onChange={e => onChange(Number(e.target.value))}
		/>
	);
};

export { Slider };
