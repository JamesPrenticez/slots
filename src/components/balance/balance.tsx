import styled from "styled-components";

import { useGameStore } from "@stores";
import { fmt } from "@ui/helpers";

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
`;

const Label = styled.span`
	color: var(--color-accent);
	font-family: "Enduro Narrow";
	font-size: 16px;
	font-style: normal;
	font-weight: 700;
	letter-spacing: 0.02em;
	line-height: 120%;
	text-transform: uppercase;
`;

const Value = styled.span`
	color: var(--color-text-value);
	font-family: "Enduro";
	font-size: 24px;
	font-style: normal;
	font-weight: 850;
	letter-spacing: 0.02em;
	line-height: 120%;
	text-transform: uppercase;
`;

const Balance = () => {
	const balance = useGameStore(s => s.balance);
	return (
		<Wrapper>
			<Label>BALANCE</Label>
			<Value>{fmt(balance)}</Value>
		</Wrapper>
	);
};

export { Balance };
