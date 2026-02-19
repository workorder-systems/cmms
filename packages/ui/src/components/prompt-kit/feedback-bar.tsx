import { cn } from "@workspace/ui/lib/utils"
import { ThumbsDown, ThumbsUp, X } from "lucide-react"

type FeedbackBarProps = {
  className?: string
  title?: string
  icon?: React.ReactNode
  onHelpful?: () => void
  onNotHelpful?: () => void
  onClose?: () => void
}

export function FeedbackBar({
  className,
  title,
  icon,
  onHelpful,
  onNotHelpful,
  onClose,
}: FeedbackBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-muted/30 px-2 py-1.5",
        className
      )}
    >
      {icon}
      {title && (
        <span className="text-muted-foreground flex-1 text-sm">{title}</span>
      )}
      <div className="flex items-center gap-1">
        {onHelpful && (
          <button
            type="button"
            onClick={onHelpful}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            aria-label="Helpful"
          >
            <ThumbsUp className="size-4" />
          </button>
        )}
        {onNotHelpful && (
          <button
            type="button"
            onClick={onNotHelpful}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            aria-label="Not helpful"
          >
            <ThumbsDown className="size-4" />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
