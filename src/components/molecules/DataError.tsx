interface Props { error: unknown; onRetry: () => unknown; label?: string }
export function DataError({ error, onRetry, label = 'Data' }: Props) {
  if (!error) return null
  return <div role="alert" className="p-4 rounded-xl bg-red-50 text-sm text-red-800">
    {label} belum dapat dimuat. <button className="underline font-bold min-h-11" onClick={() => { void onRetry() }}>Coba lagi</button>
  </div>
}
