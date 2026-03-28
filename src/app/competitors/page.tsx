"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  Target,
  Eye,
  Sparkles,
  Loader2,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface Competitor {
  name: string;
  isOwn: boolean;
  overallScore: number;
  scores: Record<string, number>;
  totalCitations: number;
  trend: string;
  change: string;
  topKeyword: string;
  strengths: string[];
  weaknesses: string[];
}

export default function CompetitorsPage() {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

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
          keywords: config.keywords.slice(0, 3),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.competitors) setCompetitors(data.competitors);
    } catch (err) {
      console.error("Competitor analysis error:", err);
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Competitor Intelligence</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Compare your AI visibility against competitors
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={runAnalysis} disabled={loading || !configured}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Run Analysis"}
        </Button>
      </div>

      {/* Competitor Comparison Table */}
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Visibility Comparison</CardTitle>
          <CardDescription>Side-by-side comparison across AI platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-3 text-left font-medium text-zinc-500">Brand</th>
                  <th className="pb-3 text-center font-medium text-zinc-500">Overall</th>
                  <th className="pb-3 text-center font-medium text-zinc-500">Score</th>
                  <th className="pb-3 text-center font-medium text-zinc-500">Citations</th>
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
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {comp.name}
                        </span>
                        {comp.isOwn && <Badge variant="info" className="text-[10px]">You</Badge>}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={comp.overallScore >= 75 ? "success" : comp.overallScore >= 65 ? "warning" : "destructive"}>
                        {comp.overallScore}
                      </Badge>
                    </td>
                    <td className="py-3 text-center text-zinc-600 dark:text-zinc-400">{comp.overallScore}/100</td>
                    <td className="py-3 text-center font-medium">{comp.totalCitations}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {comp.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-xs ${comp.trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
                          {comp.change}
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

      {/* Competitor Deep Dive */}
      <div className="grid gap-4 md:grid-cols-2">
        {competitors.filter((c) => !c.isOwn).map((comp) => (
          <Card key={comp.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{comp.name}</CardTitle>
                <Badge variant={comp.overallScore >= 75 ? "success" : "warning"}>
                  Score: {comp.overallScore}
                </Badge>
              </div>
              <CardDescription>Top keyword: &ldquo;{comp.topKeyword}&rdquo;</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 mb-1">Strengths</p>
                  {comp.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-emerald-500">+</span> {s}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Weaknesses</p>
                  {comp.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-red-500">−</span> {w}
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full">
                <Eye className="mr-2 h-3 w-3" />
                Full Analysis
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
