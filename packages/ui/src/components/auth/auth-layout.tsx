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
        'grid min-h-svh lg:grid-cols-2',
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-center gap-2 md:justify-start">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Wrench className="size-4" />
          </div>
          <span className="font-medium">WorkOrder Systems</span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_40%),radial-gradient(circle_at_80%_30%,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <div className="max-w-md rounded-xl border bg-background/70 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold">Built for maintenance teams</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Wrench className="mt-0.5 size-4 text-primary" />
                Keep work orders moving from request to completion.
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="mt-0.5 size-4 text-primary" />
                Manage assets and locations across all sites.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                Secure tenant-scoped access for every team member.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export { AuthLayout }
