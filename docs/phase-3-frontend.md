# Phase 3: Frontend — Detailed Specification

> Phase 3 Duration: 8 hours
> Module: `frontend/`
> Exit Criteria: Full user flow works — Dashboard → Upload → Evidence → Approve/Reject → Map

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Command Center Layout](#2-command-center-layout)
3. [Dashboard Page](#3-dashboard-page)
4. [Upload Page](#4-upload-page)
5. [Evidence Viewer](#5-evidence-viewer)
6. [Approve/Reject Workflow](#6-approvereject-workflow)
7. [Demo Mode Implementation](#7-demo-mode-implementation)
8. [Map Page](#8-map-page)

---

## 1. Project Setup

### Initialize Project

```bash
cd "D:\Web Project\Flipkart\Round 2"
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

### Install Dependencies

```bash
# Core
npm install react@19 react-dom@19

# Routing
npm install react-router-dom

# Styling
npm install tailwindcss @tailwindcss/vite
npx shadcn@latest init

# Components
npx shadcn@latest add button card badge dialog table tabs separator scroll-area
npx shadcn@latest add select input label textarea
npx shadcn@latest add dropdown-menu tooltip

# State
npm install zustand

# Charts
npm install recharts

# Maps
npm install react-leaflet leaflet
npm install -D @types/leaflet

# Icons
npm install lucide-react

# HTTP
# No fetch library needed — use native fetch
```

### shadcn/ui Components List

| Component | Usage |
|-----------|-------|
| Button | Actions (Approve, Reject, Upload, Print) |
| Card | Stats cards, violation cards, evidence panel |
| Badge | Confidence tier, status, demo mode indicator |
| Dialog | Evidence viewer modal |
| Table | Violations table |
| Tabs | Dashboard tabs (Overview, Violations, Analytics) |
| Separator | Section dividers |
| ScrollArea | Scrollable violation feed |
| Select | Filter dropdowns |
| Input | Search, date range |
| Label | Form labels |
| DropdownMenu | Navigation menu |
| Tooltip | Info tooltips |

### Project Structure

```
frontend/
├── public/
│   ├── demo/                    # Demo mode images
│   │   ├── sample_traffic_1.jpg
│   │   ├── sample_traffic_2.jpg
│   │   └── sample_traffic_3.jpg
│   └── favicon.ico
├── src/
│   ├── App.tsx                  # Routes + layout
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Tailwind imports
│   ├── components/
│   │   ├── layout/
│   │   │   ├── CommandCenterLayout.tsx  # Main layout with header
│   │   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   │   └── Header.tsx                # BTP badge, clock, demo toggle
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx            # Key metric cards
│   │   │   ├── ViolationFeed.tsx         # Recent violations list
│   │   │   ├── PipelineWaterfall.tsx     # Pipeline timing chart
│   │   │   └── ROICalculator.tsx         # ROI comparison table
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx            # Drag-drop upload
│   │   │   ├── BboxOverlay.tsx           # Canvas bbox rendering
│   │   │   └── ViolationCards.tsx         # Detected violation cards
│   │   ├── evidence/
│   │   │   ├── EvidenceViewer.tsx        # Split panel viewer
│   │   │   └── FIRMetadata.tsx           # FIR-style violation details
│   │   ├── map/
│   │   │   └── ViolationMap.tsx           # Leaflet map with markers
│   │   └── shared/
│   │       ├── ConfidenceBadge.tsx        # High/Medium/Low badge
│   │       ├── StatusBadge.tsx            # Pending/Approved/Rejected
│   │       └── FineInfo.tsx              # MV Act section + amount
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── ViolationsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── MapPage.tsx
│   ├── stores/
│   │   └── appStore.ts                    # Zustand store (demo mode, state)
│   ├── types/
│   │   └── violation.ts                  # TypeScript interfaces
│   ├── mocks/
│   │   ├── analytics.json
│   │   ├── violations.json
│   │   └── detect-response.json
│   ├── lib/
│   │   ├── api.ts                         # API client
│   │   └── utils.ts                       # Utility functions
│   └── hooks/
│       ├── useApi.ts                      # Data fetching hook
│       └── useDemoMode.ts                 # Demo mode hook
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Vite Config (Proxy to Backend)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/evidence": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

---

## 2. Command Center Layout

### Design Specification

The layout mimics a BTP traffic control center — dark, professional, data-dense.

#### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background (primary) | Dark navy | `#0f172a` |
| Background (card) | Slightly lighter navy | `#1e293b` |
| Background (sidebar) | Darkest navy | `#0c1222` |
| Text (primary) | White | `#f8fafc` |
| Text (secondary) | Slate gray | `#94a3b8` |
| Accent (no helmet) | Red | `#ef4444` |
| Accent (triple riding) | Orange | `#f97316` |
| Accent (plate) | Yellow | `#eab308` |
| Accent (success) | Green | `#22c55e` |
| Border | Subtle navy | `#334155` |
| Scanline texture | Semi-transparent white | `rgba(255,255,255,0.02)` |

#### Header Specification

```
┌─────────────────────────────────────────────────────────────────┐
│ 🛡️ VIGILAI  │  BENGALURU TRAFFIC POLICE  │ 14:32:05 IST  │ ⚙️ │
└─────────────────────────────────────────────────────────────────┘
```

Elements:
- **Left**: VigilAI logo/icon + text
- **Center**: "BENGALURU TRAFFICE POLICE" badge (subtle, official-looking)
- **Right**: Ticking IST clock (updates every second) + Demo mode toggle

#### Ticking IST Clock

```typescript
function useISTClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      setTime(ist.toLocaleTimeString("en-IN", { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}
```

#### Scanline Texture

A subtle CSS overlay that adds a CRT/monitoring station feel:

```css
.scanline-texture::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 255, 255, 0.02) 2px,
    rgba(255, 255, 255, 0.02) 4px
  );
  pointer-events: none;
  z-index: 1;
}
```

#### Sidebar Navigation

```
┌──────────────┐
│  📊 Dashboard │  ← Active
│  📤 Upload    │
│  📋 Violations│
│  📈 Analytics │
│  🗺️ Map       │
│              │
│  ─────────── │
│  ⚡ Demo Mode │  ← Toggle
└──────────────┘
```

---

## 3. Dashboard Page

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  STATS ROW                                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Violations│ │Potential │ │Approved │ │Approval │      │
│  │  247     │ │₹1.23L   │ │ 62      │ │ Rate 25%│      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌──────────────────────────┐ │
│  │  VIOLATION FEED        │ │  PIPELINE WATERFALL      │ │
│  │  ┌──────────────────┐  │ │                          │ │
│  │  │ No Helmet  87%   │  │ │  ████████ Preprocess 45ms│ │
│  │  │ KA01AB1234       │  │ │  ████████████ Detect 187 │ │
│  │  │ MG Road  14:32   │  │ │  █ Violate 12ms          │ │
│  │  ├──────────────────┤  │ │  ██████ Plate 95ms       │ │
│  │  │ Triple Ride 72%  │  │ │  ████████████ OCR 234ms  │ │
│  │  │ KA05MZ9876       │  │ │  ██████ Evidence 89ms    │ │
│  │  │ Silk Board 14:28 │  │ │                          │ │
│  │  └──────────────────┘  │ │  Total: 662ms           │ │
│  └────────────────────────┘ └──────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│  ROI CALCULATOR                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Current (75)  │ Conservative (500) │ Aggressive│   │
│  │  ₹65.7 Cr/yr   │ ₹219 Cr/yr         │ ₹438 Cr/yr│   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Stats Cards

| Card | Value Source | Color |
|------|-------------|-------|
| Total Violations | `analytics.total_violations` | Blue accent |
| Potential Fines | `analytics.total_potential_fine` | Green accent |
| Approved | `analytics.by_status.approved` | Green |
| Approval Rate | `approved / total * 100` | Blue |

### Violation Feed

Recent violations in reverse chronological order:

```tsx
function ViolationFeed({ violations }: { violations: ViolationRecord[] }) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Recent Violations</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {violations.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <ConfidenceBadge tier={v.confidence_tier} />
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {v.violation_type === "no_helmet" ? "No Helmet" : v.violation_type === "triple_riding" ? "Triple Riding" : "License Plate"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {v.junction_name} · {formatTime(v.timestamp)}
                  </p>
                </div>
              </div>
              <FineInfo section={v.mv_act_section} amount={v.fine_amount} />
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### Pipeline Waterfall Chart

Horizontal stacked bar chart showing pipeline stage timing:

```tsx
function PipelineWaterfall({ timing }: { timing: PipelineTiming }) {
  const stages = [
    { name: "Preprocessing", ms: timing.preprocessing_ms, color: "#3b82f6" },
    { name: "Detection", ms: timing.detection_ms, color: "#8b5cf6" },
    { name: "Violation Logic", ms: timing.violation_ms, color: "#06b6d4" },
    { name: "Plate Detection", ms: timing.plate_ms, color: "#f97316" },
    { name: "OCR", ms: timing.ocr_ms, color: "#eab308" },
    { name: "Evidence Gen", ms: timing.evidence_ms, color: "#22c55e" },
  ];

  const total = stages.reduce((sum, s) => sum + s.ms, 0);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Pipeline Waterfall</CardTitle>
        <p className="text-sm text-slate-400">Total: {total.toFixed(0)}ms</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.name} className="flex items-center gap-3">
              <span className="w-28 text-xs text-slate-400">{stage.name}</span>
              <div className="flex-1 bg-slate-700 rounded h-5 overflow-hidden">
                <div
                  style={{
                    width: `${(stage.ms / total) * 100}%`,
                    backgroundColor: stage.color,
                  }}
                  className="h-full rounded transition-all"
                />
              </div>
              <span className="w-16 text-right text-xs text-slate-300">
                {stage.ms.toFixed(0)}ms
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 4. Upload Page

### Flow

```
1. User drags image onto UploadZone
2. FormData sent to POST /api/v1/detect
3. Response received with violations + bbox data
4. Original image rendered on <canvas>
5. Bbox overlays drawn on canvas (normalized → pixel)
6. ViolationCards rendered below canvas
7. User can click a violation → opens EvidenceViewer
```

### UploadZone Component

```tsx
function UploadZone({ onResult }: { onResult: (result: DetectResponse) => void }) {
  const [uploading, setUploading] = useState(false);
  const demoMode = useAppStore((s) => s.demoMode);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      if (demoMode) {
        const mockResponse = await import("../mocks/detect-response.json");
        onResult(mockResponse.default as DetectResponse);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Detection failed: ${res.statusText}`);
      }

      const data: DetectResponse = await res.json();
      onResult(data);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="border-2 border-dashed border-slate-600 rounded-lg p-12 text-center
                  hover:border-blue-500 transition-colors cursor-pointer"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
    >
      {uploading ? (
        <div className="animate-pulse text-slate-300">Processing...</div>
      ) : (
        <div className="text-slate-400">
          <Upload className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">Drop traffic image here</p>
          <p className="text-sm mt-2">or click to browse</p>
        </div>
      )}
    </div>
  );
}
```

### Bbox Overlay (Canvas)

```tsx
function BboxOverlay({
  imageUrl,
  violations,
}: {
  imageUrl: string;
  violations: ViolationResult[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      drawViolations(ctx, violations, img.naturalWidth, img.naturalHeight);
    };
    img.src = imageUrl;
  }, [imageUrl, violations]);

  return <canvas ref={canvasRef} className="w-full rounded-lg" />;
}

function drawViolations(
  ctx: CanvasRenderingContext2D,
  violations: ViolationResult[],
  imgW: number,
  imgH: number,
) {
  const colorMap: Record<string, string> = {
    no_helmet: "#ef4444",
    triple_riding: "#f97316",
    license_plate_mismatch: "#eab308",
  };

  for (const v of violations) {
    const [x1, y1, x2, y2] = v.bbox;
    const color = colorMap[v.type] || "#8b5cf6";

    // Draw bbox
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x1 * imgW, y1 * imgH, (x2 - x1) * imgW, (y2 - y1) * imgH);

    // Draw label
    const label = `${v.type} ${Math.round(v.confidence * 100)}%`;
    ctx.font = "bold 14px monospace";
    const metrics = ctx.measureText(label);
    ctx.fillStyle = color;
    ctx.fillRect(x1 * imgW, y1 * imgH - 22, metrics.width + 10, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x1 * imgW + 5, y1 * imgH - 6);

    // Draw rider bboxes for triple riding
    if (v.rider_bboxes) {
      for (const rb of v.rider_bboxes) {
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          rb[0] * imgW, rb[1] * imgH,
          (rb[2] - rb[0]) * imgW, (rb[3] - rb[1]) * imgH,
        );
      }
    }

    // Draw head region for no_helmet
    if (v.head_bbox) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        v.head_bbox[0] * imgW, v.head_bbox[1] * imgH,
        (v.head_bbox[2] - v.head_bbox[0]) * imgW,
        (v.head_bbox[3] - v.head_bbox[1]) * imgH,
      );
      ctx.setLineDash([]);
    }
  }
}
```

### Violation Cards

```tsx
function ViolationCards({ violations }: { violations: ViolationResult[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {violations.map((v) => (
        <Card key={v.violation_id} className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <ConfidenceBadge tier={v.confidence_tier} />
              <FineInfo section={v.mv_act_section} amount={v.fine_amount} />
            </div>
            <h3 className="text-slate-100 font-semibold">
              {formatViolationType(v.type)}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Confidence: {Math.round(v.confidence * 100)}%
            </p>
            {v.license_plate && (
              <p className="text-sm text-yellow-400 mt-1">
                Plate: {v.license_plate.text} ({Math.round(v.license_plate.confidence * 100)}%)
              </p>
            )}
            {v.rider_count && (
              <p className="text-sm text-orange-400 mt-1">
                Riders: {v.rider_count}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 5. Evidence Viewer

### Layout

Split-panel layout with annotated image on the left and FIR-style metadata on the right:

```
┌──────────────────────────────────────────────────────────────┐
│  EVIDENCE VIEWER                                             │
├──────────────────────────┬───────────────────────────────────┤
│                          │  VIOLATION REPORT                  │
│                          │  ═══════════════                   │
│   [Annotated Image]      │  Case: v_20260616_143022_001      │
│   with bbox overlays     │  Type: No Helmet                   │
│                          │  Confidence: 87% (HIGH)            │
│                          │  ──────────────────────            │
│                          │  MV Act Section 129                │
│                          │  Fine: ₹500                        │
│                          │  ──────────────────────            │
│                          │  Location: MG Road                 │
│                          │  Time: 2026-06-16 14:30 IST        │
│                          │  GPS: 12.9757°N, 77.6063°E        │
│                          │  ──────────────────────            │
│                          │  License Plate: KA01AB1234         │
│                          │  Evidence Hash: sha256:abc...      │
│                          │  ──────────────────────            │
│                          │  Status: PENDING                   │
│                          │                                    │
│                          │  [APPROVE]  [REJECT]  [PRINT]      │
└──────────────────────────┴───────────────────────────────────┘
```

### FIR-Style Metadata

```tsx
function FIRMetadata({ violation }: { violation: ViolationRecord }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 font-mono text-sm">
      <h2 className="text-center text-lg font-bold text-slate-100 mb-4 border-b border-slate-600 pb-2">
        VIOLATION REPORT
      </h2>

      <div className="space-y-3">
        <FIRRow label="Case ID" value={violation.id} />
        <FIRRow label="Violation" value={formatViolationType(violation.violation_type)} />
        <FIRRow
          label="Confidence"
          value={`${Math.round(violation.confidence * 100)}% (${violation.confidence_tier.toUpperCase()})`}
        />

        <Separator className="bg-slate-700" />

        <FIRRow label="MV Act Section" value={violation.mv_act_section} />
        <FIRRow label="Fine Amount" value={`₹${violation.fine_amount}`} />

        <Separator className="bg-slate-700" />

        <FIRRow label="Location" value={violation.junction_name} />
        <FIRRow label="Time" value={formatTimestamp(violation.timestamp)} />
        <FIRRow
          label="GPS"
          value={`${violation.latitude.toFixed(4)}°N, ${violation.longitude.toFixed(4)}°E`}
        />

        {violation.license_plate_text && (
          <>
            <Separator className="bg-slate-700" />
            <FIRRow label="License Plate" value={violation.license_plate_text} />
          </>
        )}

        <Separator className="bg-slate-700" />

        <FIRRow
          label="Evidence Hash"
          value={violation.evidence_hash.substring(0, 32) + "..."}
        />
        <FIRRow label="Status" value={violation.status.toUpperCase()} />
      </div>
    </div>
  );
}

function FIRRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}:</span>
      <span className="text-slate-100 text-right">{value}</span>
    </div>
  );
}
```

### Print Evidence Button

```tsx
function PrintEvidence({ violation }: { violation: ViolationRecord }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Evidence - ${violation.id}</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h1>VIOLATION EVIDENCE REPORT</h1>
          <hr/>
          <p>Case: ${violation.id}</p>
          <p>Type: ${violation.violation_type}</p>
          <p>Confidence: ${Math.round(violation.confidence * 100)}%</p>
          <p>MV Act Section ${violation.mv_act_section}</p>
          <p>Fine: ₹${violation.fine_amount}</p>
          <p>Location: ${violation.junction_name}</p>
          <p>Time: ${violation.timestamp}</p>
          <p>GPS: ${violation.latitude}, ${violation.longitude}</p>
          ${violation.license_plate_text ? `<p>Plate: ${violation.license_plate_text}</p>` : ""}
          <p>Hash: ${violation.evidence_hash}</p>
          <hr/>
          <p><img src="${violation.evidence_image_path}" style="max-width: 100%;"/></p>
          <hr/>
          <p style="color: gray; font-size: 10px;">Generated by VigilAI · ${new Date().toISOString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Button variant="outline" size="sm" onClick={handlePrint}>
      <Printer className="w-4 h-4 mr-2" />
      Print Evidence
    </Button>
  );
}
```

---

## 6. Approve/Reject Workflow

### Status Tracking

Violations move through states: `pending → approved | rejected`

```tsx
function ApproveReject({
  violationId,
  currentStatus,
  onStatusChange,
}: {
  violationId: string;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const demoMode = useAppStore((s) => s.demoMode);

  const handleAction = async (action: "approved" | "rejected") => {
    setLoading(true);
    try {
      if (demoMode) {
        onStatusChange(action);
        return;
      }

      const res = await fetch(`/api/v1/violations/${violationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, officer_id: "officer_001" }),
      });

      if (!res.ok) throw new Error("Status update failed");

      onStatusChange(action);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus !== "pending") {
    return <StatusBadge status={currentStatus} />;
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="default"
        size="sm"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => handleAction("approved")}
        disabled={loading}
      >
        <Check className="w-4 h-4 mr-1" />
        Approve
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleAction("rejected")}
        disabled={loading}
      >
        <X className="w-4 h-4 mr-1" />
        Reject
      </Button>
    </div>
  );
}
```

### Status Badges

```tsx
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "PENDING",
      className: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    },
    approved: {
      label: "APPROVED",
      className: "bg-green-900/50 text-green-300 border-green-700",
    },
    rejected: {
      label: "REJECTED",
      className: "bg-red-900/50 text-red-300 border-red-700",
    },
  };

  const c = config[status] || config.pending;

  return (
    <Badge className={`${c.className} border font-mono text-xs`}>
      {c.label}
    </Badge>
  );
}
```

---

## 7. Demo Mode Implementation

### Zustand Store

```typescript
// src/stores/appStore.ts
import { create } from "zustand";

