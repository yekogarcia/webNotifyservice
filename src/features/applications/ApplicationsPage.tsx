import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Check, Copy, KeyRound, Pencil, Trash2 } from 'lucide-react'
import { applicationsApi } from './api'
import { providersApi } from '@/features/providers/api'
import type { Application } from '@/shared/model/types'
import { CHANNELS, type ChannelType } from '@/shared/model/enums'
import { ApiError, errorMessage } from '@/shared/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { loadStored } from '@/shared/lib/session-list'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { DataTable } from '@/shared/ui/DataTable'
import { Badge } from '@/shared/ui/Badge'
import { Modal } from '@/shared/ui/Modal'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './ApplicationsPage.module.css'

const BLOCKING_LABELS: Record<string, string> = {
  notifications: 'notificaciones',
  templates: 'plantillas',
  preferences: 'preferencias',
  devices: 'dispositivos',
  events: 'eventos',
  tokens: 'tokens/sesiones',
}

/* 409 del back: la app tiene registros asociados y no se puede eliminar. */
function deleteErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 409) {
    const blocking = (e.payload as { blocking?: Record<string, number> } | null)?.blocking
    if (blocking && typeof blocking === 'object') {
      const parts = Object.entries(blocking)
        .filter(([, n]) => typeof n === 'number' && n > 0)
        .map(([k, n]) => `${BLOCKING_LABELS[k] ?? k} (${n})`)
      if (parts.length > 0) {
        return `No se puede eliminar: tiene ${parts.join(', ')} asociados.`
      }
    }
    return 'No se puede eliminar: la aplicación tiene registros asociados.'
  }
  return errorMessage(e)
}

interface KnownProvider {
  id: string
  name: string
  providerType: string
}

/* Busca client_id/secret en la respuesta del API de forma recursiva,
 * en snake_case o camelCase (root, data, credentials, app, etc.). */
function findCreds(body: unknown): { clientId?: string; clientSecret?: string } {
  const found: { clientId?: string; clientSecret?: string } = {}
  const scan = (o: unknown, depth: number) => {
    if (!o || typeof o !== 'object' || depth > 6) return
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (found.clientId && found.clientSecret) return
      if (typeof v === 'string') {
        if (!found.clientId && k === 'client_id') found.clientId = v
        else if (!found.clientId && k === 'clientId') found.clientId = v
        else if (
          !found.clientSecret &&
          (k === 'client_secret' || k === 'clientSecret' || k === 'appSecret')
        ) {
          found.clientSecret = v
        }
      } else if (v && typeof v === 'object') {
        scan(v, depth + 1)
      }
    }
  }
  scan(body, 0)
  return found
}

