type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  ariaLabel?: string;
};

export function ProgressRing({
  value,
  size = 36,
  stroke = 3,
  label,
  ariaLabel,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - clamped);

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(clamped * 100)}%`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent-hi)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 600ms var(--ease-premium)',
          }}
        />
      </svg>
      {label ? (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-medium text-[var(--text-soft)]">
          {label}
        </div>
      ) : null}
    </div>
  );
}
