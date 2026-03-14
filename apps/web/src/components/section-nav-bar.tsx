import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'

export interface SectionNavItem {
  title: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

interface SectionNavBarProps {
  items: readonly SectionNavItem[]
  pathname: string
  ariaLabel: string
}

export function SectionNavBar({ items, pathname, ariaLabel }: SectionNavBarProps) {
  return (
    <nav className="flex flex-nowrap items-center gap-1" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = pathname === item.to
        const Icon = item.icon
        return (
          <Button
            key={item.to}
            asChild
            variant={isActive ? 'outline' : 'ghost'}
            size="sm"
          >
            <Link to={item.to}>
              <Icon className="size-4 shrink-0" />
              {item.title}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
