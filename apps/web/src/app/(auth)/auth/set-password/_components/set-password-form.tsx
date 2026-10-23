'use client'

/**
 * The form on /auth/set-password.
 *
 * Same rules and the same meter as sign-up (`scorePassword`), so a password
 * that would be refused there is refused here, and the person sees why before
 * pressing anything. The server action checks again.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Eye, EyeOff, Check, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { scorePassword } from '../../signup/_components/password-strength'
import { setPasswordAction } from '../../actions'

const BAR: Record<string, string> = {
  weak: 'bg-red-500', fair: 'bg-amber-500', good: 'bg-lime-500', strong: 'bg-emerald-500',
}

export function SetPasswordForm({ next, email }: { next: string; email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isSaving, startSaving] = useTransition()

  const strength = scorePassword(password)
  const matches = confirm.length > 0 && confirm === password
  const canSave = strength.valid && matches && !isSaving && !saved

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSave) return
    setError(null)
    const form = new FormData(e.currentTarget)
    startSaving(async () => {
      try {
        const result = await setPasswordAction(form)
        if (!result.ok) { setError(result.error); return }
        setSaved(true)
        // A moment to read "Saved" — then on to where they were going.
        setTimeout(() => router.push(result.next), 900)
      } catch {
        setError('Your password was not saved. Check your connection and try again.')
      }
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Create a password</CardTitle>
        <CardDescription>
          You signed in with an email link. Add a password so you can sign in as{' '}
          <span className="font-medium text-foreground">{email}</span> any time — no email needed.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="mb-5 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Email links only work in the browser that asked for them. With a password you can
          sign in on your phone, a work laptop, anywhere.
        </p>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <input type="hidden" name="next" value={next} />
          {/* Lets a password manager file the new password under the right account. */}
          <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />

          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password" name="password" type={show ? 'text' : 'password'}
                autoComplete="new-password" value={password} disabled={isSaving || saved}
                onChange={(e) => { setPassword(e.target.value); setError(null) }}
                aria-describedby="password-rules" className="pr-10"
              />
              <button
                type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex flex-1 gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-full',
                      i <= strength.score ? BAR[strength.level] : 'bg-muted')} />
                  ))}
                </div>
                <span className="w-12 text-right text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}

            <ul id="password-rules" className="space-y-1 pt-1">
              {strength.rules.map((r) => (
                <li key={r.id} className={cn('flex items-center gap-1.5 text-xs',
                  r.met ? 'text-emerald-700' : 'text-muted-foreground')}>
                  {r.met ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  {r.label}{!r.required && <span className="text-muted-foreground"> (recommended)</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm" name="confirm" type={show ? 'text' : 'password'}
              autoComplete="new-password" value={confirm} disabled={isSaving || saved}
              onChange={(e) => { setConfirm(e.target.value); setError(null) }}
              aria-invalid={confirm.length > 0 && !matches ? true : undefined}
            />
            {confirm.length > 0 && !matches && (
              <p className="text-xs text-destructive">The two passwords do not match.</p>
            )}
          </div>

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="w-full gap-2" disabled={!canSave}>
            {saved ? <><Check className="h-4 w-4" /> Saved — taking you on</>
              : isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : 'Save password'}
          </Button>

          {!saved && (
            <p className="text-center text-sm">
              <Link href={next} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Skip for now
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
