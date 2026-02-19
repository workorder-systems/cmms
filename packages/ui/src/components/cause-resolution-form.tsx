"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

const FORM_ID = "cause-resolution-form"

export interface CauseResolutionFormProps {
  cause?: string
  resolution?: string
  onCauseChange?: (value: string) => void
  onResolutionChange?: (value: string) => void
  onSubmit?: (payload: { cause: string; resolution: string }) => void
  submitLabel?: string
  /** When true, submit is disabled until resolution has content. */
  requireResolution?: boolean
  /** Show loading state on submit button (e.g. while API request is in flight). */
  isSubmitting?: boolean
  disabled?: boolean
  /** Optional fieldset legend. When set, fields are wrapped in a fieldset. */
  legend?: React.ReactNode
  causeLabel?: string
  causePlaceholder?: string
  /** Helper text below the cause field. */
  causeDescription?: React.ReactNode
  resolutionLabel?: string
  resolutionPlaceholder?: string
  /** Helper text below the resolution field. */
  resolutionDescription?: React.ReactNode
  className?: string
}

/**
 * Standard form for completing a work order: cause and resolution text fields with optional submit.
 * Use requireResolution and isSubmitting when wiring to a complete-work-order API.
 */
export function CauseResolutionForm({
  cause = "",
  resolution = "",
  onCauseChange,
  onResolutionChange,
  onSubmit,
  submitLabel = "Complete",
  requireResolution = false,
  isSubmitting = false,
  disabled = false,
  legend,
  causeLabel = "Cause",
  causePlaceholder = "Root cause of the issue",
  causeDescription,
  resolutionLabel = "Resolution",
  resolutionPlaceholder = "What was done to resolve it",
  resolutionDescription,
  className,
}: CauseResolutionFormProps) {
  const [localCause, setLocalCause] = React.useState(cause)
  const [localResolution, setLocalResolution] = React.useState(resolution)
  const [touchedResolution, setTouchedResolution] = React.useState(false)

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
    setTouchedResolution(true)
    onResolutionChange?.(v)
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (requireResolution && !localResolution.trim()) {
      setTouchedResolution(true)
      return
    }
    onSubmit?.({ cause: localCause, resolution: localResolution })
  }

  const resolutionEmpty = !localResolution.trim()
  const resolutionInvalid = requireResolution && touchedResolution && resolutionEmpty
  const submitDisabled =
    disabled || isSubmitting || (requireResolution && resolutionEmpty)

  const fieldClass = "flex flex-col gap-1.5"
  const content = (
    <>
      <div className={fieldClass}>
        <Label htmlFor={`${FORM_ID}-cause`}>{causeLabel}</Label>
        <Textarea
          id={`${FORM_ID}-cause`}
          placeholder={causePlaceholder}
          value={localCause}
          onChange={handleCauseChange}
          disabled={disabled || isSubmitting}
          rows={3}
          className="resize-none"
          aria-describedby={causeDescription ? `${FORM_ID}-cause-desc` : undefined}
        />
        {causeDescription ? (
          <p
            id={`${FORM_ID}-cause-desc`}
            className="text-muted-foreground text-xs"
          >
            {causeDescription}
          </p>
        ) : null}
      </div>
      <div className={fieldClass}>
        <Label htmlFor={`${FORM_ID}-resolution`}>
          {resolutionLabel}
          {requireResolution ? (
            <span className="text-destructive ml-0.5" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        <Textarea
          id={`${FORM_ID}-resolution`}
          placeholder={resolutionPlaceholder}
          value={localResolution}
          onChange={handleResolutionChange}
          disabled={disabled || isSubmitting}
          rows={4}
          className={cn(
            "resize-none",
            resolutionInvalid && "border-destructive focus-visible:ring-destructive/20"
          )}
          aria-required={requireResolution}
          aria-invalid={resolutionInvalid}
          aria-describedby={
            resolutionDescription
              ? `${FORM_ID}-resolution-desc`
              : resolutionInvalid
                ? `${FORM_ID}-resolution-error`
                : undefined
          }
        />
        {resolutionInvalid ? (
          <p
            id={`${FORM_ID}-resolution-error`}
            className="text-destructive text-xs"
            role="alert"
          >
            {resolutionLabel} is required to complete.
          </p>
        ) : null}
        {resolutionDescription && !resolutionInvalid ? (
          <p
            id={`${FORM_ID}-resolution-desc`}
            className="text-muted-foreground text-xs"
          >
            {resolutionDescription}
          </p>
        ) : null}
      </div>
      {onSubmit ? (
        <Button type="submit" disabled={submitDisabled}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {submitLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      ) : null}
    </>
  )

  return (
    <form
      data-slot="cause-resolution-form"
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
      noValidate
    >
      {legend ? (
        <fieldset className="flex flex-col gap-4 border-0 p-0 m-0 min-w-0" disabled={disabled || isSubmitting}>
          <legend className="text-sm font-medium text-foreground">
            {legend}
          </legend>
          {content}
        </fieldset>
      ) : (
        content
      )}
    </form>
  )
}
