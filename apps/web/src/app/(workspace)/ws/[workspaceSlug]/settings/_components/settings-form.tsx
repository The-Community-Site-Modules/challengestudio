'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
]

interface Props {
  workspaceId:   string
  initialName:   string
  initialSlug:   string
  initialTimezone: string
  updateAction:  (workspaceId: string, formData: FormData) => Promise<void>
}

export function SettingsForm({
  workspaceId, initialName, initialSlug, initialTimezone, updateAction,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [name,      setName]         = useState(initialName)
  const [slug,      setSlug]         = useState(initialSlug)
  const [timezone,  setTimezone]     = useState(initialTimezone)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name',     name)
    fd.set('slug',     slug)
    fd.set('timezone', timezone)
    startTransition(() => updateAction(workspaceId, fd))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">General</CardTitle>
        <CardDescription>Basic workspace information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="max-w-sm"
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Shown to participants on all public pages.
            </p>
          </div>

          <Separator />

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="ws-slug">Workspace URL slug</Label>
            <div className="flex items-center max-w-sm">
              <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                /ws/
              </span>
              <Input
                id="ws-slug"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="rounded-l-none"
                required
                disabled={isPending}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, hyphens only.{' '}
              <span className="text-amber-600 font-medium">
                Changing this will break existing links.
              </span>
            </p>
          </div>

          <Separator />

          {/* Timezone */}
          <div className="space-y-1.5">
            <Label>Default timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={isPending}>
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used as the default for new challenges. Can be overridden per challenge.
            </p>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Check className="h-4 w-4" /> Save changes</>}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
