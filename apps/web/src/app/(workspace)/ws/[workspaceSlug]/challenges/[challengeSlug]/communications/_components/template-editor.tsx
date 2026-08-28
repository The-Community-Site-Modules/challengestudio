'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, Loader2, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { saveTemplateAction } from '../actions'

export interface TemplateRow {
  trigger: string
  name: string
  when: string
  /** 'scheduled' messages need a job runner that is not configured yet. */
  firing: 'event' | 'scheduled'
  essential: boolean
  enabled: boolean
  subject: string
  body: string
  defaultSubject: string
  defaultBody: string
  variables: readonly string[]
}

interface Props {
  workspaceSlug: string
  challengeSlug: string
  templates: TemplateRow[]
}

export function TemplateEditor({ workspaceSlug, challengeSlug, templates }: Props) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {templates.map((t, i) => (
        <Row
          key={t.trigger}
          template={t}
          workspaceSlug={workspaceSlug}
          challengeSlug={challengeSlug}
          first={i === 0}
        />
      ))}
    </div>
  )
}

function Row({ template, workspaceSlug, challengeSlug, first }: {
  template: TemplateRow
  workspaceSlug: string
  challengeSlug: string
  first: boolean
}) {
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(template.enabled)
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [isSaving, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    enabled !== template.enabled ||
    subject !== template.subject ||
    body !== template.body

  function save(nextEnabled = enabled) {
    setError(null); setSaved(false)
    start(async () => {
      const r = await saveTemplateAction(workspaceSlug, challengeSlug, template.trigger, {
        enabled: nextEnabled, subject, body,
      })
      if (r.success) setSaved(true)
      else setError(r.error ?? 'Could not save that.')
    })
  }

  return (
    <div className={cn('border-slate-100', !first && 'border-t')}>
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:underline"
        >
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-900">
              {template.name}
            </span>
            <span className="block truncate text-[13px] text-slate-500">{template.when}</span>
          </span>
        </button>

        {template.firing === 'scheduled' && (
          <span
            title="Needs a scheduled job runner, which is not configured yet"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
          >
            <Clock className="h-3 w-3" /> Not scheduled
          </span>
        )}

        {template.essential ? (
          <span
            title="Access and security mail is always sent"
            className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
          >
            Always on
          </span>
        ) : (
          <Switch
            checked={enabled}
            disabled={isSaving}
            onCheckedChange={(v) => { setEnabled(v); save(v) }}
            aria-label={`Send ${template.name}`}
          />
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 px-5 py-5">
          <div>
            <label htmlFor={`s-${template.trigger}`} className="text-[13px] font-medium text-slate-700">
              Subject
            </label>
            <Input
              id={`s-${template.trigger}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={template.defaultSubject}
              maxLength={200}
              disabled={isSaving}
              className="mt-1.5 bg-white text-sm"
            />
          </div>

          <div>
            <label htmlFor={`b-${template.trigger}`} className="text-[13px] font-medium text-slate-700">
              Body
            </label>
            <Textarea
              id={`b-${template.trigger}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={template.defaultBody}
              rows={6}
              maxLength={5000}
              disabled={isSaving}
              className="mt-1.5 bg-white text-sm"
            />
            <p className="mt-1.5 text-[13px] text-slate-500">
              Leave either blank to use the default wording.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
              Available variables
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {template.variables.map((v) => (
                <code
                  key={v}
                  className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-slate-600 ring-1 ring-slate-200"
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
            <p className="mt-1.5 text-[13px] text-slate-500">
              Anything else is left as written rather than filled in.
            </p>
          </div>

          {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={() => save()}
              disabled={isSaving || !dirty}
              className="h-9 gap-1.5 bg-indigo-600 px-4 text-white hover:bg-indigo-700"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
            {saved && !dirty && (
              <span className="inline-flex items-center gap-1 text-[13px] text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
