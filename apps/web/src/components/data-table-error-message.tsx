interface DataTableErrorMessageProps {
  /** Human-readable resource name (e.g. "work orders", "locations"). */
  resourceName: string
  /** Error from useQuery. */
  error: Error | null
}

/**
 * Standard error UI for dashboard list pages when the main query fails.
 * Use instead of duplicating the same div/p structure.
 */
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

export function DataTableErrorMessage({
  resourceName,
  error,
}: DataTableErrorMessageProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pt-8">
      <Card className="border-2 border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading {resourceName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? 'An unknown error occurred while loading the data.'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
