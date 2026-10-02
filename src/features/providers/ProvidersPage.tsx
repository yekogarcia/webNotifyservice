import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Link2, Pencil, Power, Trash2 } from 'lucide-react'
import { providersApi, type CreateProviderInput, type ProviderMapping, type UpdateProviderInput } from './api'
import { CHANNELS, type ChannelType, type ProviderType } from '@/shared/model/enums'
import { errorMessage } from '@/shared/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { useStoredList } from '@/shared/lib/session-list'
import type { Provider } from '@/shared/model/types'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { Badge } from '@/shared/ui/Badge'
import { DataTable } from '@/shared/ui/DataTable'
import { Modal } from '@/shared/ui/Modal'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './ProvidersPage.module.css'

/* Solo 3 tipos genéricos: el vendedor concreto puede cambiar sin cambiar el tipo. */
const TYPE_OPTIONS = [
  { value: 'EMAIL', label: 'EMAIL' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WHATSAPP' },
] as const

type AllowedProviderType = (typeof TYPE_OPTIONS)[number]['value']

const TYPE_LABELS: Record<string, string> = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  /* Valores antiguos (proveedores guardados antes del cambio a tipos genéricos). */
  SES: 'EMAIL',
  SMTP: 'EMAIL',
  TWILIO: 'SMS',
  WHATSAPP_CLOUD: 'WHATSAPP',
}

function typeLabel(t: string): string {
  return TYPE_LABELS[t] ?? t
}

function isAllowedType(t: string): t is AllowedProviderType {
  return (TYPE_OPTIONS as readonly { value: string }[]).some((o) => o.value === t)
}

/* Ejemplos de `config` por tipo: lo que el back necesita para cada canal.
 * El secreto (password/token) NO va en el JSON: va en el campo Secret. */
const PROVIDER_CONFIG_EXAMPLES: Record<AllowedProviderType, Record<string, unknown>> = {
  EMAIL: {
    transport: 'smtp',
    host: 'smtp.tu-dominio.com',
    port: 587,
    secure: false,
    starttls: true,
    username: 'usuario-smtp',
    fromAddress: 'contacto@tu-dominio.com',
  },
  SMS: {
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    fromNumber: '+15551234567',
  },
  WHATSAPP: {
    phoneNumberId: '123456789012345',
    apiVersion: 'v21.0',
  },
}

const PROVIDER_SECRET_LABELS: Record<AllowedProviderType, string> = {
  EMAIL: 'Secret (password SMTP)',
  SMS: 'Secret (token del proveedor SMS)',
  WHATSAPP: 'Secret (access token Meta)',
}

const PROVIDER_SECRET_HINTS: Record<AllowedProviderType, string> = {
  EMAIL: 'Password del usuario SMTP. Viaja por HTTPS y se cifra AES-256-GCM en el back.',
  SMS: 'Token/credencial del proveedor SMS actual. Viaja por HTTPS y se cifra en el back.',
  WHATSAPP: 'Token permanente de Meta Cloud API. Viaja por HTTPS y se cifra en el back.',
}

const PROVIDER_CONFIG_HINTS: Record<AllowedProviderType, string> = {
  EMAIL: 'Email por SMTP: host/puerto de tu servidor. El password va en Secret.',
  SMS: 'SMS genérico: número remitente + campos del proveedor actual. El token va en Secret.',
  WHATSAPP: 'WhatsApp Cloud API: phoneNumberId (+ apiVersion). El token va en Secret.',
}

/* Canal sugerido por tipo (normalmente coincide con el tipo). */
const PROVIDER_SUGGESTED_CHANNEL: Record<string, ChannelType> = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  /* Aliases antiguos. */
  SES: 'EMAIL',
  SMTP: 'EMAIL',
  TWILIO: 'SMS',
  WHATSAPP_CLOUD: 'WHATSAPP',
}

function suggestedChannelFor(t: string): ChannelType {
  return PROVIDER_SUGGESTED_CHANNEL[t] ?? 'EMAIL'
}

function exampleFor(t: string): Record<string, unknown> {
  if (isAllowedType(t)) return PROVIDER_CONFIG_EXAMPLES[t]
  return {}
}

function secretLabelFor(t: string): string {
  if (isAllowedType(t)) return PROVIDER_SECRET_LABELS[t]
  return 'Secret'
}

