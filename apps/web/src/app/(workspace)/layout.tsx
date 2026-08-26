// Workspace shell.
//
// No shared top bar: the sidebar runs full height and carries the account menu,
// and each page owns its own header so it can put its actions next to its title.
// Sidebar is per-page because it needs workspaceSlug from params.

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen">{children}</div>
}
