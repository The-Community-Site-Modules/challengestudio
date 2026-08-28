'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, Layers, Users, UserRound, Check, ChevronDown, Plus } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface WorkspaceCardData {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: string
  challenges: number
  participants: number
  members: number
  lastActivity: string
  joinedAt: string
}

interface Props {
  workspaces: WorkspaceCardData[]
  onCreate: React.ReactNode
}

const SORTS = [
  { key: 'recent',  label: 'Recently active' },
  { key: 'name',    label: 'Name' },
  { key: 'created', label: 'Recently created' },
] as const
type SortKey = (typeof SORTS)[number]['key']

// Four restrained tints, keyed by position so a workspace keeps its mark
// between visits. Identity comes from the name and address; this is only a
// visual anchor for scanning a grid.
const MARKS = [
  'bg-indigo-50 text-indigo-600 ring-indigo-100',
  'bg-teal-50 text-teal-600 ring-teal-100',
  'bg-blue-50 text-blue-600 ring-blue-100',
  'bg-orange-50 text-orange-600 ring-orange-100',
]

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner', ADMIN: 'Admin', MEMBER: 'Member',
}

function relativeDay(iso: string) {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Metric({ icon: Icon, value, singular, plural }: {
  icon: typeof Layers; value: number; singular: string; plural: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="tabular-nums text-slate-600">{value}</span>
      <span className="text-slate-500">{value === 1 ? singular : plural}</span>
    </span>
  )
}

export function WorkspaceBrowser({ workspaces, onCreate }: Props) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Match the address too — several workspaces can share a name, and the slug
    // is then the only thing that tells them apart.
    const filtered = q
      ? workspaces.filter((w) =>
          w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q))
      : workspaces

    return [...filtered].sort((a, b) => {
      if (sort === 'name')    return a.name.localeCompare(b.name)
      if (sort === 'created') return b.joinedAt.localeCompare(a.joinedAt)
      return b.lastActivity.localeCompare(a.lastActivity)
    })
  }, [workspaces, query, sort])

  const sortLabel = SORTS.find((s) => s.key === sort)!.label

  return (
    <section aria-labelledby="your-workspaces">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="your-workspaces" className="text-xl font-semibold tracking-tight text-slate-900">
            Your workspaces
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a workspace to manage challenges, participants, and your team.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspaces…"
              aria-label="Search workspaces"
              className="h-9 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-100">
              {sortLabel}
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SORTS.map((s) => (
                <DropdownMenuItem key={s.key} onSelect={() => setSort(s.key)} className="justify-between">
                  {s.label}
                  {sort === s.key && <Check className="h-4 w-4 text-indigo-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-900">No workspaces match “{query}”</p>
          <p className="mt-1 text-sm text-slate-500">Try a different name or address.</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((w, i) => (
            <li key={w.id}>
              <Link
                href={`/ws/${w.slug}`}
                className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_2px_12px_-4px_rgb(15_23_42/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  {w.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={w.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-100" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1',
                        MARKS[i % MARKS.length]
                      )}
                    >
                      {w.name.trim().charAt(0).toUpperCase() || 'W'}
                    </span>
                  )}
                  <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                    {ROLE_LABEL[w.role] ?? w.role}
                  </span>
                </div>

                <h3 className="mt-4 truncate text-[17px] font-semibold tracking-tight text-slate-900">
                  {w.name}
                </h3>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">/ws/{w.slug}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
                  <Metric icon={Layers}     value={w.challenges}   singular="Challenge"   plural="Challenges" />
                  <Metric icon={Users}      value={w.participants} singular="Participant" plural="Participants" />
                  <Metric icon={UserRound}  value={w.members}      singular="Member"      plural="Members" />
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-[13px]">
                  <span className="text-slate-500">Last activity {relativeDay(w.lastActivity)}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                    Open
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}

          {/* Only offered on the unfiltered list — a create tile sitting inside
              search results reads as a match. */}
          {query.trim() === '' && <li>{onCreate}</li>}
        </ul>
      )}
    </section>
  )
}

/** The dashed tile that opens the create dialog. */
export function CreateWorkspaceTile({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col items-start rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-left transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors group-hover:text-indigo-600 group-hover:ring-indigo-200">
        <Plus className="h-4 w-4" />
      </span>
      <span className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
        Create a new workspace
      </span>
      <span className="mt-1 text-[13px] leading-relaxed text-slate-500">
        Set up a dedicated space for your challenges, team, and participants.
      </span>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-medium text-indigo-600">
        Create workspace
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}
