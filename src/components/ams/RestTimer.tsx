import React, { useState, useEffect, useRef } from "react";
import { Timer, X, Play, Pause, RefreshCw, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RestTimerProps {
  initialSeconds?: number;
  onClose: () => void;
}

export default function RestTimer({ initialSeconds = 60, onClose }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [hasFinished, setHasFinished] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setHasFinished(true);
      // Play a subtle sound if possible or a visual pulse
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setTimeLeft(initialSeconds);
    setIsActive(true);
    setHasFinished(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className={cn(
      "glass-dark rounded-2xl p-4 flex flex-col items-center justify-center space-y-3 animate-in zoom-in-95 duration-300",
      hasFinished && "ring-2 ring-primary animate-pulse"
    )}>
      <div className="flex justify-between w-full items-center">
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest text-white/60">Rest Timer</Badge>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-4xl font-black text-white tracking-widest tabular-nums py-2">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>

      {hasFinished ? (
        <div className="flex items-center gap-2 text-primary animate-bounce">
            <Bell className="w-4 h-4 fill-primary" />
            <span className="text-xs font-bold uppercase">Rest Complete!</span>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={toggleTimer} 
          className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl px-4"
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? "Pause" : "Resume"}
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={resetTimer} 
          className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