/* Copia al portapapeles con fallback para contextos sin Clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

const columns: ColumnDef<Application>[] = [
  { header: 'Nombre', accessorKey: 'name' },
  { header: 'Client ID', accessorKey: 'clientId' },
  {
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? <Badge value="SENT" /> : <Badge value="FAILED" />,
  },
  {
    header: 'Creada',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
]

export function ApplicationsPage() {
  const push = useToastStore((s) => s.push)
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('mi-app')
  const [cred, setCred] = useState<{
    client_id?: string
    client_secret?: string
    raw?: string
  } | null>(null)
  const [copied, setCopied] = useState<'id' | 'secret' | null>(null)
  const [rotating, setRotating] = useState<Application | null>(null)
  const [editing, setEditing] = useState<Application | null>(null)
  const [editForm, setEditForm] = useState({ name: '', isActive: true })
  const [deleting, setDeleting] = useState<Application | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapping, setMapping] = useState({ providerId: '', channel: 'EMAIL' as ChannelType })

  const list = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.list,
    retry: false,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['applications'] })

  const create = useMutation({
    mutationFn: () => applicationsApi.create(name.trim()),
    onSuccess: (res) => {
      push('success', 'Aplicación creada')
      const creds = findCreds(res)
      setCred({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        raw: creds.clientId && creds.clientSecret ? undefined : JSON.stringify(res, null, 2),
      })
      setCreateOpen(false)
      setName('mi-app')
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const saveEdit = useMutation({
    mutationFn: () => applicationsApi.update(editing!.id, { name: editForm.name.trim(), isActive: editForm.isActive }),
    onSuccess: () => {
      push('success', 'Aplicación actualizada')
      setEditing(null)
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => applicationsApi.remove(id),
    onSuccess: () => {
      push('success', 'Aplicación eliminada')
      setDeleting(null)
      void invalidate()
    },
    onError: (e) => push('error', deleteErrorMessage(e)),
  })

  const rotate = useMutation({
    mutationFn: (id: string) => applicationsApi.rotate(id),
    onSuccess: (res) => {
      const creds = findCreds(res)
      setCred({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        raw: creds.clientId && creds.clientSecret ? undefined : JSON.stringify(res, null, 2),
      })
      push('success', 'Secret rotado')
      setRotating(null)
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const map = useMutation({
    mutationFn: () => providersApi.mapChannel(mapping.providerId, mapping.channel),
    onSuccess: () => {
      push('success', `Proveedor mapeado a ${mapping.channel}`)
      setMapOpen(false)
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const knownProviders = loadStored<KnownProvider>('notify.providers')

  const handleCopy = async (which: 'id' | 'secret' | 'both', value: string) => {
    const ok = await copyText(value)
    if (ok) {
      setCopied(which === 'both' ? 'secret' : which)
      push(
        'success',
        which === 'id'
          ? 'client_id copiado'
          : which === 'secret'
            ? 'client_secret copiado'
            : 'Credenciales copiadas',
      )
      window.setTimeout(() => setCopied(null), 1500)
    } else {
      push('error', 'No se pudo copiar al portapapeles')
    }
  }

  const tableColumns: ColumnDef<Application>[] = [
    ...columns,
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <span className={styles.actions}>
          <IconButton
            title="Editar"
            onClick={() => {
              setEditing(row.original)
              setEditForm({ name: row.original.name, isActive: row.original.isActive })
            }}
          >
            <Pencil />
          </IconButton>
          <IconButton title="Rotar secret" onClick={() => setRotating(row.original)}>
            <KeyRound />
          </IconButton>
          <IconButton title="Eliminar" variant="danger" onClick={() => setDeleting(row.original)}>
            <Trash2 />
          </IconButton>
        </span>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Aplicaciones</h1>
        </div>
        <span className={styles.headBtns}>
          <Button variant="ghost" onClick={() => setMapOpen(true)}>
            Mapear proveedor
          </Button>
          <Button onClick={() => setCreateOpen(true)}>+ Nueva aplicación</Button>
        </span>
      </div>

      <DataTable
        columns={tableColumns}
        data={Array.isArray(list.data) ? list.data : []}
        loading={list.isPending}
        emptyTitle="Sin aplicaciones"
        emptyHint="Crea la primera app para obtener client_id/secret (flujo client_credentials)."
        getRowId={(r) => r.id}
      />

      {createOpen ? (
        <Modal title="Nueva aplicación" onClose={() => setCreateOpen(false)}>
          <TextField
            label="Nombre de app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mi-app"
          />
          <p className="muted">Al crear obtienes client_id/secret (el secret se muestra una sola vez).</p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!name.trim()}>
              Crear
            </Button>
          </div>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`Editar aplicación «${editing.name}»`} onClose={() => setEditing(null)}>
          <div className="stack">
            <TextField label="Nombre" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />{' '}
              Activa
            </label>
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saveEdit.mutate()} loading={saveEdit.isPending} disabled={!editForm.name.trim()}>
              Guardar
            </Button>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={`Eliminar «${deleting.name}»`} onClose={() => setDeleting(null)}>
          <p className="muted">
            Se eliminará la aplicación <code>{deleting.clientId}</code> definitivamente. Esta
            acción no se puede deshacer.
          </p>
          <p className="muted">
            Solo se puede eliminar si no tiene notificaciones, plantillas, preferencias,
            dispositivos, eventos ni tokens asociados. Si tiene algo asociado, el servidor
            rechaza el borrado (409) indicando qué la bloquea.
          </p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => remove.mutate(deleting.id)} loading={remove.isPending}>
              Eliminar
            </Button>
          </div>
        </Modal>
      ) : null}

      {rotating ? (
        <Modal title={`Rotar secret de «${rotating.name}»`} onClose={() => setRotating(null)}>
          <p className="muted">
            Se genera un nuevo <code>client_secret</code> e invalida el anterior. Se muestra una sola vez.
          </p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setRotating(null)}>
              Cancelar
            </Button>
            <Button onClick={() => rotate.mutate(rotating.id)} loading={rotate.isPending}>
              Rotar
            </Button>
          </div>
        </Modal>
      ) : null}

      {mapOpen ? (
        <Modal title="Mapear proveedor → canal" onClose={() => setMapOpen(false)}>
          <div className="stack">
            <p className="muted">
              Solo puede haber 1 proveedor activo por canal (el sistema desactiva los demás).
            </p>
            <SearchableSelect
              label="Proveedor"
              value={mapping.providerId}
              onChange={(v) => setMapping({ ...mapping, providerId: v })}
              options={knownProviders.map((p) => ({ value: p.id, label: `${p.name} (${p.providerType})` }))}
              searchPlaceholder="Buscar proveedor…"
              placeholder="Buscar o pegar ID…"
              emptyText="Sin proveedores conocidos: pega el ID"
              allowCustom
              customText="Usar ID"
            />
            <SelectField
              label="Canal"
              value={mapping.channel}
              onChange={(e) => setMapping({ ...mapping, channel: e.target.value as ChannelType })}
              options={CHANNELS.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setMapOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => map.mutate()} loading={map.isPending} disabled={!mapping.providerId}>
              Mapear
            </Button>
          </div>
        </Modal>
      ) : null}

      {cred ? (
        <Modal title="Credenciales generadas" onClose={() => setCred(null)} wide>
          <p className={styles.credWarning}>
            Copia estos datos ahora: son generados una única vez para el login. El{' '}
            <code>client_secret</code> no volverá a mostrarse.
          </p>
          <div className={styles.credentials}>
            {cred.client_id ? (
              <div className={styles.credRow}>
                <span className={styles.credLabel}>client_id</span>
                <code className={styles.credValue}>{cred.client_id}</code>
                <IconButton
                  title="Copiar client_id"
                  onClick={() => void handleCopy('id', cred.client_id!)}
                >
                  {copied === 'id' ? <Check /> : <Copy />}
                </IconButton>
              </div>
            ) : null}
            {cred.client_secret ? (
              <div className={styles.credRow}>
                <span className={styles.credLabel}>client_secret</span>
                <code className={styles.credValue}>{cred.client_secret}</code>
                <IconButton
                  title="Copiar client_secret"
                  variant="primary"
                  onClick={() => void handleCopy('secret', cred.client_secret!)}
                >
                  {copied === 'secret' ? <Check /> : <Copy />}
                </IconButton>
              </div>
            ) : null}
            {cred.raw ? <pre className={styles.credRaw}>{cred.raw}</pre> : null}
          </div>
          <div className="modal-actions">
            {cred.client_id && cred.client_secret ? (
              <Button
                variant="ghost"
                onClick={() =>
                  void handleCopy(
                    'both',
                    `client_id=${cred.client_id}\nclient_secret=${cred.client_secret}`,
                  )
                }
              >
                Copiar ambas
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => void handleCopy('both', cred.raw ?? JSON.stringify(cred, null, 2))}
              >
                Copiar datos
              </Button>
            )}
            <Button onClick={() => setCred(null)}>Entendido</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
