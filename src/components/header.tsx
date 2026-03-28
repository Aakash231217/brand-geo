"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, LogOut, Settings, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  EDITOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  VIEWER: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const SEARCH_ROUTES: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ["dashboard", "home", "overview", "score"], path: "/", label: "Dashboard" },
  { keywords: ["brand", "monitor", "mention", "keyword", "track"], path: "/brand-monitor", label: "Brand Monitor" },
  { keywords: ["analytic", "chart", "metric", "performance"], path: "/analytics", label: "Analytics" },
  { keywords: ["seo", "audit", "url", "optimize"], path: "/ai-seo", label: "AI SEO" },
  { keywords: ["geo", "generative", "citation", "playground"], path: "/geo", label: "GEO Optimizer" },
  { keywords: ["competitor", "compare", "rival"], path: "/competitors", label: "Competitors" },
  { keywords: ["content", "generate", "write", "blog", "article"], path: "/content", label: "Content" },
  { keywords: ["citation", "source", "reference"], path: "/citations", label: "Citations" },
  { keywords: ["setting", "profile", "team", "api", "billing", "notification"], path: "/settings", label: "Settings" },
  { keywords: ["integration", "connect", "slack", "webhook"], path: "/integrations", label: "Integrations" },
];

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof SEARCH_ROUTES>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) { setSearchResults([]); setSearchOpen(false); return; }
    const matches = SEARCH_ROUTES.filter((r) =>
      r.keywords.some((kw) => kw.includes(q)) || r.label.toLowerCase().includes(q)
    );
    setSearchResults(matches);
    setSearchOpen(matches.length > 0);
  }, [searchQuery]);

  const handleSearchSelect = (path: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    router.push(path);
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md" ref={searchRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0) {
                handleSearchSelect(searchResults[0].path);
              }
            }}
            onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50">
              {searchResults.map((r) => (
                <button
                  key={r.path}
                  onClick={() => handleSearchSelect(r.path)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Search className="h-3 w-3 text-zinc-400" />
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" onClick={() => router.push("/brand-monitor")}>
          <Bell className="h-4 w-4" />
        </Button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-zinc-500 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user?.name}</p>
                <p className="text-xs text-zinc-500">{user?.email}</p>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[user?.role || "VIEWER"]}`}
                >
                  <Shield className="h-2.5 w-2.5" />
                  {user?.role}
                </span>
              </div>
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
