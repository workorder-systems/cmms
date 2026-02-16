"use client"

import * as React from "react"
import { Square, Search } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  CMMS_ICONS,
  getLucideIcon,
  type IconOption,
} from "@workspace/ui/lib/lucide-icons"

export interface IconPickerProps {
  /** Controlled icon key (e.g. "play"). */
  value?: string | null
  /** Called when icon selection changes. */
  onChange?: (iconKey: string | null) => void
  /** Optional icon set to use instead of default CMMS icons. */
  icons?: IconOption[]
  /** Whether the picker is disabled. */
  disabled?: boolean
  /** Additional class name for the trigger button. */
  className?: string
}

/**
 * Icon picker with searchable grid of Lucide icons.
 * Use for selecting icons in catalog forms (status, maintenance type).
 */
export function IconPicker({
  value,
  onChange,
  icons = CMMS_ICONS,
  disabled = false,
  className,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredIcons = React.useMemo(() => {
    if (!search.trim()) return icons
    const q = search.trim().toLowerCase()
    return icons.filter(
      (opt) =>
        opt.key.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q)
    )
  }, [icons, search])

  const SelectedIcon = value ? getLucideIcon(value) : undefined

  const handleSelect = (key: string) => {
    const newValue = value === key ? null : key
    onChange?.(newValue)
    if (newValue) setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(null)
    setOpen(false)
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
          {SelectedIcon ? (
            <SelectedIcon className="size-4 shrink-0" />
          ) : (
            <Square className="size-4 shrink-0 opacity-50" />
          )}
          <span className="flex-1 truncate text-left">
            {value ? icons.find((i) => i.key === value)?.label ?? value : "Pick icon"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={handleClear}
            >
              Clear selection
            </Button>
          )}
        </div>
        {filteredIcons.length > 0 ? (
          <ScrollArea className="h-[200px]">
            <div className="grid grid-cols-6 gap-1 p-2">
              {filteredIcons.map((opt) => {
                const Icon = getLucideIcon(opt.key)
                const isSelected = value === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => handleSelect(opt.key)}
                    title={opt.label}
                    aria-label={opt.label}
                  >
                    {Icon ? (
                      <Icon className="size-4" />
                    ) : (
                      <Square className="size-4 opacity-30" />
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        ) : (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No icons match &quot;{search}&quot;
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}
