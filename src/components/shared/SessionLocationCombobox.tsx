import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/utils/api';
import { MapPin, Check, ChevronsUpDown, X, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionLocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const DEFAULT_LOCATIONS = ['CSSH', 'HPL', 'PGBA Ground'];

export function SessionLocationCombobox({
  value,
  onChange,
  placeholder = "Type or search location (e.g. CSSH, HPL, PGBA Ground)...",
  disabled = false,
  className,
  id = "session-location-input"
}: SessionLocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(DEFAULT_LOCATIONS);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch past/entered locations
  useEffect(() => {
    let mounted = true;
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<string[]>('/appointments/locations');
        if (mounted && Array.isArray(data) && data.length > 0) {
          setOptions(data);
        }
      } catch (err) {
        console.warn('Failed to load session locations:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchLocations();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter options based on user input
  const filteredOptions = useMemo(() => {
    const trimmed = (value || '').trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter(opt => opt.toLowerCase().includes(trimmed));
  }, [options, value]);

  const exactMatchExists = useMemo(() => {
    const trimmed = (value || '').trim().toLowerCase();
    return options.some(opt => opt.toLowerCase() === trimmed);
  }, [options, value]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Persist newly entered location to server so it is stored for future use
  const persistNewLocation = (locName: string) => {
    const clean = locName.trim();
    if (!clean) return;
    setOptions(prev => {
      const exists = prev.some(o => o.toLowerCase() === clean.toLowerCase());
      return exists ? prev : [...prev, clean];
    });
    apiFetch('/appointments/locations', {
      method: 'POST',
      data: { name: clean }
    }).catch(err => {
      console.warn('Failed to persist location:', err);
    });
  };

  const handleSelect = (selected: string) => {
    const clean = selected.trim();
    onChange(clean);
    persistNewLocation(clean);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(filteredOptions.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (open && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      } else {
        if (value && value.trim()) {
          persistNewLocation(value.trim());
        }
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none shrink-0" />
        
        <Input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (value && value.trim()) {
              persistNewLocation(value.trim());
            }
          }}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="pl-8 pr-16 h-9 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 font-medium"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              aria-label="Clear location"
              onClick={() => {
                onChange('');
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            aria-label="Toggle locations dropdown"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpen(prev => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown popup with matching / already entered locations */}
      {open && !disabled && (
        <div 
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-50 zoom-in-95 custom-scrollbar"
        >
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 flex items-center justify-between">
            <span>{value ? 'Matching Locations' : 'Already Entered Locations'}</span>
            <span className="text-[9px] font-medium bg-muted px-1.5 py-0.2 rounded">
              {filteredOptions.length}
            </span>
          </div>

          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((loc, idx) => {
                const isSelected = loc.toLowerCase() === (value || '').trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={loc}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur before select
                      handleSelect(loc);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors",
                      isHighlighted ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted/60",
                      isSelected && "text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={cn("w-3 h-3 shrink-0", isSelected ? "text-emerald-600" : "text-muted-foreground")} />
                      <span className="truncate">{loc}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground italic flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                No matching locations found
              </div>
            )}

            {/* Custom value option when typing something new */}
            {value.trim() && !exactMatchExists && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(value.trim());
                }}
                className="mt-1 border-t border-border/50 pt-1 px-2.5 py-1.5 text-xs flex items-center gap-2 text-primary font-semibold hover:bg-primary/10 rounded-md cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Use &quot;{value.trim()}&quot; as location</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
