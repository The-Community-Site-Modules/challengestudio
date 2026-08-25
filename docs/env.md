# Environment Variables — Challenge Studio

All variables are listed in `.env.example`. This document explains each one.

## Application
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Full public URL e.g. `https://challengestudio.com` |
| `NEXT_PUBLIC_APP_NAME` | Display name e.g. `Challenge Studio` |

## Database (OD-1: Neon)
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon connection — used by app serverless functions |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection — used by `drizzle-kit migrate` only |

## Authentication
| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | 32+ byte random string. Generate: `openssl rand -base64 32` |
| `AUTH_URL` | Same as `NEXT_PUBLIC_APP_URL` in most environments |

## Email (OD-3: Resend)
| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key from resend.com dashboard |
| `EMAIL_FROM_ADDRESS` | Sender address e.g. `hello@challengestudio.com` |
| `EMAIL_FROM_NAME` | Sender name e.g. `Challenge Studio` |

## File Storage (OD-2: Cloudflare R2)
| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API secret |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_URL` | Public-facing URL for the bucket |

## Background Jobs (OD-4: Inngest)
| Variable | Purpose |
|---|---|
| `INNGEST_EVENT_KEY` | Inngest event signing key |
| `INNGEST_SIGNING_KEY` | Inngest webhook signing key |

## Rate Limiting (Upstash Redis)
| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis auth token |

## Error Monitoring (Sentry)
| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Sentry project DSN (server-side) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (client-side, safe to expose) |
| `SENTRY_AUTH_TOKEN` | Used for source map uploads in CI only |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |

## Integration
| Variable | Purpose |
|---|---|
| `INTEGRATION_HMAC_SECRET` | HMAC-SHA256 secret shared with Community Site |
| `INTEGRATION_TOKEN_MAX_AGE_SECONDS` | Launch token TTL (default: `60`) |

## Platform
| Variable | Purpose |
|---|---|
| `PLATFORM_ADMIN_EMAIL` | Email used to bootstrap the platform owner account |
