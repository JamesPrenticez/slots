// ─── Helpers ──────────────────────────────────────────────────────────────────
export function fmt(amount: number): string {
	return (amount / 100).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2
	});
}
