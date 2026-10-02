import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { notificationsApi, normalizeNotifications } from './api'
import { applicationsApi } from '@/features/applications/api'
import { NotificationForm } from './NotificationForm'
import type { Notification } from '@/shared/model/types'
import { formatDateTime } from '@/shared/lib/format'
import { TextField } from '@/shared/ui/TextField'
import { SelectField } from '@/shared/ui/SelectField'
import { SearchableSelect } from '@/shared/ui/SearchableSelect'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { DataTable } from '@/shared/ui/DataTable'
import { Modal } from '@/shared/ui/Modal'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Card } from '@/shared/ui/Card'
import styles from './NotificationsPage.module.css'

/* Estados que el back realmente persiste en notifications (CREATED nunca se
 * guarda: al crear queda QUEUED y el worker la avanza a PROCESSING/SENT/DELIVERED/FAILED). */
const STATUS_OPTS = ['', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'FAILED']

const LIMIT_OPTS = ['10', '20', '50', '100']

/* Día local en YYYY-MM-DD para el <input type="date">. */
function todayLocal(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const columns: ColumnDef<Notification>[] = [
  {
    header: 'ID',
    cell: ({ row }) => (
      <Link to={`/notifications/${row.original.id}`} title={row.original.id}>
        <code>{row.original.id.slice(0, 8)}…</code>
      </Link>
    ),
  },
  { header: 'Evento', accessorKey: 'eventType' },
  { header: 'Template', accessorKey: 'templateCode' },
  {
    header: 'Canales',
    cell: ({ row }) => (
      <span className={styles.badges}>
        {(row.original.deliveries ?? []).map((d) => (
          <Badge key={d.id} value={d.channel} />
        ))}
      </span>
    ),
  },
  {
    header: 'Estado',
    cell: ({ row }) => <Badge value={row.original.status} />,
  },
  {
    header: 'Creada',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    header: '',
    cell: ({ row }) => (
      <Link to={`/notifications/${row.original.id}`} title="Ver detalle" aria-label="Ver detalle" className={styles.iconLink}>
        <Eye size={16} aria-hidden="true" />
      </Link>
    ),
  },
]

export function NotificationsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [applicationId, setApplicationId] = useState('')
  /* Por defecto: las del día. Vacío = últimas N (fallback o explícito). */
  const [date, setDate] = useState(todayLocal)
  const [limit, setLimit] = useState('20')
  const [applied, setApplied] = useState({ status: '', applicationId: '', date: todayLocal(), limit: '20' })
  /* Aviso cuando no hubo nada hoy y se muestran las últimas N. */
  const [fellBack, setFellBack] = useState(false)

  const appsQuery = useQuery({
    queryKey: ['applications', 'list'],
    queryFn: applicationsApi.list,
    retry: false,
  })

  /* Solo aplicaciones activas para consultar. */
  const activeApps = useMemo(() => {
    const list = Array.isArray(appsQuery.data) ? appsQuery.data : []
    return list.filter((a) => a.isActive !== false)
  }, [appsQuery.data])

  const appNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of activeApps) map.set(a.id, a.name)
    return map
  }, [activeApps])

  const query = useQuery({
    queryKey: ['notifications', 'list', applied],
    queryFn: () =>
      notificationsApi.list(1, Number(applied.limit) || 20, {
        status: applied.status || undefined,
        applicationId: applied.applicationId || undefined,
        date: applied.date || undefined,
      }),
    retry: false,
  })

  const rows = useMemo(() => {
    const all = normalizeNotifications(query.data)
    if (!applied.applicationId) return all
    return all.filter((r) => r.applicationId === applied.applicationId)
  }, [query.data, applied.applicationId])

  /* Sin nada en el día (y sin otros filtros): mostrar las últimas N. */
  useEffect(() => {
    if (
      query.isSuccess &&
      rows.length === 0 &&
      applied.date &&
      !applied.status &&
      !applied.applicationId
    ) {
      setApplied((a) => (a.date ? { ...a, date: '' } : a))
      setFellBack(true)
    }
  }, [query.isSuccess, rows.length, applied.date, applied.status, applied.applicationId])

  function applyFilters() {
    setFellBack(false)
    setApplied({ status, applicationId, date, limit })
  }

  function clearFilters() {
    const today = todayLocal()
    setStatus('')
    setApplicationId('')
    setDate(today)
    setLimit('20')
    setFellBack(false)
    setApplied({ status: '', applicationId: '', date: today, limit: '20' })
  }

  const activeFilters = [
    applied.status ? `Estado: ${applied.status}` : null,
    applied.applicationId
      ? `Aplicación: ${appNameById.get(applied.applicationId) ?? applied.applicationId.slice(0, 8)}`
      : null,
    applied.date ? `Fecha: ${applied.date}` : null,
    fellBack ? `Sin resultados hoy: últimas ${applied.limit}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className={styles.page}>
      <div className="page-head">
        <div>
          <h1>Notificaciones</h1>
          <p className={styles.sub}>
            Revisa el historial de envíos, filtra incidencias y lanza nuevas notificaciones
            sin salir del flujo operativo.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Nueva notificación</Button>
      </div>

      <Card
        title="Filtros y contexto"
        subtitle="Reduce el ruido visual para localizar estados, eventos o sistemas problemáticos."
      >
        <div className="toolbar">
          <SelectField
            label="Estado"
            className="grow"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTS.map((s) => ({ value: s, label: s || 'Todos' }))}
          />
          <SearchableSelect
            label="Aplicación"
            className="grow"
            value={applicationId}
            onChange={setApplicationId}
            options={[
              { value: '', label: 'Todas' },
              ...activeApps.map((a) => ({ value: a.id, label: a.name })),
            ]}
            placeholder="Todas"
            searchPlaceholder="Buscar aplicación…"
            emptyText="Sin aplicaciones activas"
            loading={appsQuery.isPending}
          />
          <TextField
            label="Fecha"
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
          />
          <SelectField
            label="Ver"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            options={LIMIT_OPTS.map((n) => ({ value: n, label: `Últimas ${n}` }))}
          />
          <Button
            variant="ghost"
            onClick={applyFilters}
          >
            Filtrar
          </Button>
          {(status || applicationId || !date || limit !== '20') ? (
            <Button
              variant="ghost"
              onClick={clearFilters}
            >
              Limpiar
            </Button>
          ) : null}
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryChip}>
            {query.isPending ? 'Cargando resultados…' : `${rows.length} resultado${rows.length === 1 ? '' : 's'}`}
          </span>
          {activeFilters.length > 0 ? (
            activeFilters.map((item) => (
              <span key={item} className={styles.filterChip}>
                {item}
              </span>
            ))
          ) : (
            <span className={styles.summaryMuted}>Sin filtros activos</span>
          )}
        </div>
      </Card>

      {query.isError ? (
        <EmptyState
          title="No se pudo cargar el listado"
          hint="Revisa la conexión con el backend o crea una notificación."
        />
      ) : (
        <Card
          title="Historial reciente"
          subtitle="Tabla operativa para revisar volumen, estado y canal de entrega."
        >
          <DataTable
            columns={columns}
            data={rows}
            loading={query.isPending}
            emptyTitle="Sin notificaciones"
            emptyHint="Crea la primera con el botón «Nueva notificación»."
            getRowId={(r) => r.id}
          />
        </Card>
      )}

      {open ? (
        <Modal title="Nueva notificación" onClose={() => setOpen(false)}>
          <NotificationForm
            onCreated={(id) => {
              setOpen(false)
              void qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
              navigate(`/notifications/${id}`)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
