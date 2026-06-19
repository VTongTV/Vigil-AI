/**
 * Violations page — tabular list of all detected violations with filters,
 * approve/reject actions, and a local audit trail.
 *
 * Design: "Enforcement Docket"
 * - Dense shadcn Table with sticky header
 * - Inline status badges and confidence tier indicators
 * - Filter dropdowns using shadcn Select
 * - Collapsible audit trail section
 * - Framer Motion: page entrance, row stagger, whileTap on action buttons
 *
 * Hierarchy (mirrors Dashboard reference):
 *   L1 Hero     → font-mono text-[22px] font-bold     (primary count in header)
 *   L2 Title    → text-[13px] font-semibold text-ink  (section labels)
 *   L3 Body     → text-[12px] font-medium text-ink    (violation type, plate)
 *   L4 Label    → text-[11px] uppercase tracking-wider (column heads, filter label)
 *   L5 Aux      → text-[10px] tabular-nums text-faint (camera, timestamps, IDs)
 */

import { useEffect, useState, useCallback } from "react";
import {
  Filter,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { listViolations, actionViolation } from "@/lib/api";
import type { ViolationRecord } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet as SheetPrimitive,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const PAGE_SIZE = 20;

type FilterState = {
  violation_type: string | null;
  status: string | null;
  camera_id: string;
};

/** A single entry in the local audit trail. */
interface AuditEntry {
  action: "approve" | "reject";
  violationId: string;
  timestamp: string;
  actor: string;
}

export default function Violations() {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    violation_type: "",
    status: "",
    camera_id: "",
  });
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [detailViolation, setDetailViolation] = useState<ViolationRecord | null>(null);
  const setSelectedViolation = useAppStore((s) => s.setSelectedViolation);
  const demoMode = useAppStore((s) => s.demoMode);
  const prefersReduced = useReducedMotion();

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listViolations({
        violation_type: filters.violation_type ?? undefined,
        status: filters.status ?? undefined,
        camera_id: filters.camera_id,
        page,
        page_size: PAGE_SIZE,
      });
      setViolations(res.violations);
      setTotal(res.total);
    } catch {
      setViolations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, demoMode]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  /**
   * Approve or reject a violation and log the action to the local audit trail.
   */
  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      await actionViolation(id, action);
      setAuditLog((prev) => [
        {
          action,
          violationId: id,
          timestamp: new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          actor: "officer_001",
        },
        ...prev,
      ]);
      fetchViolations();
    } catch {
      /* ignore */
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <motion.div
      className="p-5 lg:p-6"
      initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── Header ── */}
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-soft)] ring-1 ring-[var(--color-accent)]/15">
              <AlertTriangle className="h-4 w-4 text-[var(--color-accent)]" />
            </div>
            <div>
              {/* L1: page title */}
              <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
                Violations
              </h1>
              {/* L4: subtitle — subdued */}
              <p className="text-[11px] text-[var(--color-ink-faint)]">
                Review, approve, or reject detected violations
              </p>
            </div>
          </div>
          {/* L1: total count — hero metric in accent pill so it registers within 3 seconds */}
          {total > 0 && (
            <span className="rounded-md bg-[var(--color-accent-soft)] px-3 py-1 font-mono text-[15px] font-bold tabular-nums text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20">
              {total.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </header>

      {/* ── Filter bar — visually anchored as a secondary toolbar ── */}
      <div className="mb-4 flex items-center gap-3">
        {/* L4: "Filters" label — anchors the toolbar zone */}
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
          <Filter className="h-3 w-3" />
          Filters
        </span>
        <div className="h-4 w-px bg-[var(--color-paper-3)]" />
        <Select
          value={filters.violation_type || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, violation_type: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-7 w-36 border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[11px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {Object.entries(VIOLATION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                <span className="text-[11px]">{label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-7 w-32 border-[var(--rule-color)] bg-[var(--color-paper-2)] text-[11px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden border-[var(--rule-color)] bg-[var(--color-paper-1)]">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              {/* Header row — visually separated from data by stronger border */}
              <TableRow className="border-b-2 border-b-[var(--color-paper-3)]/70 hover:bg-transparent">
                {/* L4: column heads — smallest, most subdued */}
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Type
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Confidence
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Plate
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Fine
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Camera
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="wait">
                {loading ? (
                  <TableRow key="loading">
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
                        <span className="text-xs text-[var(--color-ink-faint)]">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : violations.length === 0 ? (
                  <TableRow key="empty">
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-[var(--color-ink-faint)]">
                      No violations found
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((v, i) => (
                    <ViolationRow
                      key={v.id}
                      violation={v}
                      index={i}
                      onAction={handleAction}
                      onSelect={() => {
                        setSelectedViolation(v);
                        setDetailViolation(v);
                      }}
                      prefersReduced={prefersReduced ?? false}
                    />
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <motion.div whileTap={prefersReduced ? {} : { scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </motion.div>
            <motion.div whileTap={prefersReduced ? {} : { scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Audit trail ── */}
      <AnimatePresence>
        {auditLog.length > 0 && (
          <motion.div
            key="audit-log"
            initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="mt-5 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
              <CardContent className="p-4">
                {/* L2: section title — promoted so it reads as a distinct zone */}
                <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
                  <History className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
                  Action Log
                  {/* L5: count — auxiliary */}
                  <span className="ml-1 font-mono text-[11px] tabular-nums text-[var(--color-ink-faint)]">
                    ({auditLog.length})
                  </span>
                </h2>
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {auditLog.map((entry, i) => (
                      <motion.div
                        key={`${entry.violationId}-${entry.timestamp}-${i}`}
                        initial={prefersReduced ? {} : { opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26 }}
                        className="flex items-center gap-3 text-[11px]"
                      >
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-semibold",
                            entry.action === "approve"
                              ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                              : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
                          )}
                        >
                          {entry.action.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-[var(--color-ink-muted)]">
                          {entry.violationId.slice(0, 8)}
                        </span>
                        <span className="text-[var(--color-ink-faint)]">
                          by {entry.actor}
                        </span>
                        {/* L5: timestamp — rightmost, faintest */}
                        <span className="ml-auto font-mono text-[10px] text-[var(--color-ink-faint)]">
                          {entry.timestamp}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail sheet ── */}
      <SheetPrimitive open={!!detailViolation} onOpenChange={(open) => !open && setDetailViolation(null)}>
        <SheetContent className="border-[var(--color-paper-3)] bg-[var(--color-paper-1)]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-[15px] font-semibold text-[var(--color-ink)]">
              Violation Detail
            </SheetTitle>
            {/* L5: ID — auxiliary */}
            <SheetDescription className="font-mono text-[10px] text-[var(--color-ink-faint)]">
              {detailViolation?.id}
            </SheetDescription>
          </SheetHeader>
          {detailViolation && (
            <div className="space-y-5">
              {/* Primary group — type, fine, status (highest visibility) */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Violation
                </p>
                <div className="space-y-2">
                  <DetailRow
                    label="Type"
                    value={
                      <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                        {VIOLATION_LABELS[detailViolation.violation_type] ?? detailViolation.violation_type}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Fine"
                    value={
                      <span className="font-mono text-[16px] font-bold text-[var(--color-warning)]">
                        ₹{detailViolation.fine_amount.toLocaleString("en-IN")}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          {
                            pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
                            under_review: "border-blue-400/30 bg-blue-400/10 text-blue-400",
                            approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
                            issued: "border-purple-400/30 bg-purple-400/10 text-purple-400",
                            rejected: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
                          }[detailViolation.status] ?? ""
                        )}
                      >
                        {detailViolation.status}
                      </Badge>
                    }
                  />
                </div>
              </div>

              {/* Secondary group — enforcement details */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Enforcement
                </p>
                <div className="space-y-2">
                  <DetailRow label="MV Act" value={<span className="text-[12px] text-[var(--color-ink)]">{detailViolation.mv_act_section}</span>} />
                  <DetailRow label="Confidence" value={<span className="font-mono text-[12px] text-[var(--color-ink-muted)]">{(detailViolation.confidence * 100).toFixed(1)}%</span>} />
                  <DetailRow label="Plate" value={<span className="font-mono text-[12px] text-[var(--color-accent)]">{detailViolation.license_plate?.text ?? "—"}</span>} />
                </div>
              </div>

              {/* Tertiary group — location and audit metadata */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Location & Audit
                </p>
                <div className="space-y-2">
                  <DetailRow label="Camera" value={<span className="font-mono text-[11px] text-[var(--color-ink-muted)]">{detailViolation.camera_id ?? "—"}</span>} />
                  <DetailRow label="Junction" value={<span className="text-[11px] text-[var(--color-ink-muted)]">{detailViolation.junction_name ?? "—"}</span>} />
                  <DetailRow label="Timestamp" value={<span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{new Date(detailViolation.timestamp).toLocaleString("en-IN")}</span>} />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </SheetPrimitive>
    </motion.div>
  );
}

/** Single row in the violations table — animated entrance via Framer Motion. */
function ViolationRow({
  violation: v,
  index,
  onAction,
  onSelect,
  prefersReduced,
}: {
  violation: ViolationRecord;
  index: number;
  onAction: (id: string, action: "approve" | "reject") => void;
  onSelect: () => void;
  prefersReduced: boolean;
}) {
  const vColor = VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
  const vLabel = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;

  const statusConfig = {
    pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    under_review: "border-blue-400/30 bg-blue-400/10 text-blue-400",
    approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    issued: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    rejected: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[v.status] ?? "";

  const tierConfig = {
    high: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    medium: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    low: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[v.confidence_tier] ?? "";

  return (
    <motion.tr
      initial={prefersReduced ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.025, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="cursor-pointer border-b border-b-[var(--color-paper-3)]/40 transition-colors hover:bg-[var(--color-paper-2)]/40"
      onClick={onSelect}
    >
      {/* L3: violation type — primary data in each row */}
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: vColor }}
          />
          <span className="text-[12px] font-semibold text-[var(--color-ink)]">{vLabel}</span>
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
            {(v.confidence * 100).toFixed(0)}%
          </span>
          <Badge variant="outline" className={cn("text-[10px]", tierConfig)}>
            {v.confidence_tier}
          </Badge>
        </div>
      </TableCell>
      {/* L3: license plate — distinctive monospace */}
      <TableCell className="py-2.5 font-mono text-[12px] font-semibold text-[var(--color-accent)]">
        {v.license_plate?.text ?? "—"}
      </TableCell>
      {/* L3: fine — warning color for financial significance */}
      <TableCell className="py-2.5">
        <span className="font-mono text-[12px] font-semibold text-[var(--color-warning)]">
          ₹{v.fine_amount.toLocaleString("en-IN")}
        </span>
      </TableCell>
      {/* L5: camera ID — auxiliary metadata */}
      <TableCell className="py-2.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
        {v.camera_id ?? "—"}
      </TableCell>
      {/* Status badge — visual weight matches importance */}
      <TableCell className="py-2.5">
        <Badge variant="outline" className={cn("text-[11px]", statusConfig)}>
          {v.status}
        </Badge>
      </TableCell>
      {/* Actions — labeled text buttons for clear CTA identification */}
      <TableCell className="py-2.5">
        {v.status === "pending" && (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Primary CTA — approve: solid emphasis */}
            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.9 }}
              onClick={() => onAction(v.id, "approve")}
              className="flex items-center gap-1 rounded-md bg-[var(--color-success)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--color-success)] ring-1 ring-[var(--color-success)]/25 transition-colors hover:bg-[var(--color-success)]/20"
              title="Approve violation"
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </motion.button>
            {/* Secondary CTA — reject: lighter treatment */}
            <motion.button
              whileTap={prefersReduced ? {} : { scale: 0.9 }}
              onClick={() => onAction(v.id, "reject")}
              className="flex items-center gap-1 rounded-md bg-[var(--color-paper-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-danger)] ring-1 ring-[var(--color-paper-3)]/50 transition-colors hover:bg-[var(--color-danger)]/10"
              title="Reject violation"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </motion.button>
          </div>
        )}
      </TableCell>
    </motion.tr>
  );
}

/** Key-value row for the detail sheet — supports ReactNode values. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-[11px] text-[var(--color-ink-faint)]">{label}</span>
      <span className="text-right">{typeof value === "string"
        ? <span className="text-[12px] font-medium text-[var(--color-ink)]">{value}</span>
        : value
      }</span>
    </div>
  );
}
