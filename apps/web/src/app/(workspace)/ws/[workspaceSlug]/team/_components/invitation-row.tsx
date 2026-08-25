'use client'

import { useTransition } from 'react'
import { Clock, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface Props {
  invitation: {
    id: string
    email: string
    role: string
    expiresAt: Date
  }
  workspaceId: string
  cancelInvitation: (workspaceId: string, invitationId: string) => Promise<void>
}

const ROLE_LABELS: Record<string, string> = {
  OWNER:  'Owner',
  ADMIN:  'Admin',
  MEMBER: 'Member',
}

export function InvitationRow({ invitation, workspaceId, cancelInvitation }: Props) {
  const [isPending, startTransition] = useTransition()

  const isExpired = invitation.expiresAt < new Date()
  const initials  = invitation.email.charAt(0).toUpperCase()

  function handleCancel() {
    startTransition(() => cancelInvitation(workspaceId, invitation.id))
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 opacity-70">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{invitation.email}</p>
          <Badge variant={isExpired ? 'destructive' : 'warning'} className="text-xs shrink-0">
            {isExpired ? 'Expired' : 'Pending'}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {isExpired
            ? 'Invitation expired'
            : `Expires ${invitation.expiresAt.toLocaleDateString()}`}
        </div>
      </div>

      <Badge variant="outline" className="hidden sm:flex shrink-0">
        {ROLE_LABELS[invitation.role] ?? invitation.role}
      </Badge>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleCancel}
        disabled={isPending}
        title="Cancel invitation"
      >
        {isPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <X className="h-4 w-4" />}
      </Button>
    </div>
  )
}
