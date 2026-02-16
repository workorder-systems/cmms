"use client"

import * as React from "react"
import { HexColorPicker } from "react-colorful"
import { ChevronDown } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

/** Default CMMS-relevant preset colors. */
const DEFAULT_PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#6b7280",
]

export interface ColorPickerProps {
  /** Controlled hex value (e.g. #fbbf24). */
  value?: string
  /** Called when color changes. */
  onChange?: (hex: string) => void
  /** Uncontrolled default value. */
  defaultValue?: string
  /** Optional preset swatches for quick selection. */
  presets?: string[]
  /** Whether the picker is disabled. */
  disabled?: boolean
  /** Additional class name for the trigger button. */
  className?: string
  /** Whether to show hex input in the popover. */
  showHexInput?: boolean
}

/**
 * Color picker with popover, hex input, and optional preset swatches.
 * Use for selecting colors (e.g. status, priority) in catalog forms.
 */
export function ColorPicker({
  value: controlledValue,
  onChange,
  defaultValue = "#3b82f6",
  presets = DEFAULT_PRESETS,
  disabled = false,
  className,
  showHexInput = true,
}: ColorPickerProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const [open, setOpen] = React.useState(false)
  const [hexInput, setHexInput] = React.useState(value)

  const updateValue = React.useCallback(
    (hex: string) => {
      if (!isControlled) setUncontrolledValue(hex)
      onChange?.(hex)
      setHexInput(hex)
    },
    [isControlled, onChange]
  )

  React.useEffect(() => {
    setHexInput(value)
  }, [value, open])

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setHexInput(raw)
    if (HEX_REGEX.test(raw)) {
      updateValue(raw)
    }
  }

  const handleHexInputBlur = () => {
    if (HEX_REGEX.test(hexInput)) {
      updateValue(hexInput)
    } else {
      setHexInput(value)
    }
  }

  const handleHexInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && HEX_REGEX.test(hexInput)) {
      updateValue(hexInput)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span
            className="size-5 shrink-0 rounded border border-border"
            style={{ backgroundColor: value || "transparent" }}
          />
          <span className="flex-1 truncate text-left">{value || "Pick color"}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-3 [&_.react-colorful]:h-[150px] [&_.react-colorful]:w-[200px] [&_.react-colorful]:rounded-md">
          <HexColorPicker color={value} onChange={updateValue} />
        </div>
        {showHexInput && (
          <div className="mb-3">
            <Input
              value={hexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              onKeyDown={handleHexInputKeyDown}
              placeholder="#000000"
              className="h-8 font-mono text-sm"
            />
          </div>
        )}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={cn(
                  "size-6 shrink-0 rounded border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  value === preset ? "border-primary ring-1 ring-primary" : "border-border"
                )}
                style={{ backgroundColor: preset }}
                onClick={() => updateValue(preset)}
                aria-label={`Pick ${preset}`}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
