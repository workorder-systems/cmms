import * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

/**
 * Centered full-height layout for auth pages. Router-agnostic; use in both
 * TanStack Router (web) and Next.js (chat) auth layouts.
 */
function AuthLayout({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center p-4',
        className
      )}
      {...props}
    />
  )
}

export { AuthLayout }
