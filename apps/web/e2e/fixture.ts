/**
 * The E2E fixture: two tenants, seeded and torn down around the suite.
 *
 * Until now every browser check in this project was a throwaway script in a
 * scratch directory, which meant the checks were as good as whoever remembered
 * to run them. This is the same work, kept.
 *
 * Two tenants exist on purpose. One is enough to test that features work; two
 * are needed to test that they stay apart, and the isolation spec is the part
 * of this suite that guards the boundary Prisma does not (it connects as the
 * table owner, so row-level security does not apply to anything the app does).
 *
 * Every id is prefixed `e2e_` and every address is `@e2e.invalid`, so teardown
 * can be exact and can never touch real data.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

export const PASSWORD = 'E2e-Fixture-Pass!1'

/** Everything the specs need to know about what was seeded. */
export const FIXTURE = {
  owner:  { id: 'e2e00000-0000-4000-8000-000000000001', email: 'owner@e2e.invalid',  name: 'Olive Owner' },
  admin:  { id: 'e2e00000-0000-4000-8000-000000000002', email: 'admin@e2e.invalid',  name: 'Adam Admin' },
  member: { id: 'e2e00000-0000-4000-8000-000000000003', email: 'member@e2e.invalid', name: 'Mia Member' },
  /** The other tenant. Owns nothing in the first workspace. */
  rival:  { id: 'e2e00000-0000-4000-8000-000000000004', email: 'rival@e2e.invalid',  name: 'Rita Rival' },

  participants: [
    { id: 'e2e00000-0000-4000-8000-000000000011', email: 'ada@e2e.invalid',   name: 'Ada Participant' },
    { id: 'e2e00000-0000-4000-8000-000000000012', email: 'grace@e2e.invalid', name: 'Grace Participant' },
    { id: 'e2e00000-0000-4000-8000-000000000013', email: 'alan@e2e.invalid',  name: 'Alan Participant' },
  ],

  workspace:      { id: 'e2e_ws',       slug: 'e2e-studio',  name: 'E2E Studio' },
  rivalWorkspace: { id: 'e2e_ws_rival', slug: 'e2e-rival',   name: 'E2E Rival' },

  challenge:      { id: 'e2e_ch',       slug: 'e2e-challenge', title: 'E2E Momentum Challenge' },
  rivalChallenge: { id: 'e2e_ch_rival', slug: 'e2e-rival-challenge', title: 'E2E Rival Challenge' },

  steps: [
    { id: 'e2e_st_0', title: 'Orientation' },
    { id: 'e2e_st_1', title: 'Day 1 — Your Big Idea' },
    { id: 'e2e_st_2', title: 'Day 2 — Know Your Buyer' },
  ],

  /** Ada's private answer. Nobody without submission.view_private may read it. */
  privateAnswer: 'PRIVATE-REFLECTION-DO-NOT-LEAK',
  publicAnswer:  'A public answer anyone on the team may read',

  session: { id: 'e2e_ls', title: 'E2E Kickoff Call' },
  offer:   { id: 'e2e_offer', headline: 'E2E next step' },
} as const

export type Role = 'owner' | 'admin' | 'member' | 'rival' | 'grace' | 'alan'

/** Where one role's signed-in cookies are kept between global setup and the specs. */
export function storagePath(role: Role): string {
  return path.join(process.cwd(), 'e2e', '.auth', `${role}.json`)
}

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

function connectionString(): string {
  const env = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error('e2e: DATABASE_URL missing from apps/web/.env.local')
  return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')
}

async function connect(): Promise<Client> {
  const client = new Client({ connectionString: connectionString() })
  await client.connect()
  return client
}

/**
 * Create a Supabase auth user that can actually sign in.
 *
 * The empty strings are not decoration: GoTrue scans those varchar columns
 * into non-nullable Go strings, and a NULL in any of them fails sign-in with
 * "Database error querying schema" — which looks like a broken login page
 * rather than a broken fixture.
 */
