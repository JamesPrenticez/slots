import { useEffect, useRef } from "react";

import { FanfareBaseSlotApplication } from "../fanfarebaseslot/FanfareBaseSlotApplication.js";

interface Props {
	background?: number;
	onReady: () => void;
}

export function PixiCanvas({ background = 0x000000, onReady }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const fanfareBaseSlotApp = new FanfareBaseSlotApplication();
		fanfareBaseSlotApp
			.init(container, { background })
			.then(() => onReady())
			.catch(console.error);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
