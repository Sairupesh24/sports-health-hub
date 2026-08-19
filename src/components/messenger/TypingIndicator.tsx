import React from "react";

interface Props {
  names: string[];
}

const TypingIndicator: React.FC<Props> = ({ names }) => {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-6 py-1.5 text-xs text-slate-500 bg-slate-50/80 border-t border-slate-100">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
      <span className="italic text-[11px] font-medium text-slate-600">{label}…</span>
    </div>
  );
};

export default TypingIndicator;
