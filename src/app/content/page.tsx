"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Sparkles,
  Plus,
  Calendar,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  Circle,
  ArrowRight,
  BookOpen,
  BarChart3,
  Wand2,
  Loader2,
} from "lucide-react";
import { getBrandConfig, isConfigured } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface ContentIdea {
  title: string;
  type: string;
  targetKeywords?: string[];
  estimatedImpact: string;
  reason: string;
}

export default function ContentStrategy() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  // Generator state
  const [genTopic, setGenTopic] = useState("");
  const [genType, setGenType] = useState("Blog Post");
  const [genLength, setGenLength] = useState("Medium (1000-1500 words)");
  const [genTone, setGenTone] = useState("Professional & Authoritative");
  const [genKeywords, setGenKeywords] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genOutput, setGenOutput] = useState("");

  useEffect(() => { setConfigured(isConfigured()); }, []);

  const generateIdeas = useCallback(async () => {
    const config = getBrandConfig();
    if (!config.brandName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/content-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: config.brandName,
          industry: config.industry,
          keywords: config.keywords.slice(0, 5),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (Array.isArray(data)) setIdeas(data);
      else if (data.rawContent) setIdeas([{ title: "AI Suggestion", type: "General", estimatedImpact: "N/A", reason: data.rawContent }]);
    } catch (err) {
      console.error("Content ideas error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDraft = useCallback(async () => {
    if (!genTopic.trim()) return;
    setGenLoading(true);
    setGenOutput("");
    try {
      const config = getBrandConfig();
      const res = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "chatgpt",
          query: `Write a ${genType} about "${genTopic}" in a ${genTone} tone. Target length: ${genLength}. Target keywords: ${genKeywords || "none specified"}. Brand: ${config.brandName || "our brand"}. Industry: ${config.industry || "technology"}. Optimize for AI citations (GEO - Generative Engine Optimization).`,
          brandName: config.brandName || "Brand",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGenOutput(data.response || JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Draft generation error:", err);
      setGenOutput("Error generating draft. Check your API configuration.");
    } finally {
      setGenLoading(false);
    }
  }, [genTopic, genType, genLength, genTone, genKeywords]);
  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Content Strategy</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Plan and optimize content for maximum AI visibility and citations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="brand" size="sm" onClick={generateIdeas} disabled={loading || !configured}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Generating..." : "AI Content Ideas"}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">AI Ideas Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideas.length}</div>
            <p className="text-xs text-zinc-400">content ideas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Top Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{ideas.length > 0 ? ideas[0].type : "—"}</div>
            <p className="text-xs text-zinc-400 mt-1">Most recommended by AI</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Draft Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">{genOutput ? "Ready" : "—"}</div>
            <p className="text-xs text-zinc-400 mt-1">Use the generator tab</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ideas">
        <TabsList>
          <TabsTrigger value="ideas">AI-Powered Ideas</TabsTrigger>
          <TabsTrigger value="generator">Content Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI-Powered Content Ideas</CardTitle>
              <CardDescription>
                Content opportunities identified by analyzing AI platform gaps and keyword trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ideas.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No ideas yet</p>
                  <p className="text-sm mt-1">Click &quot;AI Content Ideas&quot; to generate recommendations</p>
                </div>
              ) : (
              <div className="space-y-4">
                {ideas.map((idea, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {idea.title}
                          </h4>
                          <Badge variant="secondary" className="text-[10px]">{idea.type}</Badge>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{idea.reason}</p>
                        <div className="mt-2 flex items-center gap-3">
                          {idea.targetKeywords?.slice(0, 3).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                          ))}
                          <span className="text-xs text-emerald-600 font-medium">
                            {idea.estimatedImpact}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Content Generator</CardTitle>
              <CardDescription>
                Generate GEO-optimized content drafts powered by AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Content Topic
                  </label>
                  <input
                    type="text"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    placeholder="e.g., How to choose the right CRM for your startup"
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Content Type
                    </label>
                    <select value={genType} onChange={(e) => setGenType(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                      <option>Blog Post</option>
                      <option>Guide / Tutorial</option>
                      <option>Comparison Article</option>
                      <option>FAQ Page</option>
                      <option>Product Description</option>
                      <option>Landing Page</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Target Length
                    </label>
                    <select value={genLength} onChange={(e) => setGenLength(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                      <option>Short (500-800 words)</option>
                      <option>Medium (1000-1500 words)</option>
                      <option>Long (2000-3000 words)</option>
                      <option>Comprehensive (3000+ words)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                      Tone
                    </label>
                    <select value={genTone} onChange={(e) => setGenTone(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                      <option>Professional & Authoritative</option>
                      <option>Conversational & Friendly</option>
                      <option>Technical & Detailed</option>
                      <option>Persuasive & Sales-Oriented</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Target Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={genKeywords}
                    onChange={(e) => setGenKeywords(e.target.value)}
                    placeholder="e.g., CRM for startups, best CRM software, startup tools"
                    className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="brand" onClick={generateDraft} disabled={genLoading || !genTopic.trim()}>
                    {genLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {genLoading ? "Generating..." : "Generate Draft"}
                  </Button>
                </div>
                {genOutput && (
                  <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <h4 className="text-sm font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Generated Draft</h4>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto">{genOutput}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
