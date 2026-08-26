'use client'

import { useState } from 'react'
import { Check, AlertTriangle, Trash2, Archive, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'

// Each toggle owns its own state — a hook cannot be called inside a .map() callback.
function ToggleRow({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  )
}

export default function ChallengeSettingsClient() {
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>

      <main className="flex-1 overflow-y-auto p-8 max-w-4xl">
        <PageHeader
          title="Challenge Settings"
          description="Manage visibility, access, and lifecycle settings for this challenge."
          action={
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button onClick={handleSave} className="gap-2">
                {saved ? <><Check className="h-4 w-4" /> Saved!</> : 'Save changes'}
              </Button>
            </div>
          }
        />

        <div className="mt-8 space-y-8 max-w-2xl">

          {/* Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status & visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Badge variant="success" className="shrink-0">Published</Badge>
                <p className="text-sm text-muted-foreground flex-1">
                  This challenge is live. Participants can register and access content.
                </p>
                <Button variant="outline" size="sm">Close registrations</Button>
              </div>

              <div className="space-y-1.5">
                <Label>Challenge slug</Label>
                <div className="flex items-center gap-0 max-w-sm">
                  <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    /c/
                  </span>
                  <Input defaultValue="5-day-launch" className="rounded-l-none" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Changing the slug will break existing links.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Access control */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Access control</CardTitle>
              <CardDescription>Control who can join and how they enroll.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select defaultValue="public">
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public — anyone with the link</SelectItem>
                    <SelectItem value="invite">Invite only</SelectItem>
                    <SelectItem value="restricted">Membership restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" placeholder="Unlimited" defaultValue="" className="max-w-xs" />
                <p className="text-xs text-muted-foreground">
                  Leave blank for unlimited registrations.
                </p>
              </div>

              {[
                { label: 'Require registration approval', desc: 'Manually approve each participant before they can access the challenge.', default: false },
                { label: 'Allow late enrollment', desc: 'Participants can join after the challenge has started.', default: true },
              ].map((item) => (
                <ToggleRow
                  key={item.label}
                  label={item.label}
                  desc={item.desc}
                  defaultChecked={item.default}
                />
              ))}
            </CardContent>
          </Card>

          {/* Post-challenge */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Post-challenge access</CardTitle>
              <CardDescription>How long participants can access content after the challenge ends.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Replay window</Label>
                <Select defaultValue="30">
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['7 days', '14 days', '30 days', '60 days', '90 days', 'Unlimited', 'No replay'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long participants can access daily content after the challenge closes.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO / meta */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registration page SEO</CardTitle>
              <CardDescription>Controls how your registration page appears in search results and link previews.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Meta title</Label>
                <Input defaultValue="5-Day Business Launch Challenge — Acme Coaching" className="max-w-lg" />
              </div>
              <div className="space-y-1.5">
                <Label>Meta description</Label>
                <Textarea
                  defaultValue="Go from idea to your first paying client in just 5 days. Join 200+ entrepreneurs in this free challenge."
                  rows={3}
                  className="max-w-lg"
                />
                <p className="text-xs text-muted-foreground">Recommended 150–160 characters.</p>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Archive challenge</p>
                  <p className="text-xs text-muted-foreground">
                    Hides the challenge from your dashboard. Participant data is preserved.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Archive className="h-3.5 w-3.5" /> Archive
                </Button>
              </div>

              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete challenge</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently deletes this challenge and all participant data. Cannot be undone.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Type <span className="font-mono font-bold">5-day-launch</span> to confirm
                  </Label>
                  <Input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="5-day-launch"
                    className="max-w-xs"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirm !== '5-day-launch'}
                  className="gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete challenge permanently
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  )
}
