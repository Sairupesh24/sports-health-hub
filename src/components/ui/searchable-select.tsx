import React, { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  id?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  triggerClassName,
  contentClassName,
  disabled = false,
  emptyMessage = "No matching options found.",
  searchable = true,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearch("");
    }
  }, [open]);

  // Scroll selected item into view when opened without search query
  useEffect(() => {
    if (open && !search && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [open, search]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const displayText = selectedOption
    ? selectedOption.sublabel && !selectedOption.label.includes(selectedOption.sublabel)
      ? `${selectedOption.label} ${selectedOption.sublabel}`
      : selectedOption.label
    : placeholder;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = (opt.label || "").toLowerCase().includes(q);
      const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchValue = (opt.value || "").toLowerCase().includes(q);
      const matchGroup = opt.group ? opt.group.toLowerCase().includes(q) : false;
      return matchLabel || matchSublabel || matchValue || matchGroup;
    });
  }, [options, search]);

  // Determine if search input should be visible (e.g. if searchable flag is true and options > 3)
  const showSearch = searchable && options.length > 3;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left shadow-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60",
            triggerClassName
          )}
        >
          <span className="truncate flex-1 font-medium">{displayText}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-50 shrink-0 ml-1.5 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden",
          contentClassName
        )}
        align="start"
      >
        {showSearch && (
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setOpen(false);
                  } else if (e.key === "Enter" && filteredOptions.length > 0) {
                    e.preventDefault();
                    onValueChange(filteredOptions[0].value);
                    setOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                className="h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 rounded-lg focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 rounded-sm cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className="max-h-64 overflow-y-auto p-1 custom-scrollbar"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 px-3 text-center text-xs text-muted-foreground">
              {search ? (
                <>
                  No results found for &ldquo;<span className="font-semibold text-foreground">{search}</span>&rdquo;
                </>
              ) : (
                emptyMessage
              )}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const showGroupHeading =
                opt.group && (idx === 0 || filteredOptions[idx - 1].group !== opt.group);

              return (
                <React.Fragment key={`${opt.group || ""}-${opt.value}-${idx}`}>
                  {showGroupHeading && (
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pt-2.5 pb-1 border-t border-slate-100 dark:border-slate-800 first:border-t-0 first:pt-1">
                      {opt.group}
                    </div>
                  )}
                  <div
                    ref={isSelected ? selectedItemRef : undefined}
                    onClick={() => {
                      if (opt.disabled) return;
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex items-center w-full py-1.5 pl-7 pr-2.5 text-xs rounded-lg cursor-pointer transition-colors select-none text-left",
                      opt.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                      isSelected
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate flex-1">{opt.label}</span>
                    {opt.sublabel && (
                      <span
                        className={cn(
                          "text-[10px] ml-1.5 shrink-0 font-normal",
                          isSelected ? "text-accent-foreground/90" : "text-muted-foreground"
                        )}
                      >
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

