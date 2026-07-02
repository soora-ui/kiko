import Enso from './Enso'

export default function EmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Enso size={140} className="text-sakura mb-6" />
      <p className="text-lg font-semibold">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  )
}
