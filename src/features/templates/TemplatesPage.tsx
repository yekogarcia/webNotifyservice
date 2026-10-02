import { Suspense, lazy, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Copy, History, Pencil, Power, Trash2 } from 'lucide-react'
import { templatesApi, type CreateTemplateInput } from './api'
import { applicationsApi } from '@/features/applications/api'
import { CHANNELS, type ChannelType } from '@/shared/model/enums'
import { ApiError, errorMessage } from '@/shared/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import type { Template, TemplateVersion } from '@/shared/model/types'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { Badge } from '@/shared/ui/Badge'
import { DataTable } from '@/shared/ui/DataTable'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './TemplatesPage.module.css'

// CKEditor pesa ~800KB: se carga diferido solo al abrir el formulario.
const TemplateBodyEditor = lazy(() =>
  import('./TemplateBodyEditor').then((m) => ({ default: m.TemplateBodyEditor })),
)

function templateStatus(t: Template): 'ACTIVE' | 'INACTIVE' {
  return t.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
}

/* 409 del back: la plantilla la usan N notificaciones y no se puede eliminar. */
function deleteErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 409) {
    const usage = (e.payload as { usage?: number } | null)?.usage
    if (typeof usage === 'number') {
      return `No se puede eliminar: la usan ${usage} notificación(es).`
    }
    return 'No se puede eliminar: la plantilla está en uso.'
  }
  return errorMessage(e)
}

