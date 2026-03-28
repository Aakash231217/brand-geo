"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Eye,
  MessageSquare,
  Quote,
  Loader2,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface PlatformMetric {
  name: string;
  citations: number;
  mentions: number;
  score: number;
  change: string;
  color: string;
}

interface QueryMetric {
  query: string;
  citations: number;
  position: number;
  trend: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  chatgpt: "bg-emerald-500", gemini: "bg-blue-500", perplexity: "bg-violet-500",
  claude: "bg-amber-500", copilot: "bg-rose-500", llama: "bg-sky-500",
};

export default function AnalyticsPage() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [totalMentions, setTotalMentions] = useState(0);
  const [totalCitations, setTotalCitations] = useState(0);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetric[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<QueryMetric[]>([]);

  useEffect(() => { setConfigured(isConfigured()); }, []);

  const runAnalytics = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName || !config.keywords.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/brand-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: config.brandName,
          keywords: config.keywords.slice(0, 5),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      setOverallScore(data.overallScore || 0);

      // Build platform metrics from platformScores
      const pScores = data.platformScores || {};
      const pMetrics: PlatformMetric[] = Object.entries(pScores).map(([name, val]: [string, unknown]) => {
        const v = val as { score: number; mentions: number; sentiment: string; citations?: number };
        return {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          score: v.score,
          mentions: v.mentions,
          citations: v.citations ?? 0,
          change: v.sentiment === "positive" ? "+5" : v.sentiment === "negative" ? "-3" : "+0",
          color: PLATFORM_COLORS[name.toLowerCase()] || "bg-zinc-500",
        };
      });
      setPlatformMetrics(pMetrics);
      setTotalMentions(pMetrics.reduce((a, p) => a + p.mentions, 0));
      setTotalCitations(pMetrics.reduce((a, p) => a + p.citations, 0));

      // Build query metrics from keywordResults
      const kResults = data.keywordResults || [];
      const qMetrics: QueryMetric[] = kResults.map((kr: { keyword: string; platforms: { mentionsBrand: boolean; citesSource: boolean }[] }, idx: number) => ({
        query: kr.keyword,
        citations: kr.platforms.filter((p: { citesSource: boolean }) => p.citesSource).length,
        position: idx + 1,
        trend: kr.platforms.filter((p: { mentionsBrand: boolean }) => p.mentionsBrand).length > kr.platforms.length / 2 ? "up" : "down",
      }));
      setQueryMetrics(qMetrics);
    } catch (err) {
      console.error("Analytics error:", err);
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Deep insights into your AI platform performance
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={runAnalytics} disabled={loading || !configured}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Run Analytics"}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Eye className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{overallScore}</p>
            <p className="text-xs text-zinc-500 mt-1">AI Visibility Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Quote className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalCitations}</p>
            <p className="text-xs text-zinc-500 mt-1">Total AI Citations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <MessageSquare className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalMentions}</p>
            <p className="text-xs text-zinc-500 mt-1">Brand Mentions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Zap className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{platformMetrics.length}</p>
            <p className="text-xs text-zinc-500 mt-1">Platforms Tracked</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {platformMetrics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-zinc-500">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No analytics data yet</p>
                <p className="text-sm mt-1">Click &quot;Run Analytics&quot; to gather platform data</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Platform Score Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Visibility Scores</CardTitle>
                <CardDescription>AI visibility score per platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-48">
                  {platformMetrics.map((p) => (
                    <div key={p.name} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-400">{p.score}</span>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-violet-600 to-indigo-500 transition-all"
                        style={{ height: `${p.score}%` }}
                      />
                      <span className="text-[10px] text-zinc-400 truncate max-w-full">
                        {p.name.slice(0, 6)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mentions vs Citations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mentions vs Citations</CardTitle>
                <CardDescription>Per-platform mention and citation counts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platformMetrics.map((p) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${p.color}`} />
                      <span className="text-sm font-medium w-20">{p.name}</span>
                      <div className="flex-1 flex gap-2 items-center">
                        <span className="text-xs text-zinc-500 w-20">{p.mentions} mentions</span>
                        <span className="text-xs text-violet-600 font-medium">{p.citations} citations</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform-by-Platform Breakdown</CardTitle>
              <CardDescription>Performance across each AI platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {platformMetrics.map((p) => (
                  <div key={p.name} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${p.color}`} />
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</h4>
                      </div>
                      <Badge variant="success">{p.change}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{p.score}</p>
                        <p className="text-xs text-zinc-400">Visibility Score</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{p.citations}</p>
                        <p className="text-xs text-zinc-400">Citations</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{p.mentions.toLocaleString()}</p>
                        <p className="text-xs text-zinc-400">Mentions</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Queries Tab */}
        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top AI Queries</CardTitle>
              <CardDescription>Queries where your brand appears in AI responses</CardDescription>
            </CardHeader>
            <CardContent>
              {queryMetrics.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <Eye className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No query data yet. Run analytics to populate.</p>
                </div>
              ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-3 text-left font-medium text-zinc-500">Query</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Citations</th>
                    <th className="pb-3 text-center font-medium text-zinc-500">Position</th>
                    <th className="pb-3 text-center font-medium text-zinc-500">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {queryMetrics.map((q) => (
                    <tr key={q.query} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">{q.query}</td>
                      <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">{q.citations}</td>
                      <td className="py-3 text-center">
                        <Badge variant={q.position <= 2 ? "success" : q.position <= 4 ? "warning" : "secondary"}>
                          #{q.position}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        {q.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Performance Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Performance Summary</CardTitle>
              <CardDescription>How your brand performs across each AI platform</CardDescription>
            </CardHeader>
            <CardContent>
              {platformMetrics.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No data yet. Run analytics first.</p>
                </div>
              ) : (
              <div className="space-y-3">
                {platformMetrics.map((p) => (
                  <div key={p.name} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${p.color}`} />
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{p.name}</h4>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>{p.mentions} mentions</span>
                          <span>•</span>
                          <span>{p.citations} citations</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-violet-600">{p.score}</p>
                        <p className="text-[10px] text-zinc-400">visibility score</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
