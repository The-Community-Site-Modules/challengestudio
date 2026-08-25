'use client'

import Link from 'next/link'
import { Users, Calendar, MoreHorizontal, Eye, Edit, Archive, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type ChallengeStatus = 'draft' | 'scheduled' | 'published' | 'closed' | 'completed' | 'archived'
type ChallengeMode = 'marketing' | 'evergreen' | 'cohort' | 'internal' | 'paid' | 'team' | 'habit' | 'milestone'

interface ChallengeCardProps {
  id: string
  slug: string
  title: string
  promise: string
  mode: ChallengeMode
  status: ChallengeStatus
  participantCount: number
  completionRate?: number
  startsAt?: string
  workspaceSlug: string
}

const statusConfig: Record<ChallengeStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' }> = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  published: { label: 'Live',      variant: 'success' },
  closed:    { label: 'Closed',    variant: 'outline' },
  completed: { label: 'Completed', variant: 'outline' },
  archived:  { label: 'Archived',  variant: 'secondary' },
}

const modeLabels: Record<ChallengeMode, string> = {
  marketing: 'Marketing',
  evergreen: 'Evergreen',
  cohort:    'Cohort',
  internal:  'Internal',
  paid:      'Paid',
  team:      'Team',
  habit:     'Habit',
  milestone: 'Milestone',
}

export function ChallengeCard({
  slug, title, promise, mode, status,
  participantCount, completionRate, startsAt, workspaceSlug,
}: ChallengeCardProps) {
  const { label, variant } = statusConfig[status]
  const baseHref = `/ws/${workspaceSlug}/challenges/${slug}`

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={variant}>{label}</Badge>
          <Badge variant="outline" className="text-xs">{modeLabels[mode]}</Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`${baseHref}/overview`}>
                <Eye className="mr-2 h-4 w-4" /> View overview
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${baseHref}/builder`}>
                <Edit className="mr-2 h-4 w-4" /> Edit builder
              </Link>
            </DropdownMenuItem>
            {status === 'published' && (
              <DropdownMenuItem asChild>
                <Link href={`/c/${slug}`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" /> View public page
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground">
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title & promise */}
      <Link href={`${baseHref}/overview`} className="mt-3 block">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{promise}</p>
      </Link>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{participantCount.toLocaleString()} participants</span>
        </div>
        {completionRate !== undefined && (
          <div className="flex items-center gap-1">
            <div className={cn(
              'h-2 w-2 rounded-full',
              completionRate >= 50 ? 'bg-green-500' : completionRate >= 25 ? 'bg-yellow-500' : 'bg-muted-foreground'
            )} />
            <span>{completionRate}% completion</span>
          </div>
        )}
        {startsAt && (
          <div className="ml-auto flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{startsAt}</span>
          </div>
        )}
      </div>
    </div>
  )
}
