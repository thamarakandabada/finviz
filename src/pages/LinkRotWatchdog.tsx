import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { LinkRotHeader } from "@/components/LinkRotHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Play, LinkIcon, AlertTriangle, CheckCircle2, Clock, Square, Check, ChevronLeft, ChevronRight, Pause } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type LinkScan = {
  id: string;
  target_url: string;
  status: string;
  pages_crawled: number;
  links_checked: number;
  broken_count: number;
  started_at: string;
  completed_at: string | null;
};

type BrokenLink = {
  id: string;
  source_page: string;
  broken_url: string;
  status_code: number | null;
  resolved: boolean;
};

const LINKS_PER_PAGE = 15;

const TARGET_URL = "https://thamara.co.uk";

export default function LinkRotWatchdog() {
  const { user } = useAuth();
  const [scans, setScans] = useState<LinkScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchScans();
  }, [user]);

  useEffect(() => {
    if (selectedScan) {
      setCurrentPage(1);
      fetchBrokenLinks(selectedScan);
    }
  }, [selectedScan]);

  const fetchScans = async () => {
    const { data, error } = await supabase
      .from("link_scans")
      .select("*")
      .order("started_at", { ascending: false });

    if (error) {
      toast.error("Failed to load scans");
      console.error(error);
    } else {
      setScans((data as LinkScan[]) || []);
      if (data && data.length > 0 && !selectedScan) {
        setSelectedScan(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchBrokenLinks = async (scanId: string) => {
    setLoadingLinks(true);
    const { data, error } = await supabase
      .from("broken_links")
      .select("*")
      .eq("scan_id", scanId)
      .order("created_at");

    if (error) {
      toast.error("Failed to load broken links");
      console.error(error);
    } else {
      setBrokenLinks((data as BrokenLink[]) || []);
    }
    setLoadingLinks(false);
  };

  const toggleResolved = async (linkId: string, currentVal: boolean) => {
    const { error } = await supabase
      .from("broken_links")
      .update({ resolved: !currentVal } as any)
      .eq("id", linkId);
    if (error) {
      toast.error("Failed to update link");
    } else {
      setBrokenLinks((prev) =>
        prev.map((bl) => (bl.id === linkId ? { ...bl, resolved: !currentVal } : bl))
      );
    }
  };

  const [scanProgress, setScanProgress] = useState<string>("");
  const [scanPercent, setScanPercent] = useState<number>(0);
  const [scanTotalPages, setScanTotalPages] = useState<number>(0);

  const pauseScan = () => {
    pauseRef.current = true;
    setPaused(true);
    toast.info("Scan paused");
  };

  const resumeScan = () => {
    pauseRef.current = false;
    setPaused(false);
    toast.info("Scan resumed");
  };

  const stopScan = async (scanId: string) => {
    abortRef.current = true;
    pauseRef.current = false;
    setPaused(false);
    await supabase
      .from("link_scans")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", scanId);
    toast.info("Scan stopped");
    fetchScans();
  };

  const startScan = async () => {
    if (!user) return;
    abortRef.current = false;
    pauseRef.current = false;
    setPaused(false);
    setScanning(true);
    setScanProgress("Creating scan…");
    setScanPercent(0);
    setScanTotalPages(0);

    // Create scan record
    const { data: scan, error: createErr } = await supabase
      .from("link_scans")
      .insert({
        user_id: user.id,
        target_url: TARGET_URL,
        status: "pending",
      })
      .select()
      .single();

    if (createErr || !scan) {
      toast.error("Failed to create scan");
      setScanning(false);
      setScanProgress("");
      return;
    }

    const scanId = scan.id;
    setSelectedScan(scanId);
    setScans((prev) => [scan as LinkScan, ...prev]);

    try {
      // Phase 1: Map the site
      setScanProgress("Mapping site pages…");
      const { data: mapResult, error: mapErr } = await supabase.functions.invoke("link-rot-scan", {
        body: { mode: "map", scan_id: scanId, target_url: TARGET_URL },
      });

      if (abortRef.current) return;

      if (mapErr || !mapResult?.success) {
        throw new Error(mapErr?.message || mapResult?.error || "Map phase failed");
      }

      const totalPages = mapResult.total_pages || 0;
      setScanTotalPages(totalPages);
      setScanPercent(5);
      toast.info(`Found ${totalPages} pages — checking links…`);

      // Phase 2: Check batches until done
      let done = false;
      while (!done) {
        if (abortRef.current) return;

        // Wait while paused
        while (pauseRef.current && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 500));
        }
        if (abortRef.current) return;

        setScanProgress(`Checking links… (batch processing)`);

        const { data: batchResult, error: batchErr } = await supabase.functions.invoke("link-rot-scan", {
          body: { mode: "check-batch", scan_id: scanId },
        });

        if (abortRef.current) return;

        if (batchErr || !batchResult?.success) {
          throw new Error(batchErr?.message || batchResult?.error || "Batch check failed");
        }

        if (batchResult.phase === "complete") {
          done = true;
          setScanPercent(100);
        } else {
          const processed = batchResult.pages_processed || 0;
          const pct = totalPages > 0 ? Math.round(5 + (processed / totalPages) * 95) : 50;
          setScanPercent(pct);
          setScanProgress(`Checking links… ${processed}/${totalPages} pages`);
        }

        await fetchScans();
      }

      toast.success("Scan completed!");
      fetchBrokenLinks(scanId);
    } catch (err) {
      if (!abortRef.current) {
        toast.error("Scan failed: " + (err instanceof Error ? err.message : "Unknown error"));
      }
      fetchScans();
    } finally {
      setScanning(false);
      setScanProgress("");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-accent text-accent-foreground"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case "running":
      case "mapping":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Mapping…</Badge>;
      case "checking":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking…</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground"><Square className="h-3 w-3 mr-1" />Stopped</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const activeScan = scans.find((s) => s.id === selectedScan);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <LinkRotHeader />

        {/* Header + Run button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Link Rot Watchdog</h2>
            <p className="text-xs text-muted-foreground">
              Crawls {TARGET_URL} every 90 days and flags broken outbound links
            </p>
          </div>
          <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
              {scanning && (
                <>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-muted-foreground">{paused ? "Paused" : scanProgress}</span>
                    <span className="text-xs font-mono text-foreground">{scanPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${scanPercent}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            {scanning ? (
              <div className="flex items-center gap-1.5">
                {paused ? (
                  <Button onClick={resumeScan} size="sm" variant="secondary">
                    <Play className="h-4 w-4 mr-1" />Resume
                  </Button>
                ) : (
                  <Button onClick={pauseScan} size="sm" variant="outline">
                    <Pause className="h-4 w-4 mr-1" />Pause
                  </Button>
                )}
                <Button onClick={() => { const s = scans.find(s => s.status === 'pending' || s.status === 'mapping' || s.status === 'checking'); if (s) stopScan(s.id); else abortRef.current = true; }} variant="destructive" size="sm">
                  <Square className="h-4 w-4 mr-1" />Stop
                </Button>
              </div>
            ) : (
              <Button onClick={startScan} size="sm">
                <Play className="h-4 w-4 mr-1" />Run Scan Now
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        {activeScan && activeScan.status === "completed" && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-mono text-foreground">{activeScan.pages_crawled}</p>
                <p className="text-xs text-muted-foreground">Pages Crawled</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold font-mono text-foreground">{activeScan.links_checked}</p>
                <p className="text-xs text-muted-foreground">Links Checked</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold font-mono ${activeScan.broken_count > 0 ? "text-destructive" : "text-accent"}`}>
                  {activeScan.broken_count}
                </p>
                <p className="text-xs text-muted-foreground">Broken Links</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scan history */}
          <Card className="md:col-span-1">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scan History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {scans.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No scans yet. Run your first scan!</p>
              ) : (
                scans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => setSelectedScan(scan.id)}
                    className={`w-full text-left p-2.5 rounded-md text-xs transition-colors ${
                      selectedScan === scan.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono">{format(new Date(scan.started_at), "dd MMM yyyy")}</span>
                      {statusBadge(scan.status)}
                    </div>
                    {scan.status === "completed" && (
                      <span className="text-muted-foreground">
                        {scan.broken_count} broken · {scan.pages_crawled} pages
                      </span>
                    )}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Broken links table */}
          <Card className="md:col-span-2">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Broken Links {activeScan ? `— ${format(new Date(activeScan.started_at), "dd MMM yyyy")}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {loadingLinks ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : brokenLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  {activeScan?.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 mb-2 text-accent" />
                      <p className="text-sm">No broken links found!</p>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-8 w-8 mb-2" />
                      <p className="text-sm">Select a completed scan to view results</p>
                    </>
                  )}
                </div>
              ) : (() => {
                const totalPages = Math.ceil(brokenLinks.length / LINKS_PER_PAGE);
                const paginated = brokenLinks.slice((currentPage - 1) * LINKS_PER_PAGE, currentPage * LINKS_PER_PAGE);
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Broken URL</TableHead>
                          <TableHead className="text-xs">Found On</TableHead>
                          <TableHead className="text-xs w-[80px]">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((bl) => (
                          <TableRow key={bl.id} className={bl.resolved ? "opacity-50" : ""}>
                            <TableCell>
                              {bl.resolved ? (
                                <Badge variant="outline" className="font-mono text-xs text-accent border-accent">
                                  <Check className="h-3 w-3 mr-0.5" />Fixed
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="font-mono text-xs">
                                  {bl.status_code || "Timeout"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[250px] truncate">
                              <a
                                href={bl.broken_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {bl.broken_url}
                              </a>
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">
                              <a
                                href={bl.source_page}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary hover:underline"
                              >
                                {bl.source_page}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant={bl.resolved ? "outline" : "ghost"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => toggleResolved(bl.id, bl.resolved)}
                              >
                                {bl.resolved ? "Undo" : <><Check className="h-3 w-3 mr-0.5" />Done</>}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 px-2">
                        <span className="text-xs text-muted-foreground">
                          {brokenLinks.length} links · Page {currentPage} of {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
