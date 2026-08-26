'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { CreateWorkspaceTile } from './workspace-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  createAction: (formData: FormData) => Promise<void>
  /** Slugs already in use, so a clash is caught before the round trip. */
  existingNames: string[]
  /** Renders as a grid tile alongside workspace cards, or a plain button. */
  variant?: 'tile' | 'button'
}

function slugify(name: string) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function CreateWorkspace({ createAction, existingNames, variant = 'tile' }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  const slug = slugify(name)
  // The server appends a suffix rather than rejecting a duplicate, which is how
  // four workspaces called "Challenge Studio" end up side by side. Say so here
  // instead of letting it happen silently.
  const duplicate = name.trim().length > 0 &&
    existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    const fd = new FormData()
    fd.set('name', name.trim())
    startTransition(() => createAction(fd))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'tile' ? (
          <CreateWorkspaceTile />
        ) : (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" /> Create workspace
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            A workspace holds its own challenges, team members, and branding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Coaching Studio"
              maxLength={60}
              autoFocus
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {slug
                ? <>Address: <span className="font-medium text-foreground">/ws/{slug}</span></>
                : 'Used for the workspace address.'}
            </p>
            {duplicate && (
              <p className="text-xs font-medium text-amber-600">
                You already have a workspace with this name. A suffix will be added to keep
                the address unique.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()} className="gap-2">
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                : <><Plus className="h-4 w-4" /> Create workspace</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
