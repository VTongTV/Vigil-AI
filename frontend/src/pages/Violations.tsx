/**
 * Violations page — tabular list of all detected violations with filters,
 * approve/reject actions, and a local audit trail.
 *
 * Design: "Enforcement Docket"
 * - Dense shadcn Table with sticky header
 * - Inline status badges and confidence tier indicators
 * - Filter dropdowns using shadcn Select
 * - Collapsible audit trail section
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
  Sheet,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const PAGE_SIZE = 20;

type FilterState = {
  violation_type: string;
  status: string;
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

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listViolations({
        ...filters,
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
  }, [filters, page]);

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
    <div className="p-5">
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent)]/15">
            <AlertTriangle className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              Violations
            </h1>
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              {total} records — review, approve, or reject
            </p>
          </div>
        </div>
      </header>

      {/* Filters bar */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
        <Select
          value={filters.violation_type || "__all__"}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, violation_type: v === "__all__" ? "" : v }))
          }
        >
          <SelectTrigger className="h-7 w-36 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[11px]">
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
          <SelectTrigger className="h-7 w-32 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50 text-[11px]">
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

      {/* Table */}
      <Card className="border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70 overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-b-[var(--color-paper-3)]/60 hover:bg-transparent">
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Confidence
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Plate
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Fine
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Camera
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-[var(--color-accent)] animate-spin" />
                      <span className="text-xs text-[var(--color-ink-faint)]">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-[var(--color-ink-faint)]">
                    No violations found
                  </TableCell>
                </TableRow>
              ) : (
                violations.map((v) => (
                  <ViolationRow
                    key={v.id}
                    violation={v}
                    onAction={handleAction}
                    onSelect={() => {
                      setSelectedViolation(v);
                      setDetailViolation(v);
                    }}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="font-mono text-[10px] tabular-nums text-[var(--color-ink-faint)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 border-[var(--color-paper-3)] bg-[var(--color-paper-2)]/50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Audit trail */}
      {auditLog.length > 0 && (
        <Card className="mt-5 border-[var(--color-paper-3)]/60 bg-[var(--color-paper-1)]/70">
          <CardContent className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-faint)]">
              <History className="h-3 w-3" />
              Action Log
            </h2>
            <div className="space-y-1.5">
              {auditLog.map((entry, i) => (
                <div
                  key={`${entry.violationId}-${entry.timestamp}-${i}`}
                  className="flex items-center gap-3 text-[11px]"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-semibold",
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
                  <span className="ml-auto font-mono text-[9px] text-[var(--color-ink-faint)]">
                    {entry.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail sheet */}
      <SheetPrimitive open={!!detailViolation} onOpenChange={(open) => !open && setDetailViolation(null)}>
        <SheetContent className="border-[var(--color-paper-3)] bg-[var(--color-paper-1)]">
          <SheetHeader>
            <SheetTitle className="text-sm text-[var(--color-ink)]">
              Violation Detail
            </SheetTitle>
            <SheetDescription className="text-[10px] text-[var(--color-ink-faint)]">
              {detailViolation?.id}
            </SheetDescription>
          </SheetHeader>
          {detailViolation && (
            <div className="mt-4 space-y-3 text-[11px]">
              <DetailRow label="Type" value={VIOLATION_LABELS[detailViolation.violation_type] ?? detailViolation.violation_type} />
              <DetailRow label="Confidence" value={`${(detailViolation.confidence * 100).toFixed(1)}%`} />
              <DetailRow label="Tier" value={detailViolation.confidence_tier} />
              <DetailRow label="Plate" value={detailViolation.license_plate?.text ?? "—"} />
              <DetailRow label="Fine" value={`₹${detailViolation.fine_amount.toLocaleString("en-IN")}`} />
              <DetailRow label="Camera" value={detailViolation.camera_id ?? "—"} />
              <DetailRow label="Junction" value={detailViolation.junction_name ?? "—"} />
              <DetailRow label="MV Act" value={detailViolation.mv_act_section} />
              <DetailRow label="Timestamp" value={new Date(detailViolation.timestamp).toLocaleString("en-IN")} />
              <DetailRow label="Status" value={detailViolation.status} />
            </div>
          )}
        </SheetContent>
      </SheetPrimitive>
    </div>
  );
}

/** Single row in the violations table. */
function ViolationRow({
  violation: v,
  onAction,
  onSelect,
}: {
  violation: ViolationRecord;
  onAction: (id: string, action: "approve" | "reject") => void;
  onSelect: () => void;
}) {
  const vColor = VIOLATION_COLORS[v.violation_type] ?? "var(--color-accent)";
  const vLabel = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;

  const statusConfig = {
    pending: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    approved: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    rejected: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[v.status] ?? "";

  const tierConfig = {
    high: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
    medium: "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    low: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  }[v.confidence_tier] ?? "";

  return (
    <TableRow
      className="cursor-pointer border-b-[var(--color-paper-3)]/40 transition-colors hover:bg-[var(--color-paper-2)]/40"
      onClick={onSelect}
    >
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: vColor }}
          />
          <span className="text-[11px] font-medium text-[var(--color-ink)]">{vLabel}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] tabular-nums text-[var(--color-ink-muted)]">
            {(v.confidence * 100).toFixed(0)}%
          </span>
          <Badge variant="outline" className={cn("text-[8px]", tierConfig)}>
            {v.confidence_tier}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="py-2 font-mono text-[11px] text-[var(--color-accent)]">
        {v.license_plate?.text ?? "—"}
      </TableCell>
      <TableCell className="py-2 text-[11px] text-[var(--color-ink-muted)]">
        ₹{v.fine_amount.toLocaleString("en-IN")}
      </TableCell>
      <TableCell className="py-2 text-[11px] text-[var(--color-ink-muted)]">
        {v.camera_id ?? "—"}
      </TableCell>
      <TableCell className="py-2">
        <Badge variant="outline" className={cn("text-[9px]", statusConfig)}>
          {v.status}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        {v.status === "pending" && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
              onClick={() => onAction(v.id, "approve")}
              title="Approve"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              onClick={() => onAction(v.id, "reject")}
              title="Reject"
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/** Key-value row for the detail sheet. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-ink-faint)]">{label}</span>
      <span className="font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}