interface AppState {
  demoMode: boolean;
  toggleDemoMode: () => void;
  recentDetections: DetectResponse[];
  addDetection: (result: DetectResponse) => void;
}

export const useAppStore = create<AppState>((set) => ({
  demoMode: localStorage.getItem("vigilai_demo") === "true",
  toggleDemoMode: () =>
    set((state) => {
      const next = !state.demoMode;
      localStorage.setItem("vigilai_demo", String(next));
      return { demoMode: next };
    }),
  recentDetections: [],
  addDetection: (result) =>
    set((state) => ({
      recentDetections: [result, ...state.recentDetections].slice(0, 10),
    })),
}));
```

### Demo Mode API Client

```typescript
// src/lib/api.ts
import { useAppStore } from "../stores/appStore";

const API_BASE = "/api/v1";

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const demoMode = useAppStore.getState().demoMode;

  if (demoMode) {
    return getMockResponse<T>(endpoint, options);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function getMockResponse<T>(endpoint: string, options?: RequestInit): T {
  if (endpoint === "/analytics") {
    return import("../mocks/analytics.json") as unknown as T;
  }
  if (endpoint === "/violations") {
    return import("../mocks/violations.json") as unknown as T;
  }
  if (endpoint === "/detect" && options?.method === "POST") {
    return import("../mocks/detect-response.json") as unknown as T;
  }
  return {} as T;
}
```

### Demo Mode Badge

When demo mode is active, a prominent badge appears in the header:

```tsx
function DemoModeIndicator() {
  const demoMode = useAppStore((s) => s.demoMode);
  const toggleDemoMode = useAppStore((s) => s.toggleDemoMode);

  if (!demoMode) {
    return (
      <Button variant="ghost" size="sm" onClick={toggleDemoMode}>
        <Zap className="w-4 h-4 mr-1" />
        Enable Demo
      </Button>
    );
  }

  return (
    <Badge
      className="bg-amber-900/50 text-amber-300 border-amber-700 cursor-pointer animate-pulse"
      onClick={toggleDemoMode}
    >
      <Zap className="w-3 h-3 mr-1" />
      DEMO MODE
    </Badge>
  );
}
```

---

## 8. Map Page

### MapmyIndia Tiles with CartoDB Dark Fallback

```tsx
import { MapContainer, TileLayer, Marker, Popup, Polygon } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAPMYINDIA_API_KEY = import.meta.env.VITE_MAPMYINDIA_API_KEY;

// Bengaluru boundary polygon (simplified)
const BENGALURU_POLYGON: [number, number][] = [
  [13.20, 77.40],
  [13.20, 77.80],
  [12.75, 77.80],
  [12.75, 77.40],
];

// Tile URL with fallback
const tileUrl = MAPMYINDIA_API_KEY
  ? `https://apis.mapmyindia.com/advancedmaps/v1/${MAPMYINDIA_API_KEY}/map_tile?x={x}&y={y}&z={z}`
  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const tileAttribution = MAPMYINDIA_API_KEY
  ? "© MapmyIndia"
  : "© CartoDB © OpenStreetMap";

function ViolationMap({ violations }: { violations: ViolationRecord[] }) {
  return (
    <MapContainer
      center={[12.9716, 77.5946]}  // Bengaluru center
      zoom={11}
      className="h-[calc(100vh-120px)] w-full rounded-lg"
    >
      <TileLayer
        url={tileUrl}
        attribution={tileAttribution}
      />

      <Polygon
        positions={BENGALURU_POLYGON}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#1e40af",
          fillOpacity: 0.05,
          weight: 1,
        }}
      />

      {violations.map((v) => (
        <Marker
          key={v.id}
          position={[v.latitude, v.longitude]}
          icon={getViolationIcon(v.violation_type)}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{formatViolationType(v.violation_type)}</p>
              <p>{v.junction_name}</p>
              <p>Confidence: {Math.round(v.confidence * 100)}%</p>
              <p>Fine: ₹{v.fine_amount}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function getViolationIcon(type: string): L.DivIcon {
  const colorMap: Record<string, string> = {
    no_helmet: "#ef4444",
    triple_riding: "#f97316",
    license_plate_mismatch: "#eab308",
  };
  const color = colorMap[type] || "#8b5cf6";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 12px; height: 12px; border-radius: 50%;
      background: ${color}; border: 2px solid white;
      box-shadow: 0 0 6px ${color};
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}
```

### MapmyIndia Tile Fallback Strategy

```typescript
function useMapTiles() {
  const [tileSource, setTileSource] = useState<
    "mapmyindia" | "cartodb"
  >("mapmyindia");
  const apiKey = import.meta.env.VITE_MAPMYINDIA_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn("MapmyIndia API key not found, using CartoDB Dark fallback");
      setTileSource("cartodb");
      return;
    }

    // Test if MapmyIndia tiles load
    const img = new Image();
    img.onload = () => setTileSource("mapmyindia");
    img.onerror = () => {
      console.warn("MapmyIndia tiles failed, using CartoDB Dark fallback");
      setTileSource("cartodb");
    };
    img.src = `https://apis.mapmyindia.com/advancedmaps/v1/${apiKey}/map_tile?x=0&y=0&z=1`;
  }, [apiKey]);

  return tileSource;
}
```

---

## Exit Criteria Checklist

- [ ] React + Vite + TailwindCSS project setup
- [ ] Command Center layout with dark navy, IST clock, BTP badge
- [ ] Dashboard page with stats, feed, waterfall, ROI
- [ ] Upload page with drag-drop, canvas bbox overlay, violation cards
- [ ] Evidence viewer with FIR-style metadata, Print Evidence button
- [ ] Approve/Reject with status tracking
- [ ] Demo mode toggle with hardcoded responses
- [ ] Map page with MapmyIndia/CartoDB tiles + Bengaluru polygon
