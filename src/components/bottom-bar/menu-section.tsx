import MenuSvg from "@assets/menu.svg?react";

import { useModalStore } from "@stores";

import { SideTrigger } from "./side-trigger";

const MenuSection = () => {
	const openModal = useModalStore(s => s.openModal);
	return (
		<SideTrigger onClick={e => openModal("menu", e.currentTarget)}>
			<MenuSvg />
		</SideTrigger>
	);
};
export { MenuSection };
