import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { listViolations, actionViolation } from "@/lib/api";
import type { ViolationRecord } from "@/types/violation";
import {
  VIOLATION_LABELS,
  VIOLATION_COLORS,
  VIOLATION_SECTIONS,
} from "@/types/violation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const PAGE_SIZE = 20;

type FilterState = {
  violation_type: string;
  status: string;
  camera_id: string;
};

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

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      await actionViolation(id, action);
      fetchViolations();
    } catch {
      /* ignore */
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
            Violations
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {total} records — review, approve, or reject
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <Filter className="h-4 w-4 text-[var(--color-ink-faint)]" />
        <select
          value={filters.violation_type}
          onChange={(e) =>
            setFilters((f) => ({ ...f, violation_type: e.target.value }))
          }
          className="rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] px-3 py-1.5 text-xs text-[var(--color-ink)]"
        >
          <option value="">All Types</option>
          {Object.entries(VIOLATION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className="rounded-md border border-[var(--color-paper-3)] bg-[var(--color-paper-2)] px-3 py-1.5 text-xs text-[var(--color-ink)]"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-paper-3)] bg-[var(--color-paper-1)]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--color-paper-3)] text-[var(--color-ink-faint)]">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 font-medium">Plate</th>
              <th className="px-4 py-3 font-medium">Fine</th>
              <th className="px-4 py-3 font-medium">Camera</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-ink-muted)]">
                  Loading...
                </td>
              </tr>
            ) : violations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-ink-muted)]">
                  No violations found
                </td>
              </tr>
            ) : (
              violations.map((v) => (
                <ViolationRow
                  key={v.id}
                  violation={v}
                  onAction={handleAction}
                  onSelect={() => setSelectedViolation(v)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-[var(--color-paper-3)] px-2 py-1 text-xs text-[var(--color-ink-muted)] disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-[var(--color-paper-3)] px-2 py-1 text-xs text-[var(--color-ink-muted)] disabled:opacity-40"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const statusBadge = {
    pending: "bg-[var(--color-warning)]/20 text-[var(--color-warning)]",
    approved: "bg-[var(--color-success)]/20 text-[var(--color-success)]",
    rejected: "bg-[var(--color-danger)]/20 text-[var(--color-danger)]",
  }[v.status] ?? "";

  return (
    <tr className="border-b border-[var(--color-paper-3)] transition-colors hover:bg-[var(--color-paper-2)]">
      <td className="px-4 py-3">
        <button onClick={onSelect} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: vColor }}
          />
          <span className="font-medium text-[var(--color-ink)]">{vLabel}</span>
        </button>
      </td>
      <td className="px-4 py-3 tabular-nums text-[var(--color-ink-muted)]">
        {(v.confidence * 100).toFixed(0)}%
        <span
          className={cn(
            "ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium",
            v.confidence_tier === "high"
              ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
              : v.confidence_tier === "medium"
                ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)]"
                : "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
          )}
        >
          {v.confidence_tier}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-[var(--color-accent)]">
        {v.license_plate?.text ?? "—"}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-muted)]">
        ₹{v.fine_amount.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 text-[var(--color-ink-muted)]">
        {v.camera_id ?? "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn("rounded px-2 py-0.5 text-[10px] font-medium capitalize", statusBadge)}
        >
          {v.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {v.status === "pending" && (
          <div className="flex gap-1">
            <button
              onClick={() => onAction(v.id, "approve")}
              className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
              title="Approve"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onAction(v.id, "reject")}
              className="rounded p-1 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              title="Reject"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
