"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plug,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Zap,
  Globe,
  Search,
  BarChart3,
  Database,
  FileText,
  Bot,
  Loader2,
} from "lucide-react";
import { isConfigured, getBrandConfig } from "@/lib/brand-store";
import { SetupBanner } from "@/components/setup-banner";

interface IntegrationStatus {
  name: string;
  description: string;
  icon: typeof Bot;
  category: string;
  status: "connected" | "disconnected" | "error" | "checking";
  lastSync: string | null;
  dataPoints: string | null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([
    {
      name: "OpenRouter AI",
      description: "Powers all AI queries across ChatGPT, Gemini, Claude, Perplexity, and more via unified API.",
      icon: Bot,
      category: "AI",
      status: "disconnected",
      lastSync: null,
      dataPoints: null,
    },
    {
      name: "Bright Data",
      description: "Web scraping and SERP data collection for brand monitoring and competitor analysis.",
      icon: Globe,
      category: "Data",
      status: "disconnected",
      lastSync: null,
      dataPoints: null,
    },
    {
      name: "Brand Configuration",
      description: "Your brand profile and settings stored locally for all analyses.",
      icon: Database,
      category: "Config",
      status: "disconnected",
      lastSync: null,
      dataPoints: null,
    },
    {
      name: "Neon PostgreSQL",
      description: "Serverless Postgres database storing all analysis results, brand data, and history.",
      icon: Database,
      category: "Database",
      status: "disconnected",
      lastSync: null,
      dataPoints: null,
    },
  ]);
  const [checking, setChecking] = useState(false);

  const checkConnections = useCallback(async () => {
    setChecking(true);
    const updated = [...integrations];

    // Check OpenRouter
    try {
      const res = await fetch("/api/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "chatgpt", query: "ping", brandName: "test" }),
      });
      updated[0] = {
        ...updated[0],
        status: res.ok ? "connected" : "error",
        lastSync: res.ok ? "Just now" : "Failed",
        dataPoints: res.ok ? "API key active — 6 AI models available" : `HTTP ${res.status}`,
      };
    } catch {
      updated[0] = { ...updated[0], status: "error", lastSync: "Failed", dataPoints: "Connection error" };
    }

    // Check Bright Data (simple check via web-search)
    try {
      const res = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test", limit: 1 }),
      });
      updated[1] = {
        ...updated[1],
        status: res.ok ? "connected" : "error",
        lastSync: res.ok ? "Just now" : "Failed",
        dataPoints: res.ok ? "SERP & scraping API active" : `HTTP ${res.status}`,
      };
    } catch {
      updated[1] = { ...updated[1], status: "error", lastSync: "Failed", dataPoints: "Connection error" };
    }

    // Check brand config
    const configured = isConfigured();
    const config = getBrandConfig();
    updated[2] = {
      ...updated[2],
      status: configured ? "connected" : "disconnected",
      lastSync: configured ? "Active" : null,
      dataPoints: configured ? `${config.brandName} — ${config.keywords.length} keywords, ${config.competitors.length} competitors` : null,
    };

    // Check Neon DB
    try {
      const res = await fetch("/api/brand");
      updated[3] = {
        ...updated[3],
        status: res.ok ? "connected" : "error",
        lastSync: res.ok ? "Just now" : "Failed",
        dataPoints: res.ok ? "Neon PostgreSQL — all tables active" : `HTTP ${res.status}`,
      };
    } catch {
      updated[3] = { ...updated[3], status: "error", lastSync: "Failed", dataPoints: "Connection error" };
    }

    setIntegrations(updated);
    setChecking(false);
  }, [integrations]);

  useEffect(() => { checkConnections(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connected = integrations.filter((i) => i.status === "connected").length;
  const errored = integrations.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <SetupBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Integrations</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            API connections powering your AI SEO workflow
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={checkConnections} disabled={checking}>
          {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {checking ? "Checking..." : "Re-check All"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{connected}</p>
                <p className="text-xs text-zinc-500">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Plug className="h-5 w-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {integrations.length - connected - errored}
                </p>
                <p className="text-xs text-zinc-500">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{errored}</p>
                <p className="text-xs text-zinc-500">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((intg) => (
          <Card key={intg.name} className={intg.status === "error" ? "border-red-200 dark:border-red-900" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <intg.icon className="h-6 w-6 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{intg.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{intg.category}</Badge>
                    {intg.status === "connected" && (
                      <Badge variant="success" className="text-[10px]">Connected</Badge>
                    )}
                    {intg.status === "error" && (
                      <Badge variant="destructive" className="text-[10px]">Error</Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{intg.description}</p>
                  {intg.status === "connected" && (
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                      <span>Last sync: {intg.lastSync}</span>
                      <span>•</span>
                      <span>{intg.dataPoints}</span>
                    </div>
                  )}
                  {intg.status === "error" && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {intg.dataPoints}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {intg.status === "connected" ? (
                    <Badge variant="success" className="text-xs"><Check className="mr-1 h-3 w-3" />Active</Badge>
                  ) : intg.status === "error" ? (
                    <Badge variant="destructive" className="text-xs"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>
                  ) : intg.name === "Brand Configuration" ? (
                    <Button variant="brand" size="sm" onClick={() => window.location.href = "/settings"}>
                      Configure
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Not checked</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available AI Models */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Available AI Models</CardTitle>
          <CardDescription>Models accessible through OpenRouter for brand analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: "GPT-4o", provider: "OpenAI", id: "openai/gpt-4o" },
              { name: "Gemini 2.0 Flash", provider: "Google", id: "google/gemini-2.0-flash-001" },
              { name: "Claude Sonnet 4", provider: "Anthropic", id: "anthropic/claude-sonnet-4" },
              { name: "Perplexity Sonar", provider: "Perplexity", id: "perplexity/sonar" },
              { name: "Llama 3.3 70B", provider: "Meta", id: "meta-llama/llama-3.3-70b-instruct" },
              { name: "Phi-4", provider: "Microsoft", id: "microsoft/phi-4" },
            ].map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{model.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono">{model.id}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{model.provider}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