function secretHintFor(t: string, fallback?: string): string {
  if (fallback) return fallback
  if (isAllowedType(t)) return PROVIDER_SECRET_HINTS[t]
  return 'Viaja por HTTPS y se cifra AES-256-GCM en el back'
}

function configHintFor(t: string): string {
  if (isAllowedType(t)) return PROVIDER_CONFIG_HINTS[t]
  return 'Pega aqui el objeto `config` completo.'
}

interface ProviderConfigFields {
  [key: string]: unknown
}

interface ProviderRow {
  id: string
  tenantId?: string
  name: string
  providerType: ProviderType
  config?: ProviderConfigFields
  secretRef?: string
  hasSecret?: boolean
  isActive?: boolean
  status?: string
  channels?: string[]
  createdAt?: string
  updatedAt?: string
}

interface ProviderFormState {
  name: string
  providerType: ProviderType
  configJson: string
  secret: string
  isActive: boolean
}

function resolveStatus(row: Pick<ProviderRow, 'status' | 'isActive'>): 'ACTIVE' | 'INACTIVE' {
  if (row.status === 'ACTIVE' || row.status === 'INACTIVE') return row.status
  return row.isActive === false ? 'INACTIVE' : 'ACTIVE'
}

function toConfigFields(config: unknown): ProviderConfigFields {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
  return { ...(config as Record<string, unknown>) }
}

function toProviderForm(row: ProviderRow): ProviderFormState {
  return {
    name: row.name,
    providerType: row.providerType,
    configJson: JSON.stringify(row.config ?? {}, null, 2),
    secret: '',
    isActive: resolveStatus(row) === 'ACTIVE',
  }
}

function toProviderRow(data: Partial<Provider> | Partial<ProviderRow> | null | undefined): ProviderRow | null {
  if (!data?.id) return null
  const rawType = typeof data.providerType === 'string' ? data.providerType : 'EMAIL'
  return {
    id: String(data.id),
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    name: typeof data.name === 'string' ? data.name : 'Proveedor',
    providerType: (data.providerType as ProviderType | undefined) ?? 'EMAIL',
    config: toConfigFields(data.config ?? (data as Partial<ProviderRow>).config),
    secretRef: typeof data.secretRef === 'string' ? data.secretRef : undefined,
    hasSecret: typeof data.hasSecret === 'boolean' ? data.hasSecret : undefined,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : rawType !== undefined ? true : true,
    status: typeof (data as Partial<ProviderRow>).status === 'string' ? String((data as Partial<ProviderRow>).status) : undefined,
    channels: Array.isArray((data as Partial<ProviderRow>).channels)
      ? ((data as Partial<ProviderRow>).channels as unknown[]).filter((c): c is string => typeof c === 'string')
      : undefined,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  }
}

function normalizeProvidersResponse(data: unknown): ProviderRow[] {
  const items = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)
      ? ((data as { items: unknown[] }).items ?? [])
      : []

  return items
    .map((item) => toProviderRow(item as Partial<Provider> | Partial<ProviderRow>))
    .filter((item): item is ProviderRow => item !== null)
    .filter((item) => item.status !== 'DELETED')
}

function buildStoredProvider(
  data: Partial<ProviderRow> | null | undefined,
  fallback: { id?: string; form: ProviderFormState; createdAt?: string; updatedAt?: string },
): ProviderRow {
  const config = toConfigFields(data?.config)
  const fallbackConfig =
    Object.keys(config).length > 0 ? config : parseConfigJson(fallback.form.configJson)
  const status: string =
    typeof data?.status === 'string'
      ? String(data.status)
      : ((data?.isActive as boolean | undefined) ?? fallback.form.isActive)
        ? 'ACTIVE'
        : 'INACTIVE'
  return {
    id: String(data?.id ?? fallback.id ?? ''),
    tenantId: typeof data?.tenantId === 'string' ? data.tenantId : undefined,
    name: String(data?.name ?? fallback.form.name),
    providerType: (data?.providerType as ProviderType | undefined) ?? fallback.form.providerType,
    config: fallbackConfig,
    secretRef: typeof data?.secretRef === 'string' ? data.secretRef : undefined,
    hasSecret: typeof data?.hasSecret === 'boolean' ? data.hasSecret : undefined,
    isActive: status === 'ACTIVE',
    status,
    channels: Array.isArray(data?.channels) ? data.channels : undefined,
    createdAt: (data?.createdAt as string | undefined) ?? fallback.createdAt,
    updatedAt: (data?.updatedAt as string | undefined) ?? fallback.updatedAt,
  }
}

