'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/shared/logo'

/**
 * Desktop rail, mobile drawer — the frame every sidebar in the app sits in.
 *
 * The three sidebars were a fixed 255px at every width. On a phone that is
 * two thirds of the screen, and the global one was hidden outright below lg,
 * which left the workspace picker with no navigation at all.
 *
 * The same children render in both places, so there is one nav to maintain.
 * Radix Dialog is already a dependency and brings the focus trap, Escape and
 * scroll lock that a hand-rolled drawer usually forgets.
 *
 * The shell is a column on small screens and a row from lg, so the mobile bar
 * is an ordinary flex child. Nothing here is fixed-positioned, which is what
 * keeps the main pane's own scrolling intact.
 */

interface Props {
  children: React.ReactNode
  /** Names the drawer for assistive tech, e.g. "Workspace navigation". */
  label: string
}

export function SidebarFrame({ children, label }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // A drawer left open across a navigation covers the page you just asked for.
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* Mobile bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open navigation</span>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
            <Dialog.Content
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-card shadow-xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
            >
              <Dialog.Title className="sr-only">{label}</Dialog.Title>
              <Dialog.Close className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-indigo-400">
                <X className="h-4 w-4" />
                <span className="sr-only">Close navigation</span>
              </Dialog.Close>
              {children}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Logo variant="lockup" className="h-6" />
      </div>

      {/* Desktop rail */}
      <aside
        aria-label={label}
        className="hidden h-full w-[255px] shrink-0 flex-col border-r border-border bg-card lg:flex"
      >
        {children}
      </aside>
    </>
  )
}
