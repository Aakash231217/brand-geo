"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  Quote,
  Globe,
  ArrowUpRight,
  Sparkles,
  Bot,
  Search,
  Loader2,
  Download,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";
import type { AIQueryResult } from "@/lib/openrouter";

interface PlatformData {
  name: string;
  score: number;
  mentions: number;
  trend: string;
  icon: string;
}

interface KeywordResult {
  keyword: string;
  platforms: AIQueryResult[];
}

const PLATFORM_ICONS: Record<string, string> = {
  chatgpt: "🤖", gemini: "✨", perplexity: "🔍", claude: "🧠", copilot: "💡", llama: "🌐",
};

const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT", gemini: "Google Gemini", perplexity: "Perplexity", claude: "Claude", copilot: "Microsoft Copilot", llama: "Meta AI",
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [recentActions, setRecentActions] = useState<{ type: string; message: string; time: string; platform: string }[]>([]);
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([]);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  const generateReport = useCallback(() => {
    const config = getBrandConfig();
    const report = {
      generatedAt: new Date().toISOString(),
      brand: config.brandName,
      overallScore,
      platforms: platformData,
      keywords: keywordResults.map((kr) => ({
        keyword: kr.keyword,
        platforms: kr.platforms.map((p) => ({
          platform: p.platform,
          mentionsBrand: p.mentionsBrand,
          sentiment: p.sentiment,
        })),
      })),
      recentActivity: recentActions,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [overallScore, platformData, keywordResults, recentActions]);

  const runAnalysis = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName || !config.keywords.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/brand-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: config.brandName, keywords: config.keywords.slice(0, 3) }),
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      setOverallScore(data.overallScore || 0);

      // Build platform data
      const platforms: PlatformData[] = Object.entries(data.platformScores || {}).map(
        ([key, val]: [string, unknown]) => {
          const v = val as { score: number; mentions: number; sentiment: string };
          return {
            name: PLATFORM_NAMES[key] || key,
            score: v.score,
            mentions: v.mentions,
            trend: v.sentiment === "positive" ? "up" : "down",
            icon: PLATFORM_ICONS[key] || "🌐",
          };
        }
      );
      setPlatformData(platforms);

      // Build recent actions from keyword results
      const actions: { type: string; message: string; time: string; platform: string }[] = [];
      for (const kr of data.keywordResults || []) {
        for (const r of kr.platforms || []) {
          if (r.mentionsBrand) {
            actions.push({
              type: "citation",
              message: `Brand mentioned by ${PLATFORM_NAMES[r.platform] || r.platform} for "${kr.keyword}"`,
              time: "Just now",
              platform: PLATFORM_NAMES[r.platform] || r.platform,
            });
          } else {
            actions.push({
              type: "alert",
              message: `Not mentioned by ${PLATFORM_NAMES[r.platform] || r.platform} for "${kr.keyword}" — optimization opportunity`,
              time: "Just now",
              platform: PLATFORM_NAMES[r.platform] || r.platform,
            });
          }
        }
      }
      setRecentActions(actions.slice(0, 8));
      setKeywordResults(data.keywordResults || []);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setConfigured(isConfigured());
    // Load last results from DB
    const config = getBrandConfig();
    if (config.brandName) {
      fetch(`/api/history?brand=${encodeURIComponent(config.brandName)}&type=dashboard`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data?.latestVisibility) return;
          const snap = data.latestVisibility;
          setOverallScore(snap.overallScore || 0);
          const platforms: PlatformData[] = Object.entries(snap.platformScores || {}).map(
            ([key, val]: [string, unknown]) => {
              const v = val as { score: number; mentions: number; sentiment: string };
              return {
                name: PLATFORM_NAMES[key] || key,
                score: v.score,
                mentions: v.mentions,
                trend: v.sentiment === "positive" ? "up" : "down",
                icon: PLATFORM_ICONS[key] || "🌐",
              };
            }
          );
          setPlatformData(platforms);
        })
        .catch(() => {});
    }
  }, []);

  const totalMentions = platformData.reduce((sum, p) => sum + p.mentions, 0);
  const positivePlatforms = platformData.filter((p) => p.trend === "up").length;

  const stats = [
    {
      title: "AI Visibility Score",
      value: overallScore.toString(),
      suffix: "/100",
      change: configured ? (overallScore > 50 ? "+" + (overallScore - 50) : String(overallScore - 50)) : "—",
      trend: overallScore >= 50 ? ("up" as const) : ("down" as const),
      description: "Across all AI platforms",
      icon: Eye,
      color: "from-violet-500 to-indigo-500",
    },
    {
      title: "Brand Mentions",
      value: totalMentions.toString(),
      change: configured ? `${totalMentions} found` : "—",
      trend: "up" as const,
      description: "Across AI responses",
      icon: MessageSquare,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Platforms Positive",
      value: positivePlatforms.toString(),
      suffix: `/${platformData.length}`,
      change: configured ? `${positivePlatforms} positive` : "—",
      trend: positivePlatforms > platformData.length / 2 ? ("up" as const) : ("down" as const),
      description: "Sentiment breakdown",
      icon: Quote,
      color: "from-emerald-500 to-teal-500",
    },
    {
      title: "Keywords Tracked",
      value: keywordResults.length.toString(),
      change: configured ? "Live data" : "—",
      trend: "up" as const,
      description: "Active monitoring",
      icon: Globe,
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Monitor your brand&apos;s visibility across AI platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading || !configured}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {loading ? "Analyzing..." : "Run Analysis"}
          </Button>
          <Button variant="brand" size="sm" disabled={!configured || platformData.length === 0} onClick={generateReport}>
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="animate-fade-in-delay">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.title}
              </CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</span>
                {stat.suffix && (
                  <span className="text-lg text-zinc-400 dark:text-zinc-500">{stat.suffix}</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-zinc-400">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Platform Visibility */}
        <Card className="lg:col-span-2 animate-fade-in-delay-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">AI Platform Visibility</CardTitle>
                <CardDescription>Your brand&apos;s presence across major AI engines</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/brand-monitor")}>
                View All <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-8">
                  Click &quot;Run Analysis&quot; to see real AI platform data
                </p>
              )}
              {platformData.map((platform) => (
                <div key={platform.name} className="flex items-center gap-4">
                  <span className="text-2xl w-8">{platform.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {platform.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{platform.mentions} mentions</span>
                        <Badge
                          variant={platform.trend === "up" ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {platform.trend === "up" ? "↑" : "↓"} {platform.score}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={platform.score} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-fade-in-delay-3">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest AI visibility events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActions.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-8">
                  Run an analysis to see recent activity
                </p>
              )}
              {recentActions.map((action, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                      action.type === "citation"
                        ? "bg-emerald-500"
                        : action.type === "alert"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  >
                    {action.type === "citation" ? (
                      <Quote className="h-3 w-3" />
                    ) : action.type === "alert" ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {action.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {action.platform}
                      </Badge>
                      <span className="text-[10px] text-zinc-400">{action.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Keywords Table */}
      <Card className="animate-fade-in-delay-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Top AI Keywords</CardTitle>
              <CardDescription>Keywords where your brand appears in AI responses</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/brand-monitor")}>
              View All Keywords <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Keyword</th>
                  <th className="pb-3 text-center font-medium text-zinc-500 dark:text-zinc-400">Mention Rate</th>
                  <th className="pb-3 text-center font-medium text-zinc-500 dark:text-zinc-400">Mentions</th>
                  <th className="pb-3 text-center font-medium text-zinc-500 dark:text-zinc-400">Visibility</th>
                  <th className="pb-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {keywordResults.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-zinc-400">
                      Run an analysis to see keyword data
                    </td>
                  </tr>
                )}
                {keywordResults.map((kr) => {
                  const mentions = kr.platforms.filter((p) => p.mentionsBrand).length;
                  const total = kr.platforms.length;
                  const mentionRate = total > 0 ? Math.round((mentions / total) * 100) : 0;
                  return (
                    <tr key={kr.keyword} className="border-b border-zinc-100 dark:border-zinc-900">
                      <td className="py-3 font-medium text-zinc-900 dark:text-zinc-100">{kr.keyword}</td>
                      <td className="py-3 text-center">
                        <Badge variant={mentionRate >= 60 ? "success" : mentionRate >= 30 ? "warning" : "destructive"}>
                          {mentionRate}%
                        </Badge>
                      </td>
                      <td className="py-3 text-center text-zinc-600 dark:text-zinc-400">{mentions}/{total}</td>
                      <td className="py-3 text-center">
                        <Badge variant={mentions >= 4 ? "success" : mentions >= 2 ? "warning" : "destructive"}>
                          {mentions >= 4 ? "strong" : mentions >= 2 ? "moderate" : "weak"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedKeyword(expandedKeyword === kr.keyword ? null : kr.keyword)}>
                          {expandedKeyword === kr.keyword ? "Hide" : "Details"}
                        </Button>
                      </td>
                    </tr>
                    {expandedKeyword === kr.keyword && (
                      <tr className="border-b border-zinc-100 dark:border-zinc-900">
                        <td colSpan={5} className="py-3 px-4 bg-zinc-50 dark:bg-zinc-900/50">
                          <div className="grid gap-2 md:grid-cols-3">
                            {kr.platforms.map((p) => (
                              <div key={p.platform} className="flex items-center gap-2 text-xs">
                                <span>{PLATFORM_ICONS[p.platform] || "🌐"}</span>
                                <span className="font-medium">{PLATFORM_NAMES[p.platform] || p.platform}</span>
                                <Badge variant={p.mentionsBrand ? "success" : "destructive"} className="text-[10px]">
                                  {p.mentionsBrand ? "Mentioned" : "Not found"}
                                </Badge>
                                <span className="text-zinc-400">{p.sentiment}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
