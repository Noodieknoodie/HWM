"use client"

import * as React from "react"
import { ChevronsUpDown, X, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
  provider?: string
}

interface MultiSelectSimpleProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  groupBy?: string
}

export function MultiSelectSimple({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
  groupBy
}: MultiSelectSimpleProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== value))
  }

  const selectedItems = React.useMemo(() => {
    return selected
      .map((value) => options.find((option) => option.value === value))
      .filter(Boolean) as Option[]
  }, [selected, options])

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { "": filteredOptions }
    
    return filteredOptions.reduce((acc, option) => {
      const key = option[groupBy as keyof Option] as string || "Other"
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(option)
      return acc
    }, {} as Record<string, Option[]>)
  }, [filteredOptions, groupBy])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-[40px] h-auto", className)}
        >
          <div className="flex flex-wrap gap-1 items-center">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="mr-1"
                >
                  {item.label}
                  <X 
                    className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={(e) => handleRemove(item.value, e)}
                  />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="bg-white rounded-md border">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              className="h-10 border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ScrollArea className="h-72">
            <div className="p-2">
              {Object.keys(groupedOptions).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">{emptyMessage}</p>
              ) : (
                Object.entries(groupedOptions).map(([group, items]) => (
                  <div key={group} className="mb-2">
                    {group && (
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group}
                      </div>
                    )}
                    {items.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleSelect(option.value)}
                      >
                        <Checkbox
                          checked={selected.includes(option.value)}
                          onCheckedChange={() => handleSelect(option.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Label className="flex-1 cursor-pointer font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}