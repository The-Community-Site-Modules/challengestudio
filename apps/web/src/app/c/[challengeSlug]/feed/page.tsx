import { ChallengeNav } from '@/components/participant/challenge-nav'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Heart, MessageCircle, Pin, Flame } from 'lucide-react'

interface Props { params: Promise<{ challengeSlug: string }> }

const FEED_POSTS = [
  {
    id: 1, initials: 'RE', name: 'Robert Evans', role: 'Host', pinned: true,
    time: '2h ago', day: null,
    text: "Welcome to Day 3 everyone! Today's lesson is live. I want you to focus on the *specificity* of your offer — vague offers get vague results. Drop your offer draft below and I'll give feedback to as many as I can. Let's go! 🚀",
    reactions: { heart: 42, fire: 31 }, comments: 18,
  },
  {
    id: 2, initials: 'AP', name: 'Aisha P.', role: 'Participant', pinned: false,
    time: '45m ago', day: 3,
    text: "Here's my offer draft: 'I help freelance designers land 2 new clients per month through a weekly outreach system — in 30 days or your money back.' Does this feel specific enough?",
    reactions: { heart: 14, fire: 8 }, comments: 6,
  },
  {
    id: 3, initials: 'TK', name: 'Tom K.', role: 'Participant', pinned: false,
    time: '1h ago', day: 2,
    text: "Just completed Day 2! The buyer persona exercise was genuinely hard. I kept wanting to say 'anyone who needs help' but the template forced me to get specific. Game changer.",
    reactions: { heart: 21, fire: 12 }, comments: 4,
  },
  {
    id: 4, initials: 'MJ', name: 'Marcus J.', role: 'Participant', pinned: false,
    time: '3h ago', day: 1,
    text: "Day 1 done! My idea: productivity coaching for first-time managers who feel overwhelmed in their first 90 days. Posting here so I can't back out 😅",
    reactions: { heart: 33, fire: 19 }, comments: 11,
  },
]

export default async function FeedPage({ params }: Props) {
  const { challengeSlug } = await params

  return (
    <div className="min-h-screen bg-muted/30">
      <ChallengeNav challengeSlug={challengeSlug} challengeTitle="5-Day Business Launch" hostName="Robert Evans" />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* Compose box */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Share your progress, a win, or a question with the community..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Be encouraging — your story helps others.</p>
                <Button size="sm">Post</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {FEED_POSTS.map((post) => (
            <div
              key={post.id}
              className={`rounded-2xl border bg-card p-5 shadow-sm ${post.pinned ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'}`}
            >
              {/* Pin indicator */}
              {post.pinned && (
                <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Pin className="h-3.5 w-3.5" /> Pinned by host
                </div>
              )}

              {/* Author row */}
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`text-xs font-bold ${
                    post.role === 'Host' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {post.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{post.name}</span>
                    {post.role === 'Host' && <Badge variant="default" className="text-[10px]">Host</Badge>}
                    {post.day && (
                      <Badge variant="secondary" className="text-[10px]">Day {post.day}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{post.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">{post.text}</p>

                  {/* Reactions */}
                  <div className="mt-3 flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                      <Heart className="h-4 w-4" /> {post.reactions.heart}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-500 transition-colors">
                      <Flame className="h-4 w-4" /> {post.reactions.fire}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <MessageCircle className="h-4 w-4" /> {post.comments} replies
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
