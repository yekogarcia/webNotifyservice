export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export function shortId(id: string | null | undefined, len = 8): string {
  if (!id) return '—'
  return id.length > len ? `${id.slice(0, len)}…` : id
}
