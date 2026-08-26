// Workspace shell.
//
// No shared top bar: the sidebar runs full height and carries the account menu,
// and each page owns its own header so it can put its actions next to its title.
// The sidebar is rendered per page because it needs workspaceSlug from params.
//
// Exactly one viewport tall and not scrollable itself — scrolling belongs to the
// nav and to each page's <main>, so the sidebar stays put instead of riding up
// with the content. Same model as the admin shell.//
// `relative` matters: Tailwind's .sr-only is position:absolute, and with no
// positioned ancestor it resolves against the initial containing block. Inside
// a scrolled pane its static position can sit far below the fold, which grows
// the document and gives the page a stray scrollbar behind the fixed sidebar.
// Anchoring here contains every absolute descendant that has no nearer one.

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative flex h-screen overflow-hidden">{children}</div>
}
