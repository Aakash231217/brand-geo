"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ExternalLink,
  TrendingUp,
  Filter,
  Download,
  Quote,
  Globe,
  Clock,
  Loader2,
  Search,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT", gemini: "Google Gemini", perplexity: "Perplexity", claude: "Claude", copilot: "Microsoft Copilot", llama: "Meta AI",
};

const COLORS = [
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-zinc-400 to-zinc-500",
];

interface Citation {
  platform: string;
  query: string;
  citedContent: string;
  sourcePage: string;
  type: string;
  sentiment: string;
  date: string;
  verified: boolean;
}

export default function CitationsPage() {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [platformBreakdown, setPlatformBreakdown] = useState<{ name: string; citations: number; percentage: number; color: string }[]>([]);
  const [citationStats, setCitationStats] = useState({ total: 0, thisMonth: 0, growth: "—", topPlatform: "—", topQuery: "—" });

  useEffect(() => { setConfigured(isConfigured()); }, []);

  const runScan = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName || !config.keywords.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/brand-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: config.brandName, keywords: config.keywords.slice(0, 3) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const citList: Citation[] = [];
      const platCounts: Record<string, number> = {};

      for (const kr of data.keywordResults || []) {
        for (const r of kr.platforms || []) {
          if (r.mentionsBrand) {
            const pName = PLATFORM_NAMES[r.platform] || r.platform;
            platCounts[pName] = (platCounts[pName] || 0) + 1;
            citList.push({
              platform: pName,
              query: kr.keyword,
              citedContent: r.response?.substring(0, 400) || "",
              sourcePage: config.brandUrl || "/",
              type: r.sentiment === "positive" ? "recommendation" : "description",
              sentiment: r.sentiment || "neutral",
              date: "Just now",
              verified: true,
            });
          }
        }
      }

      setCitations(citList);
      const total = citList.length;
      const topPlat = Object.entries(platCounts).sort((a, b) => b[1] - a[1])[0];
      setCitationStats({
        total,
        thisMonth: total,
        growth: `${total} found`,
        topPlatform: topPlat?.[0] || "—",
        topQuery: data.keywordResults?.[0]?.keyword || "—",
      });

      const breakdown = Object.entries(platCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], i) => ({
          name,
          citations: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          color: COLORS[i % COLORS.length],
        }));
      setPlatformBreakdown(breakdown);
    } catch (err) {
      console.error("Citation scan error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">AI Citations</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track every time AI platforms cite or mention your brand
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={runScan} disabled={loading || !configured}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {loading ? "Scanning..." : "Scan Citations"}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Citations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{citationStats.total.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-600">{citationStats.growth} this month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{citationStats.thisMonth}</div>
            <Progress value={(citationStats.thisMonth / citationStats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Top Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{citationStats.topPlatform}</div>
            <p className="text-xs text-zinc-400 mt-1">Most citations from</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Top Query</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">&ldquo;{citationStats.topQuery}&rdquo;</div>
            <p className="text-xs text-zinc-400 mt-1">Most cited for</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Citations by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {platformBreakdown.map((platform) => (
              <div key={platform.name} className="flex items-center gap-4">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 w-32">{platform.name}</span>
                <div className="flex-1">
                  <div className="h-6 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${platform.color} transition-all duration-500`}
                      style={{ width: `${platform.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 w-20 text-right">
                  {platform.citations} ({platform.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Citation Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Citation Feed</CardTitle>
              <CardDescription>Real-time tracking of AI citations</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {citations.map((citation, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-800 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{citation.platform}</Badge>
                    <Badge
                      variant={citation.type === "recommendation" ? "success" : citation.type === "statistic" ? "info" : "secondary"}
                    >
                      {citation.type}
                    </Badge>
                    <Badge
                      variant={citation.sentiment === "positive" ? "success" : citation.sentiment === "negative" ? "destructive" : "secondary"}
                    >
                      {citation.sentiment}
                    </Badge>
                    {citation.verified && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {citation.date}
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-xs text-zinc-500 mb-1">
                    <Globe className="h-3 w-3 inline mr-1" />
                    Query: &ldquo;{citation.query}&rdquo;
                  </p>
                  <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900 border-l-2 border-violet-500">
                    <Quote className="h-3 w-3 text-violet-400 mb-1" />
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                      {citation.citedContent}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Source: {citation.sourcePage}</span>
                  <Button variant="ghost" size="sm" className="text-xs">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View Context
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
