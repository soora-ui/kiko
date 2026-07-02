/** Тонкий контурный энсо — единственный японский акцент на экран. */
export default function Enso({
  size = 160,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M 62 12
           A 40 40 0 1 0 88 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  )
}
