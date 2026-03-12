import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-lg border-2 bg-background px-4 py-3 text-base shadow-sm transition-all duration-200 outline-none focus-visible:ring-[3px] hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
