"use client"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type { VariantProps } from "class-variance-authority"
import { ChevronDown } from "lucide-react"
import { useStickToBottomContext } from "use-stick-to-bottom"

export type ScrollButtonProps = {
  className?: string
  variant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
} & React.ButtonHTMLAttributes<HTMLButtonElement>

function ScrollButton({
  className,
  variant = "outline",
  size = "sm",
  ...props
}: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  return (
    <Button
      onClick={() => scrollToBottom()}
      variant={variant}
      size={size}
      className={cn(!isAtBottom && "animate-in fade-in slide-in-from-bottom-4", className)}
      {...props}
    >
      <ChevronDown className="size-4" />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  )
}

export { ScrollButton }
