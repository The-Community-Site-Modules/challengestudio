'use client'

import { useTransition } from 'react'
import { MoreHorizontal, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  member: {
    id: string
    profileId: string
    role: string
    profile: { fullName: string | null; email: string; avatarUrl: string | null }
  }
  workspaceId: string
  currentUserId: string
  isCurrentUserOwner: boolean
  removeMember: (workspaceId: string, memberId: string) => Promise<void>
  updateRole:   (workspaceId: string, memberId: string, formData: FormData) => Promise<void>
}

const ROLE_LABELS: Record<string, string> = {
  OWNER:  'Owner',
  ADMIN:  'Admin',
  MEMBER: 'Member',
}

export function MemberRow({
  member, workspaceId, currentUserId, isCurrentUserOwner,
  removeMember, updateRole,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const isSelf      = member.profileId === currentUserId
  const isOwner     = member.role === 'OWNER'
  const canManage   = isCurrentUserOwner && !isSelf
  const initials    = (member.profile.fullName ?? member.profile.email)
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  function handleRemove() {
    startTransition(() => removeMember(workspaceId, member.id))
  }

  function handleRoleChange(newRole: string) {
    const fd = new FormData()
    fd.set('role', newRole)
    startTransition(() => updateRole(workspaceId, member.id, fd))
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {isPending && (
        <Loader2 className="absolute right-4 top-4 h-3 w-3 animate-spin text-muted-foreground" />
      )}

      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={member.profile.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.profile.fullName ?? member.profile.email}
          {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
      </div>

      <Badge variant="outline" className="hidden sm:flex shrink-0">
        {ROLE_LABELS[member.role] ?? member.role}
      </Badge>

      {(canManage || isSelf) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage && !isOwner && (
              <>
                {member.role !== 'ADMIN' && (
                  <DropdownMenuItem onClick={() => handleRoleChange('ADMIN')}>
                    Make Admin
                  </DropdownMenuItem>
                )}
                {member.role !== 'MEMBER' && (
                  <DropdownMenuItem onClick={() => handleRoleChange('MEMBER')}>
                    Make Member
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              {isSelf ? 'Leave workspace' : 'Remove member'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
