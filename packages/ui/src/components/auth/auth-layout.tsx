import * as React from 'react'
import { Building2, ShieldCheck, Wrench } from 'lucide-react'
import { cn } from '@workspace/ui/lib/utils'

/**
 * Centered full-height layout for auth pages. Router-agnostic; use in both
 * TanStack Router (web) and Next.js (chat) auth layouts.
 */
function AuthLayout({
  children,
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/20',
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-6 right-6 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2 lg:items-center lg:px-8">
        <aside className="hidden rounded-2xl border bg-card/80 p-8 shadow-lg backdrop-blur lg:block">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            Maintenance OS
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Keep facilities reliable without the spreadsheet maze.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            One place for work orders, assets, locations, and tenant-scoped
            team access.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Wrench className="size-4" />
              </div>
              <span>Structured workflows for request, assignment, and closure.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Building2 className="size-4" />
              </div>
              <span>Built-in multi-tenant boundaries for clean data isolation.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <span>Role-aware access and secure auth flows out of the box.</span>
            </li>
          </ul>
        </aside>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}

export { AuthLayout }
