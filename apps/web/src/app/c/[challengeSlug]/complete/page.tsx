import Link from 'next/link'
import { Trophy, Star, Share2, ArrowRight, CheckCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Props { params: Promise<{ challengeSlug: string }> }

const EARNED_BADGES = [
  { icon: '🏁', label: 'Day 1 Done' },
  { icon: '⚡', label: 'Day 2 Done' },
  { icon: '🎯', label: 'Day 3 Done' },
  { icon: '📣', label: 'Day 4 Done' },
  { icon: '🏆', label: 'Challenge Complete' },
  { icon: '🔥', label: '5-Day Streak' },
  { icon: '✍️', label: 'First Post' },
]

export default async function CompletePage({ params }: Props) {
  await params

  return (
    <div className="min-h-screen bg-muted/30">

      {/* Celebration hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-400 via-primary to-primary/70 py-20 text-center px-6">
        <div className="absolute inset-0 opacity-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute text-4xl animate-bounce" style={{
              left: `${(i * 8.5) % 100}%`,
              top: `${(i * 13) % 80}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${1.5 + (i % 3) * 0.5}s`,
            }}>
              {['🎉', '⭐', '🏆', '✨'][i % 4]}
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-5xl">
            🏆
          </div>
          <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">
            Challenge Complete!
          </Badge>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
            You did it, Jane!
          </h1>
          <p className="mt-3 text-xl text-white/85">
            5-Day Business Launch Challenge — Completed
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
            <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-300" /> 1,450 XP earned</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-yellow-300" /> Ranked #12 of 247</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-green-300" /> 5-day streak</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6 py-12 space-y-8">

        {/* Certificate */}
        <Card className="overflow-hidden border-2 border-yellow-200">
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-2xl">
              📜
            </div>
            <h2 className="text-lg font-bold text-foreground">Certificate of Completion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This certifies that <strong>Jane Smith</strong> successfully completed the
              <strong> 5-Day Business Launch Challenge</strong> on August 16, 2026.
            </p>
            <div className="mt-2 text-xs text-muted-foreground">Hosted by Robert Evans · Acme Coaching</div>
          </div>
          <CardContent className="p-4">
            <Button variant="outline" className="w-full gap-2">
              <Download className="h-4 w-4" /> Download certificate
            </Button>
          </CardContent>
        </Card>

        {/* Badges earned */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-bold text-foreground">Badges earned</h2>
            <Separator />
            <div className="flex flex-wrap gap-3">
              {EARNED_BADGES.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-200 bg-yellow-50 text-2xl">
                    {b.icon}
                  </div>
                  <span className="text-[10px] text-muted-foreground w-12 leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Share */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="font-bold text-foreground">Share your win</h2>
            <p className="text-sm text-muted-foreground">
              Tell the world you completed the challenge — and inspire others to join.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1 gap-2">
                𝕏 Share on X
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <Share2 className="h-4 w-4" /> Copy link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offer CTA */}
        <div className="rounded-2xl bg-primary p-8 text-center">
          <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">
            Special offer for completers only
          </Badge>
          <h2 className="text-2xl font-bold text-primary-foreground">
            Ready to go deeper?
          </h2>
          <p className="mt-2 text-primary-foreground/80">
            Join the full 12-week Business Growth Accelerator and get 1:1 coaching,
            weekly group calls, and a proven client-getting system.
          </p>
          <div className="mt-6 rounded-xl bg-white/10 p-4 text-left space-y-2">
            {['Weekly live coaching calls', 'Private Slack community', '1:1 onboarding session', '30-day money-back guarantee'].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-primary-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-300" /> {b}
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-primary-foreground/60">
            ⏰ Offer closes in <strong className="text-white">48 hours</strong>
          </div>
          <Button asChild variant="secondary" size="lg" className="mt-6 gap-2 font-bold w-full sm:w-auto">
            <Link href="https://example.com/accelerator" target="_blank">
              Get instant access <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

      </main>
    </div>
  )
}
