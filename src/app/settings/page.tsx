"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  User,
  Bell,
  Shield,
  Key,
  Globe,
  Palette,
  Users,
  Crown,
  Check,
  CheckCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { getBrandConfig, saveBrandConfig } from "@/lib/brand-store";
import { useAuth } from "@/lib/auth-context";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [industry, setIndustry] = useState("SaaS / Software");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [saved, setSaved] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<Record<string, Record<string, boolean>>>({});
  // Platform toggles
  const [platformToggles, setPlatformToggles] = useState<Record<string, boolean>>({
    "ChatGPT / OpenAI": true,
    "Google Gemini": true,
    "Perplexity AI": true,
    "Anthropic Claude": true,
    "Microsoft Copilot": true,
    "Meta AI": false,
  });

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    const config = getBrandConfig();
    setBrandName(config.brandName || "");
    setBrandUrl(config.brandUrl || "");
    setBrandDescription(config.brandDescription || "");
    setIndustry(config.industry || "SaaS / Software");
    setKeywords(config.keywords || []);
    setCompetitors(config.competitors || []);
    // Load notification prefs
    try {
      const stored = localStorage.getItem("brandai_notif_prefs");
      if (stored) setNotifPrefs(JSON.parse(stored));
    } catch {}
    // Load platform toggles
    try {
      const stored = localStorage.getItem("brandai_platform_toggles");
      if (stored) setPlatformToggles(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleNotifPref = (label: string, channel: string, currentValue: boolean) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [label]: { ...prev[label], [channel]: !currentValue } };
      localStorage.setItem("brandai_notif_prefs", JSON.stringify(next));
      return next;
    });
  };

  const togglePlatform = (name: string) => {
    setPlatformToggles((prev) => {
      const next = { ...prev, [name]: !prev[name] };
      localStorage.setItem("brandai_platform_toggles", JSON.stringify(next));
      return next;
    });
  };

  // Fetch team members
  useEffect(() => {
    if (hasPermission("team:read")) {
      fetchTeamMembers();
    }
  }, [hasPermission]);

  async function fetchTeamMembers() {
    setTeamLoading(true);
    try {
      const res = await fetch("/api/auth/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setTeamLoading(false);
    }
  }

  async function handleInvite() {
    setInviteError("");
    if (!inviteEmail || !invitePassword) {
      setInviteError("Email and password are required");
      return;
    }
    try {
      const res = await fetch("/api/auth/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName || undefined,
          role: inviteRole,
          password: invitePassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setInviteError(data.error || "Failed to invite");
        return;
      }
      setInviteEmail("");
      setInviteName("");
      setInviteRole("VIEWER");
      setInvitePassword("");
      setShowInviteForm(false);
      fetchTeamMembers();
    } catch {
      setInviteError("Network error");
    }
  }

  async function handleChangeRole(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/auth/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) fetchTeamMembers();
    } catch (err) {
      console.error("Role change failed:", err);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this team member? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/auth/team", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) fetchTeamMembers();
    } catch (err) {
      console.error("Remove failed:", err);
    }
  }

  const handleSave = async () => {
    saveBrandConfig({ brandName, brandUrl, brandDescription, industry, keywords, competitors });
    // Sync to Neon DB
    try {
      await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, brandUrl, brandDescription, industry, keywords, competitors }),
      });
    } catch (err) {
      console.error("Failed to sync brand to DB:", err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const addCompetitor = () => {
    const c = newCompetitor.trim();
    if (c && !competitors.includes(c)) {
      setCompetitors([...competitors, c]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (c: string) => {
    setCompetitors(competitors.filter((x) => x !== c));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your brand profile, preferences, and account
          </p>
        </div>
        <Button variant="brand" size="sm" onClick={handleSave}>
          {saved ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? "Saved!" : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Brand Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="api">API & Keys</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Brand Profile */}
        <TabsContent value="brand">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Brand Information</CardTitle>
                <CardDescription>Configure how AI platforms identify your brand</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Website URL</label>
                  <input
                    type="url"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Brand Description</label>
                  <textarea
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    This description helps us understand your brand context for AI analysis.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option>SaaS / Software</option>
                    <option>E-Commerce</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Education</option>
                    <option>Marketing</option>
                    <option>Real Estate</option>
                    <option>Food & Beverage</option>
                    <option>Other</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking Keywords</CardTitle>
                <CardDescription>Keywords to monitor across AI platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {keywords.length === 0 && (
                    <p className="text-xs text-zinc-400">No keywords added yet. Add keywords to start tracking.</p>
                  )}
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="ml-1 text-zinc-400 hover:text-zinc-600 text-xs">×</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Button variant="outline" size="sm" onClick={addKeyword}>Add</Button>
                </div>
                <div className="mt-4 rounded-lg bg-violet-50 dark:bg-violet-950/20 p-3">
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">Tracking Keywords</p>
                  <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">
                    These keywords will be queried across all AI platforms to track your brand visibility. Currently tracking {keywords.length} keywords.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Competitor Tracking</CardTitle>
                <CardDescription>Brands to compare against in reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {competitors.length === 0 && (
                    <p className="text-xs text-zinc-400">No competitors added yet.</p>
                  )}
                  {competitors.map((comp) => (
                    <div key={comp} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{comp}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeCompetitor(comp)} className="text-red-500 hover:text-red-700 text-xs h-7">
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Competitor name..."
                    value={newCompetitor}
                    onChange={(e) => setNewCompetitor(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                    className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Button variant="outline" size="sm" onClick={addCompetitor}>
                    + Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Platforms</CardTitle>
                <CardDescription>Select which AI platforms to monitor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(platformToggles).map(([name, enabled]) => (
                    <div key={name} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{name}</span>
                      <button
                        type="button"
                        onClick={() => togglePlatform(name)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what alerts you want to receive</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "New AI citation detected", description: "When your brand is cited in a new AI response", defaultEmail: true, defaultPush: true, defaultSlack: true },
                  { label: "Citation removed", description: "When an existing citation is no longer present", defaultEmail: true, defaultPush: false, defaultSlack: true },
                  { label: "Competitor rank change", description: "When a competitor's ranking changes significantly", defaultEmail: false, defaultPush: true, defaultSlack: false },
                  { label: "Weekly analytics report", description: "Summary of your AI visibility metrics", defaultEmail: true, defaultPush: false, defaultSlack: false },
                  { label: "Visibility score drop", description: "When your visibility score drops below threshold", defaultEmail: true, defaultPush: true, defaultSlack: true },
                  { label: "New keyword opportunity", description: "AI-detected keyword opportunities for your brand", defaultEmail: false, defaultPush: true, defaultSlack: false },
                ].map((notif) => (
                  <div key={notif.label} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{notif.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{notif.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {["email", "push", "slack"].map((channel) => {
                        const defaultKey = `default${channel.charAt(0).toUpperCase() + channel.slice(1)}` as keyof typeof notif;
                        const enabled = notifPrefs[notif.label]?.[channel] ?? (notif[defaultKey] as boolean);
                        return (
                          <div key={channel} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-zinc-400">{channel.charAt(0).toUpperCase() + channel.slice(1)}</span>
                            <button
                              type="button"
                              onClick={() => toggleNotifPref(notif.label, channel, enabled)}
                              className={`h-5 w-5 rounded flex items-center justify-center cursor-pointer transition-colors ${
                                enabled
                                  ? "bg-violet-600 text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Team Members</CardTitle>
                  <CardDescription>Manage who has access to your BrandAI workspace</CardDescription>
                </div>
                {hasPermission("team:invite") && (
                  <Button variant="brand" size="sm" onClick={() => setShowInviteForm(!showInviteForm)}>
                    <Users className="mr-2 h-3 w-3" />
                    Invite Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Invite form */}
              {showInviteForm && (
                <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Invite New Member</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="email"
                      placeholder="Email *"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <input
                      type="password"
                      placeholder="Temporary password *"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  {inviteError && <p className="mt-2 text-xs text-red-500">{inviteError}</p>}
                  <div className="mt-3 flex gap-2">
                    <Button variant="brand" size="sm" onClick={handleInvite}>Send Invite</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Team list */}
              {teamLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                </div>
              ) : !hasPermission("team:read") ? (
                <div className="text-center py-8">
                  <Shield className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">You don&apos;t have permission to view team members</p>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No team members yet. Invite someone to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const isCurrentUser = member.id === user?.id;
                    return (
                      <div key={member.id} className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {member.name}
                              {isCurrentUser && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                            </p>
                            <p className="text-xs text-zinc-500">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Role selector or badge */}
                          {hasPermission("team:changeRole") && !isCurrentUser && member.role !== "OWNER" ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.id, e.target.value)}
                              className="h-7 rounded border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          ) : (
                            <Badge variant={member.role === "OWNER" ? "info" : "secondary"}>
                              {member.role === "OWNER" && <Crown className="h-3 w-3 mr-1" />}
                              {member.role}
                            </Badge>
                          )}
                          {/* Remove button */}
                          {hasPermission("team:remove") && !isCurrentUser && member.role !== "OWNER" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & Keys */}
        <TabsContent value="api">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Keys</CardTitle>
                <CardDescription>Manage your BrandAI API access tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
                  <Key className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">API keys are managed via environment variables</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure <code className="font-mono text-violet-600 dark:text-violet-400">OPENROUTER_API_KEY</code> and{" "}
                    <code className="font-mono text-violet-600 dark:text-violet-400">BRIGHT_DATA_API_TOKEN</code> in your <code className="font-mono">.env</code> file.
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    See <code className="font-mono">.env.example</code> for all required environment variables.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Usage</CardTitle>
                <CardDescription>Current billing period usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">12,450</p>
                    <p className="text-xs text-zinc-500">API Calls</p>
                    <p className="text-[10px] text-zinc-400 mt-1">of 50,000 limit</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">2.3 GB</p>
                    <p className="text-xs text-zinc-500">Data Transfer</p>
                    <p className="text-[10px] text-zinc-400 mt-1">of 10 GB limit</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">156ms</p>
                    <p className="text-xs text-zinc-500">Avg Response Time</p>
                    <p className="text-[10px] text-zinc-400 mt-1">last 24 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5" />
                      <h3 className="text-lg font-bold">Pro Plan</h3>
                    </div>
                    <p className="text-sm text-violet-200 mt-1">$79/month • Billed monthly</p>
                  </div>
                  <Button variant="secondary" size="sm" className="bg-white text-violet-700 hover:bg-violet-50">
                    Upgrade to Enterprise
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Plan Includes</h4>
                    <div className="space-y-1.5">
                      {[
                        "50 tracked keywords",
                        "5 competitor profiles",
                        "6 AI platforms",
                        "Weekly reports",
                        "API access",
                        "Slack integration",
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Usage This Period</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Keywords", used: 5, limit: 50 },
                        { label: "Competitors", used: 3, limit: 5 },
                        { label: "API Calls", used: 12450, limit: 50000 },
                      ].map((usage) => (
                        <div key={usage.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-600 dark:text-zinc-400">{usage.label}</span>
                            <span className="text-zinc-500">{usage.used.toLocaleString()} / {usage.limit.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
                              style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
