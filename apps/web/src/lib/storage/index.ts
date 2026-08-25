// File storage abstraction — Cloudflare R2 (S3-compatible)
// Upload flow: Server Action generates presigned PUT URL →
//              Browser uploads directly to R2 →
//              Server confirms and writes uploads record
//
// Namespace pattern: {workspaceId}/{challengeId}/{enrollmentId}/{uploadId}/{filename}
// All access via presigned GET URLs (never direct public URLs for private content)
//
// TODO: Activate in Milestone 9 once R2 credentials provided (OD-2)

export async function generatePresignedUploadUrl(
  _key: string,
  _mimeType: string,
  _maxSizeBytes: number
): Promise<{ uploadUrl: string; key: string }> {
  throw new Error('Storage not configured — awaiting R2 credentials (OD-2)')
}

export async function generatePresignedDownloadUrl(
  _key: string,
  _expiresInSeconds: number
): Promise<string> {
  throw new Error('Storage not configured — awaiting R2 credentials (OD-2)')
}
