import type { JPSApiError, JPSCurrentResponse, JPSErrorCode, JPSPlayResponse } from "./JPSTypes.js";

/**
 * JPSError — thrown by JPSClient when the server returns a non-2xx response.
 *
 * Branch on err.code (stable machine code) not err.message.
 * See JPSErrorCode for all codes our game should handle.
 */
export class JPSError extends Error {
	public readonly code: JPSErrorCode | string;
	public readonly status: number;
	public readonly data: JPSApiError;

	constructor(data: JPSApiError) {
		super(data.code);
		this.code = data.code;
		this.status = data.status;
		this.data = data;
	}
}

/**
 * JPSClient — HTTP transport for the JPS RGS API.
 *
 * Handles only the network layer:
 *   - Attaches the session token to every request
 *   - Throws JPSError on non-2xx responses
 *   - Returns parsed JSON
 *
 * Does NOT know about our game's data types — that's JPSRGSAdapter's job.
 *
 * Session token comes from the URL query param ?sessionToken=
 * Base URL comes from the VITE_RGS_URL environment variable.
 */
export class JPSClient {
	private readonly headers: Record<string, string>;

	constructor(
		private readonly baseUrl: string,
		sessionToken: string
	) {
		this.headers = {
			Authorization: `Bearer ${sessionToken}`,
			"Content-Type": "application/json"
		};
	}

	/**
	 * POST /game/play — the main endpoint.
	 * Used for start, every next call, and cashout.
	 */
	public async play(message: unknown): Promise<JPSPlayResponse> {
		return this.post<JPSPlayResponse>("/game/play", { message });
	}

	/**
	 * POST /game/current — called on game load.
	 * Returns current balance and any in-progress round.
	 */
	public async current(): Promise<JPSCurrentResponse> {
		return this.post<JPSCurrentResponse>("/game/current", {});
	}

	// ── Private ────────────────────────────────────────────────────────────────

	private async post<T>(path: string, body: unknown): Promise<T> {
		const response = await fetch(this.baseUrl + path, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			// Try to parse error body — fall back to a minimal error if body isn't JSON
			const errorData = (await response.json().catch((): JPSApiError => ({
				status: response.status,
				code: "unknown"
			}))) as JPSApiError;
			throw new JPSError(errorData);
		}

		return response.json() as Promise<T>;
	}
}

/**
 * Read the session token from the URL.
 * JPS launches games with ?sessionToken=<token> in the URL.
 */
export function getSessionToken(): string {
	return new URLSearchParams(globalThis.location?.search ?? "").get("sessionToken") ?? "";
}
