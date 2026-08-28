'use client'

import { useState, useTransition } from 'react'
import { Loader2, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { saveOfferAction, type OfferInput } from '../actions'

interface Props {
  workspaceSlug: string
  challengeSlug: string
  initial: OfferInput
  clicks: number
}

export function OfferClient({ workspaceSlug, challengeSlug, initial, clicks }: Props) {
  const [form, setForm] = useState<OfferInput>(initial)
  const [isBusy, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = (k: keyof OfferInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      setSaved(false)
    }

  function submit() {
    setError(null)
    setSaved(false)
    start(async () => {
      const r = await saveOfferAction(workspaceSlug, challengeSlug, form)
      if (r.success) setSaved(true)
      else setError(r.error ?? 'Could not save that.')
    })
  }

  return (
    <div className="mt-6 space-y-6">

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Show the offer</p>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Participants see it once they finish. Off means the page is not reachable.
          </p>
        </div>
        <Switch
          checked={form.enabled}
          disabled={isBusy}
          onCheckedChange={(v) => { setForm(f => ({ ...f, enabled: v })); setSaved(false) }}
          aria-label="Show the offer"
        />
      </div>

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div>
          <Label htmlFor="headline" className="text-[13px] font-medium text-slate-700">Headline</Label>
          <Input
            id="headline"
            value={form.headline}
            onChange={set('headline')}
            placeholder="Ready to go deeper?"
            disabled={isBusy}
            className="mt-1.5 text-sm"
          />
        </div>

        <div>
          <Label htmlFor="body" className="text-[13px] font-medium text-slate-700">Description</Label>
          <Textarea
            id="body"
            value={form.body}
            onChange={set('body')}
            rows={4}
            placeholder="What they get, and why it follows on from the challenge."
            disabled={isBusy}
            className="mt-1.5 resize-none text-sm"
          />
        </div>

        <div>
          <Label htmlFor="bonuses" className="text-[13px] font-medium text-slate-700">
            What is included
          </Label>
          <Textarea
            id="bonuses"
            value={form.bonuses}
            onChange={set('bonuses')}
            rows={4}
            placeholder="Weekly group calls&#10;Private community&#10;1:1 onboarding"
            disabled={isBusy}
            className="mt-1.5 resize-none text-sm"
          />
          <p className="mt-1 text-[12px] text-slate-500">One per line.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ctaLabel" className="text-[13px] font-medium text-slate-700">
              Button text
            </Label>
            <Input
              id="ctaLabel"
              value={form.ctaLabel}
              onChange={set('ctaLabel')}
              placeholder="Get instant access"
              disabled={isBusy}
              className="mt-1.5 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="closesAt" className="text-[13px] font-medium text-slate-700">
              Closes (optional)
            </Label>
            <Input
              id="closesAt"
              type="datetime-local"
              value={form.closesAt}
              onChange={set('closesAt')}
              disabled={isBusy}
              className="mt-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="ctaUrl" className="text-[13px] font-medium text-slate-700">
            Where the button goes
          </Label>
          <Input
            id="ctaUrl"
            type="url"
            value={form.ctaUrl}
            onChange={set('ctaUrl')}
            placeholder="https://your-checkout-page.com"
            disabled={isBusy}
            className="mt-1.5 text-sm"
          />
          <p className="mt-1 text-[12px] text-slate-500">
            An external page. Challenge Studio does not take payment.
          </p>
        </div>

        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={isBusy}
            className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
          >
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-slate-500">
            <ExternalLink className="h-3.5 w-3.5" />
            {clicks} click{clicks === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  )
}
