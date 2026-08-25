import { ChallengeNav } from '@/components/participant/challenge-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Flame, Zap } from 'lucide-react'

interface Props { params: Promise<{ challengeSlug: string }> }

interface Leader {
  rank: number
  initials: string
  name: string
  xp: number
  streak: number
  days: number
  badge: string | null
  isYou?: boolean
}

const LEADERS: Leader[] = [
  { rank: 1,  initials: 'MJ', name: 'Marcus J.',   xp: 850, streak: 3, days: 3, badge: '🥇' },
  { rank: 2,  initials: 'AP', name: 'Aisha P.',    xp: 775, streak: 3, days: 3, badge: '🥈' },
  { rank: 3,  initials: 'TK', name: 'Tom K.',      xp: 650, streak: 2, days: 2, badge: '🥉' },
  { rank: 4,  initials: 'PR', name: 'Priya R.',    xp: 540, streak: 2, days: 2, badge: null },
  { rank: 5,  initials: 'SA', name: 'Sam A.',      xp: 430, streak: 1, days: 1, badge: null },
  { rank: 6,  initials: 'LW', name: 'Lisa W.',     xp: 325, streak: 1, days: 1, badge: null },
  { rank: 12, initials: 'JD', name: 'Jane D. (you)', xp: 225, streak: 2, days: 2, badge: null, isYou: true },
]

const TOP3 = LEADERS.slice(0, 3)

export default async function LeaderboardPage({ params }: Props) {
  const { challengeSlug } = await params

  return (
    <div className="min-h-screen bg-muted/30">
      <ChallengeNav challengeSlug={challengeSlug} challengeTitle="5-Day Business Launch" hostName="Robert Evans" />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Top participants by XP — Day 3 in progress
          </p>
        </div>

        {/* Podium — top 3 */}
        <div className="flex items-end justify-center gap-3 pt-4">
          {/* 2nd place */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-12 w-12 ring-2 ring-slate-300">
              <AvatarFallback className="bg-slate-100 font-bold text-slate-600">{TOP3[1]?.initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-foreground">{TOP3[1]?.name}</p>
            <div className="flex h-16 w-20 items-center justify-center rounded-t-xl bg-slate-200 text-2xl font-black text-slate-600">
              🥈
            </div>
          </div>
          {/* 1st place */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-14 w-14 ring-2 ring-yellow-400">
              <AvatarFallback className="bg-yellow-100 font-bold text-yellow-700">{TOP3[0]?.initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-foreground">{TOP3[0]?.name}</p>
            <div className="flex h-24 w-20 items-center justify-center rounded-t-xl bg-yellow-200 text-2xl font-black text-yellow-700">
              🥇
            </div>
          </div>
          {/* 3rd place */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-10 w-10 ring-2 ring-orange-300">
              <AvatarFallback className="bg-orange-100 font-bold text-orange-600">{TOP3[2]?.initials}</AvatarFallback>
            </Avatar>
            <p className="text-xs font-semibold text-foreground">{TOP3[2]?.name}</p>
            <div className="flex h-12 w-20 items-center justify-center rounded-t-xl bg-orange-200 text-2xl font-black text-orange-600">
              🥉
            </div>
          </div>
        </div>

        {/* Full list */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {LEADERS.map((p) => (
              <div
                key={p.rank}
                className={`flex items-center gap-4 px-5 py-4 ${p.isYou ? 'bg-primary/5' : ''}`}
              >
                {/* Rank */}
                <div className="w-6 text-center text-sm font-bold text-muted-foreground">
                  {p.badge ?? p.rank}
                </div>

                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`text-xs font-bold ${p.isYou ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    {p.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${p.isYou ? 'text-primary' : 'text-foreground'}`}>
                      {p.name}
                    </p>
                    {p.isYou && <Badge variant="outline" className="text-[10px]">You</Badge>}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{p.streak} streak</span>
                    <span>{p.days}/5 days</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-foreground flex items-center gap-1 justify-end">
                    <Zap className="h-3.5 w-3.5 text-primary" />{p.xp} XP
                  </p>
                  <Progress value={(p.xp / 850) * 100} className="mt-1 h-1.5 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Leaderboard updates every hour · 247 participants
        </p>
      </main>
    </div>
  )
}
