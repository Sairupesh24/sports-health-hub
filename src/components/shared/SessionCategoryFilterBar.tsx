import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";

export interface CategoryPillItem {
  key: string;
  label: string;
  count: number;
}

interface SessionCategoryFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  categoryCounts: Record<string, number>;
  className?: string;
}

export const CATEGORY_ITEMS_CONFIG: { key: string; label: string }[] = [
  { key: "all", label: "All Sessions" },
  { key: "physiotherapy", label: "Physiotherapy" },
  { key: "sports_science", label: "Sports Science" },
  { key: "device_assessment", label: "Assessments" },
  { key: "nutrition", label: "Nutrition" },
  { key: "active_recovery", label: "Active Recovery" },
  { key: "other", label: "Other" },
];

export default function SessionCategoryFilterBar({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  className,
}: SessionCategoryFilterBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 1

  // Mouse drag-to-scroll support for desktop/trackpad
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStartLeft, setScrollStartLeft] = useState(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < maxScroll - 2);

    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));
    } else {
      setScrollProgress(0);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScroll, categoryCounts]);

  // Center the active pill on initial load or when selectedCategory changes externally
  useEffect(() => {
    const activeEl = pillRefs.current[selectedCategory];
    if (activeEl && scrollContainerRef.current && !isDragging) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedCategory]);

  const handleScroll = () => {
    checkScroll();
  };

  const scrollByAmount = (delta: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
    haptic.selection();
  };

  // Drag handlers for mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setStartX(e.pageX - el.offsetLeft);
    setScrollStartLeft(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollContainerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollStartLeft - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handlePillClick = (key: string) => {
    if (hasDraggedRef.current) {
      // Was dragging, ignore click
      hasDraggedRef.current = false;
      return;
    }
    onSelectCategory(key);
    haptic.selection();

    // Auto-center clicked pill
    const pillEl = pillRefs.current[key];
    if (pillEl) {
      pillEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  return (
    <div className={cn("relative w-full select-none space-y-1.5", className)}>
      {/* Outer scroller with control buttons and gradient edge indicators */}
      <div className="relative flex items-center group/capsules">
        {/* Left Scroll Chevron */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 z-10 flex items-center pr-2 bg-gradient-to-r from-card via-card/80 to-transparent transition-opacity duration-200",
            canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(-180);
            }}
            aria-label="Scroll categories left"
            className="h-7 w-7 shrink-0 rounded-full bg-background/95 hover:bg-background border border-border shadow-xs flex items-center justify-center text-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Strip */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={cn(
            "w-full flex items-center gap-2 overflow-x-auto py-1 px-1 scroll-smooth no-scrollbar",
            "touch-pan-x touch-pan-y overscroll-x-contain",
            isDragging ? "cursor-grabbing cursor-all-scroll" : "cursor-grab"
          )}
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          {CATEGORY_ITEMS_CONFIG.map((item) => {
            const count = categoryCounts[item.key] ?? 0;
            const isSelected = selectedCategory === item.key;

            return (
              <button
                key={item.key}
                type="button"
                ref={(el) => (pillRefs.current[item.key] = el)}
                onClick={() => handlePillClick(item.key)}
                className={cn(
                  "shrink-0 h-8 px-3 rounded-xl font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 border text-xs leading-none shadow-2xs cursor-pointer",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-xs scale-[1.02]"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60 hover:border-border active:scale-95"
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none transition-colors",
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-background/80 text-muted-foreground border border-border/40"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Chevron */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 z-10 flex items-center pl-2 bg-gradient-to-l from-card via-card/80 to-transparent transition-opacity duration-200",
            canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(180);
            }}
            aria-label="Scroll categories right"
            className="h-7 w-7 shrink-0 rounded-full bg-background/95 hover:bg-background border border-border shadow-xs flex items-center justify-center text-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modern Mini Scroll Progress Track (Matching user screenshot styling) */}
      {(canScrollLeft || canScrollRight) && (
        <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(-150);
            }}
            disabled={!canScrollLeft}
            className="text-[10px] text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-opacity cursor-pointer"
            aria-label="Previous categories"
          >
            ◀
          </button>

          <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden relative max-w-[200px] mx-auto">
            <div
              className="h-full bg-primary/70 rounded-full transition-all duration-150"
              style={{
                width: "40%",
                transform: `translateX(${scrollProgress * 150}%)`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(150);
            }}
            disabled={!canScrollRight}
            className="text-[10px] text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-opacity cursor-pointer"
            aria-label="Next categories"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
