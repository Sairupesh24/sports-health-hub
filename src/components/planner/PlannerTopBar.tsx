import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LayoutGrid,
  LogOut,
  UserCircle,
  Settings,
  X,
  Orbit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface PlannerTopBarProps {
  onMobileMenuToggle: () => void;
}

export default function PlannerTopBar({ onMobileMenuToggle }: PlannerTopBarProps) {
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0 z-40">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onMobileMenuToggle}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Mobile brand */}
      <div className="md:hidden flex items-center gap-2 flex-1">
        <div
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(174 72% 40%), hsl(251 74% 60%))" }}
        >
          <Orbit className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-display font-bold text-sm text-foreground">OrbitFlow</span>
      </div>

      {/* Search — desktop inline */}
      <div className="hidden md:flex flex-1 max-w-md">
        {searchOpen ? (
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, work items, people…"
              className="pl-9 pr-8 h-8 text-sm border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            <button
              onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 h-8 text-sm text-muted-foreground bg-muted/50 border border-border/50 rounded-lg hover:bg-muted transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search…</span>
            <span className="ml-2 text-xs border border-border/50 rounded px-1.5 py-0.5 font-mono opacity-60">
              ⌘K
            </span>
          </button>
        )}
      </div>

      {/* Spacer on mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {/* Search icon on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-background"
            style={{ background: "hsl(var(--planner-primary))" }}
          />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 pl-1 pr-2 gap-1.5 rounded-lg">
              <Avatar className="w-6 h-6">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback
                  className="text-[10px] font-bold"
                  style={{ background: "hsl(var(--planner-primary))", color: "white" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-xs font-medium max-w-[100px] truncate">
                {profile?.first_name}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-sm font-semibold">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/planner/settings")}>
              <Settings className="w-4 h-4 mr-2" />
              Planner Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/app-gallery")}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              App Gallery
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
