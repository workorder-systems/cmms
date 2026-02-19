"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

export interface CauseResolutionFormProps {
  cause?: string
  resolution?: string
  onCauseChange?: (value: string) => void
  onResolutionChange?: (value: string) => void
  onSubmit?: (payload: { cause: string; resolution: string }) => void
  submitLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Standard form for completing a work order: cause and resolution text fields with optional submit.
 */
export function CauseResolutionForm({
  cause = "",
  resolution = "",
  onCauseChange,
  onResolutionChange,
  onSubmit,
  submitLabel = "Complete",
  disabled = false,
  className,
}: CauseResolutionFormProps) {
  const [localCause, setLocalCause] = React.useState(cause)
  const [localResolution, setLocalResolution] = React.useState(resolution)

  React.useEffect(() => {
    setLocalCause(cause)
  }, [cause])
  React.useEffect(() => {
    setLocalResolution(resolution)
  }, [resolution])

  const handleCauseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setLocalCause(v)
    onCauseChange?.(v)
  }
  const handleResolutionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setLocalResolution(v)
    onResolutionChange?.(v)
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.({ cause: localCause, resolution: localResolution })
  }

  return (
    <form
      data-slot="cause-resolution-form"
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="cause-resolution-form-cause">Cause</Label>
        <Textarea
          id="cause-resolution-form-cause"
          placeholder="Root cause of the issue"
          value={localCause}
          onChange={handleCauseChange}
          disabled={disabled}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cause-resolution-form-resolution">Resolution</Label>
        <Textarea
          id="cause-resolution-form-resolution"
          placeholder="What was done to resolve it"
          value={localResolution}
          onChange={handleResolutionChange}
          disabled={disabled}
          rows={3}
          className="resize-none"
        />
      </div>
      {onSubmit ? (
        <Button type="submit" disabled={disabled}>
          {submitLabel}
        </Button>
      ) : null}
    </form>
  )
}
