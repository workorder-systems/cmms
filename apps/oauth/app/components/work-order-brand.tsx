/**
 * Wordmark aligned with apps/docs Logo (cyan mark + WorkOrder text).
 */
export function WorkOrderBrand() {
  return (
    <div className="oauth-brand" role="img" aria-label="WorkOrder">
      <svg className="oauth-brand-mark" viewBox="0 0 99 24">
        <path
          fill="var(--wos-primary)"
          d="M16 8a5 5 0 0 0-5-5H5a5 5 0 0 0-5 5v13.927a1 1 0 0 0 1.623.782l3.684-2.93a4 4 0 0 1 2.49-.87H11a5 5 0 0 0 5-5V8Z"
        />
        <text
          x="26"
          y="17"
          fill="var(--wos-brand-text)"
          style={{
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          WorkOrder
        </text>
      </svg>
    </div>
  );
}
