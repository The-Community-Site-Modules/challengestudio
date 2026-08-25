'use client'

import { useRef, useState, useTransition } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  workspaceId: string
  action: (workspaceId: string, formData: FormData) => Promise<void>
}

export function InviteForm({ workspaceId, action }: Props) {
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState('ADMIN')
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('role', role)
    startTransition(async () => {
      await action(workspaceId, formData)
      formRef.current?.reset()
    })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Invite a team member</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="colleague@example.com"
                required
                disabled={isPending}
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-48">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto gap-2"
              >
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                  : <><Mail className="h-4 w-4" /> Send invite</>}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
