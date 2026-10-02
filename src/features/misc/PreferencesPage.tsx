import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { preferencesApi } from './api'
import { CHANNELS, type ChannelType } from '@/shared/model/enums'
import { errorMessage } from '@/shared/api/errors'
import { TextField } from '@/shared/ui/TextField'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable } from '@/shared/ui/DataTable'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './PreferencesPage.module.css'

interface PrefRow {
  channel: ChannelType
  enabled: boolean
}

const makeColumns = (toggle: (c: ChannelType) => void): ColumnDef<PrefRow>[] => [
  { header: 'Canal', accessorKey: 'channel' },
  {
    header: 'Estado',
    cell: ({ row }) => (row.original.enabled ? <Badge value="SENT" /> : <Badge value="FAILED" />),
  },
  {
    header: 'Habilitado',
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.original.enabled}
        onChange={() => toggle(row.original.channel)}
        aria-label={`Habilitar ${row.original.channel}`}
      />
    ),
  },
]

export function PreferencesPage() {
  const push = useToastStore((s) => s.push)
  const [userId, setUserId] = useState('user_123')
  const [searched, setSearched] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    EMAIL: true,
    SMS: false,
    PUSH: true,
  })

  const rows: PrefRow[] = CHANNELS.map((c) => ({ channel: c, enabled: prefs[c] ?? true }))

  function toggle(c: ChannelType) {
    setPrefs((p) => ({ ...p, [c]: !(p[c] ?? true) }))
  }

  const fetchPrefs = useMutation({
    mutationFn: (id: string) => preferencesApi.get(id),
    onSuccess: (res) => {
      setSearched(userId.trim())
      const list = (res as { preferences?: Array<{ channel: string; enabled: boolean }> } | Array<{ channel: string; enabled: boolean }>)
      const arr = Array.isArray(list) ? list : (list?.preferences ?? [])
      if (arr.length) {
        const next: Record<string, boolean> = {}
        for (const p of arr) next[p.channel] = p.enabled
        setPrefs((prev) => ({ ...prev, ...next }))
      }
      push('success', 'Preferencias consultadas')
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const save = useMutation({
    mutationFn: () =>
      preferencesApi.set(
        userId.trim(),
        CHANNELS.map((c: ChannelType) => ({ channel: c, enabled: prefs[c] ?? true })),
      ),
    onSuccess: () => push('success', 'Preferencias guardadas'),
    onError: (e) => push('error', errorMessage(e)),
  })

  // La tabla se carga apenas se abre el módulo (GET /preferences/:userId).
  const autoLoaded = useRef(false)
  useEffect(() => {
    if (!autoLoaded.current && userId.trim()) {
      autoLoaded.current = true
      fetchPrefs.mutate(userId.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Preferencias por usuario</h1>
          {searched ? <p className="sub">Consultado: <code>{searched}</code></p> : null}
        </div>
      </div>

      <div className="toolbar">
        <TextField
          label="User ID"
          className="grow"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="user_123"
        />
        <Button variant="ghost" onClick={() => userId.trim() && fetchPrefs.mutate(userId.trim())} loading={fetchPrefs.isPending}>
          Consultar
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!userId.trim()}>
          Guardar
        </Button>
      </div>

      <DataTable
        columns={makeColumns(toggle)}
        data={rows}
        emptyTitle="Sin canales"
        getRowId={(r) => r.channel}
      />
    </div>
  )
}
