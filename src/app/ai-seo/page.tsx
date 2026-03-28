"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Code,
  Globe,
  Link2,
  Bot,
  Zap,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface ScoreFactor {
  category: string;
  score: number;
  status: string;
  items: { name: string; status: string; impact: string }[];
}

interface Recommendation {
  priority: string;
  title: string;
  description: string;
  impact: string;
  effort: string;
  category: string;
}

export default function AISEOPage() {
  const router = useRouter();
  const [analyzingUrl, setAnalyzingUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [seoScoreFactors, setSeoScoreFactors] = useState<ScoreFactor[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    setConfigured(isConfigured());
    const config = getBrandConfig();
    if (config.brandUrl) setAnalyzingUrl(config.brandUrl);
  }, []);

  const runAnalysis = async () => {
    if (!analyzingUrl.trim()) return;
    setLoading(true);
    try {
      const config = getBrandConfig();
      const res = await fetch("/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: analyzingUrl, brandName: config.brandName }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.categories) setSeoScoreFactors(data.categories);
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  const overallScore = seoScoreFactors.length > 0
    ? Math.round(seoScoreFactors.reduce((acc, f) => acc + f.score, 0) / seoScoreFactors.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">AI SEO Analysis</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Optimize your content for AI search engines and generative responses
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={runAnalysis} disabled={loading || !analyzingUrl.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Full Site Audit"}
        </Button>
      </div>

      {/* URL Analyzer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="url"
                placeholder="Enter URL to analyze (e.g., https://yourbrand.com/features)"
                value={analyzingUrl}
                onChange={(e) => setAnalyzingUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <Button variant="brand" onClick={runAnalysis} disabled={loading || !analyzingUrl.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {loading ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Score Overview */}
      {seoScoreFactors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No analysis yet</p>
            <p className="text-sm mt-1">Enter a URL above and click &quot;Analyze&quot; to get your AI SEO score</p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <svg className="h-28 w-28" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e4e4e7" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 283} 283`}
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{overallScore}</span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-500">AI SEO Score</p>
          </CardContent>
        </Card>
        {seoScoreFactors.map((factor) => (
          <Card key={factor.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">{factor.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{factor.score}<span className="text-sm text-zinc-400">/100</span></div>
              <Progress value={factor.score} className="mt-2" />
              <Badge
                variant={factor.status === "good" ? "success" : factor.status === "moderate" ? "warning" : "destructive"}
                className="mt-2"
              >
                {factor.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Tabs */}
      {seoScoreFactors.length > 0 && (
      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">Site Audit</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="keywords">Keyword Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <div className="grid gap-4 md:grid-cols-2">
            {seoScoreFactors.map((factor) => (
              <Card key={factor.category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{factor.category}</CardTitle>
                    <Badge variant={factor.status === "good" ? "success" : "warning"}>
                      {factor.score}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {factor.items.map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                        <div className="flex items-center gap-2">
                          {item.status === "pass" ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : item.status === "fail" ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.name}</span>
                        </div>
                        <Badge
                          variant={item.impact === "high" ? "destructive" : item.impact === "medium" ? "warning" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.impact} impact
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI SEO Recommendations</CardTitle>
              <CardDescription>Prioritized actions to improve your AI visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          rec.priority === "high"
                            ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                            : rec.priority === "medium"
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                        }`}>
                          {rec.category === "Technical" ? (
                            <Code className="h-3 w-3" />
                          ) : rec.category === "Content" ? (
                            <FileText className="h-3 w-3" />
                          ) : rec.category === "Authority" ? (
                            <Link2 className="h-3 w-3" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {rec.title}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {rec.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "warning" : "info"}>
                              {rec.priority} priority
                            </Badge>
                            <Badge variant="secondary">{rec.category}</Badge>
                            <Badge variant="outline">Effort: {rec.effort}</Badge>
                          </div>
                          <p className="mt-2 text-xs text-violet-600 dark:text-violet-400 font-medium">
                            💡 {rec.impact}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 ml-4"
                        onClick={() => {
                          navigator.clipboard.writeText(`${rec.title}: ${rec.description}`);
                          setCopiedIndex(i);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                      >
                        {copiedIndex === i ? "Copied!" : "Fix Now"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">AI Keyword Analysis</CardTitle>
                  <CardDescription>How your keywords perform in AI-generated responses</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/brand-monitor")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Keywords
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-zinc-500">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Keyword tracking is available in the Brand Monitor.</p>
                <p className="text-xs mt-1">Run an analysis above to get SEO recommendations for your URL.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}
