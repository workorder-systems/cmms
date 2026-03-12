import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <Card className={`border-2 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">{message}</p>
        <p className="text-xs text-muted-foreground">Please wait...</p>
      </CardContent>
    </Card>
  )
}
