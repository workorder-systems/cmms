"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDown } from "lucide-react"

export type StepsItemProps = React.ComponentProps<"div">

export const StepsItem = ({
  children,
  className,
  ...props
}: StepsItemProps) => (
  <div className={cn("flex flex-col", className)} {...props}>
    {children}
  </div>
)

export type StepsTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode
  swapIconOnHover?: boolean
}

export const StepsTrigger = ({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: StepsTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
      className
    )}
    {...props}
  >
    {leftIcon ? (
      <>
        {leftIcon}
        {swapIconOnHover && (
          <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
        )}
      </>
    ) : null}
    {children}
    {!leftIcon && (
      <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
    )}
  </CollapsibleTrigger>
)

export type StepsContentProps = React.ComponentProps<
  typeof CollapsibleContent
> & {
  bar?: React.ReactNode
}

export const StepsContent = ({
  children,
  className,
  bar,
  ...props
}: StepsContentProps) => {
  return (
    <CollapsibleContent
      className={cn("overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down", className)}
      {...props}
    >
      {bar ?? <StepsBar />}
      {children}
    </CollapsibleContent>
  )
}

export type StepsBarProps = React.HTMLAttributes<HTMLDivElement>

export const StepsBar = ({ className, ...props }: StepsBarProps) => (
  <div
    className={cn("bg-border w-px shrink-0 self-stretch", className)}
    {...props}
  />
)

export type StepsProps = React.ComponentProps<typeof Collapsible>

export function Steps({ defaultOpen = false, className, ...props }: StepsProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}
