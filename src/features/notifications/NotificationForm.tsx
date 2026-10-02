import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { notificationsApi, type CreateNotificationInput } from './api'
import { templatesApi } from '@/features/templates/api'
import { applicationsApi } from '@/features/applications/api'
import { type ChannelType, type RecipientType } from '@/shared/model/enums'
import { errorMessage } from '@/shared/api/errors'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './NotificationForm.module.css'

const RECIPIENT_TYPES: RecipientType[] = ['INTERNAL_USER', 'EXTERNAL_USER', 'EMAIL', 'PHONE']

/* Solo estos 3 canales en el formulario (igual que proveedores). */
const FORM_CHANNELS: ChannelType[] = ['EMAIL', 'SMS', 'WHATSAPP']

/* Formulario reutilizable: se usa en el popup (modal) del listado y en la ruta /new. */
export function NotificationForm({ onCreated }: { onCreated?: (id: string) => void }) {
  const push = useToastStore((s) => s.push)
  const appsQuery = useQuery({
    queryKey: ['applications', 'list'],
    queryFn: applicationsApi.list,
    retry: false,
  })

  /* Solo aplicaciones activas, igual que el filtro del listado. */
  const activeApps = useMemo(() => {
    const list = Array.isArray(appsQuery.data) ? appsQuery.data : []
    return list.filter((a) => a.isActive !== false)
  }, [appsQuery.data])

  const templatesQuery = useQuery({
    queryKey: ['templates', 'list'],
    queryFn: templatesApi.list,
    retry: false,
  })

  /* Solo plantillas activas para enviar. */
  const activeTemplates = useMemo(() => {
    const list = Array.isArray(templatesQuery.data) ? templatesQuery.data : []
    return list.filter((tpl) => (tpl.status ?? 'ACTIVE') === 'ACTIVE')
  }, [templatesQuery.data])

  const [form, setForm] = useState(() => ({
    applicationId: '',
    eventType: 'reservation.confirmed',
    idempotencyKey: '',
    templateCode: 'reservation.confirmed',
    language: 'es',
    recipientType: 'EMAIL' as RecipientType,
    contact: '',
    data: '{\n  "reservationCode": "RES-1001",\n  "guestName": "Juan"\n}',
  }))
  const [channels, setChannels] = useState<ChannelType[]>(['EMAIL'])
  const [tplCheck, setTplCheck] = useState<{ ok: boolean; detail: string } | null>(null)
  const [checking, setChecking] = useState(false)

  const mutation = useMutation({
    mutationFn: (input: CreateNotificationInput) => notificationsApi.create(input),
    onSuccess: (res) => {
      push('success', `Notificación ${res.notificationId} encolada`)
      onCreated?.(res.notificationId)
    },
    onError: (err) => push('error', errorMessage(err)),
  })

  async function verifyTemplate() {
    if (!form.templateCode.trim()) return
    setChecking(true)
    setTplCheck(null)
    try {
      const tpl = await templatesApi.byCode(form.templateCode.trim())
      const versions = tpl.versions ?? []
      setTplCheck({
        ok: true,
        detail: versions.length
          ? versions.map((v) => `${v.channel} v${v.version} ${v.language}${v.isActive ? ' ●' : ''}`).join(' · ')
          : 'Existe, sin versiones',
      })
    } catch (e) {
      setTplCheck({ ok: false, detail: errorMessage(e) })
    } finally {
      setChecking(false)
    }
  }

  function toggleChannel(c: ChannelType) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const app = activeApps.find((a) => a.id === form.applicationId)
    if (!app) {
      push('error', 'Selecciona la aplicación de origen')
      return
    }
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(form.data) as Record<string, unknown>
    } catch {
      push('error', 'El campo data no es JSON válido')
      return
    }
    const contact = form.contact.trim()
    const key = form.idempotencyKey.trim()
    mutation.mutate({
      applicationId: app.id,
      sourceSystem: app.name,
      eventType: form.eventType,
      ...(key ? { idempotencyKey: key } : {}),
      templateCode: form.templateCode,
      language: form.language,
      channels,
      data,
      recipient:
        form.recipientType === 'EMAIL'
          ? { recipientType: 'EMAIL', email: contact || undefined }
          : form.recipientType === 'PHONE'
            ? { recipientType: 'PHONE', phone: contact || undefined }
            : { recipientType: form.recipientType, userId: contact || 'user_123' },
    })
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <div className="form-grid">
        <SearchableSelect
          label="Aplicación"
          value={form.applicationId}
          onChange={(v) => setForm({ ...form, applicationId: v })}
          options={activeApps.map((a) => ({ value: a.id, label: a.name }))}
          placeholder="Seleccionar aplicación…"
          searchPlaceholder="Buscar aplicación…"
          emptyText="Sin aplicaciones activas"
          loading={appsQuery.isPending}
          allowCustom
          customText="Usar ID"
        />
        <TextField label="Tipo de evento" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} required />
      </div>
      <TextField
        label="Idempotency key (opcional)"
        value={form.idempotencyKey}
        onChange={(e) => setForm({ ...form, idempotencyKey: e.target.value })}
        placeholder="Vacío = lo genera el servidor"
        hint="Evita duplicados si reintentas el envío; con el mismo valor responde lo ya creado sin reenviar"
      />
      <div className="toolbar">
        <SearchableSelect
          label="Template code"
          className="grow"
          value={form.templateCode}
          onChange={(v) => setForm({ ...form, templateCode: v })}
          options={activeTemplates.map((tpl) => ({ value: tpl.code, label: tpl.code }))}
          placeholder="Seleccionar plantilla…"
          searchPlaceholder="Buscar plantilla…"
          emptyText="Sin plantillas activas"
          loading={templatesQuery.isPending}
          allowCustom
          customText="Usar código"
        />
        <Button type="button" variant="ghost" onClick={() => void verifyTemplate()} loading={checking}>
          Verificar
        </Button>
      </div>
      {tplCheck ? (
        <p className="muted">
          {tplCheck.ok ? '✓ ' : '✗ '}{tplCheck.detail}
        </p>
      ) : (
        <p className="muted">Solo plantillas activas. Verifica para ver sus versiones e idiomas.</p>
      )}
      <div className="form-grid">
        <TextField label="Idioma" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
        <SelectField
          label="Tipo de destinatario"
          value={form.recipientType}
          onChange={(e) => setForm({ ...form, recipientType: e.target.value as RecipientType })}
          options={RECIPIENT_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>
      <TextField
        label={form.recipientType === 'PHONE' ? 'Teléfono (E.164)' : form.recipientType === 'EMAIL' ? 'Email destino' : 'User ID'}
        value={form.contact}
        onChange={(e) => setForm({ ...form, contact: e.target.value })}
        placeholder={form.recipientType === 'EMAIL' ? 'guest@mail.com' : form.recipientType === 'PHONE' ? '+573001234567' : 'user_123'}
      />
      <fieldset className="checks">
        <legend className="checks-title">Canales</legend>
        {FORM_CHANNELS.map((c) => (
          <label key={c}>
            <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} /> {c}
          </label>
        ))}
      </fieldset>
      <label className={styles.dataLabel}>
        Data (JSON, variables {`{{...}}`} del template)
        <textarea value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} rows={5} className={styles.data} />
      </label>
      <div className="modal-actions">
        <Button type="submit" loading={mutation.isPending} disabled={channels.length === 0}>
          Enviar
        </Button>
      </div>
    </form>
  )
}
