import { FillGradient, Text } from "pixi.js";

export function createSilverGradientFill(): FillGradient {
	return new FillGradient({
		type: "linear",
		start: { x: 0, y: 1 },
		end: { x: 0, y: 0 },
		colorStops: [
			{ offset: 0.1465, color: 0xffffff },
			{ offset: 0.5824, color: 0xcad8e3 },
			{ offset: 0.5842, color: 0xffffff },
			{ offset: 0.9972, color: 0x7b93a6 }
		]
	});
}

export interface StyledTextOptions {
	content: string;
	size: number;
	color?: number;
	bold?: boolean;
	stroke?: boolean;
	strokeColor?: number;
	strokeWidth?: number;
	silverGradient?: boolean;
	dropShadow?: boolean;
	rotationDeg?: number;
	lineHeight?: number;
}

export function makeStyledText(options: StyledTextOptions): Text {
	const {
		content,
		size,
		color = 0xffffff,
		bold = false,
		stroke = false,
		strokeColor,
		strokeWidth,
		silverGradient = false,
		dropShadow = silverGradient,
		rotationDeg = silverGradient ? -1 : 0,
		lineHeight = silverGradient ? 137 : undefined
	} = options;

	const t = new Text({
		text: content,
		style: {
			fontFamily: "Titan One",
			fontSize: size,
			fill: silverGradient ? createSilverGradientFill() : color,
			fontWeight: bold ? "bold" : "normal",
			align: "center",
			...(lineHeight != null && { lineHeight }),
			...(stroke && {
				stroke: {
					color: strokeColor ?? (silverGradient ? 0x080808 : 0x000000),
					width: strokeWidth ?? (silverGradient ? 8 : size * 0.12)
				}
			}),
			...(dropShadow && {
				dropShadow: {
					color: 0x080808,
					alpha: 1,
					angle: Math.PI / 2,
					distance: 8.81927,
					blur: 0
				}
			})
		}
	});
	t.anchor.set(0.5);
	if (rotationDeg) t.rotation = (rotationDeg * Math.PI) / 180;
	return t;
}
