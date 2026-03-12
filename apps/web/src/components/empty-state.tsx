import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={`border-2 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick} size="default" className="shadow-sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
