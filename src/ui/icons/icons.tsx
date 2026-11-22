import type { ReactElement } from "react";
import AudioIcon from "@assets/icons/audio.svg?react";
import AudioMutedIcon from "@assets/icons/audio-muted.svg?react";
import AutoPlayIcon from "@assets/icons/autoplay.svg?react";
import BonusIcon from "@assets/icons/bonus.svg?react";
import InfinityIcon from "@assets/icons/infinity.svg?react";
import TurboIcon from "@assets/icons/turbo.svg?react";

export enum IconKeys {
	AudioIcon = "AudioIcon",
	AudioMutedIcon = "AudioMutedIcon",
	AutoPlayIcon = "AutoPlayIcon",
	BonusIcon = "BonusIcon",
	InfinityIcon = "InfinityIcon",
	TurboIcon = "TurboIcon"
}

export const ICONS: Record<IconKeys, ReactElement> = {
	AudioIcon: <AudioIcon />,
	AudioMutedIcon: <AudioMutedIcon />,
	AutoPlayIcon: <AutoPlayIcon />,
	BonusIcon: <BonusIcon />,
	InfinityIcon: <InfinityIcon />,
	TurboIcon: <TurboIcon className="icon-outline" />
};
