import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { devicesApi } from './api'
import type { Platform } from '@/shared/model/enums'
import { useStoredList } from '@/shared/lib/session-list'
import { errorMessage } from '@/shared/api/errors'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { Badge } from '@/shared/ui/Badge'
import { DataTable } from '@/shared/ui/DataTable'
import { Modal } from '@/shared/ui/Modal'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './PreferencesPage.module.css'

interface DeviceRow {
  userId: string
  deviceToken: string
  platform: Platform
}

export function DevicesPage() {
  const push = useToastStore((s) => s.push)
  // Sin GET de listado en swagger: la tabla muestra lo registrado en sesión,
  // persistido para que esté cargado al abrir el módulo.
  const [rows, setRows] = useStoredList<DeviceRow>('notify.devices')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [form, setForm] = useState({ userId: 'user_123', deviceToken: '', platform: 'ANDROID' as Platform })
  const [token, setToken] = useState('')

  const columns: ColumnDef<DeviceRow>[] = [
    { header: 'User ID', accessorKey: 'userId' },
    {
      header: 'Token',
      cell: ({ row }) => <code>{row.original.deviceToken.slice(0, 12)}…</code>,
    },
    { header: 'Plataforma', accessorKey: 'platform' },
    {
      header: 'Estado',
      cell: () => <Badge value="SENT" />,
    },
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <IconButton
          title="Dar de baja"
          variant="danger"
          onClick={() => unregister.mutate(row.original.deviceToken)}
          disabled={unregister.isPending}
        >
          <Trash2 />
        </IconButton>
      ),
    },
  ]

  const register = useMutation({
    mutationFn: () => devicesApi.register(form),
    onSuccess: () => {
      push('success', 'Dispositivo registrado')
      setRows((prev) =>
        prev.some((r) => r.deviceToken === form.deviceToken)
          ? prev
          : [...prev, { ...form }],
      )
      setToken(form.deviceToken)
      setRegisterOpen(false)
      setForm((f) => ({ ...f, deviceToken: '' }))
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const unregister = useMutation({
    mutationFn: (t: string) => devicesApi.unregister(t),
    onSuccess: (_res, t) => {
      push('success', 'Dispositivo dado de baja')
      setRows((prev) => prev.filter((r) => r.deviceToken !== t))
      setToken('')
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Dispositivos push</h1>
        </div>
        <Button onClick={() => setRegisterOpen(true)}>+ Registrar dispositivo</Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        emptyTitle="Sin dispositivos en sesión"
        emptyHint="Registra uno con el botón «Registrar dispositivo»."
        getRowId={(r) => r.deviceToken}
      />

      <div className="toolbar">
        <SearchableSelect
          label="Token a eliminar"
          className="grow"
          value={token}
          onChange={setToken}
          options={rows.map((r) => ({ value: r.deviceToken, label: `${r.userId} · ${r.platform}` }))}
          searchPlaceholder="Buscar token…"
          placeholder="Buscar o pegar token…"
          emptyText="Sin tokens en sesión: pega el token"
          allowCustom
          customText="Usar token"
        />
        <Button variant="danger" onClick={() => token && unregister.mutate(token)} loading={unregister.isPending} disabled={!token}>
          Dar de baja
        </Button>
      </div>

      {registerOpen ? (
        <Modal title="Registrar dispositivo" onClose={() => setRegisterOpen(false)}>
          <div className="stack">
            <TextField label="User ID" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required />
            <TextField
              label="Device token (FCM/APNs)"
              value={form.deviceToken}
              onChange={(e) => setForm({ ...form, deviceToken: e.target.value })}
              required
            />
            <SelectField
              label="Plataforma"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })}
              options={['IOS', 'ANDROID', 'WEB'].map((p) => ({ value: p, label: p }))}
            />
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setRegisterOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => register.mutate()} loading={register.isPending} disabled={!form.deviceToken.trim()}>
              Registrar
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
