'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Mail, KeyRound } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  initialName:      string
  initialAvatarUrl: string
  email:            string
  updateAction:         (formData: FormData) => Promise<void>
  requestPasswordChange: () => Promise<void>
}

function initialsOf(name: string, email: string) {
  const source = name.trim() || email
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProfileForm({
  initialName, initialAvatarUrl, email, updateAction, requestPasswordChange,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSendingReset, startReset] = useTransition()
  const [name, setName]           = useState(initialName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('fullName', name)
    fd.set('avatarUrl', avatarUrl)
    startTransition(() => updateAction(fd))
  }

  return (
    <div className="space-y-6">

      {/* Identity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>How your name appears to your team and to participants.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                  {initialsOf(name, email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{name || 'Unnamed'}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-sm"
                maxLength={100}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="max-w-sm"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Leave blank to use your initials. Uploads arrive with file storage.
              </p>
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <><Check className="h-4 w-4" /> Save changes</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Sign-in details for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="space-y-1.5">
            <Label>Email address</Label>
            <div className="flex items-center gap-2 max-w-sm rounded-md border border-input bg-muted px-3 h-10">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">{email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your email is how you sign in and where invitations are sent. Changing it
              needs re-verification and is not available yet.
            </p>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Password</Label>
            <div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={isSendingReset}
                onClick={() => startReset(() => requestPasswordChange())}
              >
                {isSendingReset
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><KeyRound className="h-4 w-4" /> Email me a reset link</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We send a link rather than changing it here, so an unattended session
              cannot be used to take over the account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
