"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Sparkles,
  Target,
  Layers,
  BookOpen,
  MessageSquare,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Wand2,
  Loader2,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface GEOStrategy {
  name: string;
  description: string;
  score: number;
  status: string;
  tips: string[];
}

interface PageOptimization {
  page: string;
  title: string;
  currentScore: number;
  potentialScore: number;
  issues: { type: string; text: string }[];
}

export default function GEOPage() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoStrategies, setGeoStrategies] = useState<GEOStrategy[]>([]);
  const [contentOptimizations, setContentOptimizations] = useState<PageOptimization[]>([]);

  // Playground state
  const [playgroundInput, setPlaygroundInput] = useState("");
  const [playgroundOutput, setPlaygroundOutput] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("strategies");

  useEffect(() => { setConfigured(isConfigured()); }, []);

  const geoOverallScore = geoStrategies.length > 0
    ? Math.round(geoStrategies.reduce((acc, s) => acc + s.score, 0) / geoStrategies.length)
    : 0;

  const runAnalysis = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/geo-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: config.brandName,
          url: config.brandUrl || "",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.strategies) setGeoStrategies(data.strategies);
      if (data.contentOptimizations) setContentOptimizations(data.contentOptimizations);
    } catch (err) {
      console.error("GEO analysis error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const optimizeContent = useCallback(async () => {
    if (!playgroundInput.trim()) return;
    setPlaygroundLoading(true);
    setPlaygroundOutput("");
    try {
      const config = getBrandConfig();
      const res = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "chatgpt",
          query: `You are a GEO (Generative Engine Optimization) expert. Rewrite the following content to maximize AI citations. Apply these techniques: authoritative language, structured data hints, source credibility, quotable takeaways. Brand: ${config.brandName || "our brand"}.\n\nOriginal content:\n${playgroundInput}`,
          brandName: config.brandName || "Brand",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPlaygroundOutput(data.response || JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Optimize error:", err);
      setPlaygroundOutput("Error optimizing content.");
    } finally {
      setPlaygroundLoading(false);
    }
  }, [playgroundInput]);
  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">GEO Optimizer</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Generative Engine Optimization — Make AI models cite and recommend your brand
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={runAnalysis} disabled={loading || !configured}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Run GEO Analysis"}
        </Button>
      </div>

      {geoStrategies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No GEO analysis data yet</p>
            <p className="text-sm mt-1">Click &quot;Run GEO Analysis&quot; to analyze your brand&apos;s GEO optimization</p>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* GEO Score Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200 dark:border-violet-800">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <svg className="h-32 w-32" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e4e4e7" strokeWidth="6" className="dark:stroke-zinc-800" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#geoGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(geoOverallScore / 100) * 283} 283`}
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="geoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-violet-700 dark:text-violet-400">{geoOverallScore}</span>
                <span className="text-xs text-zinc-500">GEO Score</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">GEO Strategy Scores</CardTitle>
            <CardDescription>Your performance across key generative optimization pillars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {geoStrategies.map((strategy) => (
                <div key={strategy.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{strategy.name}</span>
                      <Badge
                        variant={
                          strategy.status === "strong" ? "success" :
                          strategy.status === "good" ? "info" :
                          strategy.status === "needs-work" ? "warning" : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {strategy.score}%
                      </Badge>
                    </div>
                    <Progress value={strategy.score} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="strategies" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="strategies">GEO Strategies</TabsTrigger>
          <TabsTrigger value="pages">Page Optimizations</TabsTrigger>
          <TabsTrigger value="playground">Content Playground</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies">
          <div className="grid gap-4 md:grid-cols-2">
            {geoStrategies.map((strategy) => (
              <Card key={strategy.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{strategy.name}</CardTitle>
                    <Badge
                      variant={
                        strategy.status === "strong" ? "success" :
                        strategy.status === "good" ? "info" :
                        strategy.status === "needs-work" ? "warning" : "destructive"
                      }
                    >
                      {strategy.score}/100
                    </Badge>
                  </div>
                  <CardDescription>{strategy.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {strategy.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{tip}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      setPlaygroundInput(`Strategy: ${strategy.name}\n\nCurrent score: ${strategy.score}/100\nStatus: ${strategy.status}\n\nTips to implement:\n${strategy.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nPlease optimize the following content to apply these recommendations:\n`);
                      setPlaygroundOutput("");
                      setActiveTab("playground");
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Implement Changes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Page-by-Page GEO Optimization</CardTitle>
              <CardDescription>Specific optimization suggestions for each page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentOptimizations.map((page) => (
                  <div
                    key={page.page}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {page.title}
                        </h4>
                        <p className="text-xs text-zinc-400">{page.page}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-zinc-500">Current → Potential</div>
                          <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{page.currentScore}</span>
                            <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            <span className="text-lg font-bold text-emerald-600">{page.potentialScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {page.issues.map((issue, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {issue.type === "missing" ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">{issue.text}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setPlaygroundInput(`Page: ${page.title} (${page.page})\nCurrent score: ${page.currentScore} → Potential: ${page.potentialScore}\n\nIssues to fix:\n${page.issues.map((iss) => `- [${iss.type}] ${iss.text}`).join("\n")}\n\nPlease optimize the following page content to address the issues above:\n`);
                        setPlaygroundOutput("");
                        setActiveTab("playground");
                      }}
                    >
                      <Wand2 className="mr-2 h-3 w-3" />
                      Optimize Page
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playground">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Optimization Playground</CardTitle>
              <CardDescription>
                Paste your content below and get AI-powered GEO suggestions in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Original Content
                  </label>
                  <textarea
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    className="h-64 w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 resize-none"
                    placeholder="Paste your content here... (e.g., a blog post intro, product description, or FAQ section)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    GEO-Optimized Version
                  </label>
                  {playgroundOutput ? (
                    <div className="h-64 w-full rounded-lg border border-violet-300 bg-violet-50/50 p-3 text-sm text-zinc-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-zinc-300 overflow-y-auto whitespace-pre-wrap">
                      {playgroundOutput}
                    </div>
                  ) : (
                    <div className="h-64 w-full rounded-lg border border-dashed border-violet-300 bg-violet-50/50 p-3 text-sm text-zinc-500 dark:border-violet-800 dark:bg-violet-950/20 flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="h-8 w-8 mx-auto text-violet-400 mb-2" />
                        <p>Paste content and click &ldquo;Optimize&rdquo; to see the GEO-enhanced version</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button variant="brand" onClick={optimizeContent} disabled={playgroundLoading || !playgroundInput.trim()}>
                  {playgroundLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {playgroundLoading ? "Optimizing..." : "Optimize Content"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  );
}
