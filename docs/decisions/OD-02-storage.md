# OD-02: File Storage Provider

**Status:** Pending owner decision
**Blocking:** Milestone 9

## Decision needed
Which object storage provider for participant uploads (workbooks, images, evidence)?

## Recommendation: Cloudflare R2

**Why R2:**
- Zero egress fees — participant file downloads don't accumulate cost
- S3-compatible API — uses `@aws-sdk/client-s3` (no vendor-specific SDK)
- Presigned PUT/GET URLs supported
- Works with Vercel deployments without special config

**Alternatives:**
| Provider | Pros | Cons |
|---|---|---|
| Cloudflare R2 | No egress fees, S3-compatible | Cloudflare account needed |
| AWS S3 | Industry standard | Egress fees at scale |
| Vercel Blob | Simplest setup | Less control, smaller size limits |

## Action required
Reply with: **R2** or specify alternative.
Once confirmed, provide: Account ID, Access Key ID, Secret Access Key, Bucket Name.
