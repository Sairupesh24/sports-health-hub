import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

export const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, minRows = 2, onChange, value, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);

    const updateHeight = () => {
      const target = internalRef.current;
      if (target) {
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
      }
    };

    useEffect(() => {
      updateHeight();
    }, [value]);

    return (
      <textarea
        {...props}
        ref={(node) => {
          // @ts-ignore
          internalRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        value={value}
        onChange={(e) => {
          updateHeight();
          if (onChange) {
            onChange(e);
          }
        }}
        rows={minRows}
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden text-[16px]", // 16px min for iOS zoom prevention
          className
        )}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";
