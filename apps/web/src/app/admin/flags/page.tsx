'use client'

import { useState } from 'react'
import { Flag, AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const FEATURE_FLAGS = [
  { id: 'f1',  key: 'teams_enabled',           label: 'Team challenges',         desc: 'Allow creators to configure team-based challenges with shared scoring.',                group: 'Challenge Modes',    enabled: false, risk: false },
  { id: 'f2',  key: 'habit_mode_enabled',       label: 'Habit challenge mode',    desc: 'Enable the habit/streak challenge mode in the creation wizard.',                       group: 'Challenge Modes',    enabled: true,  risk: false },
  { id: 'f3',  key: 'ai_builder_enabled',       label: 'AI challenge builder',    desc: 'Experimental AI-assisted challenge content generation. Deferred from MVP.',           group: 'AI Features',        enabled: false, risk: true },
  { id: 'f4',  key: 'ai_coach_enabled',         label: 'AI coach blocks',         desc: 'Enable AI coaching content blocks within daily challenge steps.',                      group: 'AI Features',        enabled: false, risk: true },
  { id: 'f5',  key: 'native_checkout',          label: 'Native checkout',         desc: 'Enable Stripe-powered paid challenge enrollment. Requires billing architecture review.',group: 'Commerce',           enabled: false, risk: true },
  { id: 'f6',  key: 'custom_domains',           label: 'Custom domains',          desc: 'Allow workspace owners to map a custom domain to their Challenge Studio workspace.',   group: 'Branding',           enabled: false, risk: false },
  { id: 'f7',  key: 'zoom_integration',         label: 'Zoom OAuth integration',  desc: 'Automatic meeting creation and attendance sync via Zoom OAuth.',                       group: 'Integrations',       enabled: false, risk: false },
  { id: 'f8',  key: 'community_site_module',    label: 'Community Site module',   desc: 'Enable the Community Site embedded module installation flow.',                         group: 'Integrations',       enabled: false, risk: true },
  { id: 'f9',  key: 'template_marketplace',     label: 'Template marketplace',    desc: 'Allow creators to publish and discover reusable challenge templates.',                 group: 'Post-MVP',           enabled: false, risk: false },
  { id: 'f10', key: 'public_api',               label: 'Public developer API',    desc: 'Expose a versioned public API for third-party integrations.',                          group: 'Post-MVP',           enabled: false, risk: true },
]

const groups = [...new Set(FEATURE_FLAGS.map(f => f.group))]

export default function FlagsPage() {
  const [flags, setFlags] = useState(FEATURE_FLAGS)
  const toggle = (id: string) =>
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Feature Flags</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Control which features are active across the platform. Changes take effect immediately.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 mb-6 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Enabling high-risk flags (marked ⚠️) on production may cause unexpected behaviour.
          Test in preview environments first.
        </p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {groups.map((group) => (
          <Card key={group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {flags.filter(f => f.group === group).map((flag, i, arr) => (
                <div
                  key={flag.id}
                  className={`flex items-start justify-between gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{flag.label}</p>
                      {flag.risk && (
                        <Badge variant="warning" className="text-[10px] gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" /> High risk
                        </Badge>
                      )}
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                        {flag.key}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{flag.desc}</p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => toggle(flag.id)}
                    className="shrink-0 mt-0.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
