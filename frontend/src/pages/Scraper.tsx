/**
 * Social Media Intelligence Feed — web scraper dashboard.
 * Displays scraped social media posts related to Bengaluru traffic violations.
 * Supports platform and analysis-status filtering with auto-refresh every 60s.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Globe, ExternalLink, Clock, MapPin, Search, RefreshCw, CheckCircle2, Loader2, Filter } from "lucide-react";
import { getScraperFeed } from "@/lib/api";
import type { ScrapedFeedItem, ScraperFeedResponse } from "@/types/violation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PLATFORMS = ["twitter", "reddit", "instagram", "facebook"] as const;
const PLATFORM_COLORS: Record<string, string> = { twitter: "#1DA1F2", reddit: "#FF5700", instagram: "#E4405F", facebook: "#4267B2" };
const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  pending: { bg: "var(--color-warning)", text: "text-[var(--color-warning)]", ring: "ring-[var(--color-warning)]/20" },
  analyzed: { bg: "var(--color-success)", text: "text-[var(--color-success)]", ring: "ring-[var(--color-success)]/20" },
};
const REFRESH_MS = 60_000;

/** Return a human-friendly relative timestamp. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function platformLabel(p: string): string { return p.charAt(0).toUpperCase() + p.slice(1); }

// ---------------------------------------------------------------------------
// FeedCard sub-component
// ---------------------------------------------------------------------------
function FeedCard({ item, index, reduced, onAnalyze }: { item: ScrapedFeedItem; index: number; reduced: boolean; onAnalyze: (id: string) => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const platColor = PLATFORM_COLORS[item.platform] ?? "var(--color-accent)";
  const statusStyle = STATUS_STYLES[item.analysis_status] ?? STATUS_STYLES.pending;
  const isPending = item.analysis_status === "pending";

  return (
    <motion.div initial={reduced ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}>
      <Card className="group overflow-hidden border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 transition-all hover:border-[var(--color-accent)]/30 hover:shadow-md">
        <div className="relative h-40 overflow-hidden bg-[var(--color-paper-3)]/30">
          <img src={item.thumbnail_url ?? "https://placehold.co/400x200?text=No+Image"}
            alt={item.caption ?? "Scraped post thumbnail"}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <Badge variant="outline" className="absolute top-2 left-2 text-[10px] font-semibold backdrop-blur-sm"
            style={{ borderColor: `${platColor}60`, backgroundColor: `${platColor}20`, color: platColor }}>
            {platformLabel(item.platform)}
          </Badge>
          <Badge variant="outline" className={cn("absolute top-2 right-2 text-[10px] font-semibold ring-1 backdrop-blur-sm", statusStyle.text, statusStyle.ring)}
            style={{ borderColor: `${statusStyle.bg}40`, backgroundColor: `${statusStyle.bg}15` }}>
            {isPending ? <Clock className="mr-1 h-2.5 w-2.5" /> : <CheckCircle2 className="mr-1 h-2.5 w-2.5" />}
            {item.analysis_status}
          </Badge>
        </div>
        <CardContent className="p-3.5 space-y-2.5">
          <p className="text-[12px] leading-snug text-[var(--color-ink-muted)] line-clamp-2">{item.caption ?? "No caption"}</p>
          {item.location && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
              <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{item.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-ink-faint)]">
            <Clock className="h-2.5 w-2.5 shrink-0" /><span className="font-mono tabular-nums">{relativeTime(item.timestamp)}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {isPending ? (
              <Button size="sm" disabled={analyzing}
                onClick={() => { setAnalyzing(true); onAnalyze(item.id); }}
                className="flex-1 h-7 text-[11px] font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90">
                {analyzing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Search className="mr-1.5 h-3 w-3" />}
                {analyzing ? "Analyzing..." : "Analyze"}
              </Button>
            ) : (
              <a href="/dashboard/violations"
                className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--color-success)]/30 text-[11px] font-semibold text-[var(--color-success)] transition-colors hover:bg-[var(--color-success)]/10">
                <CheckCircle2 className="h-3 w-3" />View Results
              </a>
            )}
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-paper-3)] text-[var(--color-ink-faint)] transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)]">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function Scraper() {
  const prefersReduced = useReducedMotion();
  const demoMode = useAppStore((s) => s.demoMode);
  const [feed, setFeed] = useState<ScraperFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "analyzed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Mark a scraped item as analyzed (simulated). */
  const handleAnalyze = useCallback((id: string) => {
    setTimeout(() => {
      setFeed((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.map((it) => it.id === id ? { ...it, analysis_status: "analyzed" as const } : it) };
      });
    }, 2000);
  }, []);

  const fetchFeed = useCallback(async () => {
    try { const data = await getScraperFeed(); setFeed(data); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to fetch feed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeed();
    intervalRef.current = setInterval(fetchFeed, REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchFeed]);

  const filteredItems = (feed?.items ?? []).filter((item) => {
    if (platformFilter && item.platform !== platformFilter) return false;
    if (statusFilter !== "all" && item.analysis_status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.caption?.toLowerCase().includes(q) && !item.location?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleRefresh = useCallback(() => { setLoading(true); fetchFeed(); }, [fetchFeed]);
  const handlePlatformToggle = useCallback((p: string) => { setPlatformFilter((prev) => (prev === p ? null : p)); }, []);

  return (
    <motion.div className="p-5 lg:p-6"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/10 ring-1 ring-[var(--color-accent)]/20">
            <Globe className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">Web Scraper Intelligence</h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">Social media feed — traffic violation reports from Bengaluru</p>
          </div>
          {feed?.last_scraped && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[var(--color-ink-faint)]">
              <Clock className="h-3 w-3" />Last scraped {relativeTime(feed.last_scraped)}
            </div>
          )}
        </div>
      </header>
      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="h-8 text-[12px] font-medium">
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}Refresh
          </Button>
          <div className="flex items-center gap-1">
            <Filter className="mr-1 h-3 w-3 text-[var(--color-ink-faint)]" />
            {PLATFORMS.map((p) => (
              <Badge key={p} variant="outline" onClick={() => handlePlatformToggle(p)}
                className={cn("cursor-pointer text-[11px] font-medium transition-all", platformFilter === p ? "ring-1" : "opacity-60 hover:opacity-100")}
                style={platformFilter === p ? { borderColor: PLATFORM_COLORS[p], backgroundColor: `${PLATFORM_COLORS[p]}15`, color: PLATFORM_COLORS[p] } : undefined}>
                {platformLabel(p)}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(["all", "pending", "analyzed"] as const).map((s) => (
              <Badge key={s} variant="outline" onClick={() => setStatusFilter(s)}
                className={cn("cursor-pointer text-[11px] font-medium capitalize transition-all",
                  statusFilter === s ? "ring-1 border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]" : "opacity-60 hover:opacity-100")}>
                {s === "all" ? "All" : s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-faint)]" />
          <input type="text" placeholder="Search captions or locations..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full sm:w-56 rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-1)] pl-8 pr-3 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30" />
        </div>
      </div>
      {/* Stats bar */}
      <div className="mb-4 flex items-center gap-4 text-[11px] text-[var(--color-ink-faint)]">
        <span>Showing <strong className="text-[var(--color-ink)]">{filteredItems.length}</strong> of <strong className="text-[var(--color-ink)]">{feed?.total ?? 0}</strong> posts</span>
        {demoMode && <Badge variant="outline" className="text-[10px] border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">DEMO</Badge>}
      </div>
      {/* Feed Grid */}
      <AnimatePresence mode="wait">
        {loading && !feed ? (
          <motion.div key="loading" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="flex h-[300px] items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--color-accent)]" />
                <p className="text-sm text-[var(--color-ink-muted)]">Loading feed...</p>
              </div>
            </Card>
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={prefersReduced ? {} : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-danger)]/10">
                  <Globe className="h-4 w-4 text-[var(--color-danger)]" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--color-ink)]">Failed to load feed</p>
                  <p className="text-[11px] text-[var(--color-ink-faint)]">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 text-[12px]">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          <motion.div key="empty" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="flex h-[300px] items-center justify-center border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/30">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-paper-3)]/30">
                  <Search className="h-5 w-5 text-[var(--color-ink-faint)]" />
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">No posts match your filters</p>
                <p className="text-[11px] text-[var(--color-ink-faint)]">Try adjusting the platform or status filters</p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="feed" initial={prefersReduced ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, idx) => (
              <FeedCard key={item.id} item={item} index={idx} reduced={!!prefersReduced} onAnalyze={handleAnalyze} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