const columns: ColumnDef<Template>[] = [
  { header: 'Code', accessorKey: 'code' },
  {
    header: 'Descripción',
    cell: ({ row }) => row.original.description?.trim() ? row.original.description : <span className="muted">—</span>,
  },
  {
    header: 'From',
    cell: ({ row }) => row.original.fromEmail?.trim() ? <code>{row.original.fromEmail}</code> : <span className="muted">Proveedor</span>,
  },
  {
    header: 'App ID',
    cell: ({ row }) => <code>{row.original.applicationId.slice(0, 8)}…</code>,
  },
  {
    header: 'Versiones',
    cell: ({ row }) => String(row.original.versions?.length ?? 0),
  },
  {
    header: 'Activa',
    cell: ({ row }) => {
      const v = (row.original.versions ?? []).find((x) => x.isActive)
      return v ? (
        <span className={styles.badges}>
          <Badge value={v.channel} /> v{v.version} {v.language}
        </span>
      ) : (
        <span className="muted">—</span>
      )
    },
  },
  {
    header: 'Estado',
    cell: ({ row }) => <Badge value={templateStatus(row.original)} />,
  },
  {
    header: 'Creada',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
]

export function TemplatesPage() {
  const push = useToastStore((s) => s.push)
  const qc = useQueryClient()
  // La tabla carga la data existente al abrir (GET /templates).
  const list = useQuery({ queryKey: ['templates'], queryFn: templatesApi.list, retry: false })
  const rows = Array.isArray(list.data) ? list.data : []
  const invalidate = () => qc.invalidateQueries({ queryKey: ['templates'] })
  const [code, setCode] = useState('')
  const [selectedCode, setSelectedCode] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Template | null>(null)
  const [editKey, setEditKey] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFromEmail, setEditFromEmail] = useState('')
  const [editLanguage, setEditLanguage] = useState('es')
  const [editChannel, setEditChannel] = useState<ChannelType>('EMAIL')
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [version, setVersion] = useState({ version: 1, language: 'es', channel: 'EMAIL' as ChannelType })
  const [create, setCreate] = useState({
    applicationId: '',
    code: '',
    description: '',
    fromEmail: '',
    language: 'es',
    channel: 'EMAIL' as ChannelType,
    subject: '',
    body: 'Hola {{guestName}}, tu reserva {{reservationCode}} está confirmada.',
  })

  const apps = useQuery({ queryKey: ['applications'], queryFn: applicationsApi.list, retry: false })
  const appOptions = (Array.isArray(apps.data) ? apps.data : []).map((a) => ({
    value: a.id,
    label: `${a.name} (${a.clientId})`,
  }))

  const lookup = useMutation({
    mutationFn: (c: string) => templatesApi.byCode(c),
    onSuccess: (tpl) => {
      setSelectedCode(tpl.code)
      manageVersions(tpl.code)
      push('success', `Plantilla «${tpl.code}» cargada`)
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const activate = useMutation({
    mutationFn: () =>
      templatesApi.activate(selectedCode, version.version, version.language, version.channel),
    onSuccess: () => {
      push('success', 'Versión activada')
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const createTpl = useMutation({
    mutationFn: () => {
      const input: CreateTemplateInput = {
        applicationId: create.applicationId,
        code: create.code.trim(),
        description: create.description.trim() || undefined,
        fromEmail: create.fromEmail.trim() || undefined,
        versions: [
          {
            version: 1,
            language: create.language,
            channel: create.channel,
            subject: create.subject.trim() || null,
            body: create.body,
            isActive: true,
          },
        ],
      }
      return templatesApi.create(input)
    },
    onSuccess: (tpl) => {
      push('success', 'Plantilla creada')
      setSelectedCode(tpl.code)
      setCreateOpen(false)
      setCreate((c) => ({ ...c, code: '', description: '', fromEmail: '', subject: '' }))
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const saveEdit = useMutation({
    mutationFn: async () => {
      const [v, lang, ch] = editKey.split('|')
      await templatesApi.update(
        editing!.code,
        { description: editDescription.trim() || undefined, status: editStatus, fromEmail: editFromEmail.trim() || null },
        editing!.applicationId,
      )
      return templatesApi.updateVersion(
        editing!.code,
        Number(v),
        lang,
        ch,
        { subject: editSubject.trim() || null, body: editBody, language: editLanguage.trim() || undefined, channel: editChannel },
      )
    },
    onSuccess: () => {
      push('success', 'Versión actualizada')
      setEditing(null)
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const toggleStatus = useMutation({
    mutationFn: (tpl: Template) =>
      templatesApi.update(
        tpl.code,
        { status: templateStatus(tpl) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
        tpl.applicationId,
      ),
    onSuccess: (_, tpl) => {
      push('success', templateStatus(tpl) === 'ACTIVE' ? 'Plantilla desactivada' : 'Plantilla activada')
      void invalidate()
    },
    onError: (e) => push('error', errorMessage(e)),
  })

  const [deleting, setDeleting] = useState<Template | null>(null)

  const remove = useMutation({
    mutationFn: (tpl: Template) => templatesApi.remove(tpl.code, tpl.applicationId),
    onSuccess: () => {
      push('success', 'Plantilla y versiones eliminadas')
      setDeleting(null)
      setSelectedCode((c) => (deleting && c === deleting.code ? '' : c))
      void invalidate()
    },
    onError: (e) => push('error', deleteErrorMessage(e)),
  })

  const selected = rows.find((t) => t.code === selectedCode)

  function manageVersions(code: string) {
    setSelectedCode(code)
    requestAnimationFrame(() => {
      document.getElementById('tpl-versions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const tableColumns: ColumnDef<Template>[] = [
    ...columns,
    {
      header: 'Acciones',
      cell: ({ row }) => (
        <span className={styles.badges}>
          <IconButton title="Editar" onClick={() => openEdit(row.original)}>
            <Pencil />
          </IconButton>
          <IconButton title="Versiones" onClick={() => manageVersions(row.original.code)}>
            <History />
          </IconButton>
          <IconButton title="Clonar" onClick={() => cloneTemplate(row.original)}>
            <Copy />
          </IconButton>
          <IconButton
            title={templateStatus(row.original) === 'ACTIVE' ? 'Desactivar' : 'Activar'}
            onClick={() => toggleStatus.mutate(row.original)}
            disabled={toggleStatus.isPending}
          >
            <Power />
          </IconButton>
          <IconButton title="Eliminar" variant="danger" onClick={() => setDeleting(row.original)}>
            <Trash2 />
          </IconButton>
        </span>
      ),
    },
  ]

  function versionKey(v: TemplateVersion) {
    return `${v.version}|${v.language}|${v.channel}`
  }

  // Editar guarda el contenido de la versión (PATCH /templates/:code/versions/:version).
  function openEdit(tpl: Template) {
    const versions = [...(tpl.versions ?? [])].sort((a, b) => b.version - a.version)
    const base = versions.find((v) => v.isActive) ?? versions[0]
    if (!base) {
      push('error', 'La plantilla no tiene versiones para editar')
      return
    }
    setEditing(tpl)
    setEditKey(versionKey(base))
    setEditSubject(base.subject ?? '')
    setEditBody(base.body)
    setEditDescription(tpl.description ?? '')
    setEditStatus(templateStatus(tpl))
    setEditFromEmail(tpl.fromEmail ?? '')
    setEditLanguage(base.language ?? 'es')
    setEditChannel(base.channel ?? 'EMAIL')
  }

  function pickEditVersion(key: string) {
    setEditKey(key)
    const v = editing?.versions?.find((x) => versionKey(x) === key)
    if (v) {
      setEditSubject(v.subject ?? '')
      setEditBody(v.body)
      setEditLanguage(v.language ?? 'es')
      setEditChannel(v.channel ?? 'EMAIL')
    }
  }

  // El back no tiene PUT/DELETE de plantillas: clonar crea una copia editable
  // con código nuevo vía POST /templates.
  function cloneTemplate(tpl: Template) {
    const versions = [...(tpl.versions ?? [])].sort((a, b) => b.version - a.version)
    const base = versions.find((v) => v.isActive) ?? versions[0]
    setCreate({
      applicationId: tpl.applicationId,
      code: `${tpl.code}-copia`,
      description: tpl.description ?? '',
      fromEmail: tpl.fromEmail ?? '',
      language: base?.language ?? 'es',
      channel: base?.channel ?? 'EMAIL',
      subject: base?.subject ?? '',
      body: base?.body ?? '',
    })
    setCreateOpen(true)
    push('info', 'Ajusta el código y guarda como nueva plantilla')
  }

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Plantillas</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Nueva plantilla</Button>
      </div>

      <div className="toolbar">
        <TextField
          label="Consultar por código"
          className="grow"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="reservation.confirmed"
        />
        <Button variant="ghost" onClick={() => code.trim() && lookup.mutate(code.trim())} loading={lookup.isPending}>
          Buscar
        </Button>
      </div>

      <DataTable
        columns={tableColumns}
        data={rows}
        loading={list.isPending}
        emptyTitle="Sin plantillas"
        emptyHint="Crea una nueva con el botón «Nueva plantilla»."
        getRowId={(r) => r.code}
      />

      {selected ? (
        <section className={styles.card} id="tpl-versions">
          <h2>Versiones de «{selected.code}»</h2>
          <div className={styles.versions}>
            {(selected.versions ?? []).map((v) => (
              <p key={v.id} className="muted">
                <Badge value={v.channel} /> v{v.version} {v.language}{' '}
                {v.isActive ? <Badge value="SENT" /> : null} {v.subject ?? '(sin subject)'}
              </p>
            ))}
          </div>
          <h2>Activar versión</h2>
          <div className="toolbar">
            <SearchableSelect
              label="Plantilla"
              className="grow"
              value={selectedCode}
              onChange={setSelectedCode}
              options={rows.map((t) => ({ value: t.code, label: t.code }))}
              allowCustom
              customText="Usar código"
            />
            <TextField
              label="Versión"
              type="number"
              value={String(version.version)}
              onChange={(e) => setVersion({ ...version, version: Number(e.target.value) })}
            />
            <TextField
              label="Idioma"
              value={version.language}
              onChange={(e) => setVersion({ ...version, language: e.target.value })}
            />
            <SelectField
              label="Canal"
              value={version.channel}
              onChange={(e) => setVersion({ ...version, channel: e.target.value as ChannelType })}
              options={CHANNELS.map((c) => ({ value: c, label: c }))}
            />
            <Button onClick={() => activate.mutate()} loading={activate.isPending} disabled={!selectedCode}>
              Activar
            </Button>
          </div>
        </section>
      ) : null}

      {editing ? (
        <Modal title={`Editar plantilla «${editing.code}»`} onClose={() => setEditing(null)} wide>
          <div className="stack">
            <TextField label="Descripción" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <TextField
              label="Email remitente (solo EMAIL)"
              type="email"
              value={editFromEmail}
              onChange={(e) => setEditFromEmail(e.target.value)}
              placeholder="soporte@semic.com.co"
              hint="Vacío = usa el fromAddress del proveedor"
            />
            <SelectField
              label="Estado"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              options={[
                { value: 'ACTIVE', label: 'ACTIVA' },
                { value: 'INACTIVE', label: 'INACTIVA' },
              ]}
            />
            <SearchableSelect
              label="Versión a editar"
              value={editKey}
              onChange={pickEditVersion}
              options={(editing.versions ?? []).map((v) => ({
                value: versionKey(v),
                label: `v${v.version} · ${v.language} · ${v.channel}${v.isActive ? ' (activa)' : ''}`,
              }))}
              searchPlaceholder="Buscar versión…"
              emptyText="Sin versiones"
            />
            <div className="form-grid">
              <TextField label="Idioma" value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} placeholder="es" />
              <SelectField
                label="Canal"
                value={editChannel}
                onChange={(e) => setEditChannel(e.target.value as ChannelType)}
                options={CHANNELS.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <TextField label="Subject" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            <Suspense fallback={<Spinner />}>
              <TemplateBodyEditor label="Body (HTML o texto)" value={editBody} onChange={setEditBody} />
            </Suspense>
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saveEdit.mutate()} loading={saveEdit.isPending} disabled={!editKey || !editBody.trim()}>
              Guardar
            </Button>
          </div>
        </Modal>
      ) : null}

      {createOpen ? (
        <Modal title="Nueva plantilla" onClose={() => setCreateOpen(false)} wide>
          <div className="stack">
            <SearchableSelect
              label="Aplicación"
              value={create.applicationId}
              onChange={(v) => setCreate({ ...create, applicationId: v })}
              options={appOptions}
              loading={apps.isPending}
              placeholder={apps.isError ? 'No se pudo cargar' : 'Buscar aplicación…'}
              searchPlaceholder="Buscar por nombre o client_id…"
              emptyText="Sin aplicaciones"
            />
            <div className="form-grid">
              <TextField label="Code" value={create.code} onChange={(e) => setCreate({ ...create, code: e.target.value })} placeholder="reservation.confirmed" required />
              <TextField label="Descripción" value={create.description} onChange={(e) => setCreate({ ...create, description: e.target.value })} />
            </div>
            <TextField
              label="Email remitente (solo EMAIL)"
              type="email"
              value={create.fromEmail}
              onChange={(e) => setCreate({ ...create, fromEmail: e.target.value })}
              placeholder="soporte@semic.com.co"
              hint="Vacío = usa el fromAddress del proveedor"
            />
            <div className="form-grid">
              <TextField label="Idioma (v1)" value={create.language} onChange={(e) => setCreate({ ...create, language: e.target.value })} />
              <SelectField
                label="Canal (v1)"
                value={create.channel}
                onChange={(e) => setCreate({ ...create, channel: e.target.value as ChannelType })}
                options={CHANNELS.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <TextField label="Subject (v1)" value={create.subject} onChange={(e) => setCreate({ ...create, subject: e.target.value })} />
            <Suspense fallback={<Spinner />}>
              <TemplateBodyEditor label="Body (v1, HTML o texto)" value={create.body} onChange={(v) => setCreate({ ...create, body: v })} />
            </Suspense>
          </div>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createTpl.mutate()} loading={createTpl.isPending} disabled={!create.applicationId || !create.code.trim()}>
              Crear
            </Button>
          </div>
        </Modal>
      ) : null}

      {deleting ? (
        <Modal title={`Eliminar «${deleting.code}»`} onClose={() => setDeleting(null)}>
          <p className="muted">
            Se eliminará la plantilla <code>{deleting.code}</code> con todas sus versiones.
            Esta acción no se puede deshacer.
          </p>
          <p className="muted">
            Solo se puede eliminar si ninguna notificación la usa. Si la usan, el servidor
            rechaza el borrado (409) indicando cuántas notificaciones la bloquean.
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
    </div>
  )
}
