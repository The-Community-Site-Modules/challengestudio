/**
 * A shell, not a layout with opinions.
 *
 * The centred card, the header and the footer moved to `_components/auth-shell`
 * so that sign-up can use the full width for a split screen. A layout cannot
 * see which child it is rendering, so pages choose their own chrome —
 * every page except sign-up wraps itself in `<AuthShell>`.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/30">{children}</div>
}