function parseConfigJson(configJson: string): ProviderConfigFields {
  const trimmed = configJson.trim()
  if (!trimmed) throw new Error('El campo config es obligatorio')
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new Error('El campo config debe ser un JSON valido')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El campo config debe ser un objeto JSON')
  }
  return parsed as ProviderConfigFields
}

function formatConfigValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

function formatConfigSummary(config: ProviderConfigFields | undefined): string {
  if (!config) return '—'
  const entries = Object.entries(config).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (entries.length === 0) return '—'
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${formatConfigValue(value)}`)
    .join(' | ')
}

const columns: ColumnDef<ProviderRow>[] = [
  { header: 'Nombre', accessorKey: 'name' },
  {
    header: 'Tipo',
    cell: ({ row }) => typeLabel(row.original.providerType),
  },
  {
    header: 'ID',
    cell: ({ row }) => <code>{row.original.id.slice(0, 8)}…</code>,
  },
  {
    header: 'Secret',
    cell: ({ row }) =>
      row.original.hasSecret ? <Badge value="SYNC" /> : <span className={styles.muted}>No</span>,
  },
  {
    header: 'Config',
    cell: ({ row }) => (
      <span className={styles.configCell} title={JSON.stringify(row.original.config ?? {}, null, 2)}>
        {formatConfigSummary(row.original.config)}
      </span>
    ),
  },
  {
    header: 'Estado',
    cell: ({ row }) => <Badge value={resolveStatus(row.original)} />,
  },
  {
    header: 'Canales',
    cell: ({ row }) =>
      row.original.channels && row.original.channels.length > 0 ? (
        <span className={styles.actions}>
          {row.original.channels.map((c) => (
            <Badge key={c} value={c} />
          ))}
        </span>
      ) : (
        <span className={styles.muted}>Sin mapear</span>
      ),
  },
  {
    header: 'Creado',
    cell: ({ row }) => (row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'),
  },
  {
    header: 'Actualizado',
    cell: ({ row }) => (row.original.updatedAt ? formatDateTime(row.original.updatedAt) : '—'),
  },
]

function emptyFormFor(type: AllowedProviderType, name: string): ProviderFormState {
  return {
    name,
    providerType: type as ProviderType,
    configJson: JSON.stringify(PROVIDER_CONFIG_EXAMPLES[type], null, 2),
    secret: '',
    isActive: true,
  }
}

const EMPTY_FORM: ProviderFormState = emptyFormFor('EMAIL', 'SMTP corporativo')

/* Mismos campos en crear y editar (radio 0.3125rem, alineados). */
function ProviderFormFields({
  value,
  onChange,
  secretHint,
  showStatus = false,
}: {
  value: ProviderFormState
  onChange: (v: ProviderFormState) => void
  secretHint?: string
  showStatus?: boolean
}) {
  function handleTypeChange(next: string) {
    onChange({
      ...value,
      providerType: next as ProviderType,
      configJson: JSON.stringify(exampleFor(next), null, 2),
    })
  }

  function loadExample() {
    onChange({
      ...value,
      configJson: JSON.stringify(exampleFor(value.providerType), null, 2),
    })
  }

  return (
    <div className="stack">
      <div className="form-grid">
        <TextField label="Nombre" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} required />
        <SelectField
          label="Tipo"
          value={value.providerType}
          onChange={(e) => handleTypeChange(e.target.value)}
          options={TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
        />
      </div>
      {showStatus ? (
        <div className="form-grid">
          <SelectField
            label="Estado"
            value={resolveStatus({ isActive: value.isActive })}
            onChange={(e) => onChange({ ...value, isActive: e.target.value === 'ACTIVE' })}
            options={[
              { value: 'ACTIVE', label: 'ACTIVO' },
              { value: 'INACTIVE', label: 'INACTIVO' },
            ]}
          />
        </div>
      ) : null}
      <div className="form-grid">
        <div className={styles.jsonField}>
          <span className={styles.jsonLabel}>
            Config (JSON) — ejemplo para {typeLabel(value.providerType)}{' '}
            <button type="button" className={styles.exampleBtn} onClick={loadExample}>
              Cargar ejemplo
            </button>
          </span>
          <label className={styles.jsonLabel} style={{ display: 'none' }} htmlFor="provider-config-json">
            Config JSON
          </label>
          <textarea
            id="provider-config-json"
            className={styles.jsonInput}
            value={value.configJson}
            onChange={(e) => onChange({ ...value, configJson: e.target.value })}
            rows={12}
            spellCheck={false}
          />
          <span className={styles.jsonHint}>{configHintFor(value.providerType)}</span>
        </div>
      </div>
      <div className="form-grid">
        <TextField
          label={secretLabelFor(value.providerType)}
          type="password"
          value={value.secret}
          onChange={(e) => onChange({ ...value, secret: e.target.value })}
          hint={secretHint ?? secretHintFor(value.providerType)}
        />
      </div>
    </div>
  )
}

export function ProvidersPage() {
  const push = useToastStore((s) => s.push)
  const qc = useQueryClient()
  const [rows, setRows] = useStoredList<ProviderRow>('notify.providers')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<ProviderFormState>(EMPTY_FORM)
  const [editing, setEditing] = useState<ProviderRow | null>(null)
  const [editForm, setEditForm] = useState<ProviderFormState>({ ...EMPTY_FORM, name: '' })
  const [mapOpen, setMapOpen] = useState(false)
  const [mapping, setMapping] = useState({ providerId: '', channel: 'EMAIL' as ChannelType })
  const [deleting, setDeleting] = useState<ProviderRow | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['providers', 'list'],
    queryFn: providersApi.list,
    retry: false,
  })

  const mappingsQuery = useQuery({
    queryKey: ['providers', 'mappings'],
    queryFn: providersApi.listMappings,
    retry: false,
  })
  const mappings: ProviderMapping[] = Array.isArray(mappingsQuery.data) ? mappingsQuery.data : []

  const backendRows = useMemo(() => normalizeProvidersResponse(list.data), [list.data])
  const visibleStored = useMemo(() => rows.filter((r) => r.status !== 'DELETED'), [rows])
  const tableRows = list.isSuccess ? backendRows : visibleStored

  useEffect(() => {
    if (list.isSuccess) setRows(backendRows)
  }, [backendRows, list.isSuccess, setRows])

  function upsert(row: ProviderRow) {
    setRows((prev) => {
      const rest = prev.filter((r) => r.id !== row.id)
      return [...rest, row]
    })
  }

  function removeLocal(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function openEdit(row: ProviderRow) {
    setLoadingEditId(row.id)
    try {
      const res = await providersApi.byId(row.id)
      const fresh = toProviderRow(res) ?? row
      upsert(fresh)
      setEditing(fresh)
      setEditForm(toProviderForm(fresh))
    } catch (e) {
      push('error', errorMessage(e, 'No se pudo cargar el proveedor'))
      setEditing(row)
      setEditForm(toProviderForm(row))
    } finally {
      setLoadingEditId(null)
    }
  }

  function openMap(providerId: string, providerType?: string) {
    setMapping((m) => ({
      ...m,
      providerId,
      channel: providerType ? suggestedChannelFor(providerType) : m.channel,
    }))
    setMapOpen(true)
  }

  const create = useMutation({
    mutationFn: () => {
      const config = parseConfigJson(form.configJson)
      const input: CreateProviderInput = {
        name: form.name,
        providerType: form.providerType,
        config,
        secret: form.secret || undefined,
      }
      return providersApi.create(input)
    },
    onSuccess: (res) => {
      const r = res as unknown as Partial<ProviderRow>
      if (r?.id) {
        upsert(
          buildStoredProvider(r, {
            form,
            createdAt: r.createdAt as string | undefined,
            updatedAt: r.updatedAt as string | undefined,
          }),
        )
        setMapping((m) => ({ ...m, providerId: m.providerId || String(r.id) }))
      }
      push('success', 'Proveedor creado (secret cifrado en back)')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      void qc.invalidateQueries({ queryKey: ['providers', 'list'] })
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const update = useMutation({
    mutationFn: () => {
      // El modal se precarga con GET por id; aqui enviamos el JSON completo que confirme el usuario.
      const input: UpdateProviderInput = {
        name: editForm.name,
        providerType: editForm.providerType,
        config: parseConfigJson(editForm.configJson),
        isActive: editForm.isActive,
        status: editForm.isActive ? 'ACTIVE' : 'INACTIVE',
      }
      if (editForm.secret) input.secret = editForm.secret
      return providersApi.update(editing!.id, input)
    },
    onSuccess: (res) => {
      if (editing) {
        upsert(
          buildStoredProvider((res as Partial<ProviderRow> | undefined) ?? editing, {
            id: editing.id,
            form: editForm,
            createdAt: editing.createdAt,
            updatedAt: new Date().toISOString(),
          }),
        )
      }
      push('success', 'Proveedor actualizado')
      setEditing(null)
      void qc.invalidateQueries({ queryKey: ['providers', 'list'] })
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const toggleActive = useMutation({
    mutationFn: (row: ProviderRow) => {
      const next = resolveStatus(row) !== 'ACTIVE'
      const input: UpdateProviderInput = {
        isActive: next,
        status: next ? 'ACTIVE' : 'INACTIVE',
      }
      return providersApi.update(row.id, input).then((res) => ({ res, row, next }))
    },
    onSuccess: ({ res, row, next }) => {
      upsert(
        buildStoredProvider((res as Partial<ProviderRow> | undefined) ?? row, {
          id: row.id,
          form: { ...toProviderForm(row), isActive: next },
          createdAt: row.createdAt,
          updatedAt: new Date().toISOString(),
        }),
      )
      push('success', next ? 'Proveedor activado' : 'Proveedor desactivado')
      void qc.invalidateQueries({ queryKey: ['providers', 'list'] })
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (row: ProviderRow) =>
      providersApi.remove(row.id).then((res) => ({ res, row })),
    onSuccess: ({ res, row }) => {
      removeLocal(row.id)
      if (editing?.id === row.id) setEditing(null)
      setDeleting(null)
      if (res?.softDeleted) {
        push('success', `Proveedor en uso (${res.usage ?? '?'} envíos): marcado como eliminado`)
      } else {
        push('success', 'Proveedor eliminado')
      }
      void qc.invalidateQueries({ queryKey: ['providers', 'list'] })
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const map = useMutation({
    mutationFn: () => providersApi.mapChannel(mapping.providerId, mapping.channel),
    onSuccess: () => {
      push('success', `Proveedor mapeado a ${mapping.channel}`)
      setMapOpen(false)
      void qc.invalidateQueries({ queryKey: ['providers', 'list'] })
      void qc.invalidateQueries({ queryKey: ['providers', 'mappings'] })
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const mappingColumns: ColumnDef<ProviderMapping>[] = [
    {
      header: 'Canal',
      cell: ({ row }) => <Badge value={row.original.channel} />,
    },
    {
      header: 'Proveedor',
      cell: ({ row }) => row.original.providerName ?? <span className={styles.muted}>—</span>,
    },
    {
      header: 'Tipo',
      cell: ({ row }) => (row.original.providerType ? typeLabel(row.original.providerType) : '—'),
    },
    {
      header: 'Mapeo',
      cell: ({ row }) =>
        row.original.isActive ? <Badge value="ACTIVE" /> : <Badge value="INACTIVE" />,
    },
    {
      header: 'Estado proveedor',
      cell: ({ row }) =>
        row.original.providerStatus ? (
          <Badge value={row.original.providerStatus} />
        ) : (
          <span className={styles.muted}>Eliminado</span>
        ),
    },
    {
      header: 'Desde',
      cell: ({ row }) => (row.original.createdAt ? formatDateTime(row.original.createdAt) : '—'),
    },
  ]

  const tableColumns: ColumnDef<ProviderRow>[] = [
    ...columns,
    {
      header: 'Acciones',
      cell: ({ row }) => {
        const active = resolveStatus(row.original) === 'ACTIVE'
        return (
          <span className={styles.actions}>
            <IconButton
              title="Editar"
              onClick={() => void openEdit(row.original)}
              disabled={loadingEditId === row.original.id}
            >
              <Pencil />
            </IconButton>
            <IconButton
              title={active ? 'Desactivar' : 'Activar'}
              onClick={() => toggleActive.mutate(row.original)}
              disabled={toggleActive.isPending}
            >
              <Power />
            </IconButton>
            <IconButton title="Mapear a canal" onClick={() => openMap(row.original.id, row.original.providerType)}>
              <Link2 />
            </IconButton>
            <IconButton
              title="Eliminar"
              variant="danger"
              onClick={() => setDeleting(row.original)}
              disabled={remove.isPending}
            >
              <Trash2 />
            </IconButton>
          </span>
        )
      },
    },
  ]

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Proveedores</h1>
        </div>
        <span className={styles.headBtns}>
          <Button variant="ghost" onClick={() => openMap(mapping.providerId)}>
            Mapear
          </Button>
          <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>+ Nuevo proveedor</Button>
        </span>
      </div>

      {list.isError && visibleStored.length === 0 ? (
        <EmptyState
          title="No se pudieron cargar los proveedores"
          hint="Revisa la conexión o vuelve a intentar con la sesión activa."
        />
      ) : (
        <DataTable
          columns={tableColumns}
          data={tableRows}
          loading={list.isPending && visibleStored.length === 0}
          emptyTitle="Sin proveedores"
          emptyHint="Crea el primero con el botón «Nuevo proveedor»."
          getRowId={(r) => r.id}
        />
      )}

      <div className="page-head">
        <div>
          <h2>Mapeos canal → proveedor</h2>
        </div>
      </div>

      {mappingsQuery.isError ? (
        <EmptyState
          title="No se pudieron cargar los mapeos"
          hint="Revisa la conexión o vuelve a intentar con la sesión activa."
        />
      ) : (
        <DataTable
          columns={mappingColumns}
          data={mappings}
          loading={mappingsQuery.isPending}
          emptyTitle="Sin mapeos"
          emptyHint="Usa «Mapear» para asignar un proveedor a cada canal (1 activo por canal)."
          getRowId={(r) => r.id}
        />
      )}

      {createOpen ? (
        <Modal title="Nuevo proveedor" onClose={() => setCreateOpen(false)}>
          <ProviderFormFields value={form} onChange={setForm} />
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>
              Crear proveedor
            </Button>
          </div>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`Editar proveedor ${editing.id.slice(0, 8)}…`} onClose={() => setEditing(null)}>
          <ProviderFormFields
            value={editForm}
            onChange={setEditForm}
            secretHint="Vacío = no cambia el secret."
            showStatus
          />
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => update.mutate()} loading={update.isPending} disabled={!editForm.name.trim()}>
              Guardar
            </Button>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={`Eliminar «${deleting.name}»`} onClose={() => setDeleting(null)}>
          <p className="muted">
            Se eliminará el proveedor <strong>{deleting.name}</strong> ({typeLabel(deleting.providerType)}).
            Esta acción no se puede deshacer.
          </p>
          <p className="muted">
            Si nunca se usó en notificaciones se borra de la base de datos. Si ya tiene
            envíos, solo se marca como eliminado y deja de aparecer en el listado.
          </p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => remove.mutate(deleting)} loading={remove.isPending}>
              Eliminar
            </Button>
          </div>
        </Modal>
      ) : null}

      {mapOpen ? (
        <Modal title="Mapear proveedor → canal" onClose={() => setMapOpen(false)}>
          <div className="stack">
            <p className="muted">
              Solo puede haber 1 proveedor activo por canal (el sistema desactiva los demás).
              {(() => {
                const sel = tableRows.find((r) => r.id === mapping.providerId)
                return sel ? ` Sugerido para ${typeLabel(sel.providerType)}: ${suggestedChannelFor(sel.providerType)}.` : ''
              })()}
            </p>
            <SearchableSelect
              label="Proveedor"
              value={mapping.providerId}
              onChange={(v) => {
                const sel = tableRows.find((r) => r.id === v)
                setMapping({
                  ...mapping,
                  providerId: v,
                  channel: sel ? suggestedChannelFor(sel.providerType) : mapping.channel,
                })
              }}
              options={tableRows.map((r) => ({ value: r.id, label: `${r.name} (${typeLabel(r.providerType)})` }))}
              searchPlaceholder="Buscar proveedor…"
              placeholder="Buscar o pegar ID…"
              emptyText="Sin proveedores en sesión: pega el ID"
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
    </div>
  )
}
