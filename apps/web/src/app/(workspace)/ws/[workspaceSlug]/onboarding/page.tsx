// Route: /ws/[workspaceSlug]/onboarding
// Setup checklist for new workspace owners — PRD §9.1
// Steps: branding, first challenge, invite team, publish
// TODO: Milestone 3

export default function OnboardingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Get started</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Complete these steps to launch your first challenge.
      </p>
      <div className="mt-6 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Onboarding checklist — Milestone 3
      </div>
    </div>
  )
}
