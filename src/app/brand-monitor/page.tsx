"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Plus,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Loader2,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

const PLATFORM_NAMES: Record<string, string> = {
  chatgpt: "ChatGPT", gemini: "Google Gemini", perplexity: "Perplexity", claude: "Claude", copilot: "Microsoft Copilot", llama: "Meta AI",
};

interface MentionData {
  platform: string;
  query: string;
  response: string;
  sentiment: string;
  date: string;
  keyword: string;
}

interface AlertData {
  type: string;
  title: string;
  message: string;
  time: string;
}

export default function BrandMonitor() {
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [totalMentions, setTotalMentions] = useState(0);
  const [positivePct, setPositivePct] = useState(0);
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [platformScores, setPlatformScores] = useState<Record<string, { score: number; mentions: number; sentiment: string }>>({});

  useEffect(() => {
    setConfigured(isConfigured());
  }, []);

  const runMonitor = useCallback(async () => {
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

      setOverallScore(data.overallScore || 0);
      setPlatformScores(data.platformScores || {});

      const mentionsList: MentionData[] = [];
      const alertsList: AlertData[] = [];
      let totalM = 0;
      let positiveCount = 0;
      let totalCount = 0;

      for (const kr of data.keywordResults || []) {
        for (const r of kr.platforms || []) {
          totalCount++;
          if (r.mentionsBrand) {
            totalM++;
            if (r.sentiment === "positive") positiveCount++;
            mentionsList.push({
              platform: PLATFORM_NAMES[r.platform] || r.platform,
              query: kr.keyword,
              response: r.response?.substring(0, 300) + (r.response?.length > 300 ? "..." : ""),
              sentiment: r.sentiment,
              date: "Just now",
              keyword: kr.keyword,
            });
          } else {
            alertsList.push({
              type: "warning",
              title: `Not mentioned on ${PLATFORM_NAMES[r.platform] || r.platform}`,
              message: `Your brand was not mentioned when asking about "${kr.keyword}". Consider creating content targeting this query.`,
              time: "Just now",
            });
          }
        }
      }

      if (mentionsList.length > 0) {
        alertsList.unshift({
          type: "success",
          title: `Found ${mentionsList.length} brand mentions`,
          message: `Your brand was mentioned ${mentionsList.length} times across AI platforms.`,
          time: "Just now",
        });
      }

      setTotalMentions(totalM);
      setPositivePct(totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0);
      setMentions(mentionsList);
      setAlerts(alertsList);
    } catch (err) {
      console.error("Monitor error:", err);
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Brand Monitor</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track how AI platforms perceive and reference your brand
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={runMonitor} disabled={loading || !configured}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {loading ? "Monitoring..." : "Run Monitor"}
          </Button>
          <Button variant="brand" size="sm" disabled={!configured}>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        </div>
      </div>

      {/* Brand Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Overall Score</CardTitle>
            <Eye className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallScore}<span className="text-lg text-zinc-400">/100</span></div>
            {overallScore > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">Live analysis</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Mentions</CardTitle>
            <Globe className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMentions}</div>
            {totalMentions > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">Across AI platforms</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Positive Sentiment</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{positivePct}<span className="text-lg text-zinc-400">%</span></div>
            <Progress value={positivePct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.filter(a => a.type === "warning").length}</div>
            {alerts.length > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-amber-600">{alerts.filter(a => a.type === "warning").length} require attention</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="mentions">
        <TabsList>
          <TabsTrigger value="mentions">AI Mentions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="mentions">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent AI Mentions</CardTitle>
              <CardDescription>How AI platforms are referencing your brand in responses</CardDescription>
            </CardHeader>
            <CardContent>
              {mentions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No mentions yet. Click &quot;Run Monitor&quot; to scan AI platforms.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {mentions.map((mention, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{mention.platform}</Badge>
                        <Badge
                          variant={
                            mention.sentiment === "positive"
                              ? "success"
                              : mention.sentiment === "negative"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {mention.sentiment}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs text-zinc-400">{mention.date}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                      Query: &ldquo;{mention.query}&rdquo;
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {mention.response}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {mention.keyword}
                      </Badge>
                      <Button variant="ghost" size="sm" className="ml-auto text-xs">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Full Response
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Alerts</CardTitle>
              <CardDescription>Important changes in your AI brand presence</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No alerts yet. Run the monitor to check your brand presence.</p>
                </div>
              ) : (
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${
                      alert.type === "warning"
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20"
                        : alert.type === "success"
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                        : "border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-950/20"
                    }`}
                  >
                    {alert.type === "warning" ? (
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                    ) : alert.type === "success" ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Eye className="h-5 w-5 shrink-0 text-blue-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {alert.title}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {alert.message}
                      </p>
                      <span className="mt-2 inline-block text-[10px] text-zinc-400">
                        {alert.time}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-xs">
                      View
                    </Button>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
              <CardDescription>How AI platforms describe your brand</CardDescription>
            </CardHeader>
            <CardContent>
              {mentions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Run the monitor to see sentiment analysis</p>
                </div>
              ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                    Overall Sentiment Distribution
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const total = mentions.length || 1;
                      const pos = Math.round((mentions.filter(m => m.sentiment === "positive").length / total) * 100);
                      const neg = Math.round((mentions.filter(m => m.sentiment === "negative").length / total) * 100);
                      const neu = 100 - pos - neg;
                      return (
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Positive</span>
                              <span className="text-sm font-medium text-emerald-600">{pos}%</span>
                            </div>
                            <Progress value={pos} indicatorClassName="from-emerald-500 to-emerald-400" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Neutral</span>
                              <span className="text-sm font-medium text-zinc-600">{neu}%</span>
                            </div>
                            <Progress value={neu} indicatorClassName="from-zinc-400 to-zinc-300" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">Negative</span>
                              <span className="text-sm font-medium text-red-600">{neg}%</span>
                            </div>
                            <Progress value={neg} indicatorClassName="from-red-500 to-red-400" />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                    Sentiment by Platform
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(platformScores).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400 w-28">{PLATFORM_NAMES[key] || key}</span>
                        <div className="flex-1">
                          <Progress value={val.score} />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{val.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
