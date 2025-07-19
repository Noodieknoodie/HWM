"use client"

import * as React from "react"
import { X, ChevronsUpDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

type Option = Record<"value" | "label", string> & Record<string, string>

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: React.Dispatch<React.SetStateAction<string[]>>
  placeholder?: string
  className?: string
  groupBy?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  groupBy,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value])
  }

  const selectedObjects = selected.map((s) => options.find((opt) => opt.value === s)).filter(Boolean) as Option[]

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return null
    return options.reduce(
      (acc, option) => {
        const group = option[groupBy] || "Other"
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(option)
        return acc
      },
      {} as Record<string, Option[]>,
    )
  }, [options, groupBy])

  const handleSelectGroup = (group: string) => {
    if (!groupedOptions) return
    const groupOptions = groupedOptions[group].map((opt) => opt.value)
    const allSelected = groupOptions.every((opt) => selected.includes(opt))

    if (allSelected) {
      // Deselect all in group
      onChange(selected.filter((s) => !groupOptions.includes(s)))
    } else {
      // Select all in group
      onChange([...new Set([...selected, ...groupOptions])])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className}`}
        >
          <div className="flex flex-wrap gap-1 items-center py-1">
            {selectedObjects.length > 0 ? (
              selectedObjects.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleSelect(option.value)
                  }}
                >
                  {option.label}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <ScrollArea className="max-h-96">
          <div className="p-2">
            {groupedOptions
              ? Object.entries(groupedOptions).map(([group, groupOptions]) => {
                  const allSelectedInGroup = groupOptions.every((opt) => selected.includes(opt.value))
                  const someSelectedInGroup = groupOptions.some((opt) => selected.includes(opt.value))

                  return (
                    <div key={group} className="mb-2">
                      <div className="flex items-center space-x-2 px-2 py-1.5">
                        <Checkbox
                          id={`select-all-${group}`}
                          checked={allSelectedInGroup ? true : someSelectedInGroup ? "indeterminate" : false}
                          onCheckedChange={() => handleSelectGroup(group)}
                        />
                        <Label htmlFor={`select-all-${group}`} className="font-semibold cursor-pointer">
                          {group}
                        </Label>
                      </div>
                      <div className="pl-4">
                        {groupOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2 px-2 py-1.5">
                            <Checkbox
                              id={option.value}
                              checked={selected.includes(option.value)}
                              onCheckedChange={() => handleSelect(option.value)}
                            />
                            <Label htmlFor={option.value} className="w-full font-normal cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              : options.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 px-2 py-1.5">
                    <Checkbox
                      id={option.value}
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => handleSelect(option.value)}
                    />
                    <Label htmlFor={option.value} className="w-full font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}