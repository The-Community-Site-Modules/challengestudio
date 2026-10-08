/**
 * How long a failed send keeps being retried before it is given up on.
 *
 * Shared by dispatch (which reclaims a failed row) and the scheduled sweep
 * (which treats an older failure as settled). Without a limit, a permanent
 * failure — a bad address, no provider configured — was retried by every
 * hourly sweep forever and took a slot in each sweep's budget.
 */
export const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000
