import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { healthApi } from './api'
import { DataTable } from '@/shared/ui/DataTable'
import { Badge } from '@/shared/ui/Badge'
import styles from './PreferencesPage.module.css'

interface KvRow {
  key: string
  value: string
}

const columns: ColumnDef<KvRow>[] = [
  { header: 'Clave', accessorKey: 'key' },
  {
    header: 'Valor',
    cell: ({ row }) =>
      /^(up|ok|healthy|active|true)$/i.test(row.original.value) ? (
        <Badge value="SENT" />
      ) : (
        <code>{row.original.value}</code>
      ),
  },
]

function toRows(payload: unknown): KvRow[] {
  if (!payload || typeof payload !== 'object') return []
  return Object.entries(payload as Record<string, unknown>).map(([key, v]) => ({
    key,
    value: typeof v === 'string' ? v : JSON.stringify(v),
  }))
}

export function HealthPage() {
  const status = useQuery({ queryKey: ['health'], queryFn: healthApi.status, retry: false })
  const providers = useQuery({ queryKey: ['health', 'providers'], queryFn: healthApi.providers, retry: false })

  const statusRows = useMemo(() => toRows(status.data), [status.data])
  const providerRows = useMemo(() => toRows(providers.data), [providers.data])

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Salud del servicio</h1>
        </div>
      </div>
      <h2>Estado general</h2>
      <DataTable
        columns={columns}
        data={statusRows}
        loading={status.isPending}
        emptyTitle="Sin datos de salud"
        getRowId={(r) => r.key}
      />
      <h2>Proveedores</h2>
      <DataTable
        columns={columns}
        data={providerRows}
        loading={providers.isPending}
        emptyTitle="Sin datos de proveedores"
        getRowId={(r) => r.key}
      />
    </div>
  )
}
