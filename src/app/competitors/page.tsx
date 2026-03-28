"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  Loader2,
  Search,
  Bot,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface Competitor {
  name: string;
  isOwn: boolean;
  overallScore: number;
  serpScore?: number;
  aiScore?: number;
  scores: Record<string, number>;
  totalCitations: number;
  trend: string;
  change: string;
  topKeyword: string;
  strengths: string[];
  weaknesses: string[];
}

interface KeywordBattle {
  keyword: string;
  positions: { brand: string; position: number | null; url?: string }[];
  winner?: string;
}

interface Insight {
  type: "opportunity" | "threat" | "strength";
  title: string;
  description: string;
}

interface RealRanking {
  keyword: string;
  rankings: { name: string; rank: number | null; url: string; snippet: string; topResult?: string }[];
  topResults?: { title: string; url: string; description: string; rank: number }[];
}

interface AIVisibility {
  brand: string;
  platforms: { platform: string; mentioned: boolean; sentiment: string; position: string }[];
}

export default function CompetitorsPage() {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [keywordBattles, setKeywordBattles] = useState<KeywordBattle[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [realRankings, setRealRankings] = useState<RealRanking[]>([]);
  const [aiVisibility, setAiVisibility] = useState<AIVisibility[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "serp" | "ai" | "battles">("overview");

  useEffect(() => { setConfigured(isConfigured()); }, []);

  const runAnalysis = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName || !config.competitors.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: config.brandName,
          competitors: config.competitors,
          industry: config.industry,
          keywords: config.keywords.slice(0, 5),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.competitors) setCompetitors(data.competitors);
      if (data.keywordBattles) setKeywordBattles(data.keywordBattles);
      if (data.insights) setInsights(data.insights);
      if (data.realRankings) setRealRankings(data.realRankings);
      if (data.aiVisibility) setAiVisibility(data.aiVisibility);
    } catch (err) {
      console.error("Competitor analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const PLATFORM_LABELS: Record<string, string> = {
    chatgpt: "ChatGPT", gemini: "Gemini", perplexity: "Perplexity", claude: "Claude",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Competitor Intelligence</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Real SERP rankings + AI platform visibility comparison
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={runAnalysis} disabled={loading || !configured}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing (this takes ~30s)..." : "Run Analysis"}
        </Button>
      </div>

      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No competitor data yet</p>
            <p className="text-sm mt-1">Add competitors in Settings, then click &quot;Run Analysis&quot;</p>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
        {(["overview", "serp", "ai", "battles"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "overview" && "Overview"}
            {tab === "serp" && "🔍 SERP Rankings"}
            {tab === "ai" && "🤖 AI Visibility"}
            {tab === "battles" && "⚔️ Keyword Battles"}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === "overview" && (
        <>
          {/* Score Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Competitive Scorecard</CardTitle>
              <CardDescription>Based on real Google SERP data + AI platform tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="pb-3 text-left font-medium text-zinc-500">Brand</th>
                      <th className="pb-3 text-center font-medium text-zinc-500">Overall</th>
                      <th className="pb-3 text-center font-medium text-zinc-500">SERP</th>
                      <th className="pb-3 text-center font-medium text-zinc-500">AI</th>
                      {Object.keys(PLATFORM_LABELS).map((p) => (
                        <th key={p} className="pb-3 text-center font-medium text-zinc-500">{PLATFORM_LABELS[p]}</th>
                      ))}
                      <th className="pb-3 text-center font-medium text-zinc-500">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((comp) => (
                      <tr
                        key={comp.name}
                        className={`border-b border-zinc-100 dark:border-zinc-900 ${
                          comp.isOwn ? "bg-violet-50/50 dark:bg-violet-950/10" : ""
                        }`}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{comp.name}</span>
                            {comp.isOwn && <Badge variant="info" className="text-[10px]">You</Badge>}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={comp.overallScore >= 70 ? "success" : comp.overallScore >= 40 ? "warning" : "destructive"}>
                            {comp.overallScore}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-medium ${(comp.serpScore ?? 0) >= 50 ? "text-emerald-600" : "text-red-500"}`}>
                            {comp.serpScore ?? "–"}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-xs font-medium ${(comp.aiScore ?? 0) >= 50 ? "text-emerald-600" : "text-red-500"}`}>
                            {comp.aiScore ?? "–"}
                          </span>
                        </td>
                        {Object.keys(PLATFORM_LABELS).map((p) => (
                          <td key={p} className="py-3 text-center">
                            <span className="text-xs text-zinc-500">{comp.scores?.[p] ?? "–"}</span>
                          </td>
                        ))}
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {comp.trend === "up" ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : comp.trend === "down" ? (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                            <span className={`text-xs ${comp.trend === "up" ? "text-emerald-600" : comp.trend === "down" ? "text-red-600" : "text-zinc-400"}`}>
                              {comp.change || comp.trend}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {insights.map((insight, i) => (
                <Card key={i} className={`border-l-4 ${
                  insight.type === "opportunity" ? "border-l-blue-500" :
                  insight.type === "threat" ? "border-l-red-500" : "border-l-emerald-500"
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      {insight.type === "opportunity" && <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                      {insight.type === "threat" && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                      {insight.type === "strength" && <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{insight.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            {competitors.map((comp) => (
              <Card key={comp.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{comp.name}</CardTitle>
                    <Badge variant={comp.overallScore >= 70 ? "success" : comp.overallScore >= 40 ? "warning" : "destructive"}>
                      {comp.overallScore}/100
                    </Badge>
                  </div>
                  {comp.topKeyword && <CardDescription>Best keyword: &ldquo;{comp.topKeyword}&rdquo;</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comp.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 mb-1">Strengths</p>
                        {comp.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="text-emerald-500 shrink-0">+</span> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {comp.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 mb-1">Weaknesses</p>
                        {comp.weaknesses.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="text-red-500 shrink-0">−</span> {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ===== SERP RANKINGS TAB ===== */}
      {activeTab === "serp" && (
        <>
          {realRankings.length > 0 ? (
            realRankings.map((kr) => (
              <Card key={kr.keyword}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4 text-zinc-400" />
                    &ldquo;{kr.keyword}&rdquo;
                  </CardTitle>
                  <CardDescription>Real Google SERP positions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {kr.rankings
                      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                      .map((r) => {
                        const isOwn = r.name === getBrandConfig().brandName;
                        return (
                          <div
                            key={r.name}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              isOwn ? "bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800" : "bg-zinc-50 dark:bg-zinc-900"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                r.rank
                                  ? r.rank <= 3 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                  : r.rank <= 10 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700"
                              }`}>
                                {r.rank ? `#${r.rank}` : "–"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{r.name}</span>
                                  {isOwn && <Badge variant="info" className="text-[10px]">You</Badge>}
                                </div>
                                {r.snippet && (
                                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 max-w-md">{r.snippet}</p>
                                )}
                              </div>
                            </div>
                            {r.url && (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 shrink-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="hidden sm:inline max-w-[200px] truncate">{r.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                  </div>
                  {/* Top results for context */}
                  {kr.topResults && kr.topResults.length > 0 && (
                    <details className="mt-4">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-700">
                        View top {kr.topResults.length} SERP results for context
                      </summary>
                      <div className="mt-2 space-y-1">
                        {kr.topResults.slice(0, 10).map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                            <span className="text-zinc-400 w-5 text-right">#{r.rank || i + 1}</span>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate">
                              {r.title}
                            </a>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-zinc-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">SERP ranking data will appear after running analysis</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ===== AI VISIBILITY TAB ===== */}
      {activeTab === "ai" && (
        <>
          {aiVisibility.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Platform Mention Test
                </CardTitle>
                <CardDescription>
                  We asked AI platforms to compare your brand with competitors — here&apos;s who got mentioned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="pb-3 text-left font-medium text-zinc-500">Brand</th>
                        {aiVisibility[0]?.platforms.map((p) => (
                          <th key={p.platform} className="pb-3 text-center font-medium text-zinc-500">
                            {PLATFORM_LABELS[p.platform] || p.platform}
                          </th>
                        ))}
                        <th className="pb-3 text-center font-medium text-zinc-500">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiVisibility.map((v) => {
                        const isOwn = v.brand === getBrandConfig().brandName;
                        const mentionCount = v.platforms.filter((p) => p.mentioned).length;
                        const score = Math.round((mentionCount / v.platforms.length) * 100);
                        return (
                          <tr
                            key={v.brand}
                            className={`border-b border-zinc-100 dark:border-zinc-900 ${
                              isOwn ? "bg-violet-50/50 dark:bg-violet-950/10" : ""
                            }`}
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{v.brand}</span>
                                {isOwn && <Badge variant="info" className="text-[10px]">You</Badge>}
                              </div>
                            </td>
                            {v.platforms.map((p) => (
                              <td key={p.platform} className="py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {p.mentioned ? (
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-400" />
                                  )}
                                  {p.mentioned && (
                                    <span className="text-[10px] text-zinc-500">{p.position}</span>
                                  )}
                                  {p.mentioned && (
                                    <Badge
                                      variant={p.sentiment === "positive" ? "success" : p.sentiment === "negative" ? "destructive" : "secondary"}
                                      className="text-[9px] px-1"
                                    >
                                      {p.sentiment}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            ))}
                            <td className="py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg font-bold ${score >= 67 ? "text-emerald-600" : score >= 33 ? "text-yellow-600" : "text-red-500"}`}>
                                  {score}%
                                </span>
                                <span className="text-[10px] text-zinc-500">{mentionCount}/{v.platforms.length} platforms</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-zinc-500">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">AI visibility data will appear after running analysis</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ===== KEYWORD BATTLES TAB ===== */}
      {activeTab === "battles" && (
        <>
          {keywordBattles.length > 0 ? (
            keywordBattles.map((battle) => (
              <Card key={battle.keyword}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">&ldquo;{battle.keyword}&rdquo;</CardTitle>
                    {battle.winner && (
                      <Badge variant="success" className="text-xs">
                        Winner: {battle.winner}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {battle.positions
                      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
                      .map((pos) => {
                        const isOwn = pos.brand === getBrandConfig().brandName;
                        return (
                          <div key={pos.brand} className="flex items-center gap-3">
                            <div className={`w-20 text-right text-sm font-medium ${
                              pos.position
                                ? pos.position <= 3 ? "text-emerald-600" : pos.position <= 10 ? "text-yellow-600" : "text-red-500"
                                : "text-zinc-400"
                            }`}>
                              {pos.position ? `#${pos.position}` : "Not found"}
                            </div>
                            <div className="flex-1">
                              <Progress
                                value={pos.position ? Math.max(5, 100 - (pos.position - 1) * 10) : 0}
                                className="h-6"
                              />
                            </div>
                            <div className="w-28 flex items-center gap-1">
                              <span className={`text-sm ${isOwn ? "font-bold text-violet-600" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {pos.brand}
                              </span>
                              {isOwn && <Badge variant="info" className="text-[9px]">You</Badge>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-zinc-500">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Keyword battle data will appear after running analysis</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