async function authUser(c: Client, id: string, email: string, name: string) {
  await c.query(
    `insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
       $2, crypt($3, gen_salt('bf')), now(), now(), now(),
       '{"provider":"email","providers":["email"]}', '{}',
       '', '', '', '', '', '', '', '')
     on conflict (id) do nothing`,
    [id, email, PASSWORD]
  )
  await c.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
     values (gen_random_uuid(), $1::uuid, $2::text, jsonb_build_object('sub', $2::text, 'email', $3::text), 'email', now(), now(), now())
     on conflict do nothing`,
    [id, id, email]
  )
  // A Supabase trigger may have created the profile already with no name, so
  // this updates rather than doing nothing on conflict.
  await c.query(
    `insert into profiles (id, email, full_name, created_at, updated_at)
     values ($1, $2, $3, now(), now())
     on conflict (id) do update set full_name = excluded.full_name`,
    [id, email, name]
  )
}

export async function seed() {
  const c = await connect()
  try {
    await teardownWith(c)

    const f = FIXTURE
    for (const p of [f.owner, f.admin, f.member, f.rival, ...f.participants]) {
      await authUser(c, p.id, p.email, p.name)
    }

    // ── Two workspaces ──────────────────────────────────────────────────────
    for (const [ws, owner] of [[f.workspace, f.owner], [f.rivalWorkspace, f.rival]] as const) {
      await c.query(
        `insert into workspaces (id, slug, name, owner_id, timezone, created_at, updated_at)
         values ($1, $2, $3, $4, 'UTC', now(), now())`,
        [ws.id, ws.slug, ws.name, owner.id]
      )
      await c.query(
        `insert into workspace_members (id, workspace_id, profile_id, role, joined_at, created_at)
         values ($1, $2, $3, 'OWNER', now(), now())`,
        [`${ws.id}_owner`, ws.id, owner.id]
      )
    }
    for (const [person, role] of [[f.admin, 'ADMIN'], [f.member, 'MEMBER']] as const) {
      await c.query(
        `insert into workspace_members (id, workspace_id, profile_id, role, joined_at, created_at)
         values ($1, $2, $3, $4, now(), now())`,
        [`${f.workspace.id}_${role}`, f.workspace.id, person.id, role]
      )
    }

    // ── Two challenges ──────────────────────────────────────────────────────
    for (const [ch, ws] of [[f.challenge, f.workspace], [f.rivalChallenge, f.rivalWorkspace]] as const) {
      await c.query(
        `insert into challenges
           (id, workspace_id, slug, title, description, promise, mode, status,
            starts_at, ends_at, timezone, is_public, requires_approval, created_at, updated_at)
         values ($1, $2, $3, $4, 'An end to end fixture.', 'Finish something small.',
            'COHORT', 'ACTIVE', $5, $6, 'UTC', true, false, now(), now())`,
        [ch.id, ws.id, ch.slug, ch.title, days(4), days(-3)]
      )
    }

    // Steps, on the first challenge only.
    for (const [i, step] of f.steps.entries()) {
      await c.query(
        `insert into challenge_steps
           (id, challenge_id, title, "order", step_type, is_required, is_published, created_at, updated_at)
         values ($1, $2, $3, $4, 'day', true, true, now(), now())`,
        [step.id, f.challenge.id, step.title, i]
      )
      await c.query(
        `insert into content_blocks (id, step_id, type, "order", data, created_at, updated_at)
         values ($1, $2, 'HEADING', 0, $3, now(), now())`,
        [`${step.id}_b`, step.id, JSON.stringify({ text: step.title })]
      )
    }
    // One step on the rival's challenge, so isolation has a target to try.
    await c.query(
      `insert into challenge_steps
         (id, challenge_id, title, "order", step_type, is_required, is_published, created_at, updated_at)
       values ('e2e_st_rival', $1, 'Rival Day 1', 0, 'day', true, true, now(), now())`,
      [f.rivalChallenge.id]
    )

    // ── Participants at three different places ──────────────────────────────
    const plan = [
      { person: f.participants[0], status: 'COMPLETED', steps: [0, 1, 2], quietDays: 0 },
      { person: f.participants[1], status: 'ACTIVE',    steps: [0],       quietDays: 0 },
      { person: f.participants[2], status: 'ACTIVE',    steps: [],        quietDays: 4 },
    ]
    for (const [i, row] of plan.entries()) {
      const pid = `e2e_pt_${i}`
      await c.query(
        `insert into participants (id, challenge_id, profile_id, status, registered_at, completed_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [pid, f.challenge.id, row.person!.id, row.status, days(4),
         row.status === 'COMPLETED' ? days(0) : null]
      )
      for (const s of row.steps) {
        const isPrivate = i === 0 && s === 2
        await c.query(
          `insert into submissions (id, participant_id, step_id, data, is_private, submitted_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, now())`,
          [`e2e_sb_${i}_${s}`, pid, f.steps[s]!.id,
           JSON.stringify({ text: isPrivate ? f.privateAnswer : f.publicAnswer }),
           isPrivate, days(row.quietDays)]
        )
        await c.query(
          `insert into points_events
             (id, workspace_id, challenge_id, participant_id, action, points, idempotency_key, created_at)
           values ($1, $2, $3, $4, 'step_completed', 50, $5, now())`,
          [`e2e_pe_${i}_${s}`, f.workspace.id, f.challenge.id, pid, `${pid}:step_completed:${f.steps[s]!.id}`]
        )
      }
    }

    // Ada posts; Grace comments. Enough for the community metrics to be non-zero.
    await c.query(
      `insert into feed_posts (id, challenge_id, participant_id, body, created_at, updated_at)
       values ('e2e_fp', $1, 'e2e_pt_0', 'Day one done.', $2, now())`,
      [f.challenge.id, days(1)]
    )
    await c.query(
      `insert into feed_comments (id, post_id, participant_id, body, created_at)
       values ('e2e_fc', 'e2e_fp', 'e2e_pt_1', 'Nice one.', $1)`,
      [days(1)]
    )
    await c.query(
      `insert into badge_awards (id, challenge_id, participant_id, badge_key, awarded_at)
       values ('e2e_ba', $1, 'e2e_pt_0', 'first_step', now())`,
      [f.challenge.id]
    )

    // ── A session ahead, and an offer with a click ──────────────────────────
    await c.query(
      `insert into live_sessions
         (id, challenge_id, title, starts_at, duration_minutes, host_name, join_url, created_at, updated_at)
       values ($1, $2, $3, $4, 45, 'Olive Owner', 'https://meet.e2e.invalid/room', now(), now())`,
      [f.session.id, f.challenge.id, f.session.title, days(-2)]
    )
    await c.query(
      `insert into offers (id, challenge_id, enabled, headline, cta_label, cta_url, created_at, updated_at)
       values ($1, $2, true, $3, 'Join', 'https://example.com/next', now(), now())`,
      [f.offer.id, f.challenge.id, f.offer.headline]
    )
    await c.query(
      `insert into offer_clicks (id, offer_id, participant_id, clicked_at)
       values ('e2e_oc', $1, 'e2e_pt_0', now())`,
      [f.offer.id]
    )
  } finally {
    await c.end()
  }
}

async function teardownWith(c: Client) {
  // Workspaces cascade to challenges, steps, blocks, participants, submissions,
  // feed, points, badges, sessions and the offer.
  await c.query(`delete from audit_logs where workspace_id like 'e2e_%'`)
  await c.query(`delete from workspaces where id like 'e2e_%'`)
  await c.query(`delete from profiles where email like '%@e2e.invalid'`)
  await c.query(`delete from auth.users where email like '%@e2e.invalid'`)
}

export async function teardown() {
  const c = await connect()
  try {
    await teardownWith(c)
  } finally {
    await c.end()
  }
}
