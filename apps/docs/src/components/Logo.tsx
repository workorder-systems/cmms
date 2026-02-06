export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 99 24" aria-hidden="true" {...props}>
      <path
        className="fill-primary-500"
        d="M16 8a5 5 0 0 0-5-5H5a5 5 0 0 0-5 5v13.927a1 1 0 0 0 1.623.782l3.684-2.93a4 4 0 0 1 2.49-.87H11a5 5 0 0 0 5-5V8Z"
      />
      <text
        x="26"
        y="17"
        className="fill-zinc-900 dark:fill-white"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        WorkOrder
      </text>
    </svg>
  )
}
