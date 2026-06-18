import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnnotatedViewer from '../AnnotatedViewer';
import type { ViolationRecord } from '../../types/violation';

function makeViolation(overrides: Partial<ViolationRecord> = {}): ViolationRecord {
  return {
    id: 'v-test-001',
    violation_type: 'no_helmet',
    confidence: 0.88,
    confidence_tier: 'high',
    bbox: { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.6 },
    person_bbox: null,
    metadata: {},
    mv_act_section: 'S.129',
    fine_amount: 500,
    license_plate: null,
    status: 'pending',
    data_source: 'seeded',
    camera_id: 'cam-01',
    junction_name: 'Test Junction',
    latitude: 12.97,
    longitude: 77.59,
    timestamp: '2026-06-15T10:00:00Z',
    evidence_url: null,
    evidence_hash: null,
    danger_score: 65,
    ai_explanation: 'AI-detected helmet non-compliance with high confidence.',
    is_duplicate: false,
    duplicate_group_id: null,
    ...overrides,
  };
}

// Mock ResizeObserver
beforeEach(() => {
  class MockResizeObserver {
    callback: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: MockResizeObserver,
    writable: true,
  });

  // Mock canvas context to avoid jsdom limitations
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    canvas: document.createElement('canvas'),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any;
});

describe('AnnotatedViewer', () => {
  it('renders without crashing with no violations', () => {
    render(
      <AnnotatedViewer
        imageUrl="http://example.com/image.jpg"
        violations={[]}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'http://example.com/image.jpg');
    expect(img).toHaveAttribute('alt', 'Annotated evidence');
  });

  it('renders with custom alt text', () => {
    render(
      <AnnotatedViewer
        imageUrl="http://example.com/img.png"
        violations={[]}
        alt="Custom alt text"
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Custom alt text');
  });

  it('renders a canvas element for drawing overlays', () => {
    const { container } = render(
      <AnnotatedViewer
        imageUrl="http://example.com/image.jpg"
        violations={[]}
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders with violations without crashing', () => {
    const violations = [
      makeViolation({ violation_type: 'no_helmet', confidence: 0.95 }),
      makeViolation({
        id: 'v-002',
        violation_type: 'triple_riding',
        confidence: 0.78,
        bbox: { x1: 0.5, y1: 0.1, x2: 0.8, y2: 0.5 },
      }),
    ];

    const { container } = render(
      <AnnotatedViewer
        imageUrl="http://example.com/violation.jpg"
        violations={violations}
      />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('applies className prop to container', () => {
    const { container } = render(
      <AnnotatedViewer
        imageUrl="http://example.com/image.jpg"
        violations={[]}
        className="my-custom-class"
      />,
    );

    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});
