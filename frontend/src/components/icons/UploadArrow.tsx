/**
 * Animated upload icon for batch upload.
 *
 * A tray with an upward arrow that bobs gently, suggesting motion into the
 * system.
 */

interface UploadArrowProps {
  size?: number;
  className?: string;
}

export function UploadArrow({ size = 20, className = "" }: UploadArrowProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Upload"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <g className="upload-arrow-shaft">
        <polyline points="17 8 12 3 7 8" />
        <line x1={12} y1={3} x2={12} y2={15} />
      </g>
    </svg>
  );
}
