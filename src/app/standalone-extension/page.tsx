"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type { ApplicationContext } from "@sitecore-marketplace-sdk/client";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import { Button } from "@/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Select } from "@/src/components/ui/select";
import { TreeView, ContentTreeNode } from "@/src/components/ui/tree-view";
import {
  parseXmlContent,
  SAMPLE_XML_CONTENT,
} from "@/src/utils/xml-parser";
import { MOCK_SITECORE_APPS, SitecoreAppDefinition } from "@/src/utils/sitecore-data";
import {
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderTree,
  Sparkles,
  ExternalLink,
  Code2,
  Layers,
  Database,
  ImageIcon,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function StandaloneExtension() {
  const { client, error: clientError, isInitialized } = useMarketplaceClient();
  const [appContext, setAppContext] = useState<ApplicationContext>();

  // Real vs Mock Apps State
  const [sitecoreApps, setSitecoreApps] = useState<SitecoreAppDefinition[]>(MOCK_SITECORE_APPS);
  const [selectedAppId, setSelectedAppId] = useState<string>(MOCK_SITECORE_APPS[0].id);
  const [isLoadingSites, setIsLoadingSites] = useState<boolean>(false);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);

  const activeApp = useMemo(
    () => sitecoreApps.find((app) => app.id === selectedAppId) || sitecoreApps[0] || MOCK_SITECORE_APPS[0],
    [selectedAppId, sitecoreApps]
  );

  // App Content Tree (cloneable state so import updates the tree dynamically)
  const [appTrees, setAppTrees] = useState<Record<string, ContentTreeNode>>(() => {
    const initial: Record<string, ContentTreeNode> = {};
    MOCK_SITECORE_APPS.forEach((app) => {
      initial[app.id] = JSON.parse(JSON.stringify(app.contentTree));
    });
    return initial;
  });

  const currentTree = appTrees[selectedAppId] || activeApp.contentTree;

  // Selected Content Tree Node (Starting Point)
  const [selectedTreeNodePath, setSelectedTreeNodePath] = useState<string>(activeApp.rootPath);

  // XML File and Content State
  const [xmlContent, setXmlContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showRawEditor, setShowRawEditor] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Execution State
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [importCompleted, setImportCompleted] = useState<boolean>(false);
  const [completedImportCounts, setCompletedImportCounts] = useState<{ created: number; updated: number } | null>(null);

  // Real Authoring & Management API Settings
  const [apiEndpoint, setApiEndpoint] = useState<string>(
    "https://xmc-avanade-xmcloudtraining-atcitraining1.sitecorecloud.io/sitecore/api/authoring/graphql/v1"
  );
  const [apiClientId, setApiClientId] = useState<string>("IKHXwXHsQz3hJlbv35DgxpOF5GArI4OJ");
  const [apiClientKey, setApiClientKey] = useState<string>("");
  const [apiToken, setApiToken] = useState<string>("");
  const apiKey = "";
  const [apiDatabase, setApiDatabase] = useState<string>("master");
  const [apiLanguage, setApiLanguage] = useState<string>("en");
  const [showApiSettings, setShowApiSettings] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "connected" | "disconnected">("idle");
  const [connectionMessage, setConnectionMessage] = useState<string>("");
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const [tokenInfo, setTokenInfo] = useState<string>("");

  // Function to load sites & real content tree from Authoring GraphQL API
  const loadSitecoreApps = async (forceMock = false) => {
    setIsLoadingSites(true);
    try {
      const url = forceMock ? "/api/sitecore/sites?mock=true" : "/api/sitecore/sites";
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.apps && data.apps.length > 0) {
        setSitecoreApps(data.apps);
        setSelectedAppId(data.apps[0].id);
        setSelectedTreeNodePath(data.apps[0].rootPath);
        setIsLiveMode(data.mode === "real");
        setConnectionStatus(data.mode === "real" ? "connected" : "idle");
        setConnectionMessage(data.message || "");

        const newTrees: Record<string, ContentTreeNode> = {};
        data.apps.forEach((a: SitecoreAppDefinition) => {
          newTrees[a.id] = JSON.parse(JSON.stringify(a.contentTree));
        });
        setAppTrees(newTrees);
      } else if (data.fallbackApps) {
        setSitecoreApps(data.fallbackApps);
        setIsLiveMode(false);
        setConnectionStatus("disconnected");
        setConnectionMessage(data.message || data.error || "Using fallback mock apps.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Could not load real Sitecore apps, falling back to mock:", msg);
      setIsLiveMode(false);
      setConnectionStatus("disconnected");
      setConnectionMessage(`Could not connect to live API: ${msg}`);
    } finally {
      setIsLoadingSites(false);
    }
  };

  // Load sites on mount
  useEffect(() => {
    loadSitecoreApps();
  }, []);

  // Retrieve Marketplace Application Context
  useEffect(() => {
    if (!clientError && isInitialized && client) {
      client
        .query("application.context")
        .then((res) => {
          setAppContext(res.data);
        })
        .catch((err) => {
          console.warn("Marketplace context query failed (running in standalone mock mode):", err);
        });
    }
  }, [client, clientError, isInitialized]);

  // Generate OAuth JWT Token On-the-Fly
  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    setTokenInfo("Requesting OAuth token from https://auth.sitecorecloud.io/oauth/token...");
    try {
      const res = await fetch("/api/sitecore/token?refresh=true");
      const data = await res.json();
      if (data.success) {
        setTokenInfo(data.message || "Token generated successfully.");
        if (data.token) {
          setApiToken(data.token);
        }
        // Also refresh apps list
        await loadSitecoreApps();
      } else {
        setTokenInfo(`Token generation failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTokenInfo(`Failed: ${msg}`);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Test Real Sitecore Authoring GraphQL Endpoint
  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    setConnectionMessage("Contacting Authoring and Management GraphQL endpoint...");
    try {
      const queryParams = new URLSearchParams({
        endpoint: apiEndpoint,
        token: apiToken,
        apiKey: apiKey,
      });
      const res = await fetch(`/api/sitecore/import-pages?${queryParams.toString()}`);
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus("connected");
        setConnectionMessage(`Connected. Found ${data.sites?.length || 0} configured Sitecore site(s).`);
        await loadSitecoreApps();
      } else {
        setConnectionStatus("disconnected");
        setConnectionMessage(data.message || "Endpoint offline or authorization failed.");
      }
    } catch (err: unknown) {
      setConnectionStatus("disconnected");
      const msg = err instanceof Error ? err.message : "Failed to reach internal test proxy.";
      setConnectionMessage(msg);
    }
  };

  // Update selected target node when app changes
  const handleAppChange = (newAppId: string) => {
    setSelectedAppId(newAppId);
    const target = sitecoreApps.find((a) => a.id === newAppId);
    if (target) {
      setSelectedTreeNodePath(target.rootPath);
    }
    setImportCompleted(false);
    setImportLogs([]);
  };

  const handleExpandNode = async (node: ContentTreeNode) => {
    const appId = selectedAppId;
    const response = await fetch(`/api/sitecore/content-tree?path=${encodeURIComponent(node.path)}`);
    const data = await response.json();
    if (!response.ok || !data.success || !data.tree) {
      throw new Error(data.error || `Could not load pages under ${node.name}.`);
    }

    const updateChildren = (current: ContentTreeNode): ContentTreeNode =>
      current.path === node.path
        ? { ...current, children: data.tree.children || [] }
        : { ...current, children: current.children?.map(updateChildren) };

    setAppTrees((previous) => ({
      ...previous,
      [appId]: updateChildren(previous[appId]),
    }));
  };

  // Parse XML whenever xmlContent or selected starting point changes
  const parsedResult = useMemo(() => {
    if (!xmlContent.trim()) {
      return { pages: [], rawXml: "", error: undefined };
    }
    return parseXmlContent(xmlContent, selectedTreeNodePath, [currentTree]);
  }, [xmlContent, selectedTreeNodePath, currentTree]);

  const createCount = parsedResult.pages.filter((p) => p.status === "CREATE").length;
  const updateCount = parsedResult.pages.filter((p) => p.status === "UPDATE").length;
  const invalidCount = parsedResult.pages.filter((p) => !p.isValid).length;

  // File Handlers
  const handleFileChange = (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setImportCompleted(false);
    setImportLogs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setXmlContent(text || "");
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileChange(file);
    }
  };

  // Load Real XML file from server (public/sample-pages.xml)
  const handleLoadSample = async () => {
    try {
      const res = await fetch("/sample-pages.xml");
      if (res.ok) {
        const text = await res.text();
        setXmlContent(text);
        setFileName("sample-pages.xml");
        setFileSize(text.length);
        setImportCompleted(false);
        setImportLogs([]);
        return;
      }
    } catch {
      // Fallback
    }

    setXmlContent(SAMPLE_XML_CONTENT);
    setFileName("sample-pages.xml");
    setFileSize(SAMPLE_XML_CONTENT.length);
    setImportCompleted(false);
    setImportLogs([]);
  };

  const handleClearFile = () => {
    setXmlContent("");
    setFileName("");
    setFileSize(0);
    setImportCompleted(false);
    setImportLogs([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Execute Import via real Backend Authoring Service API
  const handleExecuteImport = async () => {
    if (parsedResult.pages.length === 0 || parsedResult.error) return;

    setIsImporting(true);
    setImportProgress(10);
    setImportCompleted(false);
    setCompletedImportCounts(null);
    const initialLogs: string[] = [
      `[Dispatch] Initiating import request to backend Sitecore Authoring service...`,
      `[Target App] ${activeApp.displayName} (Starting Path: ${selectedTreeNodePath})`,
      `[Endpoint] ${apiEndpoint}`,
    ];
    setImportLogs([...initialLogs]);

    try {
      setImportProgress(35);
      const response = await fetch("/api/sitecore/import-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: selectedAppId,
          startingPointPath: selectedTreeNodePath,
          config: {
            endpoint: apiEndpoint,
            token: apiToken,
            apiKey: apiKey,
            database: apiDatabase,
            language: apiLanguage,
          },
          pages: parsedResult.pages,
        }),
      });

      setImportProgress(75);
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || `Server responded with ${response.status}`);
      }

      setImportProgress(95);

      // Clone tree and apply successful changes
      const clonedTree: ContentTreeNode = JSON.parse(JSON.stringify(currentTree));
      const findNodeByPath = (node: ContentTreeNode, path: string): ContentTreeNode | null => {
        if (node.path.toLowerCase() === path.toLowerCase()) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNodeByPath(child, path);
            if (found) return found;
          }
        }
        return null;
      };

      const parentNode = findNodeByPath(clonedTree, selectedTreeNodePath) || clonedTree;

      parsedResult.pages.forEach((p, idx) => {
        const itemResult = result.results?.[idx];
        if (!itemResult?.success) return;

        if (p.status === "UPDATE") {
          const targetNode = findNodeByPath(clonedTree, p.targetFullPath);
          if (targetNode) {
            targetNode.isUpdated = true;
            targetNode.displayName = p.title;
          }
        } else {
          if (!parentNode.children) parentNode.children = [];
          parentNode.children.push({
            id: itemResult.itemId || `item-${Date.now()}-${idx}`,
            name: p.name,
            displayName: p.title,
            path: `${selectedTreeNodePath}/${p.name}`,
            template: "Page",
            isNew: true,
          });
        }
      });

      setAppTrees((prev) => ({
        ...prev,
        [selectedAppId]: clonedTree,
      }));

      setImportLogs([...initialLogs, ...(result.logs || [])]);
      setImportProgress(100);
      setCompletedImportCounts({ created: result.created, updated: result.updated });
      setImportCompleted(result.success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setImportLogs((prev) => [
        ...prev,
        `[FATAL ERROR] Import failed: ${msg}`,
        `[Fallback] Please ensure the backend server and Authoring GraphQL endpoint are reachable.`,
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-neutral-900 pb-16">
      {/* Top Navigation Bar adhering to Blok design */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white font-bold shadow-blok-sm">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-neutral-900 tracking-tight">
                  Sitecore XML Content Importer
                </h1>
                <Badge variant="primary" className="text-[11px] font-semibold">
                  Blok Design System
                </Badge>
              </div>
              <p className="text-xs text-neutral-500">
                Automated XML ingestion, page creation &amp; update for Sitecore XM Cloud
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLiveMode ? (
              <Badge variant="success" className="gap-1.5 py-1 px-3">
                <ShieldCheck className="h-3.5 w-3.5 text-success-600" />
                Live XM Cloud Connected
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1.5 py-1 px-3">
                <AlertCircle className="h-3.5 w-3.5 text-warning-600" />
                Mock Mode (SHOW_MOCK)
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSitecoreApps(isLiveMode)}
              className="h-8 text-xs gap-1.5"
              disabled={isLoadingSites}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingSites ? "animate-spin" : ""}`} />
              {isLiveMode ? "Switch to Mock" : "Load Real Sites"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="h-8 text-xs gap-1.5"
            >
              <Database className="h-3.5 w-3.5 text-primary-600" />
              {showApiSettings ? "Hide API Config" : "Authoring API Config"}
            </Button>

            {appContext ? (
              <Badge variant="success" className="gap-1.5 py-1 px-3">
                <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
                App: {appContext.name}
              </Badge>
            ) : null}

            <a
              href="https://blok.sitecore.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Blok Docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* Banner Introduction */}
        <div className="rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50/70 via-white to-purple-50/40 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-primary-950 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-600" />
              Declarative XML Ingestion for Composable Sitecore
            </h2>
            <p className="text-xs text-neutral-600 max-w-3xl leading-relaxed">
              Upload an XML document containing <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-primary-700 font-mono text-[11px]">Title</code>,{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-primary-700 font-mono text-[11px]">Body</code>, and{" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-primary-700 font-mono text-[11px]">Image</code>.
              Uses real Sitecore Authoring and Management GraphQL operations (<code className="font-mono text-primary-700 text-[11px]">createItem</code>, <code className="font-mono text-primary-700 text-[11px]">updateItem</code>) to synchronize the content tree.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="shrink-0 text-xs gap-1.5 bg-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              Load Sample XML (5 Pages)
            </Button>
          </div>
        </div>

        {/* Expandable Authoring & Management API Connection Panel */}
        {showApiSettings && (
          <Card className="border-primary-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary-600" />
                  <CardTitle className="text-sm">Sitecore Authoring &amp; Management API Settings</CardTitle>
                </div>
                <Badge variant={isLiveMode ? "success" : "outline"} className="text-[11px]">
                  {isLiveMode ? "Live API Connected" : "OAuth Client Credentials Mode"}
                </Badge>
              </div>
              <CardDescription>
                Tokens are generated automatically on the fly via Client ID and Client Secret from <code className="font-mono text-primary-600 text-[11px]">https://auth.sitecorecloud.io/oauth/token</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1 lg:col-span-2">
                  <label className="font-semibold text-neutral-700 uppercase tracking-wide text-[10px]">
                    GraphQL Endpoint
                  </label>
                  <input
                    type="text"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="https://xmc-<org>-<env>.sitecorecloud.io/sitecore/api/authoring/graphql/v1"
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 uppercase tracking-wide text-[10px]">
                    Client ID (OAuth2)
                  </label>
                  <input
                    type="text"
                    value={apiClientId}
                    onChange={(e) => setApiClientId(e.target.value)}
                    placeholder="e.g. IKHXwXHsQz3h..."
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 uppercase tracking-wide text-[10px]">
                    Client Key / Secret
                  </label>
                  <input
                    type="password"
                    value={apiClientKey}
                    onChange={(e) => setApiClientKey(e.target.value)}
                    placeholder="Enter Client Secret"
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs font-mono text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-4 text-xs text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-neutral-500">Database:</span>
                    <input
                      type="text"
                      value={apiDatabase}
                      onChange={(e) => setApiDatabase(e.target.value)}
                      className="w-20 font-mono bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-neutral-500">Language:</span>
                    <input
                      type="text"
                      value={apiLanguage}
                      onChange={(e) => setApiLanguage(e.target.value)}
                      className="w-16 font-mono bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                    />
                  </div>
                  {apiToken && (
                    <span className="text-[11px] text-success-700 font-mono">
                      Token: {apiToken.substring(0, 10)}... (Active)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleGenerateToken}
                    isLoading={isGeneratingToken}
                  >
                    <KeyRound className="h-3.5 w-3.5 text-primary-600" />
                    Generate JWT On-the-Fly
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleTestConnection}
                    isLoading={connectionStatus === "testing"}
                  >
                    Test &amp; Sync Sites
                  </Button>
                </div>
              </div>

              {tokenInfo && (
                <div className="rounded-lg bg-neutral-100 border border-neutral-200 p-2.5 text-xs font-mono text-neutral-700">
                  {tokenInfo}
                </div>
              )}

              {connectionMessage && (
                <div
                  className={`rounded-lg p-2.5 text-xs ${
                    connectionStatus === "connected"
                      ? "bg-success-50 text-success-800 border border-success-200"
                      : "bg-warning-50 text-warning-800 border border-warning-200"
                  }`}
                >
                  {connectionMessage}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: App Selection & Content Tree Starting Point (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
                      1
                    </span>
                    <CardTitle>Sitecore App &amp; Target</CardTitle>
                    {isLoadingSites && (
                      <span className="text-[11px] text-primary-600 animate-pulse flex items-center gap-1 font-medium">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Loading...
                      </span>
                    )}
                  </div>
                  <Badge variant={isLiveMode ? "success" : "outline"} className="text-[11px]">
                    {isLiveMode ? "Live Sitecore" : "Mock Data"}
                  </Badge>
                </div>
                <CardDescription>
                  Select the Sitecore application and designate the starting point in the content tree.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Sitecore App Dropdown */}
                <Select
                  label="Target Sitecore App"
                  value={selectedAppId}
                  onChange={(e) => handleAppChange(e.target.value)}
                  helperText={activeApp.description}
                >
                  {sitecoreApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.displayName}
                    </option>
                  ))}
                </Select>

                {/* Content Tree Starting Point Card */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-primary-600" />
                      <span className="text-xs font-semibold text-neutral-800 uppercase tracking-wide">
                        Content Tree Starting Point
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-primary-600 hover:text-primary-700 gap-1"
                        onClick={() => loadSitecoreApps()}
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Sync Tree
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] px-2 text-primary-600 hover:text-primary-700"
                        onClick={() => setSelectedTreeNodePath(activeApp.rootPath)}
                      >
                        Reset Root
                      </Button>
                    </div>
                  </div>

                  {/* Selected Path Indicator */}
                  <div className="flex items-center gap-2 rounded-lg bg-white p-2 border border-neutral-200 text-xs">
                    <span className="text-neutral-400 font-medium shrink-0">Target:</span>
                    <span className="font-mono text-primary-700 font-semibold truncate text-[11px]">
                      {selectedTreeNodePath}
                    </span>
                  </div>

                  {/* Interactive Tree View */}
                  <div className="max-h-[340px] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2">
                    <TreeView
                      nodes={[currentTree]}
                      selectedPath={selectedTreeNodePath}
                      onSelectNode={(node) => setSelectedTreeNodePath(node.path)}
                      onExpandNode={isLiveMode ? handleExpandNode : undefined}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 italic">
                    Click any page or folder node above to target that branch as the parent for new items.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* XML Upload & Input Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
                      2
                    </span>
                    <CardTitle>XML Source File</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-neutral-600"
                    onClick={() => setShowRawEditor(!showRawEditor)}
                  >
                    <Code2 className="h-3.5 w-3.5 mr-1 text-primary-600" />
                    {showRawEditor ? "Hide Editor" : "Edit XML"}
                  </Button>
                </div>
                <CardDescription>
                  Upload your XML file containing page definitions with Title, Body, and Image.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary-500 bg-primary-50/60"
                      : fileName
                      ? "border-success-400 bg-success-50/30"
                      : "border-neutral-300 hover:border-primary-400 hover:bg-neutral-50/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,text/xml"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-3 shadow-sm">
                    <Upload className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-semibold text-neutral-800">
                    {fileName ? "Replace XML File" : "Click to upload or drag & drop XML"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Accepts XML files with &lt;Title&gt;, &lt;Body&gt;, &lt;Image&gt; tags
                  </p>
                </div>

                {/* Quick Real XML File loader */}
                <div className="flex items-center justify-between rounded-xl bg-neutral-50 border border-neutral-200/80 p-2.5">
                  <span className="text-xs text-neutral-600">Sample file: <code className="font-mono text-primary-700">sample-pages.xml</code></span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadSample}
                    className="h-7 text-xs gap-1.5 bg-white shadow-sm"
                  >
                    <FileCode className="h-3.5 w-3.5 text-primary-600" />
                    Load Real XML File
                  </Button>
                </div>

                {/* File Details bar if loaded */}
                {fileName && (
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode className="h-5 w-5 text-primary-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-800 truncate">
                          {fileName}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {(fileSize / 1024).toFixed(1)} KB • {parsedResult.pages.length} items detected
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFile}
                      className="h-7 text-xs text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                    >
                      Remove
                    </Button>
                  </div>
                )}

                {/* Raw XML Textarea (Collapsible / Toggleable) */}
                {showRawEditor && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-neutral-700 tracking-wide uppercase">
                      Direct XML Content Editor
                    </label>
                    <textarea
                      value={xmlContent}
                      onChange={(e) => {
                        setXmlContent(e.target.value);
                        setFileName("custom-input.xml");
                        setFileSize(e.target.value.length);
                      }}
                      rows={8}
                      placeholder="<pages><page><title>...</title><body>...</body><image>...</image></page></pages>"
                      className="w-full rounded-xl border border-neutral-300 bg-neutral-900 text-neutral-100 font-mono text-xs p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Parsed Items Preview & Import Actions (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-xs">
                      3
                    </span>
                    <CardTitle>Parsed Data Preview &amp; Reconciliation</CardTitle>
                  </div>

                  {parsedResult.pages.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="success" className="text-[11px]">
                        +{createCount} To Create
                      </Badge>
                      <Badge variant="warning" className="text-[11px]">
                        ⟳ {updateCount} To Update
                      </Badge>
                      {invalidCount > 0 && (
                        <Badge variant="danger" className="text-[11px]">
                          ! {invalidCount} Invalid
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <CardDescription>
                  Review the parsed XML fields (Title, Body, Image) and the calculated action for each page.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 flex-1">
                {/* Parse Error Notification */}
                {parsedResult.error && (
                  <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-800 flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-danger-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">XML Parsing Failed</p>
                      <p className="mt-0.5 text-danger-700">{parsedResult.error}</p>
                    </div>
                  </div>
                )}

                {/* Empty State when no XML is loaded */}
                {!xmlContent.trim() && !parsedResult.error && (
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
                      <FileCode className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-800">No XML Data Provided Yet</h3>
                    <p className="text-xs text-neutral-500 max-w-sm mt-1">
                      Upload an XML file or click below to populate the workspace with sample pages.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleLoadSample}
                      className="mt-4 gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Populate Sample Pages
                    </Button>
                  </div>
                )}

                {/* Table of Parsed Pages */}
                {parsedResult.pages.length > 0 && (
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Title &amp; Slug</th>
                            <th className="py-2.5 px-3">Body Summary</th>
                            <th className="py-2.5 px-3">Image</th>
                            <th className="py-2.5 px-3">Target Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {parsedResult.pages.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                              {/* Status Badge */}
                              <td className="py-3 px-3 align-top whitespace-nowrap">
                                {item.status === "CREATE" ? (
                                  <Badge variant="success" className="text-[10px] font-semibold">
                                    + Create
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-[10px] font-semibold">
                                    ⟳ Update
                                  </Badge>
                                )}
                              </td>

                              {/* Title & Slug */}
                              <td className="py-3 px-3 align-top">
                                <div className="font-semibold text-neutral-900 leading-tight">
                                  {item.title}
                                </div>
                                <div className="font-mono text-[10px] text-neutral-500 mt-0.5">
                                  slug: /{item.name}
                                </div>
                                {item.id && (
                                  <div className="text-[10px] text-primary-600 mt-0.5">
                                    id: {item.id}
                                  </div>
                                )}
                              </td>

                              {/* Body */}
                              <td className="py-3 px-3 align-top max-w-[200px]">
                                <p className="text-neutral-600 line-clamp-2 leading-relaxed">
                                  {item.body || <span className="text-neutral-400 italic">No body text</span>}
                                </p>
                              </td>

                              {/* Image */}
                              <td className="py-3 px-3 align-top">
                                {item.imageUrl ? (
                                  <div className="flex items-center gap-1.5">
                                    {/* Thumbnail Preview */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title}
                                      className="h-8 w-8 rounded-lg object-cover border border-neutral-200 shrink-0"
                                      onError={(e) => {
                                        // Fallback if image URL is inaccessible
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                    <span className="text-[10px] text-neutral-500 truncate max-w-[80px]" title={item.imageUrl}>
                                      {item.imageUrl.split("/").pop() || "Image"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                                    <ImageIcon className="h-3 w-3" /> None
                                  </span>
                                )}
                              </td>

                              {/* Target Path */}
                              <td className="py-3 px-3 align-top max-w-[170px]">
                                <span className="font-mono text-[10px] text-neutral-600 break-all leading-tight block">
                                  {item.targetFullPath}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                            Import &amp; Synchronize Execution
                          </h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Submits parsed entries to Sitecore App &quot;{activeApp.displayName}&quot;
                          </p>
                        </div>

                        <Button
                          variant="primary"
                          size="default"
                          disabled={parsedResult.pages.length === 0 || isImporting}
                          isLoading={isImporting}
                          onClick={handleExecuteImport}
                          className="gap-2 text-xs shadow-md"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isImporting ? "animate-spin" : ""}`} />
                          Import {parsedResult.pages.length} Pages
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      {isImporting && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs text-neutral-600 font-medium">
                            <span>Processing and dispatching pages...</span>
                            <span>{importProgress}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${importProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Success Alert Banner */}
                      {importCompleted && completedImportCounts && (
                        <div className="rounded-xl border border-success-200 bg-success-50 p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-success-800 font-medium">
                            <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                            <span>
                              Import completed successfully! {completedImportCounts.created} pages created and {completedImportCounts.updated} pages updated in the content tree.
                            </span>
                          </div>
                          <Badge variant="success" className="text-[10px]">
                            Synchronized
                          </Badge>
                        </div>
                      )}

                      {/* Execution Console Logs */}
                      {importLogs.length > 0 && (
                        <div className="rounded-lg bg-neutral-900 text-neutral-200 p-3 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                          <div className="text-neutral-400 font-bold border-b border-neutral-700 pb-1 mb-1 flex items-center justify-between">
                            <span>Import Activity Log</span>
                            <span>{importLogs.length} events</span>
                          </div>
                          {importLogs.map((log, idx) => (
                            <div key={idx} className="leading-tight">
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

