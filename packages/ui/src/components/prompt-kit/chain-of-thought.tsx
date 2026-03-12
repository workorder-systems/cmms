"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDown, Circle } from "lucide-react"
import React from "react"

export type ChainOfThoughtItemProps = React.ComponentProps<"div">

export const ChainOfThoughtItem = ({
  children,
  className,
  ...props
}: ChainOfThoughtItemProps) => (
  <div className={cn("flex flex-col", className)} {...props}>
    {children}
  </div>
)

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode
  swapIconOnHover?: boolean
}

export const ChainOfThoughtTrigger = ({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: ChainOfThoughtTriggerProps) => (
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
    ) : (
      <Circle className="size-2 shrink-0 fill-current" />
    )}
    {children}
    {!leftIcon && (
      <ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
    )}
  </CollapsibleTrigger>
)

export type ChainOfThoughtContentProps = React.ComponentProps<
  typeof CollapsibleContent
>

export const ChainOfThoughtContent = ({
  children,
  className,
  ...props
}: ChainOfThoughtContentProps) => {
  return (
    <CollapsibleContent
      className={cn(
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
}

export type ChainOfThoughtProps = {
  children: React.ReactNode
  className?: string
}

export function ChainOfThought({ children, className }: ChainOfThoughtProps) {
  const childrenArray = React.Children.toArray(children)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {React.isValidElement(child) &&
            React.cloneElement(child as React.ReactElement<{ isLast?: boolean }>, {
              isLast: index === childrenArray.length - 1,
            })}
        </React.Fragment>
      ))}
    </div>
  )
}

export type ChainOfThoughtStepProps = {
  children: React.ReactNode
  className?: string
  isLast?: boolean
}

export const ChainOfThoughtStep = ({
  children,
  className,
  isLast = false,
  ...props
}: ChainOfThoughtStepProps & React.ComponentProps<"div">) => {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Collapsible defaultOpen={false}>
        {children}
      </Collapsible>
      {!isLast && (
        <div className="bg-border ml-2 h-4 w-px shrink-0 self-start" />
      )}
    </div>
  )
}
